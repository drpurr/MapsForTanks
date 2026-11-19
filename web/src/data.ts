import type { Instance, Marker, Registration, Route, Section } from './types'

const BASE = import.meta.env.BASE_URL

export const dataUrl = (rel: string) => `${BASE}data/${rel}`
/** sourceImage paths are repo-relative ("maps-src/Zone/Dungeon/01.jpg"). */
export const repoUrl = (rel: string) => BASE + rel.split('/').map(encodeURIComponent).join('/')

async function getJson<T>(rel: string): Promise<T | null> {
  try {
    const res = await fetch(dataUrl(rel), { cache: 'no-store' })
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/** Written guide for a dungeon (data/guides/<slug>.md), or null when there isn't one. */
export async function loadGuide(slug: string): Promise<string | null> {
  try {
    const res = await fetch(dataUrl(`guides/${slug}.md`), { cache: 'no-store' })
    // a host's SPA fallback answers missing files with index.html
    if (!res.ok || res.headers.get('content-type')?.includes('html')) return null
    const text = await res.text()
    return text.trim() ? text : null
  } catch {
    return null
  }
}

export const loadInstances = async () =>
  (await getJson<{ instances: Instance[] }>('instances.json'))?.instances ?? []
export const loadRouteIndex = async () => (await getJson<string[]>('routes/index.json')) ?? []
/** slug -> run video URL, for dungeons that have one. */
export const loadRouteVideos = async () => (await getJson<Record<string, string>>('routes/videos.json')) ?? {}
export const loadRoute = (slug: string) => getJson<Route>(`routes/${slug}.json`)
export const loadRegistration = async () =>
  (await getJson<Record<string, Registration>>('registration.json')) ?? {}

export const DEFAULT_SIZE: [number, number] = [1002, 668]

/** Base image + pixel size for a section (game floor art, or a custom upload). */
export function sectionBase(inst: Instance, sec: Pick<Section, 'floor' | 'baseImage'>) {
  if (sec.baseImage) return { src: dataUrl(sec.baseImage), size: DEFAULT_SIZE }
  const f = inst.floors.find((x) => x.floor === sec.floor)
  return f ? { src: dataUrl(f.image), size: [f.width, f.height] as [number, number] } : null
}

/** "8 bosses on 2 maps" style summary for a route. */
export function routeSummary(sections: Section[]) {
  const bosses = sections.flatMap((s) => s.markers).filter((m) => m.type === 'boss' && !m.optional).length
  const maps = new Set(sections.map((s) => s.floor)).size
  const b = bosses === 1 ? '1 boss' : `${bosses} bosses`
  return maps > 1 ? `${b} across ${maps} maps` : `${b} on one map`
}

/**
 * Normalized box around everything drawn in a section (paths and markers, including how far
 * their labels extend), padded so nothing touches the frame edge. Null when nothing is drawn.
 */
export function routeBounds(sec: Section, [w, h]: [number, number], padPx = 28) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  const add = (x: number, y: number, rx = 0, ry = 0) => {
    x0 = Math.min(x0, x - rx); x1 = Math.max(x1, x + rx); y0 = Math.min(y0, y - ry); y1 = Math.max(y1, y + ry)
  }
  for (const p of [...sec.path, ...sec.boundaries]) for (const [x, y] of p.points) add(x * w, y * h)
  for (const m of sec.markers) {
    const [x, y] = [m.pos[0] * w, m.pos[1] * h]
    if (m.type === 'boss') add(x, y, 15, 15)
    else if (m.type === 'los') add(x, y, 22, 13)
    else if (m.type === 'entrance') add(x, y, 32, 15)
    else add(x, y, ((m.text ?? 'To next area').length * 8 + 12) / 2, 15)
  }
  if (!isFinite(x0)) return null
  return {
    x0: Math.max(0, (x0 - padPx) / w), y0: Math.max(0, (y0 - padPx) / h),
    x1: Math.min(1, (x1 + padPx) / w), y1: Math.min(1, (y1 + padPx) / h),
  }
}

const IGNORE = new Set(['to', 'from', 'and', 'the', 'of', 'lord', 'lfd', 'end'])
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !IGNORE.has(w))
const same = (a: string, b: string) => a.slice(0, 5) === b.slice(0, 5)

/**
 * Which section a transition label leads to: its explicit `toSection`, otherwise the section whose
 * title shares the most words with the label ("To Dining Hall" -> "Dining Hall"). Ties go to the
 * nearest section in the label's direction ("From …" looks back, everything else looks forward).
 * Returns the section index, or -1 when nothing matches.
 */
export function transitionTarget(m: Marker, sections: Section[], current: number): number {
  if (m.type !== 'transition') return -1
  if (m.toSection) return sections.findIndex((s) => s.id === m.toSection)
  const text = m.text ?? ''
  const want = words(text)
  const back = /^\s*from\b/i.test(text)
  let best = -1, bestScore = 0, bestDist = Infinity
  sections.forEach((s, j) => {
    if (j === current) return
    const title = words(s.title)
    const score = want.filter((w) => title.some((t) => same(w, t))).length
    const dist = back ? (j < current ? current - j : 100 + j) : (j > current ? j - current : 100 + current - j)
    if (score > bestScore || (score === bestScore && score > 0 && dist < bestDist)) { best = j; bestScore = score; bestDist = dist }
  })
  return best
}
