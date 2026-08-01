import json
import time
from groq import Groq
from app.core.config import GROQ_API_KEY
from app.services.rag import search_rag
from app.core.safety import SafetyInterlock
from app.core.database import save_operator_action
from app.services.interpolation import (
    get_active_sector_status,
    set_active_sector_status,
    get_active_voltage_setpoint,
    set_active_voltage_setpoint
)

# Global session states
AGENT_MODE = "advisory"  # 'advisory' or 'autonomous'
CURRENT_PROPOSAL = None  # Holds active stashed proposal dict
AGENT_THOUGHT_LOGS = []  # thought logs history

# Simple trigger lockout to prevent API spamming
LAST_CYCLE_TRIGGER_TIME = 0.0

async def run_agent_cycle(grid_state: dict) -> dict:
    """
    Evaluates grid state, performs RAG manual searches, and queries Groq Llama models
    to suggest mitigation actions.
    """
    global CURRENT_PROPOSAL, AGENT_THOUGHT_LOGS, LAST_CYCLE_TRIGGER_TIME
    
    stability = grid_state.get("stability", 100.0)
    frequency = grid_state.get("frequency", 50.0)
    voltage = grid_state.get("voltage", 220.0)
    
    # 1. Evaluate triggers
    if stability >= 60.0 and frequency >= 49.5 and voltage >= 215.0:
        return None
        
    # Check rate limit (wait at least 10 seconds between API triggers)
    now = time.time()
    if now - LAST_CYCLE_TRIGGER_TIME < 10:
        return None
    LAST_CYCLE_TRIGGER_TIME = now
    
    print("Agent Loop: Grid anomaly detected! Running operator agent reasoning...")
    
    # 2. Query RAG for manual SOP citations
    search_query = ""
    if frequency < 49.5:
        search_query = "underfrequency stability load shed emergency"
    elif voltage < 215.0:
        search_query = "voltage drop setpoint capacitor adjustment"
    else:
        search_query = "grid stability index violation emergency procedures"
        
    rag_results = search_rag(search_query, limit=2)
    rag_context = "\n\n".join([f"Manual: {r['title']}\nSnippet: {r['content']}" for r in rag_results])
    
    # 3. Formulate reasoning response (API vs Mock Fallback)
    agent_output = None
    
    if GROQ_API_KEY:
        try:
            client = Groq(api_key=GROQ_API_KEY)
            
            system_prompt = (
                "You are the VoltSync SCADA AI operator agent. You monitor real-time grid metrics and issue control commands.\n"
                "You must analyze the current telemetry parameters and citation details from standard operating procedures (SOP), then suggest a single mitigation action.\n"
                "Your response must be a valid, parseable JSON object matching this structure exactly (do not output any markdown code blocks or wrapper text, just the raw JSON):\n"
                "{\n"
                '  "reasoning": "Step-by-step chain of thought reasoning citing specific rule from SOP manual.",\n'
                '  "citations": ["Exact quote from RAG snippets."],\n'
                '  "command": {\n'
                '    "action": "toggle_sector",\n'
                '    "sector_id": "residential"\n'
                "  }\n"
                "}\n"
                "OR if voltage adjustment:\n"
                "{\n"
                '  "reasoning": "...",\n'
                '  "citations": [...],\n'
                '  "command": {\n'
                '    "action": "adjust_voltage",\n'
                '    "value": 225.0\n'
                "  }\n"
                "}\n"
                "Operational limits:\n"
                "- Do NOT toggle 'hospital' sector offline.\n"
                "- Adjusting voltage setpoint cannot exceed 5% (11.0V) step size.\n"
            )
            
            user_content = (
                f"Current Telemetry Grid State:\n"
                f"- Total Supply: {grid_state['totalSupply']} MW\n"
                f"- Total Demand: {grid_state['totalDemand']} MW\n"
                f"- Grid Frequency: {frequency:.3f} Hz\n"
                f"- Grid Voltage: {voltage:.1f} V\n"
                f"- Grid Stability: {stability:.1f} %\n\n"
                f"Relevant SOP Citations:\n{rag_context}\n"
            )
            
            import anyio
            def make_call():
                return client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    model="llama-3.3-70b-versatile",
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )
            
            chat_completion = await anyio.to_thread.run_sync(make_call)
            raw_content = chat_completion.choices[0].message.content
            agent_output = json.loads(raw_content)
        except Exception as e:
            print(f"Agent Loop: Groq API query failed, running mock fallback: {e}")
            agent_output = generate_mock_agent_reasoning(grid_state, rag_results)
    else:
        agent_output = generate_mock_agent_reasoning(grid_state, rag_results)
        
    if not agent_output:
        return None
        
    # Append timestamp
    agent_output["timestamp"] = int(time.time() * 1000)
    
    # 4. Handle execution modes
    if AGENT_MODE == "advisory":
        # Stash proposal for operator review
        CURRENT_PROPOSAL = agent_output
        # Log thoughts
        log_entry = {
            "timestamp": int(time.time() * 1000),
            "reasoning": agent_output["reasoning"],
            "citations": agent_output["citations"],
            "proposal": agent_output["command"]
        }
        AGENT_THOUGHT_LOGS.append(log_entry)
        print("Agent Loop: New proposal stashed for Advisory approval.")
        
    else:
        # Autonomous execution
        execute_agent_command(agent_output["command"], agent_output["reasoning"])
        
    return agent_output

def generate_mock_agent_reasoning(grid_state: dict, rag_results: list) -> dict:
    frequency = grid_state.get("frequency", 50.0)
    voltage = grid_state.get("voltage", 220.0)
    
    citation = "No matching guidelines found."
    if rag_results:
        citation = rag_results[0]["content"]
        
    if frequency < 49.5:
        return {
            "reasoning": f"Frequency has dropped to {frequency:.3f}Hz. SOP-01 mandates load shedding to restore grid frequency stability. Hospital status must remain online. Toggling Residential District B offline to shed load.",
            "citations": [citation],
            "command": {
                "action": "toggle_sector",
                "sector_id": "residential"
            }
        }
    elif voltage < 215.0:
        target_v = round(voltage + 6.0, 1)
        return {
            "reasoning": f"Voltage is low at {voltage:.1f}V. SOP-02 permits voltage adjustments up to 5% (11.0V). Proposing raising setpoint incrementally to {target_v}V.",
            "citations": [citation],
            "command": {
                "action": "adjust_voltage",
                "value": target_v
            }
        }
    else:
        return {
            "reasoning": "Grid stability index is degraded under 60.0%. Toggling Commercial Hub C offline to shed non-essential loading.",
            "citations": [citation],
            "command": {
                "action": "toggle_sector",
                "sector_id": "commercial"
            }
        }

def execute_agent_command(cmd: dict, reasoning: str) -> tuple[bool, str]:
    """
    Executes a parsed control command directly on the grid state, keeping logs in database.
    """
    action = cmd.get("action")
    
    if action == "toggle_sector":
        sector_id = cmd.get("sector_id")
        current_status = get_active_sector_status(sector_id)
        new_status = not current_status
        
        # Interlock check
        is_safe, error_msg = SafetyInterlock.validate_toggle_sector(sector_id, new_status)
        if not is_safe:
            save_operator_action("ai_agent", "toggle_sector", sector_id, status="rejected_by_interlock", reason=error_msg)
            return False, error_msg
            
        set_active_sector_status(sector_id, new_status)
        save_operator_action("ai_agent", "toggle_sector", sector_id, value=1.0 if new_status else 0.0, status="executed")
        print(f"Autonomous Mode: AI Agent toggled sector '{sector_id}' successfully.")
        return True, ""
        
    elif action == "adjust_voltage":
        new_voltage = cmd.get("value")
        current_voltage = get_active_voltage_setpoint()
        
        # Interlock check
        is_safe, error_msg = SafetyInterlock.validate_voltage_adjustment(current_voltage, new_voltage)
        if not is_safe:
            save_operator_action("ai_agent", "adjust_voltage", value=new_voltage, status="rejected_by_interlock", reason=error_msg)
            return False, error_msg
            
        set_active_voltage_setpoint(new_voltage)
        save_operator_action("ai_agent", "adjust_voltage", value=new_voltage, status="executed")
        print(f"Autonomous Mode: AI Agent set voltage setpoint to {new_voltage:.1f}V successfully.")
        return True, ""
        
    return False, "Unsupported action."
