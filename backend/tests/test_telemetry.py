import sys
import os
import json
from fastapi.testclient import TestClient

# Add app to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.services.interpolation import interpolate_grid_state
from app.core.database import init_db, save_telemetry

def test_grid_interpolation_logic():
    # Make sure we generate structured sub-seconds states
    base_state = {
        "total_supply": 25000.0,
        "total_demand": 24500.0,
    }
    
    state = interpolate_grid_state(base_state, cycle_count=1)
    
    assert "totalSupply" in state
    assert "totalDemand" in state
    assert "sources" in state
    assert "sectors" in state
    assert "frequency" in state
    assert "voltage" in state
    assert "stability" in state
    
    # Assert counts match design spec
    assert len(state["sources"]) == 6
    assert len(state["sectors"]) == 8
    
    # Assert values are non-zero and floating points
    assert state["totalSupply"] > 0
    assert state["totalDemand"] > 0
    assert 49.0 <= state["frequency"] <= 51.0
    assert 200.0 <= state["voltage"] <= 240.0

def test_websocket_telemetry_stream():
    init_db()
    save_telemetry(25000.0, 24500.0, 50.0, 220.0, 95.0, "[]")
    
    client = TestClient(app)
    with client.websocket_connect("/ws/telemetry") as websocket:
        # Read the first tick pushed
        data = websocket.receive_text()
        state = json.loads(data)
        
        assert "totalSupply" in state
        assert "totalDemand" in state
        assert "sources" in state
        assert "sectors" in state
        assert state["cycleCount"] == 0
