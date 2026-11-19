"""Write vision-pass labels: reads a JSON object {"<slug>/<stem>": {...labels...}} on stdin
and writes data/extract/<slug>/<stem>.labels.json for each entry."""
import json
import sys

from common import DATA

for key, labels in json.load(sys.stdin).items():
    slug, stem = key.split("/")
    path = DATA / "extract" / slug / f"{stem}.labels.json"
    path.write_text(json.dumps(labels, indent=1) + "\n")
    print("wrote", path.relative_to(DATA))
