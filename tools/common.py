"""Shared paths and helpers for the route-extraction tools."""
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SRC = ROOT / "maps-src"
OUT = ROOT / "tools" / "out"
IMG_EXT = {".jpg", ".jpeg", ".png"}

# HSV ranges (OpenCV: H 0-179) for the hand-drawn annotation colors.
# Parchment is low-saturation yellow-brown, so all ranges require high saturation.
COLORS = {
    "green": [((38, 70, 110), (76, 255, 255))],
    "red": [((0, 110, 120), (12, 255, 255)), ((165, 90, 120), (179, 255, 255))],
    "blue": [((80, 80, 130), (115, 255, 255))],
    "yellow": [((24, 140, 160), (33, 255, 255))],
}


def load_instances():
    return json.loads((DATA / "instances.json").read_text())["instances"]


def source_images(inst):
    for folder in inst["sources"]:
        for p in sorted((SRC / folder).iterdir()):
            if p.suffix.lower() in IMG_EXT:
                yield p


def floor_png(inst, floor):
    return DATA / "maps" / inst["slug"] / f"{floor['floor']}.png"


def color_mask(bgr, name):
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    m = np.zeros(bgr.shape[:2], np.uint8)
    for lo, hi in COLORS[name]:
        m |= cv2.inRange(hsv, np.array(lo), np.array(hi))
    return m


def annotation_mask(bgr):
    m = np.zeros(bgr.shape[:2], np.uint8)
    for name in COLORS:
        m |= color_mask(bgr, name)
    return cv2.dilate(m, np.ones((7, 7), np.uint8))


def rel(p: Path) -> str:
    return str(p.relative_to(ROOT))
