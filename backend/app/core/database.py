import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "voltsync.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create grid_history table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS grid_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_supply REAL NOT NULL,
        total_demand REAL NOT NULL,
        frequency REAL NOT NULL,
        voltage REAL NOT NULL,
        stability REAL NOT NULL,
        alerts TEXT
    );
    """)
    
    # Create operator_actions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS operator_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        actor TEXT NOT NULL,       -- 'operator' or 'ai_agent'
        action_type TEXT NOT NULL,  -- 'toggle_sector', 'shed_load'
        target_sector TEXT,
        value REAL,
        status TEXT NOT NULL,      -- 'approved', 'rejected_by_interlock', 'executed'
        reason TEXT
    );
    """)
    
    # Seed default record if empty to prevent backend blockages
    cursor.execute("SELECT COUNT(*) FROM grid_history")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
        INSERT INTO grid_history (total_supply, total_demand, frequency, voltage, stability, alerts)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (24000.0, 23500.0, 50.0, 220.0, 100.0, "[]"))
        
    conn.commit()
    conn.close()

def save_telemetry(total_supply: float, total_demand: float, frequency: float, voltage: float, stability: float, alerts: str = "[]"):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO grid_history (total_supply, total_demand, frequency, voltage, stability, alerts)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (total_supply, total_demand, frequency, voltage, stability, alerts))
    conn.commit()
    conn.close()

def get_latest_telemetry() -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM grid_history ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            "total_supply": row["total_supply"],
            "total_demand": row["total_demand"],
            "frequency": row["frequency"],
            "voltage": row["voltage"],
            "stability": row["stability"],
            "alerts": row["alerts"],
            "timestamp": row["timestamp"],
        }
    return None

def save_operator_action(actor: str, action_type: str, target_sector: str = None, value: float = None, status: str = "executed", reason: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO operator_actions (actor, action_type, target_sector, value, status, reason)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (actor, action_type, target_sector, value, status, reason))
    conn.commit()
    conn.close()

