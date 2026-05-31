from fastapi import FastAPI, WebSocket, Response, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import json
import asyncio
import subprocess
import signal
import os
import sys
from typing import List

from src.database import DB_PATH, init_db, log_event, save_recording
from src.recorder import Recorder

import logging

# Disable uvicorn access logs and set level to WARNING
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.WARNING)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients: List[WebSocket] = []
latest_frame = None
latest_data = {"ear": 0, "status": "AWAKE"}
detection_process = None

recorder = Recorder()
current_reason = None


@app.on_event("startup")
def startup():
    init_db()


@app.on_event("shutdown")
def shutdown():
    global detection_process
    if detection_process and detection_process.poll() is None:
        try:
            if os.name == 'nt':
                subprocess.run(['taskkill', '/F', '/T', '/PID', str(detection_process.pid)], capture_output=True)
            else:
                detection_process.terminate()
        except:
            pass


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
    return [{"filename": r[0], "start_time": r[1], "end_time": r[2], "reason": r[3]} for r in rows]


@app.post("/detection/start")
def start_detection():
    global detection_process
    if detection_process is None or detection_process.poll() is not None:
        # On Windows, we use creationflags to avoid a popup window if needed, but here it's fine
        detection_process = subprocess.Popen([sys.executable, 'src/detect.py'])
        log_event("SYSTEM", "Detection Started via UI")
        return {"status": "started"}
    return {"status": "already_running"}


@app.post("/detection/stop")
def stop_detection():
    global detection_process
    if detection_process and detection_process.poll() is None:
        # Use Popen instead of run to make taskkill non-blocking and eliminate UI lag
        subprocess.Popen(['taskkill', '/F', '/T', '/PID', str(detection_process.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        detection_process = None
        log_event("SYSTEM", "Detection Stopped via UI")
        return {"status": "stopped"}
    return {"status": "not_running"}


@app.get("/detection/status")
def get_detection_status():
    global detection_process
    is_running = detection_process is not None and detection_process.poll() is None
    return {"running": is_running}


@app.post("/update")
async def update_data(data: dict):
    global latest_data, force_stop_alarm
    latest_data = data
    for client in clients:
        try:
            await client.send_json(data)
        except:
            clients.remove(client)
    
    resp = {"status": "success"}
    if force_stop_alarm:
        resp["stop_alarm"] = True
        force_stop_alarm = False
    return resp


@app.post("/frame")
async def update_frame(request: Request):
    global latest_frame
    latest_frame = await request.body()
    return {"status": "ok"}


@app.get("/video_feed")
async def video_feed():
    async def generate():
        while True:
            if latest_frame is not None:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + latest_frame + b'\r\n')
            await asyncio.sleep(0.04)  # ~25 FPS

    return StreamingResponse(generate(), media_type="multipart/x-mixed-replace; boundary=frame")


force_stop_alarm = False

@app.post("/beep/start")
def beep_start(data: dict):
    global current_reason, recorder
    reason = data.get("reason", "unknown")
    current_reason = reason
    log_event("BEEP_START", reason)
    filename, start_time = recorder.start(640, 480)
    return {"status": "recording_started", "reason": reason}


@app.post("/beep/stop")
def beep_stop():
    global current_reason, recorder, force_stop_alarm
    force_stop_alarm = True
    try:
        filename, start_time, end_time = recorder.stop()
        reason = current_reason or "unknown"
        if filename:
            save_recording(filename, start_time, end_time, reason)
        log_event("BEEP_STOP", reason)
    except Exception:
        pass
    current_reason = None
    return {"status": "alarm_stopped"}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    clients.append(ws)
    try:
        while True:
            await ws.receive_text()
    except:
        if ws in clients:
            clients.remove(ws)