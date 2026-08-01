import sys
import os
import sqlite3

# Add app to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.eia_service import fetch_grid_data, REGION_MAPPING
from app.core.database import init_db, save_telemetry, get_latest_telemetry, DB_PATH

def test_eia_mock_fallback():
    # Calling fetch_grid_data with no API key should fallback to mock data
    data = fetch_grid_data("caiso")
    assert "total_supply" in data
    assert "total_demand" in data
    assert "frequency" in data
    assert "voltage" in data
    assert "stability" in data
    assert data["total_supply"] > 0
    assert data["total_demand"] > 0
    assert 49.0 <= data["frequency"] <= 51.0

def test_database_logging():
    # Make sure database initializes and records telemetry
    init_db()
    
    # Save test telemetry
    save_telemetry(
        total_supply=25000.5,
        total_demand=24500.2,
        frequency=50.005,
        voltage=220.1,
        stability=92.5,
        alerts="[]"
    )
    
    # Retrieve latest and verify
    latest = get_latest_telemetry()
    assert latest is not None
    assert latest["total_supply"] == 25000.5
    assert latest["total_demand"] == 24500.2
    assert latest["frequency"] == 50.005
    assert latest["voltage"] == 220.1
    assert latest["stability"] == 92.5
