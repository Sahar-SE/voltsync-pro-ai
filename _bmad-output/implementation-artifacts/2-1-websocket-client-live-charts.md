---
baseline_commit: NO_VCS
---

# Story 2.1: WebSocket Client & Live Charts

Status: done

## Story

As a Grid Operator,
I want my dashboard to connect to the backend WebSockets stream,
so that the graphs display live telemetry.

## Acceptance Criteria

1. Frontend connects to the backend WebSocket server at `process.env.NEXT_PUBLIC_WS_URL` (falling back to `ws://localhost:8000/ws/telemetry`).
2. Replaces the local browser-based mock simulation cycle with updates received from the WebSocket.
3. Decodes incoming JSON grid state payloads and correctly updates React state, updating the live graphs and grids in real-time.
4. Implements automatic reconnection attempts if the WebSocket connection drops (e.g. try reconnecting every 3–5 seconds), showing a connection status badge (e.g. Connected, Reconnecting, Disconnected) in the header.

## Tasks / Subtasks

- [x] Implement WebSocket connection hook/helper (AC: 1, 4)
  - [x] Create `frontend/lib/useWebSocket.ts` or add WS connection logic in `frontend/app/page.tsx`
  - [x] Add connection state tracking (status badge) and auto-reconnection scheduler
- [x] Connect state to homepage dashboard (AC: 2, 3)
  - [x] Modify `frontend/app/page.tsx` to mount WebSocket listener on component load
  - [x] Map the WebSocket's `GridState` structure to the page's reactive state (sources, sectors, metrics)
  - [x] Remove or disable the JIT browser-based interval simulation loop

## Dev Notes

*   Next.js client-side code runs in the browser, so make sure WS connections are established inside `useEffect` (client-side only).
*   Format variables carefully to ensure data structures (e.g. lists of sources/sectors) align exactly with existing components.

### Project Structure Notes

*   All code belongs in the `frontend/` directory.

### References

*   [architecture-spine.md](file:///c:/Users/sahar/Desktop/voltsync-pro-ai/_bmad-output/planning-artifacts/architecture/architecture-voltsync-pro-ai-2026-08-01/architecture-spine.md#L52-L57) - Unified layout mapping.
*   [epics.md](file:///c:/Users/sahar/Desktop/voltsync-pro-ai/_bmad-output/planning-artifacts/epics.md#L159-L168) - Story 2.1 Acceptance Criteria.

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium)

### Debug Log References

### Completion Notes List
- Refactored frontend/app/page.tsx to mount WebSocket client streaming from backend.
- Upgraded frontend/components/Header.tsx with dynamic connection status badge and pulse animations.

### File List
- frontend/app/page.tsx
- frontend/components/Header.tsx

