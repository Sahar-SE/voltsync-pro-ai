# Architecture Spine: VoltSync Pro AI Agentic Real-time Smart Grid

This document establishes the architectural invariants for the real-time smart grid management platform.

## 1. System Invariants

These decisions are binding and cannot be violated by downstream components without refactoring the architecture.

### AD-1: Technology Stack
*   **Binds:** Backend server runtime and database layer.
*   **Prevents:** Node.js/Go migrations or cloud database dependencies in v1.
*   **Rule:** The backend MUST run as a Python 3.12+ FastAPI application. The persistent database MUST be a local SQLite database file located at the project root (`voltsync.db`).

### AD-2: Telemetry Pipeline & Live Ingestion
*   **Binds:** Grid data ingestion interface.
*   **Prevents:** Batch processing, client-side HTTP polling, and direct database queries from the frontend.
*   **Rule:** The backend must run a background scheduler to poll the US EIA API. Real-time telemetry MUST be streamed from the FastAPI backend to the React client via WebSockets (`ws://localhost:8000/ws/telemetry`). The client MUST NOT query raw EIA APIs directly.

### AD-3: Telemetry Interpolation
*   **Binds:** Telemetry flow frequency.
*   **Prevents:** Static, stepping dashboard charts.
*   **Rule:** The backend must run an interpolation engine that recalculates grid metrics (voltage, frequency, demand) at 1-second intervals by adding normal distribution noise around the cached 15-minute EIA API data point.

### AD-4: AI & RAG Boundaries
*   **Binds:** AI agent reasoning and knowledge representation.
*   **Prevents:** Direct remote vector database infrastructure and cloud embedding costs.
*   **Rule:** Agentic reasoning MUST run via Groq cloud API using Llama 3 models. RAG documents MUST be vectorized locally on the host CPU using the Python `sentence-transformers` library and stored in a memory-based/SQLite vector lookup index.

### AD-5: Deterministic Safety Interlocks
*   **Binds:** State mutation pathways for grid components.
*   **Prevents:** Non-deterministic LLM commands writing hazardous states to the grid database.
*   **Rule:** All grid control commands (e.g. toggling sectors, shedding load) MUST pass through a validation class (`SafetyInterlock`) on the FastAPI backend prior to database transaction write. The interlock MUST reject any action attempting to disable `Medical Complex D` or violating safety tolerances.

---

## 2. System Seed

The minimal initial blueprint to bootstrap the implementation.

### 2.1 File & Directory Invariants
```
voltsync-pro-ai/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routes (telemetry, control, RAG)
│   │   ├── core/         # Config, safety interlock classes
│   │   ├── services/     # EIA Client, RAG indexer, WebSocket coordinator
│   │   └── main.py       # FastAPI entrypoint
│   ├── infra/
│   │   └── sop_documents/# Local markdown files for RAG
│   └── requirements.txt  # Python packages
├── frontend/             # Next.js frontend (components, pages)
│   ├── app/
│   ├── components/
│   ├── tsconfig.json
│   └── package.json
└── tsconfig.json

```

### 2.2 Database Schema Seed
```sql
CREATE TABLE IF NOT EXISTS grid_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_supply REAL NOT NULL,
    total_demand REAL NOT NULL,
    frequency REAL NOT NULL,
    voltage REAL NOT NULL,
    stability REAL NOT NULL,
    alerts TEXT
);

CREATE TABLE IF NOT EXISTS operator_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    actor TEXT NOT NULL,       -- 'operator' or 'ai_agent'
    action_type TEXT NOT NULL,  -- 'toggle_sector', 'shed_load'
    target_sector TEXT,
    value REAL,
    status TEXT NOT NULL,      -- 'approved', 'rejected_by_interlock', 'executed'
    reason TEXT
);
```

### 2.3 API Interface Contracts
*   `GET /api/telemetry` - Returns cached raw EIA data.
*   `WS /ws/telemetry` - Pushes 1-second interpolated grid data.
*   `POST /api/control/execute` - Accepts control command (requires validation).
*   `POST /api/control/approve` - Human-in-the-loop operator confirmation.

---

## 3. Deferred Decisions

The following details are explicitly out of scope for the current design phase and will be decided during story execution:
1.  **AI agent prompt wording:** System prompting and Groq tool formatting will be refined during implementation.
2.  **Specific interpolation noise parameters:** The standard deviation range for voltage/frequency fluctuations will be tuned during frontend visual testing.
3.  **Local RAG token limit strategy:** Chunking strategy for extremely long SOP documents is deferred until test files are populated.
