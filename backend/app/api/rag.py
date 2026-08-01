from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.rag import search_rag

router = APIRouter()

class SearchRequest(BaseModel):
    query: str

@router.post("/rag/search")
async def search_manuals(payload: SearchRequest):
    query_str = payload.query.strip()
    if not query_str:
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")
        
    try:
        results = search_rag(query_str)
        return {
            "query": query_str,
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG search error: {e}")
