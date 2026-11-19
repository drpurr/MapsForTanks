// Fails the build if any editor code or endpoint leaked into dist/.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST = new URL('../dist/', import.meta.url).pathname
const FORBIDDEN = ['__editor', 'DEV EDITOR', 'uploadBase', 'tankmaps-editor', 'saveRoute']
const files = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? files(join(d, f)) : [join(d, f)]))
const hits = files(DIST).filter((f) => /\.(js|html|css)$/.test(f))
  .flatMap((f) => FORBIDDEN.filter((s) => readFileSync(f, 'utf8').includes(s)).map((s) => `${f}: ${s}`))
if (hits.length) { console.error('Editor code found in production build:\n' + hits.join('\n')); process.exit(1) }
console.log('ok: no editor code in dist/')
