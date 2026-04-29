from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import sqlite3

from src.database import DB_PATH, init_db, log_event, save_recording
from src.recorder import Recorder

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients = []

recorder = Recorder()
current_reason = None


@app.on_event("startup")
def startup():
    init_db()


@app.get("/events")
def get_events():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT event_type, message, timestamp FROM events ORDER BY id DESC LIMIT 200")
    rows = cursor.fetchall()

    conn.close()

    return [{"type": r[0], "message": r[1], "timestamp": r[2]} for r in rows]


@app.get("/recordings")
def get_recordings():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT filename, start_time, end_time, reason FROM recordings ORDER BY id DESC")
    rows = cursor.fetchall()

    conn.close()

    return [
        {
            "filename": r[0],
            "start_time": r[1],
            "end_time": r[2],
            "reason": r[3],
        }
        for r in rows
    ]


# ---------------- START BEEP ----------------
@app.post("/beep/start")
def beep_start(data: dict):
    global current_reason, recorder

    reason = data.get("reason", "unknown")
    current_reason = reason

    log_event("BEEP_START", reason)

    filename, start_time = recorder.start(640, 480)

    return {"status": "recording_started", "reason": reason}


# ---------------- STOP BEEP ----------------
@app.post("/beep/stop")
def beep_stop():
    global current_reason, recorder

    filename, start_time, end_time, reason = recorder.stop(current_reason)

    save_recording(filename, start_time, end_time, reason)

    log_event("BEEP_STOP", reason)

    current_reason = None

    return {"status": "recording_stopped"}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    clients.append(ws)

    try:
        while True:
            await ws.receive_text()
    except:
        clients.remove(ws)