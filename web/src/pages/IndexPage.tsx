import { useEffect, useMemo, useRef, useState } from 'react'
import { MapCredit } from '../components/MapCredit'
import { MapView } from '../components/MapView'
import { RouteOverlay } from '../components/RouteOverlay'
import { loadRoute, routeSummary, sectionBase } from '../data'
import crest from '../assets/crest.webp'
import type { Instance, Route } from '../types'

type Filter = 'all' | 'routes' | 'raid'
const FILTERS: [Filter, string][] = [['all', 'Everything'], ['routes', 'Has a route'], ['raid', 'Raids']]
const FOREVER = 'Only in WoW Forever'

/** Small hand-drawn arrow, the same ink as the routes: marks instances that have one. */
function RouteGlyph() {
  return (
    <svg className="route-glyph" viewBox="0 0 28 14" aria-hidden="true">
      <path d="M2 10c5-7 10 2 16-4" />
      <path d="M15 3.5l4 2.3-2.6 3.6" />
    </svg>
  )
}

export function IndexPage({ instances, routed }: { instances: Instance[]; routed: Set<string> }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<string | null>(null)
  const cache = useRef(new Map<string, Route | null>())
  useEffect(() => { document.title = 'Tank Maps – WoW Forever dungeon and raid routes' }, [])
  const [route, setRoute] = useState<Route | null>(null)

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = instances.filter((i) =>
      (filter === 'all' || (filter === 'routes' ? routed.has(i.slug) : i.type === 'raid')) &&
      (!q || i.name.toLowerCase().includes(q) || (i.zone ?? '').toLowerCase().includes(q)))
    const by = new Map<string, Instance[]>()
    for (const i of list) by.set(i.zone ?? FOREVER, [...(by.get(i.zone ?? FOREVER) ?? []), i])
    return [...by].sort(([a], [b]) => (a === FOREVER ? 1 : b === FOREVER ? -1 : a.localeCompare(b)))
  }, [instances, routed, filter, query])

  // Preview the first instance with a route until the reader points at something.
  const shown = instances.find((i) => i.slug === active) ?? instances.find((i) => routed.has(i.slug)) ?? instances[0]
  useEffect(() => {
    if (!shown) return
    const hit = cache.current.get(shown.slug)
    if (hit !== undefined) { setRoute(hit); return }
    let live = true
    const load = routed.has(shown.slug) ? loadRoute(shown.slug) : Promise.resolve(null)
    load.then((r) => { cache.current.set(shown.slug, r); if (live) setRoute(r) })
    return () => { live = false }
  }, [shown, routed])

  const sec = shown && route && route.instance === shown.slug ? route.sections[0] : undefined
  const base = shown ? (sec ? sectionBase(shown, sec) : sectionBase(shown, { floor: 1 })) : null

  return (
    <div className="book">
      <header className="masthead">
        <h1 className="wordmark"><img src={crest} alt="Tank Maps" width={135} height={180} /></h1>
        <p className="lede">Pull routes for every WoW Forever dungeon and raid, drawn on the in-game maps.</p>
        <div className="controls">
          <label className="search">
            <span className="visually-hidden">Find a dungeon or zone</span>
            <input type="search" placeholder="Find a dungeon or zone" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className="segmented" role="radiogroup" aria-label="Show">
            {FILTERS.map(([f, label]) => (
              <button key={f} role="radio" aria-checked={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{label}</button>
            ))}
          </div>
        </div>
      </header>

      <div className="book-body">
        <nav className="contents" aria-label="Dungeons and raids">
          {groups.length === 0 && <p className="nothing">Nothing matches “{query}”. Try a zone name, like Feralas.</p>}
          {groups.map(([zone, list]) => (
            <section key={zone} className="zone">
              <h2>{zone}</h2>
              <ul>
                {list.map((i) => (
                  <li key={i.slug} className={`${routed.has(i.slug) ? 'has-route' : ''}${shown?.slug === i.slug ? ' current' : ''}`}>
                    <a href={`#/i/${i.slug}`} onPointerEnter={() => setActive(i.slug)} onFocus={() => setActive(i.slug)}>
                      <span className="name">{i.name}</span>
                      {i.type === 'raid' && <span className="kind">raid</span>}
                      {routed.has(i.slug) ? <RouteGlyph /> : i.floors.length === 0 && <span className="kind">no map</span>}
                      {routed.has(i.slug) && <span className="visually-hidden">(has a route)</span>}
                    </a>
                    {import.meta.env.DEV && <a className="edit-link" href={`#/edit/${i.slug}`}>edit</a>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>

        {shown && (
          <aside className="preview" aria-live="polite">
            {base ? (
              <MapView key={shown.slug} base={base.src} size={base.size}>
                {(size) => sec && <RouteOverlay key={sec.id} section={sec} size={size} draw />}
              </MapView>
            ) : (
              <div className="nomap">
                <p>The Forever client ships no map for {shown.name} yet.</p>
              </div>
            )}
            <div className="caption">
              <h2>{shown.name}</h2>
              <p>
                {shown.type === 'raid' ? 'Raid' : 'Dungeon'}{shown.zone ? ` in ${shown.zone}` : ''}.{' '}
                {sec && route ? `${routeSummary(route.sections)}.` : shown.floors.length ? 'No route drawn yet.' : ''}
              </p>
              {(() => {
                const credit = shown.floors.find((f) => f.floor === (sec?.floor ?? shown.floors[0]?.floor))?.credit
                return credit && <MapCredit credit={credit} className="preview-credit" />
              })()}
              <a className="open" href={`#/i/${shown.slug}`}>{sec ? 'Open route' : shown.floors.length ? 'View maps' : 'View details'}</a>
            </div>
          </aside>
        )}
      </div>

      <footer className="colophon">
        Routes adapted from the <a href="https://mapsfortanks.wordpress.com/">MapsForTanks</a> guides. Map art belongs to Blizzard Entertainment.
      </footer>
    </div>
  )
}
