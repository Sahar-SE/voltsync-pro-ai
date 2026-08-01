---
baseline_commit: NO_VCS
---

# Story 1.3: WebSockets Telemetry & 1s Interpolation

Status: done

## Story

As a Frontend Client,
I want to stream 1-second grid updates over a WebSocket,
so that the dashboard charts display smooth live metrics.

## Acceptance Criteria

1. Backend exposes a WebSocket route `/ws/telemetry` at `ws://localhost:8000/ws/telemetry`.
2. When a client connects, they immediately receive the latest grid state from the SQLite database.
3. Every 1 second, the WebSocket pushes a JSON telemetry frame containing: `total_supply`, `total_demand`, `frequency`, `voltage`, `stability`, `alerts`, and `timestamp`.
4. Telemetry values must be interpolated on each tick, adding minor realistic random variations around the baseline fetched from the SQLite database, preventing static jumps.
5. The server manages client connections cleanly (closing connections on client disconnect, preventing memory leaks or exceptions).

## Tasks / Subtasks

- [x] Implement Telemetry Interpolation Logic (AC: 4)
  - [x] Create `backend/app/services/interpolation.py`
  - [x] Implement a function `interpolate_grid_state(base_state: dict) -> dict` adding realistic, normal distribution noise to frequency, voltage, supply, and demand
- [x] Create WebSocket Endpoint (AC: 1, 2, 3, 5)
  - [x] Create `backend/app/api/telemetry.py` implementing the `/ws/telemetry` endpoint
  - [x] Write connection management (track active connections, clean close on disconnect)
  - [x] Write transmission loop fetching latest DB telemetry and pushing interpolated ticks every 1 second
  - [x] Mount the telemetry WebSocket route in `backend/app/main.py`

## Dev Notes

*   FastAPI supports WebSockets directly via `APIRouter.websocket("/ws/...")`.
*   Ensure that database reads are handled asynchronously or run in a threadpool so that they don't block the async WebSocket broadcast loop.
*   Use `asyncio.sleep(1.0)` to control the update rate.

### Project Structure Notes

*   All code belongs in the `backend/` directory.

### References

*   [architecture-spine.md](file:///c:/Users/sahar/Desktop/voltsync-pro-ai/_bmad-output/planning-artifacts/architecture/architecture-voltsync-pro-ai-2026-08-01/architecture-spine.md#L36-L74) - API definition invariants.
*   [prd.md](file:///c:/Users/sahar/Desktop/voltsync-pro-ai/_bmad-output/planning-artifacts/prds/prd-voltsync-pro-ai-2026-08-01/prd.md#L63-L73) - Functional requirements for WebSockets and interpolation.

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium)

### Debug Log References

### Completion Notes List
- Implemented real-time interpolation engine converting EIA database states to complete frontend grid payloads.
- Implemented connection coordinator and transmission loops inside backend/app/api/telemetry.py.
- Created unit tests in backend/tests/test_telemetry.py verifying sub-second ticks and WebSocket integrations.

### File List
- backend/app/services/interpolation.py
- backend/app/api/telemetry.py
- backend/tests/test_telemetry.py

