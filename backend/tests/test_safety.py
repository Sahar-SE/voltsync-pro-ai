import sys
import os
from fastapi.testclient import TestClient

# Add app to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.safety import SafetyInterlock
from app.core.database import init_db, get_db_connection

def test_safety_rules_unit():
    # 1. Hospital Rule check
    ok, err = SafetyInterlock.validate_toggle_sector("hospital", False)
    assert not ok
    assert "Hospital" in err
    
    ok, err = SafetyInterlock.validate_toggle_sector("industrial", False)
    assert ok
    
    # 2. Voltage Rule check
    ok, err = SafetyInterlock.validate_voltage_adjustment(220.0, 230.5)
    assert ok
    
    ok, err = SafetyInterlock.validate_voltage_adjustment(220.0, 231.5)  # Diff is 11.5 > 11.0 (5%)
    assert not ok
    assert "Voltage" in err
    
    # 3. Power Allocation check
    ok, err = SafetyInterlock.validate_power_allocation("industrial", 1, 100.0, 96.0)
    assert ok
    
    ok, err = SafetyInterlock.validate_power_allocation("industrial", 1, 100.0, 94.0)
    assert not ok
    assert "Allocation" in err

def test_safety_api_control_flow():
    init_db()
    client = TestClient(app)
    
    # 1. Test normal sector toggle
    response = client.post("/api/grid/control", json={"action": "toggle_sector", "sector_id": "industrial"})
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # 2. Test hospital toggle rejection
    response = client.post("/api/grid/control", json={"action": "toggle_sector", "sector_id": "hospital"})
    assert response.status_code == 400
    assert "Hospital" in response.json()["detail"]
    
    # 3. Verify SQLite operator action logging
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM operator_actions ORDER BY id DESC LIMIT 2")
    rows = cursor.fetchall()
    conn.close()
    
    assert len(rows) == 2
    # The last row should be the rejected hospital action
    assert rows[0]["status"] == "rejected_by_interlock"
    assert rows[0]["target_sector"] == "hospital"
    
    # The second to last row should be the executed industrial action
    assert rows[1]["status"] == "executed"
    assert rows[1]["target_sector"] == "industrial"
