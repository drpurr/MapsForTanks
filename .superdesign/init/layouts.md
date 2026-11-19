# Layouts

There is no shared NavBar, Sidebar, Header, or Footer component. `App` is a hash router that renders one page at a time. Each page draws its own chrome.

## App shell
- Path: `web/src/App.tsx`
- Renders: loading stone page (`.book` empty, `aria-busy`), `LoadProblem`, `InstancePage` at `#/i/:slug`, dev-only `Editor` at `#/edit/:slug`, otherwise `IndexPage`.

```tsx
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { loadInstances, loadRouteIndex } from './data'
import { LoadProblem } from './components/ErrorBoundary'
import { allowNav } from './navGuard'
import { IndexPage } from './pages/IndexPage'
import { InstancePage } from './pages/InstancePage'
import type { Instance } from './types'

// The editor only exists in `vite dev`. In production `import.meta.env.DEV` is the
// literal `false`, so this branch and the editor chunk are removed from the bundle.
const Editor = import.meta.env.DEV ? lazy(() => import('./editor/Editor')) : null

type NavState = { navIdx?: number } | null

/**
 * Hash router with a navigation guard. Every accepted history entry is stamped with an index
 * so a blocked navigation can be undone exactly: a new entry (link click, typed URL) is popped
 * with history.back(); a back/forward jump is reversed with history.go(delta). History stays
 * clean, so the browser Back button keeps working normally after a blocked attempt.
 */
function useHash() {
  const [hash, setHash] = useState(location.hash)
  const idx = useRef((history.state as NavState)?.navIdx ?? 0)
  const restoring = useRef(false)
  useEffect(() => {
    if (typeof (history.state as NavState)?.navIdx !== 'number') history.replaceState({ navIdx: idx.current }, '')
    const on = () => {
      if (restoring.current) { restoring.current = false; return }
      const st = (history.state as NavState)?.navIdx
      if (!allowNav(location.hash)) {
        restoring.current = true
        if (typeof st === 'number') history.go(idx.current - st)
        else history.back()
        return
      }
      idx.current = typeof st === 'number' ? st : idx.current + 1
      if (typeof st !== 'number') history.replaceState({ navIdx: idx.current }, '')
      setHash(location.hash)
      window.scrollTo(0, 0)
    }
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  return hash.replace(/^#/, '') || '/'
}

export default function App() {
  const path = useHash()
  const [instances, setInstances] = useState<Instance[] | null>(null)
  const [routed, setRouted] = useState<Set<string>>(new Set())
  useEffect(() => {
    loadInstances().then(setInstances)
    loadRouteIndex().then((l) => setRouted(new Set(l)))
  }, [path])

  if (!instances) return <div className="book" aria-busy="true" />
  if (instances.length === 0) return <LoadProblem />
  const [, kind, slug] = path.split('/')
  const inst = instances.find((i) => i.slug === slug)

  if (kind === 'i' && inst) return <InstancePage key={inst.slug} inst={inst} />
  if (kind === 'edit' && inst && Editor) {
    return <Suspense fallback={<p>Loading editor…</p>}><Editor key={inst.slug} inst={inst} /></Suspense>
  }
  return <IndexPage instances={instances} routed={routed} />
}
```


## Index masthead, contents, preview, colophon
- Path: `web/src/pages/IndexPage.tsx`
- Renders on `#/`: a two-column "route book". Masthead is the wordmark, lede, search, and segmented filter. Left column is the zone contents. Right column is a sticky map preview (hidden below 820px). Footer is a one-line colophon.

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapView } from '../components/MapView'
import { RouteOverlay } from '../components/RouteOverlay'
import { loadRoute, routeSummary, sectionBase } from '../data'
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
        <h1 className="wordmark">Tank Maps</h1>
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
```


## Instance header, section steps, map stage, legend footer
- Path: `web/src/pages/InstancePage.tsx`
- Renders on `#/i/:slug`: back link, title, where-line, ordered section steps, zoomable map, legend, handwritten note, source credit.

```tsx
import { useEffect, useState } from 'react'
import { MapView } from '../components/MapView'
import { RouteOverlay } from '../components/RouteOverlay'
import { ZoomPan } from '../components/ZoomPan'
import { loadRoute, routeSummary, sectionBase } from '../data'
import type { Instance, Route } from '../types'

type View = { kind: 'section'; id: string } | { kind: 'floor'; floor: number }

export function InstancePage({ inst }: { inst: Instance }) {
  const [route, setRoute] = useState<Route | null | undefined>(undefined)
  const [view, setView] = useState<View | null>(null)

  useEffect(() => {
    loadRoute(inst.slug).then((r) => {
      setRoute(r)
      setView(r?.sections.length ? { kind: 'section', id: r.sections[0].id }
        : inst.floors.length ? { kind: 'floor', floor: 1 } : null)
    })
  }, [inst])

  if (route === undefined) return <main className="instance" aria-busy="true" />
  const sections = route?.sections ?? []
  const sec = view?.kind === 'section' ? sections.find((s) => s.id === view.id) : undefined
  const base = sec ? sectionBase(inst, sec) : view?.kind === 'floor' ? sectionBase(inst, { floor: view.floor }) : null
  const otherFloors = inst.floors.filter((f) => !sections.some((s) => s.floor === f.floor))

  return (
    <main className="instance">
      <a href="#/" className="back">Back to all dungeons</a>
      <header className="instance-head">
        <h1>{inst.name}</h1>
        <p className="where">
          {inst.type === 'raid' ? 'Raid' : 'Dungeon'}{inst.zone ? ` in ${inst.zone}` : ''}
          {sections.length > 0 && `. ${routeSummary(sections)}.`}
        </p>
      </header>

      {(sections.length > 1 || otherFloors.length > 0) && (
        <nav className="steps" aria-label="Route sections, in order">
          {sections.length > 0 && (
            <ol>
              {sections.map((s, i) => (
                <li key={s.id}>
                  <button aria-current={sec?.id === s.id ? 'step' : undefined} onClick={() => setView({ kind: 'section', id: s.id })}>
                    <span className="n">{i + 1}</span>{s.title}
                  </button>
                </li>
              ))}
            </ol>
          )}
          {otherFloors.length > 0 && (
            <div className="other-maps">
              <span>{sections.length ? 'Maps without a route' : 'Maps'}</span>
              {otherFloors.map((f) => (
                <button key={f.floor} aria-current={view?.kind === 'floor' && view.floor === f.floor ? 'page' : undefined}
                  onClick={() => setView({ kind: 'floor', floor: f.floor })}>{f.label}</button>
              ))}
            </div>
          )}
        </nav>
      )}

      {base ? (
        <ZoomPan key={sec?.id ?? `floor-${base.src}`} aspect={base.size[1] / base.size[0]}>
          <MapView base={base.src} size={base.size}>
            {(size) => sec && <RouteOverlay key={sec.id} section={sec} size={size} draw />}
          </MapView>
        </ZoomPan>
      ) : (
        <div className="nomap">
          <p>The Forever client ships no map for {inst.name}, and nobody has drawn one yet.</p>
        </div>
      )}

      <footer className="instance-foot">
        {sec && <Legend />}
        {sec?.notes && <p className="note">{sec.notes}</p>}
        {view?.kind === 'floor' && <p className="credit">No route on this map yet.</p>}
      </footer>
      {sec?.sourceUrl && (
        <p className="credit-line">
          Drawn from the <a href={sec.sourceUrl} target="_blank" rel="noreferrer">MapsForTanks guide</a>.
        </p>
      )}
    </main>
  )
}

function Legend() {
  return (
    <ul className="legend" aria-label="Legend">
      <li><svg viewBox="0 0 30 12" aria-hidden="true"><path className="lg-path" d="M2 8c8-6 14 2 24-3" /></svg>Tank path</li>
      <li><svg viewBox="0 0 12 18" aria-hidden="true"><path className="lg-boundary" d="M6 2v14" /></svg>Stop and pull here</li>
      <li><svg viewBox="0 0 22 22" aria-hidden="true"><circle className="lg-boss" cx="11" cy="11" r="9" /><text x="11" y="15">1</text></svg>Boss, in kill order</li>
      <li><svg viewBox="0 0 22 22" aria-hidden="true"><circle className="lg-boss optional" cx="11" cy="11" r="9" /><text x="11" y="15">★</text></svg>Optional boss</li>
      <li><span className="lg-los" aria-hidden="true">LOS</span>Line-of-sight pull spot</li>
      <li><span className="lg-start" aria-hidden="true">Start</span>Dungeon entrance</li>
    </ul>
  )
}
```


## Editor bar and three-column body (dev only)
- Path: `web/src/editor/Editor.tsx`
- Renders on `#/edit/:slug` only while `vite dev` is running. Sticky toolbar, section list, map canvas, inspector, unsaved-changes modal.

```tsx
// DEV-ONLY route editor. Loaded via `import.meta.env.DEV` in App.tsx, so it is
// never part of a production build. Saves through the editor Vite plugin.
import { useCallback, useEffect, useRef, useState } from 'react'
import { MapView } from '../components/MapView'
import { RouteOverlay } from '../components/RouteOverlay'
import { loadRegistration, loadRoute, sectionBase } from '../data'
import type { Instance, Pt, Registration, Route } from '../types'
import { setNavGuard } from '../navGuard'
import { Inspector } from './Inspector'
import { findElement, findSection, newId, removeElement, saveRoute, useHistory, type Tool } from './state'

const TOOLS: [Tool, string, string][] = [
  ['select', 'V', 'Select / drag'], ['path', 'P', 'Path'], ['boundary', 'B', 'Pull boundary'],
  ['boss', 'O', 'Boss'], ['entrance', 'E', 'Start'], ['transition', 'T', 'Transition'], ['note', 'N', 'Note'], ['los', 'L', 'LOS pull'],
]
const HINT: Record<Tool, string> = {
  select: 'Click to select · drag markers, lines or points · click a point then Delete to remove it (or Alt+click / double-click it)',
  path: 'Click to add points · Enter or double-click to finish · Backspace removes last · Esc cancels',
  boundary: 'Click two points',
  boss: 'Click to place; order auto-increments', entrance: 'Click to place', transition: 'Click to place', note: 'Click to place',
  los: 'Click where the tank stands to break line of sight',
}
const clamp = (v: number) => Math.min(1, Math.max(0, Math.round(v * 10000) / 10000))

export default function Editor({ inst }: { inst: Instance }) {
  const [initial, setInitial] = useState<Route | null>(null)
  const [reg, setReg] = useState<Record<string, Registration>>({})
  useEffect(() => {
    loadRoute(inst.slug).then((r) =>
      setInitial(r ?? { instance: inst.slug, mapId: inst.mapId, source: 'manual', reviewed: false, sections: [] }))
    loadRegistration().then(setReg)
  }, [inst])
  if (!initial) return <p>Loading…</p>
  return <EditorInner inst={inst} initial={initial} reg={reg} />
}

type Drag = { id: string; vertex?: number; start: Pt; orig: Pt[] | Pt }

function EditorInner({ inst, initial, reg }: { inst: Instance; initial: Route; reg: Record<string, Registration> }) {
  const h = useHistory(initial)
  const [secId, setSecId] = useState<string | null>(initial.sections[0]?.id ?? null)
  const [tool, setTool] = useState<Tool>('select')
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState<Pt[]>([])
  const [hover, setHover] = useState<Pt | null>(null)
  const [srcOpacity, setSrcOpacity] = useState(0)
  const [status, setStatus] = useState('')
  /** Index of the selected point on the selected path/boundary (for deleting single points). */
  const [vertex, setVertex] = useState<number | null>(null)
  /** Hash the user tried to navigate to while there were unsaved changes. */
  const [leaveTo, setLeaveTo] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const barRef = useRef<HTMLElement>(null)
  const [barH, setBarH] = useState(56)
  // The toolbar floats over the page; side panels stick just below it, whatever height it wraps to.
  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setBarH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const drag = useRef<Drag | null>(null)
  const dirtyRef = useRef(h.dirty)
  const routeRef = useRef(h.route)
  useEffect(() => { dirtyRef.current = h.dirty }, [h.dirty])
  useEffect(() => { routeRef.current = h.route }, [h.route])

  const sec = findSection(h.route, secId)
  const base = sec ? sectionBase(inst, sec) : null
  const size = base?.size ?? [1002, 668]
  const srcReg = sec?.sourceImage ? reg[sec.sourceImage] : undefined
  const sel = findElement(sec, selected)

  const toNorm = (e: { clientX: number; clientY: number }): Pt => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svgRef.current!.getScreenCTM()!.inverse())
    return [clamp(p.x / size[0]), clamp(p.y / size[1])]
  }
  const editSec = useCallback((fn: (s: NonNullable<typeof sec>) => void) =>
    h.edit((r) => { const s = findSection(r, secId); if (s) fn(s) }), [h, secId])

  const finishDraft = useCallback((pts = draft) => {
    if (pts.length >= 2 && (tool === 'path' || tool === 'boundary')) {
      const id = newId(tool === 'path' ? 'p' : 'r')
      editSec((s) => {
        if (tool === 'path') s.path.push({ id, points: pts, arrow: 'end' })
        else s.boundaries.push({ id, points: pts.slice(0, 2) })
      })
      setSelected(id)
    }
    setDraft([])
  }, [draft, tool, editSec])

  /** Saves `route` (defaults to the current draft). Returns false and shows why on failure. */
  const save = useCallback(async (reason = 'Saved', route: Route = h.route) => {
    setStatus('Saving…')
    try {
      const { file } = await saveRoute(route)
      // Only mark clean if nothing was edited while the save was in flight.
      if (routeRef.current === route) h.setDirty(false)
      setStatus(`${reason} ${file} · ${new Date().toLocaleTimeString()}`)
      return true
    } catch (e) {
      setStatus(`Save failed: ${e instanceof Error ? e.message : e}`)
      return false
    }
  }, [h])

  /** Changing a section's floor is a floor switch too: apply it and autosave the result. */
  const changeFloor = useCallback((floor: number) => {
    const next = structuredClone(h.route)
    const s = findSection(next, secId)
    if (!s || s.floor === floor) return
    s.floor = floor
    h.replace(next)
    routeRef.current = next
    save('Autosaved', next)
  }, [h, secId, save])

  // Block in-app navigation while there are unsaved changes; the dialog below decides.
  useEffect(() => {
    setNavGuard((to) => {
      if (!dirtyRef.current) return true
      setLeaveTo(to)
      return false
    })
    return () => setNavGuard(null)
  }, [])

  const leave = async (mode: 'save' | 'discard') => {
    if (!leaveTo) return
    if (mode === 'save' && !(await save())) return   // keep the dialog open; the status shows why
    setNavGuard(null)
    location.hash = leaveTo
  }

  const deletePoint = useCallback((index: number) => {
    const f = findElement(sec, selected)
    if (!f || f.kind === 'marker') return
    if (f.kind === 'boundary') return setStatus('A pull boundary is always two points — move it or delete it instead.')
    if (f.el.points.length <= 2) return setStatus('A path needs at least two points — delete the whole path instead.')
    editSec((s) => { const g = findElement(s, selected); if (g && g.kind === 'path') g.el.points.splice(index, 1) })
    setVertex(null)
  }, [sec, selected, editSec])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as Element | null)?.closest?.('input, textarea, select')) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return }
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) h.redo(); else h.undo(); return }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); h.redo(); return }
      const del = e.key === 'Backspace' || e.key === 'Delete'
      if (e.key === 'Enter') finishDraft()
      else if (e.key === 'Escape') { setDraft([]); setVertex(null); setSelected(null) }
      else if (del && draft.length) setDraft((d) => d.slice(0, -1))
      else if (del && vertex !== null) deletePoint(vertex)          // a point is selected: delete just that point
      else if (del && selected) { editSec((s) => removeElement(s, selected)); setSelected(null) }
      else {
        const t = TOOLS.find(([, k]) => k.toLowerCase() === e.key.toLowerCase())
        if (t && !mod) { setTool(t[0]); setDraft([]) }
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [finishDraft, draft.length, selected, vertex, deletePoint, editSec, h, save])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (h.dirty) e.preventDefault() }
    addEventListener('beforeunload', warn)
    return () => removeEventListener('beforeunload', warn)
  }, [h.dirty])

  const onBackground = (e: React.PointerEvent) => {
    if (!sec || e.button !== 0) return
    const p = toNorm(e)
    if (tool === 'select') { setVertex(null); return setSelected(null) }
    if (tool === 'path') return setDraft((d) => [...d, p])
    if (tool === 'boundary') return draft.length ? finishDraft([draft[0], p]) : setDraft([p])
    const id = newId('m')
    editSec((s) => {
      const order = tool === 'boss' ? Math.max(0, ...s.markers.map((m) => m.order ?? 0)) + 1 : undefined
      s.markers.push({ id, type: tool, pos: p, ...(order ? { order } : {}), ...(tool === 'transition' || tool === 'note' ? { text: tool === 'note' ? 'Note' : 'To …' } : {}) })
    })
    setSelected(id)
  }

  const beginDrag = (id: string, e: React.PointerEvent, vertex?: number) => {
    if (tool !== 'select') return
    e.stopPropagation()
    setSelected(id)
    setVertex(vertex ?? null)
    const f = findElement(sec, id)
    if (!f) return
    h.snapshot()
    svgRef.current?.setPointerCapture(e.pointerId)
    drag.current = { id, vertex, start: toNorm(e), orig: f.kind === 'marker' ? f.el.pos : f.el.points }
  }

  const onMove = (e: React.PointerEvent) => {
    const p = toNorm(e)
    setHover(p)
    const d = drag.current
    if (!d) return
    const [dx, dy] = [p[0] - d.start[0], p[1] - d.start[1]]
    const shift = (q: Pt): Pt => [clamp(q[0] + dx), clamp(q[1] + dy)]
    h.live((r) => {
      const f = findElement(findSection(r, secId), d.id)
      if (!f) return
      if (f.kind === 'marker') f.el.pos = shift(d.orig as Pt)
      else if (d.vertex !== undefined) f.el.points[d.vertex] = shift((d.orig as Pt[])[d.vertex])
      else f.el.points = (d.orig as Pt[]).map(shift)
    })
  }

  /** Switching section/floor autosaves pending changes. */
  /** Switching floors/sections autosaves (all sections share one route file). Pass `next` if the
   *  same handler also changed the route, so the new state is what gets saved. */
  const switchSection = (id: string | null, next?: Route) => {
    setSecId(id)
    setSelected(null)
    setVertex(null)
    setDraft([])
    if (next) { h.replace(next); routeRef.current = next; save('Autosaved', next) }
    else if (h.dirty && id !== secId) save('Autosaved')
  }
  const addSection = () => {
    const id = newId('s')
    const next = structuredClone(h.route)
    next.sections.push({ id, title: `Section ${next.sections.length + 1}`, floor: inst.floors[0]?.floor ?? 1, path: [], boundaries: [], markers: [] })
    switchSection(id, next)
  }
  const deleteSection = () => {
    if (!sec || !confirm(`Delete section "${sec.title}"?`)) return
    const next = structuredClone(h.route)
    next.sections = next.sections.filter((s) => s.id !== secId)
    switchSection(next.sections[0]?.id ?? null, next)
  }

  const handles = sel && sel.kind !== 'marker' ? sel.el.points : []
  return (
    <main className="editor" style={{ '--bar-h': `${barH}px` } as React.CSSProperties}>
      <header className="editor-bar" ref={barRef}>
        <a href={`#/i/${inst.slug}`}>← {inst.name}</a>
        <span className="dev-badge">DEV EDITOR</span>
        <div className="tools" role="toolbar">
          {TOOLS.map(([t, k, label]) => (
            <button key={t} className={tool === t ? 'on' : ''} title={`${label} (${k})`} onClick={() => { setTool(t); setDraft([]) }}>
              {label} <kbd>{k}</kbd>
            </button>
          ))}
        </div>
        <button onClick={h.undo} title="Undo (Ctrl+Z)">Undo</button>
        <button onClick={h.redo} title="Redo (Ctrl+Shift+Z)">Redo</button>
        <button className="primary" onClick={() => save()} title="Save (Ctrl+S)">Save{h.dirty ? ' •' : ''}</button>
        <span className="status">{status}</span>
      </header>

      <div className="editor-body">
        <nav className="sections">
          {h.route.sections.map((s) => (
            <button key={s.id} className={s.id === secId ? 'on' : ''} onClick={() => switchSection(s.id)}>
              {s.title}<small>floor {s.floor} · {s.path.length} paths · {s.markers.length} markers</small>
            </button>
          ))}
          <button onClick={addSection}>+ Section</button>
          {sec && <button className="danger" onClick={deleteSection}>Delete section</button>}
          {srcReg && (
            <label className="opacity">Original drawing
              <input type="range" min={0} max={1} step={0.05} value={srcOpacity} onChange={(e) => setSrcOpacity(Number(e.target.value))} />
            </label>
          )}
        </nav>

        <div className="canvas">
          <p className="hint">{HINT[tool]}</p>
          {sec && base ? (
            <MapView base={base.src} size={base.size}
              source={srcReg && sec.sourceImage && srcOpacity > 0 ? { path: sec.sourceImage, reg: srcReg, opacity: srcOpacity } : null}
              svgProps={{
                ref: svgRef, className: `mapview-svg editing tool-${tool}`,
                onPointerDown: onBackground, onPointerMove: onMove,
                onPointerUp: () => { drag.current = null }, onDoubleClick: () => tool === 'path' && finishDraft(),
              }}>
              {(sz) => (
                <>
                  <rect width={sz[0]} height={sz[1]} fill="transparent" />
                  <RouteOverlay section={sec} size={sz} selected={selected} onPick={(id, e) => beginDrag(id, e)} />
                  {handles.map((q, i) => (
                    <circle key={i} className={`handle${vertex === i ? ' active' : ''}`} cx={q[0] * sz[0]} cy={q[1] * sz[1]} r={vertex === i ? 8 : 6}
                      onPointerDown={(e) => {
                        if (e.altKey) { e.stopPropagation(); deletePoint(i); return }   // Alt+click: delete point
                        beginDrag(selected!, e, i)
                      }}
                      onDoubleClick={(e) => { e.stopPropagation(); deletePoint(i) }}>
                      <title>Point {i + 1} · Delete/Backspace, double-click or Alt+click to remove</title>
                    </circle>
                  ))}
                  {draft.length > 0 && (
                    <polyline className="draft" points={[...draft, ...(hover ? [hover] : [])].map(([x, y]) => `${x * sz[0]},${y * sz[1]}`).join(' ')} />
                  )}
                </>
              )}
            </MapView>
          ) : (
            <p className="empty">{sec ? 'This instance has no game map art — upload a custom base image in the Section panel.' : 'Add a section to start drawing.'}</p>
          )}
        </div>

        <Inspector inst={inst} route={h.route} secId={secId} selected={selected} edit={h.edit} setSelected={setSelected}
          vertex={vertex} onDeletePoint={deletePoint} onFloorChange={changeFloor} />
      </div>

      {leaveTo !== null && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="leave-title">
            <h2 id="leave-title">Unsaved changes</h2>
            <p>Save your changes to <code>{inst.slug}.json</code> before leaving the editor?</p>
            {status.startsWith('Save failed') && <p className="error">{status}</p>}
            <div className="modal-actions">
              <button onClick={() => setLeaveTo(null)} autoFocus>Stay</button>
              <button className="danger" onClick={() => leave('discard')}>Discard changes</button>
              <button className="primary" onClick={() => leave('save')}>Save &amp; leave</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
```

