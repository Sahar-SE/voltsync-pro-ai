# Forged Idea: VoltSync Pro AI Agentic Real-time Backend

## Locked Decisions
*   **Backend Architecture:** Python FastAPI + SQLite database.
*   **Grid Telemetry Feed:** Real-world regional grid data fetched from the US EIA API (Energy Information Administration). 
*   **Real-time Simulation Flow:** The backend pulls raw EIA data (5-15 min updates), caches it in SQLite, and uses client/server interpolation to stream smooth sub-second updates (voltage, frequency, demand, and generation) over WebSockets.
*   **AI Agent Engine:** Groq API running Llama models (e.g. `llama-3.3-70b-versatile`) for high-speed agentic reasoning, schema planning, and function calling.
*   **RAG Engine:** Local Python-based embeddings (`sentence-transformers/all-MiniLM-L6-v2`) indexing operational documents in `infra/sop_documents/` into a lightweight sqlite/vector index.
*   **AI Boundary Modes:** Dual mode switchable via dashboard UI:
    *   *Advisory Mode:* Agent proposes actions based on RAG; Operator must click "Approve" or "Reject".
    *   *Autonomous Mode:* Agent executes actions directly.
*   **Grid Safety Interlocks:** Hardcoded backend guardrail layer. Rejects any action trying to disconnect high-priority sectors (e.g., Medical/Hospitals) or violating voltage/frequency threshold margins.

## Rejected Options & Rationales
*   *Rejected: Pure High-frequency IoT Simulation (no API).* 
    *   *Reason:* User wanted real-world connection. We chose EIA API data connection to ensure the grid is grounded in real-life grid behaviors.
*   *Rejected: Raw Grid API Telemetry Updates only (no interpolation).*
    *   *Reason:* Dashboard charts would feel static or jump abruptly. We chose sub-second data interpolation to keep the dashboard responsive and interactive.
*   *Rejected: Local LLM Engine (Ollama).*
    *   *Reason:* Groq API is free, dramatically faster, and handles complex tool-calling and reasoning loops out of the box without requiring high local hardware specs.
*   *Rejected: Direct Agent-to-Grid execution without guardrails.*
    *   *Reason:* Hallucinations or errors could cause simulated grid disasters. Deterministic interlocks ensure security.
