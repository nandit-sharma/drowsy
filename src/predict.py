import cv2
import numpy as np
from tensorflow.keras.models import load_model

model = load_model("model/eye_model.h5")
IMG_SIZE = 64

def predict_eye_state(eye_img):
    gray = cv2.cvtColor(eye_img, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, (IMG_SIZE, IMG_SIZE))
    normalized = resized / 255.0
    reshaped = normalized.reshape(1, IMG_SIZE, IMG_SIZE, 1)

    prediction = model.predict(reshaped, verbose=0)[0]

    # prediction[0] = OPEN probability
    # prediction[1] = CLOSED probability
    open_prob = prediction[0]
    close_prob = prediction[1]

    return open_prob, close_prob