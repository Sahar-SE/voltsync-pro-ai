---
stepsCompleted:
  - step-1
  - step-2
  - step-3
  - step-4
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-voltsync-pro-ai-2026-08-01/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-voltsync-pro-ai-2026-08-01/architecture-spine.md
---

# voltsync-pro-ai - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for voltsync-pro-ai, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

*   **FR-1.1:** The backend MUST query the EIA API every 15 minutes to retrieve generation and demand metrics for the active region.
*   **FR-1.2:** The backend MUST stream interpolated data at 1-second intervals via a WebSocket endpoint (`/ws/telemetry`) to provide smooth visual metrics on the frontend.
*   **FR-1.3:** The backend MUST write all grid state cycles and operator actions to a local SQLite database for historical logging and analysis.
*   **FR-2.1:** The agent MUST trigger a reasoning loop whenever grid telemetry metrics violate safety margins (e.g. stability < 60%, frequency < 49.5Hz, or voltage < 215V).
*   **FR-2.2:** In **Advisory Mode**, the agent MUST package its proposed commands into a JSON payload containing the reasoning path, RAG citations, and action parameters.
*   **FR-2.3:** In **Autonomous Mode**, the agent MUST attempt to execute the action directly by calling private backend endpoints.
*   **FR-3.1:** On startup, the backend MUST scan the `infra/sop_documents/` folder, parse all `.md` and `.txt` files, and generate vector embeddings using a local `sentence-transformers` CPU model.
*   **FR-3.2:** The backend MUST expose a semantic search endpoint (`/api/rag/search`) for the agent to query relevant manual sections based on current grid anomalies.
*   **FR-4.1:** The interlock layer MUST enforce the following hardcoded rules:
    *   `hospital` sector online status MUST always remain `true`.
    *   Allocated power to any priority 1 sector MUST be at least 95% of its current demand.
    *   Voltage adjustment steps must not exceed 5% of nominal values per command.
*   **FR-4.2:** If any rule is violated, the backend MUST block the transaction, log a security alert in SQLite, and return a validation error.
*   **FR-5.1:** The UI MUST display the Agent Console showing the step-by-step reasoning logs (thought processes) of the Llama model.
*   **FR-5.2:** The UI MUST feature a high-priority "Approval Modal" in Advisory Mode whenever the agent proposes an action, requiring "Approve" or "Reject" interaction.
*   **FR-5.3:** The UI MUST provide a regional selector mapping the simulation to real-world EIA balancing authorities (e.g., ERCOT, PJM, CAISO).

### NonFunctional Requirements

*   **NFR-1 (SM-1 - Latency):** AI Agent generates recommendations within 1.5 seconds of anomaly trigger.
*   **NFR-2 (SM-2 - Safety):** 100% of illegal AI agent actions are successfully intercepted and blocked by the Safety Interlocks.
*   **NFR-3 (SM-C1 - System Stability):** Simulated grid frequency remains between 49.5Hz and 50.5Hz on average under normal operating conditions.

### Additional Requirements

*   **AD-1 (Tech Stack):** The backend MUST run as a Python 3.12+ FastAPI application. The database MUST be a local SQLite file located at the project root (`voltsync.db`).
*   **AD-2 (Telemetry Ingestion):** Telemetry MUST be streamed from the FastAPI backend to the React client via WebSockets (`ws://localhost:8000/ws/telemetry`). No direct frontend-to-EIA connection is permitted.
*   **AD-3 (Interpolation):** Telemetry interpolation MUST add standard deviation noise (voltage, frequency, demand) at 1-second intervals based on raw EIA data points.
*   **AD-4 (RAG Architecture):** LLM agent reasoning MUST run via Groq API using Llama 3 models. Embeddings MUST use local `sentence-transformers/all-MiniLM-L6-v2` run on local CPU.
*   **AD-5 (Safety Gate):** A strict validation class (`SafetyInterlock`) MUST intercept and check all state mutations before database writes.

### UX Design Requirements

*   No separate visual UX Design document exists. Visual adjustments are guided by the Operator Control Center requirements (FR-5.1, FR-5.2, FR-5.3) and the existing Tailwind styling system.

### FR Coverage Map

*   **FR-1.1:** Epic 1 (Telemetry) -> Covered by Story 1.2
*   **FR-1.2:** Epic 1 (Telemetry) -> Covered by Story 1.3
*   **FR-1.3:** Epic 1 (Telemetry) -> Covered by Story 1.1, 1.2
*   **FR-2.1:** Epic 4 (Agentic) -> Covered by Story 4.2
*   **FR-2.2:** Epic 4 (Agentic) -> Covered by Story 4.2
*   **FR-2.3:** Epic 4 (Agentic) -> Covered by Story 4.2
*   **FR-3.1:** Epic 3 (RAG) -> Covered by Story 3.1
*   **FR-3.2:** Epic 3 (RAG) -> Covered by Story 3.2
*   **FR-4.1:** Epic 4 (Agentic) -> Covered by Story 4.1
*   **FR-4.2:** Epic 4 (Agentic) -> Covered by Story 4.1
*   **FR-5.1:** Epic 4 (Agentic) -> Covered by Story 4.3
*   **FR-5.2:** Epic 4 (Agentic) -> Covered by Story 4.3
*   **FR-5.3:** Epic 2 (Dashboard) -> Covered by Story 2.2

---

## Epic List

### Epic 1: Real-time Telemetry Ingestion & API Integration
*Goal:* Setup backend API, poll EIA data, cache in SQLite, and push 1s interpolated metrics via WebSockets.
**FRs covered:** FR-1.1, FR-1.2, FR-1.3

### Epic 2: Operator Dashboard Console & Interface Refactor
*Goal:* Refactor frontend React files to connect to live WebSocket telemetry and select grid regions.
**FRs covered:** FR-5.3

### Epic 3: Local RAG (Retrieval Augmented Generation) Engine
*Goal:* Build a local CPU-based vector search pipeline for grid emergency procedures.
**FRs covered:** FR-3.1, FR-3.2

### Epic 4: Groq Agentic Operator & Safety Interlocks
*Goal:* Build backend safety validation checks and integrate the Groq Llama agent.
**FRs covered:** FR-2.1, FR-2.2, FR-2.3, FR-4.1, FR-4.2, FR-5.1, FR-5.2

---

## Epic 1: Real-time Telemetry Ingestion & API Integration

### Story 1.1: Backend Server & DB Foundation
As a Developer,
I want to initialize a Python FastAPI application and setup the SQLite database,
So that we have a stable environment to serve endpoints and cache telemetry.

**Acceptance Criteria:**
*   **Given** a clean repo workspace
*   **When** I run the uvicorn command on `backend/app/main.py`
*   **Then** the FastAPI server boots up on port 8000 without errors
*   **And** a SQLite database file `voltsync.db` is initialized at the root of the project with required tables.

---

### Story 1.2: EIA API Ingestion & Cache
As a Grid Operator,
I want the backend to query US EIA grid API data and save it to SQLite,
So that the dashboard works with real generation and demand stats.

**Acceptance Criteria:**
*   **Given** a configured EIA API Key in `.env`
*   **When** the backend starts
*   **Then** a background worker queries the EIA API every 15 minutes for CAISO generation and demand
*   **And** stores the metrics inside the SQLite database
*   **And** falls back to simulated data gracefully if the API fails or key is missing.

---

### Story 1.3: WebSockets Telemetry & 1s Interpolation
As a Frontend Client,
I want to stream 1-second grid updates over a WebSocket,
So that the dashboard charts display smooth live metrics.

**Acceptance Criteria:**
*   **Given** cached EIA data in the SQLite database
*   **When** a client connects to `ws://localhost:8000/ws/telemetry`
*   **Then** the server pushes JSON telemetry frames every 1 second
*   **And** the values include realistic minor random fluctuations around the last fetched API coordinates.

---

## Epic 2: Operator Dashboard Console & Interface Refactor

### Story 2.1: WebSocket Client & Live Charts
As a Grid Operator,
I want my dashboard to connect to the backend WebSockets stream,
So that the graphs display live telemetry.

**Acceptance Criteria:**
*   **Given** the FastAPI WebSocket stream is running
*   **When** I load the homepage dashboard
*   **Then** the client connects to `ws://localhost:8000/ws/telemetry`
*   **And** updates the React charts in real-time.

---

### Story 2.2: Regional Grid Selector
As a Grid Operator,
I want to select the grid region from a dropdown,
So that I can monitor stats from different balancing authorities.

**Acceptance Criteria:**
*   **Given** multiple balancing authority templates (e.g. CAISO, ERCOT, PJM)
*   **When** I select a region in the header dropdown
*   **Then** the dashboard sends the updated choice to the backend
*   **And** the backend switches its EIA ingestion and simulation streams to that region.

---

## Epic 3: Local RAG (Retrieval Augmented Generation) Engine

### Story 3.1: Document Parsing & Embedding Index
As a Developer,
I want the backend to index markdown files in `infra/sop_documents/` on startup,
So that emergency manuals can be searched semantically.

**Acceptance Criteria:**
*   **Given** markdown manuals in `infra/sop_documents/`
*   **When** the backend starts
*   **Then** the server parses the text, computes embeddings using a local CPU model, and indexes the chunks.

---

### Story 3.2: RAG Search API Route
As an AI Agent,
I want to search grid manuals semantically,
So that I can cite standard procedures in emergency alerts.

**Acceptance Criteria:**
*   **Given** a query string
*   **When** I post to `/api/rag/search`
*   **Then** the API returns the top matching document snippets and their identifiers.

---

## Epic 4: Groq Agentic Operator & Safety Interlocks

### Story 4.1: Deterministic Safety Interlocks
As a Developer,
I want a strict gatekeeper layer checking any grid adjustments,
So that the agent cannot execute unsafe decisions.

**Acceptance Criteria:**
*   **Given** a control command (e.g., toggle sector)
*   **When** the command attempts to set the hospital sector offline
*   **Then** the SafetyInterlock class rejects the command
*   **And** returns a validation error to the caller without mutating state.

---

### Story 4.2: Groq Agent Loop Integration
As an Automated Assistant,
I want to monitor grid stability and suggest recommendations,
So that the grid remains balanced.

**Acceptance Criteria:**
*   **Given** grid metrics violating thresholds (e.g. stability < 60%)
*   **When** the agent reasoning loop executes via Groq
*   **Then** the agent generates a balanced action sequence and cites standard operating procedures.

---

### Story 4.3: Agent UI Console & Approval Queue
As a Grid Operator,
I want to see the Agent's reasoning logs and approve proposed changes,
So that I can supervise autonomous adjustments.

**Acceptance Criteria:**
*   **Given** Advisory Mode is active
*   **When** the agent proposes a load-shedding command
*   **Then** the dashboard displays the thought console logs
*   **And** displays an Approval Card allowing the operator to click "Approve" or "Reject".
