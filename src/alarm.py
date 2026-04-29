import pygame

pygame.mixer.init()

def start_alarm(sound_path):
    pygame.mixer.music.load(sound_path)
    pygame.mixer.music.play(-1)   # loop forever

def stop_alarm():
    pygame.mixer.music.stop()