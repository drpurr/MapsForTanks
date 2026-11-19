"""Register each mapsfortanks image to the clean Forever floor it was drawn on.

For every source image, SIFT features (annotation colors masked out) are matched
against every floor of the instance; the floor with the most RANSAC inliers wins.
Writes data/registration.json (homography: tank image px -> floor px) and a
50/50 debug overlay per image in tools/out/register/.

usage: uv run register.py [slug ...]
"""
import json
import sys

import cv2
import numpy as np

from common import DATA, OUT, annotation_mask, floor_png, load_instances, rel, source_images

MIN_INLIERS = 40
MIN_RATIO = 0.25
sift = cv2.SIFT_create(nfeatures=6000)
matcher = cv2.BFMatcher(cv2.NORM_L2)


def features(bgr, mask=None):
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    keep = None if mask is None else cv2.bitwise_not(mask)
    return sift.detectAndCompute(gray, keep)


def match(src_feat, dst_feat):
    (kp1, d1), (kp2, d2) = src_feat, dst_feat
    if d1 is None or d2 is None or len(kp2) < 4:
        return None
    good = [m for m, n in matcher.knnMatch(d1, d2, k=2) if m.distance < 0.75 * n.distance]
    if len(good) < 8:
        return None
    a = np.float32([kp1[m.queryIdx].pt for m in good])
    b = np.float32([kp2[m.trainIdx].pt for m in good])
    H, inl = cv2.findHomography(a, b, cv2.RANSAC, 4.0)
    if H is None:
        return None
    n = int(inl.sum())
    return {"H": H, "inliers": n, "ratio": n / len(good)}


def overlay(tank, floor, H, path):
    warped = cv2.warpPerspective(tank, H, (floor.shape[1], floor.shape[0]))
    cv2.imwrite(str(path), cv2.addWeighted(floor, 0.5, warped, 0.5, 0), [cv2.IMWRITE_JPEG_QUALITY, 85])


def main(only):
    (OUT / "register").mkdir(parents=True, exist_ok=True)
    reg_path = DATA / "registration.json"
    results = json.loads(reg_path.read_text()) if reg_path.exists() else {}
    for inst in load_instances():
        if not inst["sources"] or not inst["floors"] or (only and inst["slug"] not in only):
            continue
        floors = [(f, cv2.imread(str(floor_png(inst, f)))) for f in inst["floors"]]
        floor_feats = [features(img) for _, img in floors]
        for img_path in source_images(inst):
            tank = cv2.imread(str(img_path))
            feat = features(tank, annotation_mask(tank))
            scored = [(match(feat, ff), f, img) for ff, (f, img) in zip(floor_feats, floors)]
            scored = [s for s in scored if s[0]]
            if not scored:
                results[rel(img_path)] = {"instance": inst["slug"], "ok": False, "reason": "no match"}
                print(f"FAIL {rel(img_path)}: no match")
                continue
            best, f, img = max(scored, key=lambda s: s[0]["inliers"])
            ok = best["inliers"] >= MIN_INLIERS and best["ratio"] >= MIN_RATIO
            results[rel(img_path)] = {
                "instance": inst["slug"], "floor": f["floor"], "ok": ok,
                "inliers": best["inliers"], "ratio": round(best["ratio"], 3),
                "size": [tank.shape[1], tank.shape[0]], "floorSize": [img.shape[1], img.shape[0]],
                "H": [[round(v, 8) for v in row] for row in best["H"].tolist()],
                "method": "sift",
            }
            overlay(tank, img, best["H"], OUT / "register" / f"{inst['slug']}__{img_path.stem}.jpg")
            print(f"{'ok  ' if ok else 'FLAG'} {inst['slug']:<20} {img_path.name:<40} floor {f['floor']} "
                  f"inliers {best['inliers']:>4} ratio {best['ratio']:.2f}")
    reg_path.write_text(json.dumps(results, indent=1) + "\n")


if __name__ == "__main__":
    main(set(sys.argv[1:]))
