---
baseline_commit: NO_VCS
---

# Story 2.2: Regional Grid Selector

Status: done

## Story

As a Grid Operator,
I want to select the grid region from a dropdown,
so that I can monitor stats from different balancing authorities.

## Acceptance Criteria

1. Backend exposes a `POST /api/grid/region` REST API endpoint that updates the active EIA balancing authority region.
2. The background EIA scheduler worker dynamically switches its ingestion queries to pull stats for the newly chosen region (CAISO, ERCOT, PJM, or MISO) on its next check.
3. The frontend displays a stylized region dropdown selector in the navigation header (e.g. CAISO, ERCOT, PJM, MISO).
4. Changing the region in the dropdown makes a POST call to the backend `/api/grid/region` endpoint to sync the active region.
5. Telemetry data is updated with metrics from the new region within the next WebSocket ticks.

## Tasks / Subtasks

- [x] Implement Backend Region API (AC: 1, 2)
  - [x] Create `backend/app/api/grid.py` containing the `POST /api/grid/region` endpoint
  - [x] Store the active region in FastAPI's `app.state.region` dynamically
  - [x] Update `eia_poll_loop` in `backend/app/main.py` and `fetch_grid_data` in `backend/app/services/eia_service.py` to check the dynamically selected active region
  - [x] Mount the grid router in `backend/app/main.py`
- [x] Implement Frontend Regional Selector Dropdown (AC: 3, 4, 5)
  - [x] Add the region selector dropdown component inside `frontend/components/Header.tsx`
  - [x] Connect the dropdown to call `POST /api/grid/region` on change
  - [x] Verify that region updates propagate telemetry data updates cleanly

## Dev Notes

*   Keep backend thread safety in mind when updating the active region state. Storing it in `app.state.region` is standard in FastAPI.
*   Dropdown styling should match the retro-cyberpunk styling guidelines (glassmorphism borders, neon hover shadows).

### Project Structure Notes

*   Frontend code resides in `frontend/`, backend in `backend/`.

### References

*   [architecture-spine.md](file:///c:/Users/sahar/Desktop/voltsync-pro-ai/_bmad-output/planning-artifacts/architecture/architecture-voltsync-pro-ai-2026-08-01/architecture-spine.md#L42-L57) - File layout and structure.
*   [prd.md](file:///c:/Users/sahar/Desktop/voltsync-pro-ai/_bmad-output/planning-artifacts/prds/prd-voltsync-pro-ai-2026-08-01/prd.md#L83-L85) - FR-5.3 Regional selector specifications.

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium)

### Debug Log References

### Completion Notes List
- Created grid.py api endpoints handles balancing region switching body payload.
- Wrote unit tests in backend/tests/test_grid.py testing active region update events.
- Integrated select dropdown next to clock display in frontend/components/Header.tsx.
- Hooked handleRegionChange triggers fetch requests inside frontend/app/page.tsx.

### File List
- backend/app/api/grid.py
- backend/tests/test_grid.py
- frontend/components/Header.tsx
- frontend/app/page.tsx

