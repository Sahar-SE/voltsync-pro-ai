import sys
import os
from fastapi.testclient import TestClient

# Add app to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

def test_region_update_flow():
    client = TestClient(app)
    
    # 1. Update to valid region
    response = client.post("/api/grid/region", json={"region": "ercot"})
    assert response.status_code == 200
    assert response.json()["active_region"] == "ercot"
    assert app.state.active_region == "ercot"
    
    # 2. Assert lowercasing
    response = client.post("/api/grid/region", json={"region": "PJM"})
    assert response.status_code == 200
    assert response.json()["active_region"] == "pjm"
    assert app.state.active_region == "pjm"
    
    # 3. Invalid region rejection
    response = client.post("/api/grid/region", json={"region": "texas_grid"})
    assert response.status_code == 400
    assert "Invalid region" in response.json()["detail"]
