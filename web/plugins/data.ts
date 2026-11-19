// Serves the repo's data/ and maps-src/ folders to the app.
// dev: middleware under /data/* and /maps-src/*; build: copies the public subset into outDir.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin, ResolvedConfig } from 'vite'

export const REPO = fileURLToPath(new URL('../..', import.meta.url))
const DATA = path.join(REPO, 'data')
const SRC = path.join(REPO, 'maps-src')

const TYPES: Record<string, string> = {
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
}

/** Files under data/ the site may read. Raw PNGs and CV intermediates stay private. */
const PUBLIC_DATA = /^(instances\.json|registration\.json|routes\/[a-z0-9-]+\.json|maps\/[a-z0-9-]+\/\d+\.webp|custom\/[a-z0-9-]+\/[\w.-]+\.(webp|png|jpe?g))$/

export function routeIndex(): string[] {
  const dir = path.join(DATA, 'routes')
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort() : []
}

function walk(dir: string, base = ''): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name), `${base}${e.name}/`) : [`${base}${e.name}`])
}

function resolveRequest(url: string): string | null {
  const p = decodeURIComponent(url.split('?')[0])
  if (p.startsWith('/data/')) {
    const rel = p.slice(6)
    return PUBLIC_DATA.test(rel) ? path.join(DATA, rel) : null
  }
  if (p.startsWith('/maps-src/')) {
    const file = path.resolve(SRC, p.slice(10))
    return file.startsWith(SRC + path.sep) && TYPES[path.extname(file).toLowerCase()] ? file : null
  }
  return null
}

export function dataPlugin(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'tankmaps-data',
    configResolved(c) { config = c },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] === '/data/routes/index.json') {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify(routeIndex()))
          return
        }
        const file = req.url ? resolveRequest(req.url) : null
        if (!file || !fs.existsSync(file)) {
          // Never let /data/* fall through to Vite's SPA fallback (index.html with 200).
          if (req.url?.startsWith('/data/')) { res.statusCode = 404; res.end('not found'); return }
          return next()
        }
        res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-store')
        fs.createReadStream(file).pipe(res)
      })
    },
    closeBundle() {
      if (config.command !== 'build') return
      const out = path.resolve(config.root, config.build.outDir)
      const copy = (from: string, to: string) => {
        fs.mkdirSync(path.dirname(to), { recursive: true })
        fs.copyFileSync(from, to)
      }
      for (const rel of walk(DATA)) if (PUBLIC_DATA.test(rel)) copy(path.join(DATA, rel), path.join(out, 'data', rel))
      fs.writeFileSync(path.join(out, 'data/routes/index.json'), JSON.stringify(routeIndex()))
      for (const rel of walk(SRC)) if (TYPES[path.extname(rel).toLowerCase()] && !rel.endsWith('.json'))
        copy(path.join(SRC, rel), path.join(out, 'maps-src', rel))
    },
  }
}
