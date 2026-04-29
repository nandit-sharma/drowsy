import sqlite3
import os
from datetime import datetime

DB_PATH = "logs/events.db"


# ---------------- INIT DB ----------------
def init_db():
    os.makedirs("logs", exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT,
            message TEXT,
            timestamp TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recordings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            start_time TEXT,
            end_time TEXT,
            reason TEXT
        )
    """)

    conn.commit()
    conn.close()


# ---------------- EVENT LOG ----------------
def log_event(event_type, message):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO events (event_type, message, timestamp)
        VALUES (?, ?, ?)
    """, (
        event_type,
        message,
        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ))

    conn.commit()
    conn.close()


# ---------------- SAVE RECORDING ----------------
def save_recording(filename, start_time, end_time, reason=None):
    """
    reason is OPTIONAL so old code won't break.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO recordings (filename, start_time, end_time, reason)
        VALUES (?, ?, ?, ?)
    """, (
        filename,
        start_time,
        end_time,
        reason
    ))

    conn.commit()
    conn.close()