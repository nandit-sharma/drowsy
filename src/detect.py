import cv2
import mediapipe as mp
import time
from utils import calculate_ear
from alarm import start_alarm, stop_alarm

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True
)

LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]

EAR_THRESHOLD = 0.25
CLOSED_FRAMES_LIMIT = 30

closed_frames = 0

# Alarm system variables
alarm_started = False
drowsy_start_time = None
alarm_delay = 5  # seconds

sound_path = "assets/alarm.wav"

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    h, w, _ = frame.shape

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = face_mesh.process(rgb)

    key = cv2.waitKey(1) & 0xFF

    eyes_closed = False

    if result.multi_face_landmarks:
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

            # Detect eye closed
            if ear < EAR_THRESHOLD:
                closed_frames += 1
            else:
                closed_frames = 0
                eyes_closed = False

                # if eyes open, stop alarm immediately
                if alarm_started:
                    stop_alarm()
                    alarm_started = False

                drowsy_start_time = None

            # Check if drowsy
            if closed_frames >= CLOSED_FRAMES_LIMIT:
                eyes_closed = True

                cv2.putText(frame, "DROWSY!", (30, 120),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)

                if drowsy_start_time is None:
                    drowsy_start_time = time.time()

                elapsed = time.time() - drowsy_start_time
                remaining = int(alarm_delay - elapsed)

                if remaining > 0:
                    cv2.putText(frame, f"Alarm in {remaining}s (Press S to stop)", (30, 180),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
                else:
                    if not alarm_started:
                        start_alarm(sound_path)
                        alarm_started = True
            else:
                cv2.putText(frame, "AWAKE", (30, 120),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)

    # Manual cancel with S
    if key == ord("s"):
        drowsy_start_time = None
        closed_frames = 0
        stop_alarm()
        alarm_started = False

    cv2.imshow("Drowsiness Detection", frame)

    if key == ord("q"):
        stop_alarm()
        break

cap.release()
cv2.destroyAllWindows()