# Hello vandit how are you. I have made some changes to the code. Please review it and let me know if you have any questions or need further modifications.



import cv2
import mediapipe as mp
import time
import requests
import os
import logging
from datetime import datetime

from utils import calculate_ear
from alarm import start_alarm, stop_alarm
from recorder import Recorder
from database import log_event, save_recording

# ---------------- API ----------------
API_URL = "http://127.0.0.1:8001"

# ---------------- MEDIAPIPE ----------------
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True
)

# ---------------- EYE LANDMARKS ----------------
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]

# ---------------- THRESHOLDS ----------------
EAR_THRESHOLD = 0.19
CLOSED_FRAMES_LIMIT = 10

# ---------------- STATES ----------------
closed_frames = 0
open_frames = 0
drowsy_start_time = None
alarm_started = False
face_missing_start_time = None
face_alarm_started = False
is_recording = False

# ---------------- SOUNDS ----------------
drowsy_sound_path = "assets/drowsy_alarm.wav"
face_missing_sound_path = "assets/face_missing_alarm.wav"

# ---------------- SETTINGS ----------------
alarm_delay = 0.30  # seconds

# ---------------- CAMERA & RECORDER ----------------
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

recorder = Recorder()
session = requests.Session()  # reuse TCP connection for speed

def start_recording(frame, reason):
    global is_recording
    if not is_recording:
        h, w, _ = frame.shape
        filename, start_time = recorder.start(w, h)
        log_event("RECORDING_START", f"{reason} -> {filename}")
        try:
            session.post(f"{API_URL}/beep/start", json={"reason": reason}, timeout=1)
        except: pass
        is_recording = True

def stop_recording(reason):
    global is_recording
    if is_recording:
        filename, start_time, end_time = recorder.stop()
        save_recording(filename, start_time, end_time, reason)
        log_event("RECORDING_STOP", f"{reason} -> {filename}")
        try:
            session.post(f"{API_URL}/beep/stop", timeout=1)
        except: pass
        is_recording = False

# ===================== MAIN LOOP =====================
while True:
    ret, frame = cap.read()
    if not ret: break

    frame = cv2.flip(frame, 1)
    h, w, _ = frame.shape
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = face_mesh.process(rgb)

    status_to_send = "AWAKE"
    ear_to_send = 0.0

    # ================= FACE DETECTED =================
    if result.multi_face_landmarks:
        face_missing_start_time = None
        if face_alarm_started:
            stop_alarm()
            face_alarm_started = False
            stop_recording("FACE_FOUND")

        for face_landmarks in result.multi_face_landmarks:
            left_eye_points = []
            right_eye_points = []

            for idx in LEFT_EYE:
                lm = face_landmarks.landmark[idx]
                x, y = int(lm.x * w), int(lm.y * h)
                left_eye_points.append((x, y))
                cv2.circle(frame, (x, y), 3, (0, 255, 0), -1) # Slightly larger dots

            for idx in RIGHT_EYE:
                lm = face_landmarks.landmark[idx]
                x, y = int(lm.x * w), int(lm.y * h)
                right_eye_points.append((x, y))
                cv2.circle(frame, (x, y), 3, (0, 255, 0), -1)

            left_ear = calculate_ear(left_eye_points)
            right_ear = calculate_ear(right_eye_points)
            ear = (left_ear + right_ear) / 2.0
            ear_to_send = round(ear, 3)

            # ---------------- DROWSY LOGIC ----------------
            if ear < EAR_THRESHOLD:
                closed_frames += 1
                open_frames = 0
            else:
                open_frames += 1
                if open_frames >= 5:  # Debounce: require 5 consecutive open frames to cancel drowsy state
                    closed_frames = 0
                    if alarm_started:
                        stop_alarm()
                        stop_recording("DROWSY_ENDED")
                        alarm_started = False
                    drowsy_start_time = None

            if closed_frames >= CLOSED_FRAMES_LIMIT:
                status_to_send = "DROWSY"
                if drowsy_start_time is None:
                    drowsy_start_time = time.time()
                elapsed = time.time() - drowsy_start_time
                if elapsed >= alarm_delay:
                    if not alarm_started:
                        start_alarm(drowsy_sound_path)
                        alarm_started = True
                        log_event("ALARM_START", "DROWSY")
                        start_recording(frame, "DROWSY")
            else:
                status_to_send = "AWAKE"

    # ================= FACE NOT DETECTED =================
    else:
        status_to_send = "MISSING"
        if alarm_started:
            stop_alarm()
            stop_recording("MISSING_ENDED")
            alarm_started = False

        if face_missing_start_time is None:
            face_missing_start_time = time.time()
        
        elapsed = time.time() - face_missing_start_time
        if elapsed >= alarm_delay:
            if not face_alarm_started:
                start_alarm(face_missing_sound_path)
                face_alarm_started = True
                log_event("ALARM_START", "MISSING")
                start_recording(frame, "MISSING")

    # ---------------- PUSH DATA TO API ----------------
    try:
        r = session.post(f"{API_URL}/update", json={"ear": ear_to_send, "status": status_to_send}, timeout=1)
    except: pass

    # ---------------- PUSH FRAME TO API (NOW AT THE END) ----------------
    recorder.write(frame) # Write processed frame to recorder
    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
    try:
        session.post(f"{API_URL}/frame", data=buffer.tobytes(), timeout=1)
    except: pass

cap.release()
cv2.destroyAllWindows()