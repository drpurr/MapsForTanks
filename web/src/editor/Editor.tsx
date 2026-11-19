// DEV-ONLY route editor. Loaded via `import.meta.env.DEV` in App.tsx, so it is
// never part of a production build. Saves through the editor Vite plugin.
import { useCallback, useEffect, useRef, useState } from 'react'
import { MapView } from '../components/MapView'
import { RouteOverlay } from '../components/RouteOverlay'
import { loadGuide, loadRegistration, loadRoute, sectionBase } from '../data'
import type { Instance, Pt, Registration, Route } from '../types'
import { setNavGuard } from '../navGuard'
import { GuideEditor } from './GuideEditor'
import { Inspector } from './Inspector'
import { findElement, findSection, newId, removeElement, saveGuide, saveRoute, useHistory, type Tool } from './state'

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
  const [guide, setGuide] = useState<string | null>(null)
  useEffect(() => {
    loadGuide(inst.slug).then((g) => setGuide(g ?? ''))
    loadRoute(inst.slug).then((r) =>
      setInitial(r ?? { instance: inst.slug, mapId: inst.mapId, source: 'manual', reviewed: false, sections: [] }))
    loadRegistration().then(setReg)
  }, [inst])
  if (!initial || guide === null) return <p>Loading…</p>
  return <EditorInner inst={inst} initial={initial} initialGuide={guide} reg={reg} />
}

type Drag = { id: string; vertex?: number; start: Pt; orig: Pt[] | Pt }

function EditorInner({ inst, initial, initialGuide, reg }: {
  inst: Instance; initial: Route; initialGuide: string; reg: Record<string, Registration>
}) {
  const h = useHistory(initial)
  /** The guide is a separate file (data/guides/<slug>.md) with its own saved state; Save writes both. */
  const [guide, setGuide] = useState(initialGuide)
  const [savedGuide, setSavedGuide] = useState(initialGuide)
  const guideDirty = guide !== savedGuide
  const dirty = h.dirty || guideDirty
  const guideRef = useRef(guide)
  useEffect(() => { guideRef.current = guide }, [guide])
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
  useEffect(() => { document.title = `Editing ${inst.name} – Tank Maps` }, [inst])
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
  const dirtyRef = useRef(dirty)
  const routeRef = useRef(h.route)
  useEffect(() => { dirtyRef.current = dirty }, [dirty])
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
      const text = guideRef.current
      const files = [(await saveRoute(route)).file]
      // Only mark clean if nothing was edited while the save was in flight.
      if (routeRef.current === route) h.setDirty(false)
      if (text !== savedGuide) {
        const g = await saveGuide(inst.slug, text)
        setSavedGuide(text)
        files.push(g.removed ? `(removed ${g.file})` : g.file)
      }
      setStatus(`${reason} ${files.join(' + ')} · ${new Date().toLocaleTimeString()}`)
      return true
    } catch (e) {
      setStatus(`Save failed: ${e instanceof Error ? e.message : e}`)
      return false
    }
  }, [h, inst.slug, savedGuide])

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
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault() }
    addEventListener('beforeunload', warn)
    return () => removeEventListener('beforeunload', warn)
  }, [dirty])

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
    else if (dirty && id !== secId) save('Autosaved')
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
        <button className="primary" onClick={() => save()} title="Save (Ctrl+S)">Save{dirty ? ' •' : ''}</button>
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
          <GuideEditor text={guide} onChange={setGuide} sections={h.route.sections} current={sec?.title}
            dirty={guideDirty} onSave={() => save()} />
        </div>

        <Inspector inst={inst} route={h.route} secId={secId} selected={selected} edit={h.edit} setSelected={setSelected}
          vertex={vertex} onDeletePoint={deletePoint} onFloorChange={changeFloor} />
      </div>

      {leaveTo !== null && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="leave-title">
            <h2 id="leave-title">Unsaved changes</h2>
            <p>Save your changes to <code>{inst.slug}.json</code>{guideDirty && <> and <code>{inst.slug}.md</code></>} before leaving the editor?</p>
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
