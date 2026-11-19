"""Vision-pass helper: render each tank image warped into floor space with the
blue/yellow text boxes from extract_routes.py outlined and labelled by id.
A reviewer (Claude vision, or a human) reads each sheet and writes
data/extract/<slug>/<stem>.labels.json:
  {"b0": {"kind": "boss", "order": 1}, "y2": {"kind": "label", "text": "To Wall Walk"},
   "y5": {"kind": "ignore"}, "_entrance": [x, y]}   # optional, normalized
usage: uv run vision_sheets.py [slug ...]
"""
import json
import sys

import cv2
import numpy as np

from common import DATA, OUT, ROOT

COL = {"blue": (255, 120, 0), "yellow": (0, 200, 255)}


def main(only):
    reg = json.loads((DATA / "registration.json").read_text())
    (OUT / "vision").mkdir(parents=True, exist_ok=True)
    for img_rel, r in reg.items():
        if not r.get("ok") or (only and r["instance"] not in only):
            continue
        stem = (ROOT / img_rel).stem
        ex = json.loads((DATA / "extract" / r["instance"] / f"{stem}.json").read_text())
        W, H = r["floorSize"]
        img = cv2.warpPerspective(cv2.imread(str(ROOT / img_rel)), np.array(r["H"]), (W, H))
        for c, boxes in ex["boxes"].items():
            for b in boxes:
                x, y, w, h = (int(v * s) for v, s in zip(b["bbox"], (W, H, W, H)))
                cv2.rectangle(img, (x, y), (x + w, y + h), (255, 0, 255), 2)
                cv2.putText(img, b["id"], (x, max(12, y - 3)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 3)
                cv2.putText(img, b["id"], (x, max(12, y - 3)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 255), 1)
        cv2.imwrite(str(OUT / "vision" / f"{r['instance']}__{stem}.jpg"), img, [cv2.IMWRITE_JPEG_QUALITY, 88])
        print(r["instance"], stem, {c: len(b) for c, b in ex["boxes"].items()})


if __name__ == "__main__":
    main(set(sys.argv[1:]))
