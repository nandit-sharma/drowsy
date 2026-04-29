import cv2
import mediapipe as mp
import time
from predict import predict_eye_state
from alarm import start_alarm, stop_alarm

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True
)

LEFT_EYE_POINTS = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_POINTS = [362, 385, 387, 263, 373, 380]

# Drowsiness settings (increased for stability)
CLOSED_FRAMES_LIMIT = 30
closed_frames = 0

# Missing person settings
MISSING_FRAMES_LIMIT = 30
missing_frames = 0

# Confidence threshold (IMPORTANT FIX)
CLOSE_THRESHOLD = 0.40  # Only consider eye closed if model is 60% sure

# Alarm settings
alarm_started = False
alarm_delay = 5
sound_path = "assets/alarm.wav"

# Separate timers
drowsy_trigger_time = None
missing_trigger_time = None

cap = cv2.VideoCapture(0)


def crop_eye(frame, eye_points):
    h, w, _ = frame.shape
    coords = [(int(p.x * w), int(p.y * h)) for p in eye_points]

    x_coords = [c[0] for c in coords]
    y_coords = [c[1] for c in coords]

    x_min, x_max = min(x_coords), max(x_coords)
    y_min, y_max = min(y_coords), max(y_coords)

    # Increased padding for better crop
    padding = 40
    x_min = max(0, x_min - padding)
    x_max = min(w, x_max + padding)
    y_min = max(0, y_min - padding)
    y_max = min(h, y_max + padding)

    eye_crop = frame[y_min:y_max, x_min:x_max]
    return eye_crop, (x_min, y_min, x_max, y_max)


while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = face_mesh.process(rgb)

    key = cv2.waitKey(1) & 0xFF

    face_detected = False

    # -------------------- FACE/EYE DETECTION --------------------
    if result.multi_face_landmarks:
        face_detected = True
        missing_frames = 0
        missing_trigger_time = None

        for face_landmarks in result.multi_face_landmarks:
            landmarks = face_landmarks.landmark

            left_eye_lms = [landmarks[i] for i in LEFT_EYE_POINTS]
            right_eye_lms = [landmarks[i] for i in RIGHT_EYE_POINTS]

            left_eye_img, left_box = crop_eye(frame, left_eye_lms)
            right_eye_img, right_box = crop_eye(frame, right_eye_lms)

            if left_eye_img.size == 0 or right_eye_img.size == 0:
                continue

            # Get probabilities
            left_open, left_close = predict_eye_state(left_eye_img)
            right_open, right_close = predict_eye_state(right_eye_img)

            # Decide state using threshold
            left_state = 1 if left_close >= CLOSE_THRESHOLD else 0
            right_state = 1 if right_close >= CLOSE_THRESHOLD else 0

            # left_status = "CLOSED" if left_state == 0 else "OPEN"
            # right_status = "CLOSED" if right_state == 0 else "OPEN"

            # Draw eye rectangles
            cv2.rectangle(frame, (left_box[0], left_box[1]), (left_box[2], left_box[3]), (0, 255, 0), 2)
            cv2.rectangle(frame, (right_box[0], right_box[1]), (right_box[2], right_box[3]), (0, 255, 0), 2)

            # Show eye status + confidence
            # cv2.putText(frame, f"Left: {left_status} ({left_close:.2f})", (30, 50),
            #             cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)

            # cv2.putText(frame, f"Right: {right_status} ({right_close:.2f})", (30, 80),
            #             cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)

            # -------------------- DROWSINESS LOGIC --------------------
            if left_state == 1 and right_state == 1:
                closed_frames += 1
            else:
                closed_frames = 0
                drowsy_trigger_time = None

                # stop alarm instantly if eyes open
                if alarm_started:
                    stop_alarm()
                    alarm_started = False

            # Drowsy trigger countdown
            if closed_frames >= CLOSED_FRAMES_LIMIT:
                cv2.putText(frame, "DROWSY!", (30, 140),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)

                if drowsy_trigger_time is None:
                    drowsy_trigger_time = time.time()

                elapsed = time.time() - drowsy_trigger_time
                remaining = int(alarm_delay - elapsed)

                if remaining > 0:
                    cv2.putText(frame, f"Alarm in {remaining}s (Press S to stop)", (30, 200),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
                else:
                    if not alarm_started:
                        start_alarm(sound_path)
                        alarm_started = True
            else:
                cv2.putText(frame, "AWAKE", (30, 140),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)

    # -------------------- PERSON MISSING LOGIC --------------------
    if not face_detected:
        missing_frames += 1
        closed_frames = 0
        drowsy_trigger_time = None

        cv2.putText(frame, "NO PERSON DETECTED!", (30, 140),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)

        if missing_frames >= MISSING_FRAMES_LIMIT:
            if missing_trigger_time is None:
                missing_trigger_time = time.time()

            elapsed = time.time() - missing_trigger_time
            remaining = int(alarm_delay - elapsed)

            if remaining > 0:
                cv2.putText(frame, f"Alarm in {remaining}s (Press S to stop)", (30, 200),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
            else:
                if not alarm_started:
                    start_alarm(sound_path)
                    alarm_started = True

    # Stop alarm only if it was started due to missing person
    if face_detected and alarm_started and missing_trigger_time is not None:
        stop_alarm()
        alarm_started = False
        missing_trigger_time = None

    # Press S cancels everything
    if key == ord("s"):
        closed_frames = 0
        missing_frames = 0
        drowsy_trigger_time = None
        missing_trigger_time = None
        stop_alarm()
        alarm_started = False

    cv2.imshow("Deep Learning Drowsiness Detection", frame)

    if key == ord("q"):
        stop_alarm()
        break

cap.release()
cv2.destroyAllWindows()