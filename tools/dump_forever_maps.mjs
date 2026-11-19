// Dump world-map art for every WoW Forever dungeon/raid (Map.db2 InstanceType 1|2).
// Reads the local install through hated-wow-mcp's exporter (the same code path as
// the wow_texture_export MCP tool), stitches the 4x3 BLP tiles per floor and writes
// data/maps/<slug>/<floor>.{png,webp} plus data/instances.json, data/missing.json
// and data/unmatched-art.json.
//
// usage: node tools/dump_forever_maps.mjs [--only <slug|mapId>]
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { homedir, tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const TILE = 256, COLS = 4, ROWS = 3;
const CROP = { width: 1002, height: 668 }; // visible area of the classic world-map frame
process.env.WOW_INSTALL_PATH ??= "/run/media/nbatroff/Games/Battle.net/World of Warcraft";

function findPackage() {
  if (process.env.HATED_WOW_MCP) return process.env.HATED_WOW_MCP;
  const npx = join(homedir(), ".npm/_npx");
  for (const d of readdirSync(npx)) {
    const p = join(npx, d, "node_modules/hated-wow-mcp/dist/wowexport/index.js");
    if (existsSync(p)) return p;
  }
  throw new Error("hated-wow-mcp not found; run `npx -y hated-wow-mcp --help` once or set HATED_WOW_MCP");
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/^the/, "");
const slugify = (s) => s.toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Group listfile world-map tiles into { key -> {dir, floor, tiles: Map(idx -> fdid)} }. */
function parseListfile(csvPath) {
  const groups = new Map();
  const add = (dir, floor, idx, fdid) => {
    const key = `${dir}#${floor}`;
    if (!groups.has(key)) groups.set(key, { dir, floor, tiles: new Map() });
    groups.get(key).tiles.set(idx, fdid);
  };
  for (const line of readFileSync(csvPath, "utf8").split("\n")) {
    const semi = line.indexOf(";");
    const fdid = Number(line.slice(0, semi));
    const path = line.slice(semi + 1).trim().toLowerCase();
    if (!path.startsWith("interface/worldmap/") || !path.endsWith(".blp")) continue;
    const rest = path.slice(19, -4);
    let m;
    if ((m = rest.match(/^([a-z0-9']+)\/([a-z0-9']+?)(\d+)_(\d+)$/)) && m[2] === m[1].replace(/\d+$/, "")) {
      add(m[1], Number(m[3]), Number(m[4]), fdid);          // dir/dir<floor>_<tile>
    } else if ((m = rest.match(/^([a-z0-9']+)\/([a-z']+)(\d+)$/)) && m[2] === m[1]) {
      add(m[1], 1, Number(m[3]), fdid);                    // dir/dir<tile> (single floor)
    } else if ((m = rest.match(/^([a-z']+)(\d+)_(\d{6,})$/))) {
      add(m[1], 1, Number(m[2]), fdid);                    // <name><tile>_<fdid> (new, flat)
    }
  }
  for (const [k, g] of groups) if (g.tiles.size !== COLS * ROWS) groups.delete(k);
  return groups;
}

async function stitch(driver, tiles, tmp, outBase) {
  const parts = [];
  for (let i = 1; i <= COLS * ROWS; i++) {
    const png = await driver.exportTexture(tiles.get(i), tmp);
    parts.push({ input: png, left: ((i - 1) % COLS) * TILE, top: Math.floor((i - 1) / COLS) * TILE });
  }
  const full = await sharp({ create: { width: TILE * COLS, height: TILE * ROWS, channels: 4, background: "#000" } })
    .composite(parts).png().toBuffer();
  const img = sharp(full).extract({ left: 0, top: 0, ...CROP });
  await img.clone().png().toFile(`${outBase}.png`);
  await img.clone().webp({ quality: 88 }).toFile(`${outBase}.webp`);
}

async function main() {
  const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
  const pkg = findPackage();
  const { openDriver, listfileCsv } = await import(pkg);
  const driver = await openDriver("forever");
  const casc = driver.getCasc();
  const db2 = createRequire(pkg)("./lib/casc/db2.js");
  const aliases = JSON.parse(readFileSync(join(ROOT, "tools/aliases.json"), "utf8"));
  const skip = new Set(aliases._skip ?? []);

  // Art present in this client, by directory.
  const art = new Map();
  for (const g of parseListfile(listfileCsv()).values()) {
    if (![...g.tiles.values()].every((id) => casc.fileExists(id))) continue;
    if (!art.has(g.dir)) art.set(g.dir, []);
    art.get(g.dir).push(g);
  }
  for (const floors of art.values()) floors.sort((a, b) => a.floor - b.floor);
  console.log(`world-map art dirs present in Forever: ${art.size}`);

  const rows = [...(await db2.Map.getAllRows())]
    .filter(([id, r]) => (r.InstanceType === 1 || r.InstanceType === 2) && !skip.has(id));
  const names = rows.map(([, r]) => r.MapName_lang);
  const used = new Set(), instances = [], missing = [];
  for (const [id, r] of rows) {
    const a = aliases[String(id)] ?? {};
    const candidates = a.art ?? [...art.keys()].filter((d) => [norm(r.MapName_lang), norm(r.Directory)].includes(norm(d)));
    const dir = candidates.find((d) => art.has(d));
    const dup = names.filter((n) => n === r.MapName_lang).length > 1;
    const slug = slugify(r.MapName_lang) + (dup ? `-${id}` : "");
    const inst = {
      slug, mapId: id, name: r.MapName_lang, directory: r.Directory,
      type: r.InstanceType === 2 ? "raid" : "dungeon", zone: a.zone ?? null,
      art: dir ?? null, sources: a.src ?? [], floors: [],
    };
    if (!dir) { missing.push({ slug, mapId: id, name: inst.name, tried: candidates }); instances.push(inst); continue; }
    used.add(dir);
    if (only && only !== slug && only !== String(id)) { instances.push(inst); continue; }
    const outDir = join(DATA, "maps", slug);
    mkdirSync(outDir, { recursive: true });
    const tmp = join(tmpdir(), `tankmaps-${process.pid}`);
    for (const [i, g] of art.get(dir).entries()) {
      const n = i + 1;
      await stitch(driver, g.tiles, tmp, join(outDir, String(n)));
      inst.floors.push({ floor: n, artFloor: g.floor, label: `Floor ${n}`, image: `maps/${slug}/${n}.webp`, ...CROP });
    }
    rmSync(tmp, { recursive: true, force: true });
    console.log(`${slug}: ${inst.floors.length} floor(s) from ${dir}`);
    instances.push(inst);
  }

  const unmatched = [...art.keys()].filter((d) => !used.has(d)).sort()
    .map((d) => ({ dir: d, floors: art.get(d).length }));
  instances.sort((x, y) => x.name.localeCompare(y.name));
  writeFileSync(join(DATA, "instances.json"), JSON.stringify({ build: "forever", instances }, null, 2) + "\n");
  writeFileSync(join(DATA, "missing.json"), JSON.stringify(missing, null, 2) + "\n");
  writeFileSync(join(DATA, "unmatched-art.json"), JSON.stringify(unmatched, null, 2) + "\n");
  console.log(`instances: ${instances.length}, with art: ${instances.length - missing.length}, missing: ${missing.length}, unmatched art dirs: ${unmatched.length}`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
