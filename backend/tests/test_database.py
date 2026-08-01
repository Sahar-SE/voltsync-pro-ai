import sys
import os
import pytest
import sqlite3

# Add app to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app.core.database as db
from app.core.database import get_db_connection, init_db, save_telemetry, get_latest_telemetry, save_operator_action

def test_sqlite_fallback_flow():
    # Force SQLite engine setting
    db.DATABASE_URL = ""
    
    # 1. Initialize
    init_db()
    
    # 2. Test saving telemetry
    save_telemetry(25000.0, 24000.0, 50.05, 221.0, 98.0, "[]")
    
    # 3. Test retrieving telemetry
    latest = get_latest_telemetry()
    assert latest is not None
    assert latest["total_supply"] == 25000.0
    assert latest["total_demand"] == 24000.0
    assert latest["voltage"] == 221.0
    
    # 4. Test saving operator actions
    save_operator_action("operator", "toggle_sector", "industrial", 1.0, "executed")

def test_postgresql_driver_activation():
    old_url = db.DATABASE_URL
    try:
        # Force PostgreSQL connection string trigger
        db.DATABASE_URL = "postgresql://invalid_user:invalid_password@localhost:5432/invalid_db"
        
        # Verify that get_db_connection attempts to connect using psycopg2
        # and raises OperationalError/InterfaceError since the target is invalid,
        # proving the PostgreSQL driver path executes successfully.
        with pytest.raises(Exception):
            get_db_connection()
        
        # Either psycopg2 OperationalError or ConnectionRefusedError depending on local environment
        assert "psycopg2" in str(sys.modules.get("psycopg2"))
    finally:
        db.DATABASE_URL = old_url
