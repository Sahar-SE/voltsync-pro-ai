import sqlite3
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from app.core.config import DATABASE_URL

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "voltsync.db")

def is_postgres() -> bool:
    """
    Checks if a PostgreSQL connection string is set in environment configuration.
    """
    return bool(DATABASE_URL and (DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://")))

def get_db_connection():
    """
    Creates a new connection to either PostgreSQL (Neon) or SQLite based on configuration.
    """
    if is_postgres():
        return psycopg2.connect(DATABASE_URL)
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

def get_db_cursor(conn):
    """
    Returns a cursor instance supporting dictionary row access.
    """
    if is_postgres():
        return conn.cursor(cursor_factory=RealDictCursor)
    return conn.cursor()

def execute_statement(cursor, sql: str, params: tuple = ()):
    """
    Executes an SQL query, adapting place-holders dynamically for the database engine.
    """
    if is_postgres():
        # Convert SQLite ? placeholder style to PostgreSQL %s parameter format
        adapted_sql = sql.replace("?", "%s")
        cursor.execute(adapted_sql, params)
    else:
        cursor.execute(sql, params)

def init_db():
    """
    Initializes database tables and seeds fallback record.
    """
    conn = get_db_connection()
    cursor = get_db_cursor(conn)
    
    if is_postgres():
        # Create tables using PostgreSQL dialect syntax
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS grid_history (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total_supply REAL NOT NULL,
            total_demand REAL NOT NULL,
            frequency REAL NOT NULL,
            voltage REAL NOT NULL,
            stability REAL NOT NULL,
            alerts TEXT
        );
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS operator_actions (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            actor TEXT NOT NULL,
            action_type TEXT NOT NULL,
            target_sector TEXT,
            value REAL,
            status TEXT NOT NULL,
            reason TEXT
        );
        """)
    else:
        # Create tables using SQLite dialect syntax
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
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS operator_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            actor TEXT NOT NULL,
            action_type TEXT NOT NULL,
            target_sector TEXT,
            value REAL,
            status TEXT NOT NULL,
            reason TEXT
        );
        """)
        
    # Seed default baseline telemetry record if empty
    execute_statement(cursor, "SELECT COUNT(*) as count FROM grid_history")
    row = cursor.fetchone()
    count = row["count"] if row else 0
    
    if count == 0:
        execute_statement(cursor, """
        INSERT INTO grid_history (total_supply, total_demand, frequency, voltage, stability, alerts)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (24000.0, 23500.0, 50.0, 220.0, 100.0, "[]"))
        
    conn.commit()
    conn.close()

def save_telemetry(total_supply: float, total_demand: float, frequency: float, voltage: float, stability: float, alerts: str = "[]"):
    conn = get_db_connection()
    cursor = get_db_cursor(conn)
    execute_statement(cursor, """
    INSERT INTO grid_history (total_supply, total_demand, frequency, voltage, stability, alerts)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (total_supply, total_demand, frequency, voltage, stability, alerts))
    conn.commit()
    conn.close()

def get_latest_telemetry() -> dict:
    conn = get_db_connection()
    cursor = get_db_cursor(conn)
    execute_statement(cursor, "SELECT * FROM grid_history ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    
    if row:
        timestamp_val = row["timestamp"]
        # Convert PostgreSQL datetimes to string
        if hasattr(timestamp_val, "strftime"):
            timestamp_val = timestamp_val.strftime("%Y-%m-%d %H:%M:%S")
            
        return {
            "total_supply": row["total_supply"],
            "total_demand": row["total_demand"],
            "frequency": row["frequency"],
            "voltage": row["voltage"],
            "stability": row["stability"],
            "alerts": row["alerts"],
            "timestamp": timestamp_val,
        }
    return None

def save_operator_action(actor: str, action_type: str, target_sector: str = None, value: float = None, status: str = "executed", reason: str = None):
    conn = get_db_connection()
    cursor = get_db_cursor(conn)
    execute_statement(cursor, """
    INSERT INTO operator_actions (actor, action_type, target_sector, value, status, reason)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (actor, action_type, target_sector, value, status, reason))
    conn.commit()
    conn.close()
