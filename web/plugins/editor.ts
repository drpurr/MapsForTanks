// DEV-ONLY route editor backend. `apply: 'serve'` keeps this plugin (and its
// endpoints) out of `vite build` entirely; the production site has no write path.
//   POST /__editor/save    {slug, route}           -> validates, writes data/routes/<slug>.json
//   POST /__editor/guide   {slug, text}            -> writes data/guides/<slug>.md (empty text deletes it)
//   POST /__editor/upload  ?slug=..&name=.. (body)  -> writes data/custom/<slug>/<name> (base images)
import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage } from 'node:http'
import { Ajv2020 } from 'ajv/dist/2020.js'
import type { Plugin } from 'vite'
import { REPO } from './data.ts'

const SLUG = /^[a-z0-9-]+$/
const NAME = /^[\w-]+\.(webp|png|jpe?g)$/i

function body(req: IncomingMessage, limit = 20 * 1024 * 1024): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > limit) { reject(new Error('body too large')); req.destroy() }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export function editorPlugin(): Plugin {
  const schema = JSON.parse(fs.readFileSync(path.join(REPO, 'tools/schema/route.schema.json'), 'utf8'))
  const validate = new Ajv2020({ allErrors: true }).compile(schema)
  return {
    name: 'tankmaps-editor',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://local')
        if (!url.pathname.startsWith('/__editor/') || req.method !== 'POST') return next()
        const reply = (status: number, data: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
        }
        try {
          if (url.pathname === '/__editor/save') {
            const { slug, route } = JSON.parse((await body(req)).toString('utf8'))
            if (!SLUG.test(slug) || route?.instance !== slug) return reply(400, { error: 'bad slug' })
            if (!validate(route)) return reply(422, { error: 'schema', details: validate.errors })
            const file = path.join(REPO, 'data/routes', `${slug}.json`)
            fs.mkdirSync(path.dirname(file), { recursive: true })
            fs.writeFileSync(file, JSON.stringify(route, null, 1) + '\n')
            return reply(200, { ok: true, file: path.relative(REPO, file) })
          }
          if (url.pathname === '/__editor/guide') {
            const { slug, text } = JSON.parse((await body(req, 1024 * 1024)).toString('utf8'))
            if (!SLUG.test(slug) || typeof text !== 'string') return reply(400, { error: 'bad slug or text' })
            const file = path.join(REPO, 'data/guides', `${slug}.md`)
            const rel = path.relative(REPO, file)
            if (!text.trim()) {
              fs.rmSync(file, { force: true })
              return reply(200, { ok: true, file: rel, removed: true })
            }
            fs.mkdirSync(path.dirname(file), { recursive: true })
            fs.writeFileSync(file, text.replace(/\r\n?/g, '\n').replace(/\s*$/, '\n'))
            return reply(200, { ok: true, file: rel })
          }
          if (url.pathname === '/__editor/upload') {
            const slug = url.searchParams.get('slug') ?? '', name = url.searchParams.get('name') ?? ''
            if (!SLUG.test(slug) || !NAME.test(name)) return reply(400, { error: 'bad slug or name' })
            const file = path.join(REPO, 'data/custom', slug, name.toLowerCase())
            fs.mkdirSync(path.dirname(file), { recursive: true })
            fs.writeFileSync(file, await body(req))
            return reply(200, { ok: true, path: `custom/${slug}/${name.toLowerCase()}` })
          }
          return reply(404, { error: 'unknown endpoint' })
        } catch (e) {
          return reply(500, { error: String(e) })
        }
      })
    },
  }
}
