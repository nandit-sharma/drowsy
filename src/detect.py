import cv2
import mediapipe as mp
import time
import requests   # ✅ ADDED
from datetime import datetime  # ✅ ADDED

from utils import calculate_ear
from alarm import start_alarm, stop_alarm

from recorder import Recorder   # ✅ ADDED
from database import log_event, save_recording  # ✅ ADDED

# ---------------- API (OPTIONAL SAFE LAYER) ----------------
API_URL = "http://127.0.0.1:8000"

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
EAR_THRESHOLD = 0.25
CLOSED_FRAMES_LIMIT = 30

# ---------------- STATES ----------------
closed_frames = 0
drowsy_start_time = None
alarm_started = False

face_missing_start_time = None
face_alarm_started = False

# ---------------- SOUNDS ----------------
drowsy_sound_path = "assets/drowsy_alarm.wav"
face_missing_sound_path = "assets/face_missing_alarm.wav"

# ---------------- SETTINGS ----------------
alarm_delay = 5  # seconds

# ---------------- ADDED: RECORDER ----------------
recorder = Recorder()
is_recording = False

cap = cv2.VideoCapture(0)


# ===================== NEW HELPERS =====================

def start_recording(frame, reason):
    global is_recording

    if not is_recording:
        h, w, _ = frame.shape
        filename, start_time = recorder.start(w, h)

        log_event("RECORDING_START", f"{reason} -> {filename}")

        try:
            requests.post(f"{API_URL}/beep/start", json={"reason": reason})
        except:
            pass

        is_recording = True


def stop_recording(reason):
    global is_recording

    if is_recording:
        filename, start_time, end_time = recorder.stop()

        save_recording(filename, start_time, end_time, reason)

        log_event("RECORDING_STOP", f"{reason} -> {filename}")

        try:
            requests.post(f"{API_URL}/beep/stop")
        except:
            pass

        is_recording = False


# ===================== MAIN LOOP =====================
while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    h, w, _ = frame.shape

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = face_mesh.process(rgb)

    key = cv2.waitKey(1) & 0xFF

    # write frame to recorder (if active)
    recorder.write(frame)

    # ================= FACE DETECTED =================
    if result.multi_face_landmarks:

        face_missing_start_time = None

        if face_alarm_started:
            stop_alarm()
            face_alarm_started = False
            stop_recording("FACE_FOUND")   # ✅ ADDED

        for face_landmarks in result.multi_face_landmarks:

            left_eye_points = []
            right_eye_points = []

            for idx in LEFT_EYE:
                lm = face_landmarks.landmark[idx]
                x, y = int(lm.x * w), int(lm.y * h)
                left_eye_points.append((x, y))
                cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)

            for idx in RIGHT_EYE:
                lm = face_landmarks.landmark[idx]
                x, y = int(lm.x * w), int(lm.y * h)
                right_eye_points.append((x, y))
                cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)

            left_ear = calculate_ear(left_eye_points)
            right_ear = calculate_ear(right_eye_points)
            ear = (left_ear + right_ear) / 2.0

            cv2.putText(frame, f"EAR: {ear:.2f}", (30, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)

            # ---------------- EYES CLOSED ----------------
            if ear < EAR_THRESHOLD:
                closed_frames += 1

            else:
                closed_frames = 0

                if alarm_started:
                    stop_alarm()
                    stop_recording("DROWSY_ENDED")  # ✅ ADDED
                    alarm_started = False

                drowsy_start_time = None

            # ---------------- DROWSY LOGIC ----------------
            if closed_frames >= CLOSED_FRAMES_LIMIT:
                cv2.putText(frame, "DROWSY!", (30, 120),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)

                if drowsy_start_time is None:
                    drowsy_start_time = time.time()

                elapsed = time.time() - drowsy_start_time
                remaining = int(alarm_delay - elapsed)

                if remaining > 0:
                    cv2.putText(frame, f"Alarm in {remaining}s", (30, 180),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
                else:
                    if not alarm_started:
                        start_alarm(drowsy_sound_path)
                        alarm_started = True

                        log_event("ALARM_START", "DROWSY")  # ✅ ADDED
                        start_recording(frame, "DROWSY")     # ✅ ADDED

            else:
                cv2.putText(frame, "AWAKE", (30, 120),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)

    # ================= FACE NOT DETECTED =================
    else:
        cv2.putText(frame, "FACE NOT FOUND!", (30, 120),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)

        if alarm_started:
            stop_alarm()
            stop_recording("MISSING_ENDED")   # ✅ ADDED
            alarm_started = False

        drowsy_start_time = None
        closed_frames = 0

        if face_missing_start_time is None:
            face_missing_start_time = time.time()

        elapsed = time.time() - face_missing_start_time
        remaining = int(alarm_delay - elapsed)

        if remaining > 0:
            cv2.putText(frame, f"Alarm in {remaining}s", (30, 180),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        else:
            if not face_alarm_started:
                start_alarm(face_missing_sound_path)
                face_alarm_started = True

                log_event("ALARM_START", "MISSING")   # ✅ ADDED
                start_recording(frame, "MISSING")     # ✅ ADDED

    # ================= MANUAL RESET =================
    if key == ord("s"):
        stop_alarm()
        stop_recording("MANUAL_STOP")   # ✅ ADDED

        alarm_started = False
        face_alarm_started = False

        drowsy_start_time = None
        face_missing_start_time = None
        closed_frames = 0

    # ================= EXIT =================
    if key == ord("q"):
        stop_alarm()
        stop_recording("EXIT")   # ✅ ADDED
        break

    cv2.imshow("Drowsiness + Face Monitor", frame)

cap.release()
cv2.destroyAllWindows()