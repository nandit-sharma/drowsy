import cv2
import os
from datetime import datetime

class Recorder:
    def __init__(self):
        self.recording = False
        self.writer = None
        self.filename = None
        self.start_time = None

    def start(self, frame_width, frame_height, fps=20):
        os.makedirs("recordings", exist_ok=True)

        self.start_time = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        self.filename = f"recordings/alarm_{self.start_time}.avi"

        fourcc = cv2.VideoWriter_fourcc(*"XVID")
        self.writer = cv2.VideoWriter(self.filename, fourcc, fps, (frame_width, frame_height))

        self.recording = True
        return self.filename, self.start_time

    def write(self, frame):
        if self.recording and self.writer:
            self.writer.write(frame)

    def stop(self):
        if self.writer:
            self.writer.release()

        self.recording = False
        end_time = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

        return self.filename, self.start_time, end_time