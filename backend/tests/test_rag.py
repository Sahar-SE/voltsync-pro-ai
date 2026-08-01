import sys
import os
from fastapi.testclient import TestClient

# Add app to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.services.rag import initialize_rag, search_rag, RAG_INDEX

def test_rag_indexing_and_search():
    # 1. Initialize index
    initialize_rag()
    assert len(RAG_INDEX) > 0
    
    # 2. Test semantic/text search matching
    results = search_rag("underfrequency stability")
    assert len(results) > 0
    assert "remediation" in results[0]["content"].lower() or "remediation" in results[0]["title"].lower() or "stability" in results[0]["content"].lower()
    
    # 3. Test voltage dropdown search
    results_voltage = search_rag("voltage drop steps")
    assert len(results_voltage) > 0
    assert "voltage" in results_voltage[0]["content"].lower() or "SOP-02" in results_voltage[0]["title"]
    
def test_rag_api_endpoint():
    client = TestClient(app)
    
    # 1. Valid search query
    response = client.post("/api/rag/search", json={"query": "hospital online"})
    assert response.status_code == 200
    data = response.json()
    assert "query" in data
    assert "results" in data
    assert len(data["results"]) > 0
    assert "title" in data["results"][0]
    assert "content" in data["results"][0]
    
    # 2. Empty query validation
    response = client.post("/api/rag/search", json={"query": ""})
    assert response.status_code == 400
