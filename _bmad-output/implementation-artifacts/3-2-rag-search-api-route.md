---
baseline_commit: NO_VCS
---

# Story 3.2: RAG Search API Route

Status: done

## Story

As an AI Agent,
I want to search grid manuals semantically,
so that I can cite standard procedures in emergency alerts.

## Acceptance Criteria

1. Backend exposes a `POST /api/rag/search` REST API endpoint that takes a search query: `{ "query": "underfrequency event" }`.
2. The endpoint compares the query's embedding vector (fetched via Hugging Face API or local fallback) with the cached document chunk vectors using cosine similarity.
3. Returns a JSON array of the top 3 matching chunks containing: `title`, `content` snippet, `source_file`, and `similarity_score`.
4. If no matches exist, returns a friendly empty array.

## Tasks / Subtasks

- [x] Implement Search Matching Logic (AC: 2)
  - [x] Add query search vector parsing method in `backend/app/services/rag.py`
  - [x] Implement cosine similarity ranking
- [x] Create REST API endpoint (AC: 1, 3, 4)
  - [x] Create `backend/app/api/rag.py` defining the `/api/rag/search` router
  - [x] Mount the RAG router in `backend/app/main.py` under the `/api` prefix

## Dev Notes

*   Verify similarity scores are normalised between 0 and 1.

### Project Structure Notes

*   Frontend code resides in `frontend/`, backend in `backend/`.

### References

*   [architecture-spine.md](file:///c:/Users/sahar/Desktop/voltsync-pro-ai/_bmad-output/planning-artifacts/architecture/architecture-voltsync-pro-ai-2026-08-01/architecture-spine.md#L42-L51) - Layout.

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium)

### Debug Log References

### Completion Notes List
- Created RAG search api endpoint POST /api/rag/search.
- Hooked API endpoint to route queries to the active search index processor.
- Wrote API route validation check unit tests.

### File List
- backend/app/api/rag.py
- backend/tests/test_rag.py

