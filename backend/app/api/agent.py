from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import app.services.agent as agent_service
from app.core.database import save_operator_action

router = APIRouter()

class ModeRequest(BaseModel):
    mode: str

@router.post("/agent/mode")
async def update_agent_mode(payload: ModeRequest):
    new_mode = payload.mode.strip().lower()
    if new_mode not in ["advisory", "autonomous"]:
        raise HTTPException(status_code=400, detail="Invalid mode. Must be 'advisory' or 'autonomous'.")
        
    agent_service.AGENT_MODE = new_mode
    print(f"Agent Loop: Operation mode switched to: {new_mode.upper()}")
    
    return {
        "status": "success",
        "mode": new_mode
    }

@router.get("/agent/proposal")
async def get_proposal():
    return {
        "proposal": agent_service.CURRENT_PROPOSAL
    }

@router.post("/agent/approve")
async def approve_proposal():
    proposal = agent_service.CURRENT_PROPOSAL
    if not proposal:
        raise HTTPException(status_code=400, detail="No active proposal to approve.")
        
    cmd = proposal["command"]
    reasoning = proposal["reasoning"]
    
    # Execute the command
    success, error_msg = agent_service.execute_agent_command(cmd, reasoning)
    if not success:
        # Clear proposal on execute failure
        agent_service.CURRENT_PROPOSAL = None
        raise HTTPException(status_code=400, detail=f"Approval execution failed: {error_msg}")
        
    # Clear stashed proposal on success
    agent_service.CURRENT_PROPOSAL = None
    
    return {
        "status": "success",
        "message": "Proposed command executed successfully."
    }

@router.post("/agent/reject")
async def reject_proposal():
    proposal = agent_service.CURRENT_PROPOSAL
    if not proposal:
        raise HTTPException(status_code=400, detail="No active proposal to reject.")
        
    cmd = proposal["command"]
    action_type = cmd.get("action")
    target = cmd.get("sector_id") if action_type == "toggle_sector" else None
    val = cmd.get("value") if action_type == "adjust_voltage" else None
    
    # Log rejection in SQLite
    save_operator_action(
        actor="operator",
        action_type=action_type,
        target_sector=target,
        value=val,
        status="rejected_by_operator",
        reason="Operator rejected AI proposal."
    )
    
    # Clear stashed proposal
    agent_service.CURRENT_PROPOSAL = None
    
    return {
        "status": "success",
        "message": "AI Proposal rejected and cleared."
    }

@router.get("/agent/logs")
async def get_thought_logs():
    return {
        "logs": agent_service.AGENT_THOUGHT_LOGS
    }
