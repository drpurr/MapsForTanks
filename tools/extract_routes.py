"""CV pass: pull annotation geometry out of each registered tank image.

The tank image is warped into its clean floor's pixel space; a pixel counts as
annotation only if it has an annotation color AND differs from the clean art.
  green  -> skeleton -> polylines, arrowheads detected from short barbs at a tip
  red    -> boundary segments (long axis of each stroke)
  blue / yellow -> text boxes for the vision pass (numbers / labels)
Coordinates are normalized to the floor image (0..1).
Writes data/extract/<slug>/<image-stem>.json and tools/out/extract/<slug>__<stem>.png.

usage: uv run extract_routes.py [slug ...]
"""
import json
import sys
from collections import deque

import cv2
import numpy as np
from skimage.morphology import skeletonize

from common import DATA, OUT, ROOT, color_mask

SPUR = 14          # px: skeleton branches shorter than this ending at a junction are arrow barbs/noise
MIN_PATH = 18      # px: shortest kept path segment
DIFF = 28          # Lab distance from the clean art to count as drawn-on
N8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def drawn_mask(warped, clean, valid, name):
    diff = np.linalg.norm(cv2.cvtColor(warped, cv2.COLOR_BGR2LAB).astype(np.int16)
                          - cv2.cvtColor(clean, cv2.COLOR_BGR2LAB).astype(np.int16), axis=2)
    m = color_mask(warped, name) & (diff > DIFF).astype(np.uint8) * 255 & valid
    if name in ("blue", "yellow"):   # text strokes are thick; drops 1px edge slivers of printed map text
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    k = 5 if name == "red" else 3
    return cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((k, k), np.uint8))


def neighbors(sk, y, x):
    h, w = sk.shape
    return [(y + dy, x + dx) for dy, dx in N8 if 0 <= y + dy < h and 0 <= x + dx < w and sk[y + dy, x + dx]]


def trace(sk, start, first):
    """Walk from start through `first` until a node (deg != 2). Returns pixel list."""
    path, prev, cur = [start], start, first
    while True:
        path.append(cur)
        nxt = [p for p in neighbors(sk, *cur) if p != prev and p not in path[-3:]]
        if len(neighbors(sk, *cur)) != 2 or not nxt:
            return path
        prev, cur = cur, nxt[0]


def prune_spurs(sk):
    """Remove short endpoint->junction branches; their junctions are arrow-tip candidates."""
    tips = []
    for _ in range(3):
        removed = False
        for y, x in zip(*np.nonzero(sk)):
            if not sk[y, x] or len(neighbors(sk, y, x)) != 1:
                continue
            p = trace(sk, (y, x), neighbors(sk, y, x)[0])
            end = p[-1]
            if len(p) < SPUR and len(neighbors(sk, *end)) >= 3:
                for q in p[:-1]:
                    sk[q] = False
                tips.append(end)
                removed = True
        if not removed:
            break
    return tips


def skeleton_paths(mask):
    sk = skeletonize(mask > 0)
    tips = prune_spurs(sk)
    seen, paths = set(), []
    nodes = [(y, x) for y, x in zip(*np.nonzero(sk)) if len(neighbors(sk, y, x)) != 2]
    for n in nodes:
        for nb in neighbors(sk, *n):
            if (n, nb) in seen:
                continue
            p = trace(sk, n, nb)
            seen.add((n, nb))
            if len(p) > 1:
                seen.add((p[-1], p[-2]))
            if len(p) >= MIN_PATH:
                paths.append(p)
    return paths, tips


def arrow_end(path, tips, barb_votes):
    near = lambda pt: any(abs(pt[0] - t[0]) + abs(pt[1] - t[1]) <= 4 for t in tips)
    s, e = near(path[0]), near(path[-1])
    if s and not e:
        return path[::-1], "end"
    if e and not s:
        return path, "end"
    return path, ("both" if s and e else "none")


def boxes(mask, pad=4):
    """Group strokes into word/line boxes: wide horizontal join, then merge overlaps."""
    merged = cv2.dilate(mask, np.ones((11, 23), np.uint8))
    n, _, stats, _ = cv2.connectedComponentsWithStats(merged)
    out = [[x - pad, y - pad, x + w + pad, y + h + pad] for x, y, w, h, area in stats[1:] if area >= 150]
    changed = True
    while changed:
        changed = False
        for i in range(len(out)):
            for j in range(i + 1, len(out)):
                a, b = out[i], out[j]
                if a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]:
                    out[i] = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]
                    del out[j]
                    changed = True
                    break
            if changed:
                break
    return [[max(0, x0), max(0, y0), x1 - max(0, x0), y1 - max(0, y0)] for x0, y0, x1, y1 in out]


def red_segments(mask):
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask)
    segs = []
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] < 25:
            continue
        pts = np.column_stack(np.nonzero(lab == i))[:, ::-1].astype(np.float32)
        (cx, cy), (w, h), ang = cv2.minAreaRect(pts)
        if max(w, h) < 12:
            continue
        box = cv2.boxPoints(((cx, cy), (w, h), ang))
        # endpoints = midpoints of the two SHORT edges
        if np.linalg.norm(box[0] - box[1]) < np.linalg.norm(box[1] - box[2]):
            a, b = (box[0] + box[1]) / 2, (box[2] + box[3]) / 2
        else:
            a, b = (box[1] + box[2]) / 2, (box[3] + box[0]) / 2
        segs.append([a.tolist(), b.tolist()])
    return segs


def extract(img_rel, reg):
    inst = reg["instance"]
    clean = cv2.imread(str(DATA / "maps" / inst / f"{reg['floor']}.png"))
    tank = cv2.imread(str(ROOT / img_rel))
    H, (W, Hh) = np.array(reg["H"]), reg["floorSize"]
    warped = cv2.warpPerspective(tank, H, (W, Hh))
    valid = cv2.warpPerspective(np.full(tank.shape[:2], 255, np.uint8), H, (W, Hh))
    valid = cv2.erode(valid, np.ones((9, 9), np.uint8))
    nrm = lambda x, y: [round(float(x) / W, 4), round(float(y) / Hh, 4)]

    green = drawn_mask(warped, clean, valid, "green")
    paths, tips = skeleton_paths(green)
    out_paths = []
    for p in paths:
        p, arrow = arrow_end(p, tips, None)
        pts = cv2.approxPolyDP(np.array([[x, y] for y, x in p], np.int32), 1.6, False)[:, 0]
        out_paths.append({"points": [nrm(x, y) for x, y in pts], "arrow": arrow})
    red = drawn_mask(warped, clean, valid, "red")
    result = {
        "image": img_rel, "instance": inst, "floor": reg["floor"], "floorSize": [W, Hh],
        "paths": out_paths,
        "boundaries": [[nrm(*a), nrm(*b)] for a, b in red_segments(red)],
        "boxes": {c: [{"id": f"{c[0]}{i}", "bbox": [round(v / s, 4) for v, s in zip(bx, (W, Hh, W, Hh))]}
                      for i, bx in enumerate(boxes(drawn_mask(warped, clean, valid, c)))]
                  for c in ("blue", "yellow")},
    }
    debug(clean, result, OUT / "extract" / f"{inst}__{(ROOT / img_rel).stem}.png")
    return result


def debug(clean, r, path):
    img = (clean * 0.6).astype(np.uint8)
    W, H = r["floorSize"]
    px = lambda p: (int(p[0] * W), int(p[1] * H))
    for p in r["paths"]:
        pts = [px(q) for q in p["points"]]
        cv2.polylines(img, [np.array(pts)], False, (80, 255, 80), 2)
        if p["arrow"] in ("end", "both") and len(pts) > 1:
            cv2.arrowedLine(img, pts[-2], pts[-1], (0, 255, 255), 2, tipLength=0.6)
    for a, b in r["boundaries"]:
        cv2.line(img, px(a), px(b), (60, 60, 255), 3)
    for c, col in (("blue", (255, 160, 60)), ("yellow", (60, 230, 255))):
        for bx in r["boxes"][c]:
            x, y, w, h = bx["bbox"]
            cv2.rectangle(img, px((x, y)), px((x + w, y + h)), col, 1)
    path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(path), img)


def main(only):
    reg = json.loads((DATA / "registration.json").read_text())
    for img_rel, r in reg.items():
        if not r.get("ok") or (only and r["instance"] not in only):
            continue
        res = extract(img_rel, r)
        out = DATA / "extract" / r["instance"] / f"{(ROOT / img_rel).stem}.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(res, indent=1) + "\n")
        print(f"{r['instance']:<20} {(ROOT / img_rel).name:<40} paths {len(res['paths']):>3} "
              f"arrows {sum(p['arrow'] != 'none' for p in res['paths']):>3} bounds {len(res['boundaries']):>3} "
              f"blue {len(res['boxes']['blue']):>2} yellow {len(res['boxes']['yellow']):>2}")


if __name__ == "__main__":
    main(set(sys.argv[1:]))
