import type { Instance, Registration, Route, Section } from './types'

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

export const loadInstances = async () =>
  (await getJson<{ instances: Instance[] }>('instances.json'))?.instances ?? []
export const loadRouteIndex = async () => (await getJson<string[]>('routes/index.json')) ?? []
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
