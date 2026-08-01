import sys
import os
import pytest
from fastapi.testclient import TestClient

# Add app to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
import app.services.agent as agent_service
from app.core.database import init_db, get_db_connection

@pytest.mark.anyio
async def test_agent_reasoning_and_endpoints():
    old_key = agent_service.GROQ_API_KEY
    agent_service.GROQ_API_KEY = ""
    try:
        init_db()
        client = TestClient(app)
        
        # 1. Test Mode switching endpoint
        response = client.post("/api/agent/mode", json={"mode": "advisory"})
        assert response.status_code == 200
        assert response.json()["mode"] == "advisory"
        assert agent_service.AGENT_MODE == "advisory"
        
        # Reset proposal state
        agent_service.CURRENT_PROPOSAL = None
        agent_service.LAST_CYCLE_TRIGGER_TIME = 0.0
        
        # 2. Trigger agent reasoning cycle manually with anomalous state (underfrequency)
        anomalous_state = {
            "totalSupply": 25000,
            "totalDemand": 26000,
            "frequency": 49.3, # Underfrequency trigger
            "voltage": 220.0,
            "stability": 55.0
        }
        
        proposal = await agent_service.run_agent_cycle(anomalous_state)
        assert proposal is not None
        assert agent_service.CURRENT_PROPOSAL is not None
        assert agent_service.CURRENT_PROPOSAL["command"]["action"] == "toggle_sector"
        
        # 3. Test get proposal endpoint
        response = client.get("/api/agent/proposal")
        assert response.status_code == 200
        assert response.json()["proposal"]["command"]["action"] == "toggle_sector"
        
        # 4. Test approve proposal endpoint
        response = client.post("/api/agent/approve")
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        assert agent_service.CURRENT_PROPOSAL is None  # Should be cleared
        
        # Verify execution audit log in SQLite
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM operator_actions WHERE actor='ai_agent' ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        conn.close()
        assert row is not None
        assert row["status"] == "executed"
        
        # 5. Trigger again for reject test
        agent_service.LAST_CYCLE_TRIGGER_TIME = 0.0
        anomalous_state_v = {
            "totalSupply": 25000,
            "totalDemand": 26000,
            "frequency": 50.0,
            "voltage": 212.0, # Low voltage trigger
            "stability": 58.0
        }
        proposal_v = await agent_service.run_agent_cycle(anomalous_state_v)
        assert proposal_v is not None
        assert agent_service.CURRENT_PROPOSAL is not None
        assert agent_service.CURRENT_PROPOSAL["command"]["action"] == "adjust_voltage"
        
        # Test reject proposal endpoint
        response = client.post("/api/agent/reject")
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        assert agent_service.CURRENT_PROPOSAL is None  # Should be cleared
        
        # Verify operator rejection audit log in SQLite
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM operator_actions WHERE status='rejected_by_operator' ORDER BY id DESC LIMIT 1")
        row_rej = cursor.fetchone()
        conn.close()
        assert row_rej is not None
        assert row_rej["action_type"] == "adjust_voltage"
        
        # 6. Test logs endpoint
        response = client.get("/api/agent/logs")
        assert response.status_code == 200
        assert len(response.json()["logs"]) >= 2
    finally:
        agent_service.GROQ_API_KEY = old_key
