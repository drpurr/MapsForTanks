// Builds the web logo assets from the master crest SVG.
//   brand/tank-maps-crest.svg  (source; 3.4 MB traced artwork, not shipped)
//   -> web/src/assets/crest.webp, crest-small.webp   (UI)
//   -> web/public/favicon.png (crest gem), apple-touch-icon.png (full crest)
// usage: node tools/make_logo.mjs
import { readFileSync, mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const STONE = '#232c35'
const BG_RECT = /<path fill="#272927" d="M0 0L1024 0L1024 1024L0 1024L0 0Z"\/>/

// The artwork ships on a dark square; drop it so the crest sits on the site's own background.
const svg = readFileSync(join(ROOT, 'brand/tank-maps-crest.svg'), 'utf8')
if (!BG_RECT.test(svg)) throw new Error('background rect not found; update BG_RECT for the new artwork')
const full = await sharp(Buffer.from(svg.replace(BG_RECT, '')), { density: 144 }).png().toBuffer()

// Crop to the crest's opaque pixels.
const { data, info } = await sharp(full).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true })
let [x0, y0, x1, y1] = [info.width, info.height, 0, 0]
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  if (data[y * info.width + x] > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
}
const crest = await sharp(full).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).png().toBuffer()

const assets = join(ROOT, 'web/src/assets'), pub = join(ROOT, 'web/public')
mkdirSync(assets, { recursive: true })
// Displayed at ~180px and ~44px tall; rendered at 2x for sharp high-DPI screens.
await sharp(crest).resize({ height: 360 }).webp({ quality: 90, alphaQuality: 100 }).toFile(join(assets, 'crest.webp'))
await sharp(crest).resize({ height: 96 }).webp({ quality: 90, alphaQuality: 100 }).toFile(join(assets, 'crest-small.webp'))

/** Crest centred on a square canvas. */
const square = async (size, pad, background) => {
  const inner = await sharp(crest).resize({ width: size - pad * 2, height: size - pad * 2, fit: 'inside' }).toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: inner, gravity: 'centre' }]).png()
}
// Tab icon: the crest's centre hexagon gem. The full crest's lettering is unreadable at 16-32px;
// the gem is a bold shape that survives. Box is a fraction of the cropped crest (measured once).
const GEM = { x: 0.4019, y: 0.5234, w: 0.1945, h: 0.1685 }
const cw = x1 - x0 + 1, ch = y1 - y0 + 1, m = 6
const gem = await sharp(crest).extract({
  left: Math.round(GEM.x * cw) - m, top: Math.round(GEM.y * ch) - m,
  width: Math.round(GEM.w * cw) + 2 * m, height: Math.round(GEM.h * ch) + 2 * m,
}).png().toBuffer()
const gemIcon = await sharp(gem).resize({ width: 60, height: 60, fit: 'inside' }).toBuffer()
await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: gemIcon, gravity: 'centre' }]).png().toFile(join(pub, 'favicon.png'))
await (await square(180, 18, STONE)).toFile(join(pub, 'apple-touch-icon.png'))
console.log('crest', `${x1 - x0 + 1}x${y1 - y0 + 1}`, '-> web/src/assets/crest*.webp, web/public/favicon.png, apple-touch-icon.png')
