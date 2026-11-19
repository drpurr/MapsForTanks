# Tank Maps

Tank routes for WoW Forever dungeons and raids, drawn over the game's own world-map art.
Routes are adapted from the 2011–12 [MapsForTanks](https://mapsfortanks.wordpress.com/) images in `maps-src/`.

## Layout
| Path | What |
| --- | --- |
| `maps-src/` | Original MapsForTanks images (`Zone/Dungeon/NN_name.jpg`) + `INDEX.md` |
| `data/instances.json` | Every Forever dungeon/raid: map id, zone, floors, matching `maps-src` folders |
| `data/maps/<slug>/<n>.webp` | Clean floor art dumped from the Forever client (`.png` copies are gitignored) |
| `data/registration.json` | Homography from each tank image to its clean floor |
| `data/extract/<slug>/` | CV output per image + `*.labels.json` (vision-pass transcriptions; hand-maintained) |
| `data/routes/<slug>.json` | Final routes (schema: `tools/schema/route.schema.json`) |
| `web/` | Vite + React viewer and the dev-only route editor |

## Pipeline
```sh
node tools/dump_forever_maps.mjs              # 1. dump floor art from the local Forever install (~20 s)
cd tools
uv run python register.py                     # 2. align tank images to clean floors (debug: tools/out/register)
uv run python extract_routes.py               # 3. CV: paths, arrows, boundaries, text boxes (debug: tools/out/extract)
uv run python vision_sheets.py                # 4. sheets for reading numbers/labels -> data/extract/*/*.labels.json
uv run python build_routes.py                 # 5. merge + validate -> data/routes (never overwrites reviewed routes)
```
Instance ↔ art ↔ source mapping lives in `tools/aliases.json` (`_skip` excludes map ids).

## Web
```sh
cd web
npm run dev      # viewer + editor at /#/edit/<slug> (editor and its save/upload endpoints exist only here)
npm run build    # static site in web/dist; fails if any editor code leaks into the bundle
```
The editor saves to `data/routes/<slug>.json` (Ctrl+S; it also autosaves when you switch section or floor, and asks to save/discard before you leave with unsaved changes). To delete a single point, select a path, click the point, then press Delete (or Alt+click / double-click it). Tick **Reviewed** once a route is checked so `build_routes.py` won't overwrite it.
For instances with no Forever map art, upload a custom base image in the editor's Section panel.
