---
baseline_commit: NO_VCS
---

# Story 4.1: Deterministic Safety Interlocks

Status: done

## Story

As a Developer,
I want a strict gatekeeper layer checking any grid adjustments,
so that the agent cannot execute unsafe decisions.

## Acceptance Criteria

1. Implement a `SafetyInterlock` validation class in the backend that enforces:
   - Hospital sector (`hospital`) online status must always remain `True`.
   - Power allocated to priority-1 sectors (Industrial, Hospital, Data Centers) must be at least 95% of its demand.
   - Voltage adjustment steps cannot exceed 5% of nominal voltage (max step of 11.0V relative to 220.0V).
2. Create a POST endpoint `/api/grid/control` to handle sector toggle and voltage adjustment mutations.
3. If a command violates a safety rule, the API blocks the change, returns a 400 Bad Request with a clear validation message, and logs the attempt in SQLite (`operator_actions` table) with status `rejected_by_interlock`.
4. If approved, the API updates the live grid state, commits the action log to SQLite with status `executed`, and propagates changes to the WebSocket stream.

## Tasks / Subtasks

- [x] Create SafetyInterlock Class (AC: 1)
  - [x] Create `backend/app/core/safety.py` containing the `SafetyInterlock` validator class
  - [x] Implement validator methods checking rule violations (hospital status, priority-1 power allocation, voltage step sizes)
- [x] Implement Control API Route (AC: 2, 3, 4)
  - [x] Add control routing inside `backend/app/api/grid.py`
  - [x] Wire the validation logic into control mutations handler
  - [x] Implement SQLite logging to the `operator_actions` table for both executed and rejected commands
- [x] Connect WebSocket telemetries (AC: 4)
  - [x] Allow the WebSocket endpoint to fetch and push state mutations dynamically reflecting control updates

## Dev Notes

*   Nominal voltage is 220.0V. A 5% threshold is exactly 11.0V. Verify adjustments compared to the current voltage state.
*   Make sure to log actor type correctly (e.g. `'operator'` for UI inputs).

### Project Structure Notes

*   Frontend code resides in `frontend/`, backend in `backend/`.

### References

*   [architecture-spine.md](file:///c:/Users/sahar/Desktop/voltsync-pro-ai/_bmad-output/planning-artifacts/architecture/architecture-voltsync-pro-ai-2026-08-01/architecture-spine.md#L31-L41) - Safety Interlocks details.
*   [prd.md](file:///c:/Users/sahar/Desktop/voltsync-pro-ai/_bmad-output/planning-artifacts/prds/prd-voltsync-pro-ai-2026-08-01/prd.md#L75-L81) - Deterministic Safety Rules.

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium)

### Debug Log References

### Completion Notes List
- Created core validator safety.py implementing hospital protection, priority-1 power allocation, and voltage step limit rules.
- Implemented POST /api/grid/control mutations api endpoint in grid.py.
- Configured dynamic global states in interpolation.py to connect control actions to active WebSocket streams.
- Configured logging hooks to SQLite operator_actions table.

### File List
- backend/app/core/safety.py
- backend/app/api/grid.py
- backend/tests/test_safety.py
- backend/app/services/interpolation.py

