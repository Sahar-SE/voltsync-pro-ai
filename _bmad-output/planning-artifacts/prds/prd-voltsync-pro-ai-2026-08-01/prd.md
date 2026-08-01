---
title: VoltSync Pro AI Agentic Real-time Smart Grid
created: 2026-08-01
updated: 2026-08-01
status: draft
---

# PRD: VoltSync Pro AI Agentic Real-time Smart Grid

## 0. Document Purpose
This PRD outlines the requirements for transitioning the VoltSync Pro AI smart grid application from a pure client-side simulation to a real-time smart grid management platform with a Python FastAPI backend, a real-world US EIA data integration, and a Groq-based Agentic AI system that features deterministic Safety Interlocks and local RAG.

This document serves as the alignment contract for the product manager (John), technical writer (Paige), system architect (Winston), software engineer (Amelia), and UX designer (Sally).

## 1. Vision
VoltSync Pro AI aims to become a production-ready, interactive smart grid management platform. By connecting to real-world grid data from the US EIA and combining it with a responsive sub-second local simulation layer, VoltSync replicates actual utility generation and demand patterns. 

Using an integrated Agentic AI operator powered by Groq and a local RAG engine reading from emergency Standard Operating Procedures (SOPs), the platform acts either as a smart advisor to human operators (Advisory Mode) or runs as a closed-loop grid optimizer (Autonomous Mode). A robust Safety Interlock layer safeguards the system against LLM hallucinations, ensuring critical infrastructure remains safe and operational under all circumstances.

## 2. Target User
The target user is a **Grid Operations Dispatcher / Engineer** who manages localized distribution balancing and demands.

### 2.1 Jobs To Be Done
*   **Prevent blackouts:** Balance load and generation dynamically using real-time insights and automated controls.
*   **Analyze grid incidents:** Quickly search through operating manuals and standard operating procedures (SOPs) during crises.
*   **Maximize clean energy:** Optimally route solar, wind, and hydro generation over dirty fossil fuel options.
*   **Reduce operational error:** Rely on automated safety guardrails to prevent accidental disconnections of critical sectors.

### 2.2 Non-Users (v1)
*   **General Consumers:** This app is not a smart-home billing application for residential consumers; it is an industrial dispatcher dashboard.
*   **Physical Grid Regulators:** This app does not integrate with physical high-voltage SCADA hardware; it interfaces with a real-time software simulation backed by live public grid API feeds.

### 2.3 Key User Journeys

*   **UJ-1: Operator reviews AI recommendation in crisis (Advisory Mode)**
    *   **Context:** Grid operator is managing localized power distribution when a storm suddenly decreases solar generation by 40%.
    *   **Entry state:** Authenticated on the main VoltSync web dashboard in **Advisory Mode**.
    *   **Path:** The dashboard flashes a warning: *Low Grid Stability (42%)*. An alert card automatically opens in the "AI Operator Console" containing a generated recommendation from the Agentic AI: *"Ramp down non-essential Commercial Hub C by 120MW to preserve safety margins."* The card cites section *NERC-E-03* of the SOP manuals via RAG.
    *   **Climax:** The operator clicks **"Approve"**. The backend instantly updates the database, reallocating power, and the grid stability score recovers to 85%.
    *   **Resolution:** The action is logged to the SQLite database with operator sign-off, and the alert is resolved.

*   **UJ-2: Automated stabilization under load surge (Autonomous Mode)**
    *   **Context:** Grid operator has toggled the system into **Autonomous Mode** during a heatwave.
    *   **Entry state:** Dashboard running in **Autonomous Mode**.
    *   **Path:** Industrial Zone A demands spike by 150MW, causing grid frequency to drop to 49.3Hz. The Groq-based Agentic AI triggers its reasoning loop, realizes the crisis, and attempts to execute a shutdown command on the Medical Complex D sector to save the grid.
    *   **Climax:** The backend Safety Interlock Layer intercepts the command and rejects it, flagging a rule violation (*Rule: Medical Complex D is a critical safety node and can never be disabled*). The backend blocks the command, halts autonomous execution, and fires a critical siren alarm.
    *   **Resolution:** The dashboard forces itself back into **Advisory Mode**, prompting the operator to manually intervene, while successfully protecting the hospital's power feed.

## 3. Glossary
*   **Advisory Mode** — A mode where the Agentic AI generates recommendations, requiring explicit human operator approval before execution.
*   **Autonomous Mode** — A mode where the Agentic AI executes grid adjustments directly, subject to validation by the Safety Interlocks.
*   **Safety Interlock** — A deterministic backend code layer that validates all control actions against a hardcoded list of safety invariants before execution.
*   **SOP (Standard Operating Procedure)** — Standard emergency protocols and utility manuals stored in the `infra/sop_documents/` folder.
*   **US EIA API** — The United States Energy Information Administration API, providing hourly electricity generation, demand, and price data by balancing authority.
*   **Interpolation** — A mathematical model generating minor random fluctuations between raw EIA data pulls to present smooth, real-time telemetry updates.

## 4. Features

### 4.1 FastAPI Backend & SQLite Ingestion
**Description:** A Python FastAPI backend replacing the pure client-side simulation. It schedules a background worker that polls the US EIA API for regional grid telemetry, writes data history to SQLite, and streams the interpolated data over WebSockets to the React frontend.
`[ASSUMPTION: We will support a offline/mock fallback for the EIA API if the network is disconnected or no API key is specified.]`

**Functional Requirements:**
*   **FR-1.1:** The backend MUST query the EIA API every 15 minutes to retrieve generation and demand metrics for the active region.
*   **FR-1.2:** The backend MUST stream interpolated data at 1-second intervals via a WebSocket endpoint (`/ws/telemetry`) to provide smooth visual metrics on the frontend.
*   **FR-1.3:** The backend MUST write all grid state cycles and operator actions to a local SQLite database for historical logging and analysis.

### 4.2 Agentic AI Operator (Groq)
**Description:** An AI agent powered by the Groq API (using Llama 3 models) that monitors grid telemetry. It is equipped with tools to query the RAG database, suggest grid routing changes, and write control updates back to the backend.

**Functional Requirements:**
*   **FR-2.1:** The agent MUST trigger a reasoning loop whenever grid telemetry metrics violate safety margins (e.g. stability < 60%, frequency < 49.5Hz, or voltage < 215V).
*   **FR-2.2:** In **Advisory Mode**, the agent MUST package its proposed commands into a JSON payload containing the reasoning path, RAG citations, and action parameters.
*   **FR-2.3:** In **Autonomous Mode**, the agent MUST attempt to execute the action directly by calling private backend endpoints.

### 4.3 Local RAG Document Indexing
**Description:** Ingests grid manuals and emergency procedures directly from the disk on startup, allowing the Agent to search and cite actual operational standards.

**Functional Requirements:**
*   **FR-3.1:** On startup, the backend MUST scan the `infra/sop_documents/` folder, parse all `.md` and `.txt` files, and generate vector embeddings using a local `sentence-transformers` CPU model.
*   **FR-3.2:** The backend MUST expose a semantic search endpoint (`/api/rag/search`) for the agent to query relevant manual sections based on current grid anomalies.

### 4.4 Deterministic Safety Interlocks
**Description:** A deterministic validation class on the backend that intercepts all control commands before they modify database states.

**Functional Requirements:**
*   **FR-4.1:** The interlock layer MUST enforce the following hardcoded rules:
    *   `hospital` sector online status MUST always remain `true`.
    *   Allocated power to any priority 1 sector MUST be at least 95% of its current demand.
    *   Voltage adjustment steps must not exceed 5% of nominal values per command.
*   **FR-4.2:** If any rule is violated, the backend MUST block the transaction, log a security alert in SQLite, and return a validation error.

### 4.5 Operator Control Center Dashboard (UI)
**Description:** React/Next.js UI including an Agent thought log console, a regional dropdown selector, and an action approval queue.

**Functional Requirements:**
*   **FR-5.1:** The UI MUST display the Agent Console showing the step-by-step reasoning logs (thought processes) of the Llama model.
*   **FR-5.2:** The UI MUST feature a high-priority "Approval Modal" in Advisory Mode whenever the agent proposes an action, requiring "Approve" or "Reject" interaction.
*   **FR-5.3:** The UI MUST provide a regional selector mapping the simulation to real-world EIA balancing authorities (e.g., ERCOT, PJM, CAISO).

## 5. Non-Goals (Explicit)
*   **Physical Grid Integration:** We will not build physical SCADA hardware communication interfaces (like Modbus, DNP3, or OPC UA). All controls target the simulated backend.
*   **Multi-tenant Accounts:** No user management, authentication, or SaaS billing features in v1. The system is designed for a single local operator session.

## 6. MVP Scope

### 6.1 In Scope
*   Python FastAPI backend server with SQLite storage.
*   US EIA API client with offline/mock fallback.
*   WebSockets telemetry stream with 1s interpolation.
*   Groq API client calling Llama 3 models.
*   Local vector embedding and index generation using `sentence-transformers` over `infra/sop_documents/`.
*   Safety Interlocks layer enforcing hardcoded hospital safety and demand margins.
*   React frontend panel redesign (Agent Console, Regional dropdown, Mode Switcher, Approval Card).

### 6.2 Out of Scope for MVP
*   **Cloud Hosting Database:** No AWS RDS/PostgreSQL setup. (SQLite is sufficient).
*   **Fine-tuned Models:** No custom-trained LLM models. (Local RAG + system prompting is sufficient).
*   **Continuous Vector DB:** No separate vector database microservice like Pinecone. (In-memory/NumPy vector index is sufficient).

## 7. Success Metrics
*   **SM-1 (Response Latency):** AI Agent generates recommendations within 1.5 seconds of anomaly trigger. (Validates FR-2.1, FR-2.2).
*   **SM-2 (Safety Rate):** 100% of illegal AI agent actions are successfully intercepted and blocked by the Safety Interlocks. (Validates FR-4.1, FR-4.2).
*   **SM-C1 (System Stability):** Simulated grid frequency remains between 49.5Hz and 50.5Hz on average under normal operating conditions. (Do not optimize past safety bounds).

## 8. Open Questions
1.  **What regional balancing authorities should be pre-configured in the EIA dropdown?** (Defaulting to CAISO and ERCOT is proposed).
2.  **How long should the backend retain historical telemetry logs in SQLite?** (Defaulting to a 24-hour circular cache to prevent SQLite bloat is proposed).

## 9. Assumptions Index
*   **Assumptions-1:** We will support a offline/mock fallback for the EIA API if the network is disconnected or no API key is specified. (Section 4.1).
