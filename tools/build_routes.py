"""Merge CV geometry (data/extract/<slug>/<stem>.json) and vision labels
(<stem>.labels.json) into data/routes/<slug>.json, one section per source image,
then validate every route file against tools/schema/route.schema.json.
Route files already marked "reviewed": true are never overwritten.

usage: uv run build_routes.py [slug ...]
"""
import json
import re
import sys

from jsonschema import Draft202012Validator

from common import DATA, ROOT, SRC, load_instances, source_images

SCHEMA = json.loads((ROOT / "tools/schema/route.schema.json").read_text())


def source_urls():
    """maps-src folder name -> mapsfortanks post URL, from INDEX.md (titles use ': ' where folders use ' - ')."""
    urls = {}
    for title, url in re.findall(r"^- \[(.+?)\]\((\S+?)\)", (SRC / "INDEX.md").read_text(), re.M):
        urls[title.replace(": ", " - ")] = url
    return urls


def center(bbox):
    x, y, w, h = bbox
    return [round(x + w / 2, 4), round(y + h / 2, 4)]


def near_entrance(points, ent, radius=0.05, max_len=0.06):
    xs, ys = [p[0] for p in points], [p[1] for p in points]
    short = max(max(xs) - min(xs), max(ys) - min(ys)) < max_len
    return short and all(abs(x - ent[0]) < radius and abs(y - ent[1]) < radius * 1.5 for x, y in points)


def section(ex, labels, sid, url):
    boxes = {b["id"]: b for c in ex["boxes"].values() for b in c}
    markers = []
    for key, lab in labels.items():
        if key.startswith("_") or lab["kind"] == "ignore":
            continue
        pos = lab.get("pos") or center(boxes[key]["bbox"])
        m = {"id": f"m-{key}", "type": {"label": "note"}.get(lab["kind"], lab["kind"]), "pos": pos}
        for k in ("order", "optional", "text"):
            if k in lab:
                m[k] = lab[k]
        markers.append(m)
    for i, lab in enumerate(labels.get("_extra", [])):
        m = {"id": f"m-x{i}", "type": lab["kind"], "pos": lab["pos"]}
        m.update({k: lab[k] for k in ("order", "optional", "text") if k in lab})
        markers.append(m)
    if "_entrance" in labels:
        markers.append({"id": "m-entrance", "type": "entrance", "pos": labels["_entrance"]})
    markers.sort(key=lambda m: (m["type"] != "entrance", m["type"] != "boss", m.get("order", 99)))
    if "_entrance" in labels:   # the hand-drawn green "!" is picked up as a tiny path; drop it
        ex["paths"] = [p for p in ex["paths"] if not near_entrance(p["points"], labels["_entrance"])]
    sec = {
        "id": sid, "title": labels.get("_title", f"Floor {ex['floor']}"), "floor": ex["floor"], "sourceImage": ex["image"],
        "path": [{"id": f"p{i}", "points": p["points"], "arrow": p["arrow"]} for i, p in enumerate(ex["paths"])],
        "boundaries": [{"id": f"r{i}", "points": b} for i, b in enumerate(ex["boundaries"])],
        "markers": markers,
    }
    if url:
        sec["sourceUrl"] = url
    if "_note" in labels:
        sec["notes"] = labels["_note"]
    return sec


def main(only):
    urls, validator = source_urls(), Draft202012Validator(SCHEMA)
    out_dir = DATA / "routes"
    out_dir.mkdir(exist_ok=True)
    for inst in load_instances():
        if not inst["sources"] or (only and inst["slug"] not in only):
            continue
        out = out_dir / f"{inst['slug']}.json"
        if out.exists() and json.loads(out.read_text()).get("reviewed"):
            print(f"skip {inst['slug']} (reviewed)")
            continue
        sections = []
        for img in source_images(inst):
            ex_path = DATA / "extract" / inst["slug"] / f"{img.stem}.json"
            lab_path = ex_path.with_suffix(".labels.json")
            if not ex_path.exists():
                print(f"  missing extract for {img.name}")
                continue
            labels = json.loads(lab_path.read_text()) if lab_path.exists() else {}
            sid = re.sub(r"[^a-z0-9_-]+", "-", img.stem.lower())
            sections.append(section(json.loads(ex_path.read_text()), labels, sid, urls.get(img.parent.name)))
        route = {"instance": inst["slug"], "mapId": inst["mapId"], "source": "mapsfortanks", "reviewed": False,
                 "sections": sections}
        errors = list(validator.iter_errors(route))
        if errors:
            print(f"INVALID {inst['slug']}: {errors[0].json_path}: {errors[0].message}")
            continue
        out.write_text(json.dumps(route, indent=1) + "\n")
        n = lambda k: sum(len(s[k]) for s in sections)
        print(f"{inst['slug']:<20} sections {len(sections)} paths {n('path'):>3} bounds {n('boundaries'):>3} markers {n('markers'):>3}")


if __name__ == "__main__":
    main(set(sys.argv[1:]))
