---
baseline_commit: NO_VCS
---

# Story 3.1: Document Parsing & Embedding Index

Status: done

## Story

As a Developer,
I want the backend to index markdown files in `infra/sop_documents/` on startup using the Hugging Face Inference API,
so that emergency manuals can be searched semantically.

## Acceptance Criteria

1. On startup, the backend scans the `infra/sop_documents/` directory at the project root for `.md` and `.txt` files.
2. The backend splits the document texts into clean chunks (e.g. paragraphs or 500-character segments).
3. The backend calculates vector embeddings for these chunks using the Hugging Face Inference API for model `sentence-transformers/all-MiniLM-L6-v2`.
4. If the Hugging Face API key is missing or the request fails, the service falls back gracefully to a lightweight, zero-dependency local text matcher (e.g. TF-IDF or keyword matcher) so that startup never crashes.
5. Cached document embeddings are held in memory (since the document corpus is small, ~10-20 pages) for fast query lookups.

## Tasks / Subtasks

- [x] Create Document Scanner (AC: 1, 2)
  - [x] Add standard emergency SOP documents in `backend/infra/sop_documents/` (e.g. grid-stability.md, voltage-drop.md)
  - [x] Create `backend/app/services/rag.py` to handle chunking and indexing
- [x] Implement Hugging Face API Embedding Client (AC: 3, 4)
  - [x] Add `HUGGINGFACE_API_TOKEN` environment variable support in config
  - [x] Implement embedding extraction method using `requests` calling Hugging Face Inference API
  - [x] Add local python-based text fallback matching if HF calls fail
- [x] Initialize on Startup (AC: 5)
  - [x] Trigger RAG index initialization in `backend/app/main.py` lifespan startup

## Dev Notes

*   Keep indexer RAM footprint minimal.
*   Do NOT install torch, transformers, or sentence-transformers locally as they exceed 512MB RAM.

### Project Structure Notes

*   All code belongs in the `backend/` directory.

### References

*   [architecture-spine.md](file:///c:/Users/sahar/Desktop/voltsync-pro-ai/_bmad-output/planning-artifacts/architecture/architecture-voltsync-pro-ai-2026-08-01/architecture-spine.md#L42-L51) - Layout.

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium)

### Debug Log References

### Completion Notes List
- Configured document indexing loader under backend/app/services/rag.py.
- Built Hugging Face Inference API integrations with dynamic TF-IDF token overlap cosine fallback search.
- Configured startup lifecycle loader in backend/app/main.py.

### File List
- backend/infra/sop_documents/grid-stability.md
- backend/infra/sop_documents/voltage-drop.md
- backend/app/services/rag.py
- backend/tests/test_rag.py

