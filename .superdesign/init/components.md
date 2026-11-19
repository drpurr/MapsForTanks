# Shared UI components

Framework: Vite + React 19 + TypeScript. No component library (no Tailwind, shadcn, MUI, Radix). Styling is vanilla CSS in `web/src/index.css` using custom properties. Buttons, segmented controls, inputs, and the modal are CSS classes, not React primitives.

## Button, segmented control, search input, kbd
- Path: `web/src/index.css`
- Description: Global form controls. Default button is raised stone; `.on` and `.primary` are lamplight on deep stone; `.danger` is coral text. `.segmented` is one outlined radio group.
- Props: class names `on`, `primary`, `danger`; disabled state.

```css
/* Tank Maps: dungeon stone around parchment maps. Route inks are the MapsForTanks colours. */
:root {
  --stone: #232c35;
  --stone-raised: #2e3944;
  --stone-deep: #1c242c;
  --mortar: #46535f;
  --parchment: #eadfc8;
  --lichen: #9fadb8;
  --lamplight: #e2bf6a;
  --ink-green: #63e6a0;
  --ink-red: #ff6b5e;
  --ink-cyan: #4cc9e6;
  --ink-yellow: #f6dc84;
  --ink-orange: #ffa552;
  --danger: #ff8a7a;

  /* 1.25 scale on a 17px condensed base */
  --t-sm: 0.8125rem;
  --t-base: 1.0625rem;
  --t-md: 1.25rem;
  --t-lg: 1.5625rem;
  --t-xl: 1.9375rem;
  --t-2xl: 2.4375rem;
  --t-3xl: 3.0625rem;

  --ui: 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif;
  --hand: 'Patrick Hand', 'Comic Neue', cursive;

  color-scheme: dark;
  font-family: var(--ui);
  line-height: 1.45;
  color: var(--parchment);
  background: var(--stone);
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--stone); font-size: var(--t-base); }
a { color: var(--lamplight); text-underline-offset: 0.18em; text-decoration-thickness: 1px; }
a:hover { text-decoration-thickness: 2px; }
:focus-visible { outline: 2px solid var(--lamplight); outline-offset: 2px; border-radius: 3px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.muted { color: var(--lichen); }
h1, h2 { font-weight: 700; letter-spacing: -0.005em; }

button {
  font: inherit; color: var(--parchment); background: var(--stone-raised); border: 1px solid var(--mortar);
  border-radius: 6px; padding: 6px 12px; cursor: pointer;
}
button:hover { border-color: var(--lichen); }
button.on { background: var(--lamplight); color: var(--stone-deep); border-color: var(--lamplight); }
button.primary { background: var(--lamplight); color: var(--stone-deep); border-color: var(--lamplight); font-weight: 600; }
button.danger { color: var(--danger); }
button:disabled { opacity: 0.5; cursor: not-allowed; }
kbd { font: inherit; font-size: 0.75em; opacity: 0.65; margin-left: 3px; }

/* segmented control: one outline, divided options */
.segmented { display: inline-flex; border: 1px solid var(--mortar); border-radius: 7px; overflow: hidden; background: var(--stone-deep); }
.segmented button { border: 0; border-radius: 0; background: transparent; color: var(--lichen); padding: 7px 14px; }
.segmented button + button { border-left: 1px solid var(--mortar); }
.segmented button.on { background: var(--lamplight); color: var(--stone-deep); font-weight: 600; }
.segmented button:focus-visible { outline-offset: -3px; }



## ErrorBoundary / LoadProblem
- Path: `web/src/components/ErrorBoundary.tsx`
- Description: Full-page failure for a render error, and a separate failure when the dungeon list cannot load.
- Props: `children` on the boundary. `LoadProblem` takes none.

```tsx
import { Component, type ReactNode } from 'react'

/** Shows what broke instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <main className="problem" role="alert">
        <h1>This page hit an error</h1>
        <p>{error.message}</p>
        <p className="muted">Reload to try again. If it keeps happening, the browser console has the details.</p>
        <button className="primary" onClick={() => location.reload()}>Reload</button>
      </main>
    )
  }
}

export function LoadProblem() {
  return (
    <main className="problem" role="alert">
      <h1>Couldn’t load the dungeon list</h1>
      <p><code>data/instances.json</code> didn’t come back as JSON, so the site has nothing to show.</p>
      <p className="muted">
        When running locally, restart the dev server with <code>npm run dev</code> in <code>web/</code>.
        If the file is missing, rebuild it with <code>node tools/dump_forever_maps.mjs</code>.
      </p>
      <button className="primary" onClick={() => location.reload()}>Reload</button>
    </main>
  )
}
```


## MapView
- Path: `web/src/components/MapView.tsx`
- Description: Floor-art frame. Image fills an aspect-ratio box; an optional warped source image sits above it; children render inside an SVG in floor-pixel space.
- Props: `base`, `size`, `source?`, `children?`, `svgProps?`

```tsx
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Registration } from '../types'
import { repoUrl } from '../data'

interface Props {
  base: string
  size: [number, number]
  /** Original mapsfortanks image warped onto the clean map via its homography. */
  source?: { path: string; reg: Registration; opacity: number } | null
  children?: (size: [number, number]) => ReactNode
  svgProps?: React.SVGProps<SVGSVGElement>
}

/** Homography (tank px -> floor px) as a CSS matrix3d (column-major). */
function matrix3d(H: number[][]) {
  const [[a, b, c], [d, e, f], [g, h, i]] = H
  return `matrix3d(${[a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, i].join(',')})`
}

export function MapView({ base, size, source, children, svgProps }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(el.clientWidth / size[0]))
    ro.observe(el)
    return () => ro.disconnect()
  }, [size])

  return (
    <div className="mapview" ref={box} style={{ aspectRatio: `${size[0]} / ${size[1]}` }}>
      <img className="mapview-base" src={base} alt="" draggable={false} />
      {source && (
        <div className="mapview-source" style={{ opacity: source.opacity }}>
          <img
            src={repoUrl(source.path)}
            alt=""
            draggable={false}
            style={{
              width: source.reg.size[0],
              height: source.reg.size[1],
              transform: `scale(${scale}) ${matrix3d(source.reg.H)}`,
            }}
          />
        </div>
      )}
      <svg className="mapview-svg" viewBox={`0 0 ${size[0]} ${size[1]}`} {...svgProps}>
        {children?.(size)}
      </svg>
    </div>
  )
}
```


## ZoomPan
- Path: `web/src/components/ZoomPan.tsx`
- Description: Grab-to-pan, wheel-to-zoom stage with + / − / Whole map controls pinned to the bottom right.
- Props: `aspect` (height/width), `children`

```tsx
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

type View = { k: number; x: number; y: number }
type Pt = { x: number; y: number }

const MAX_ZOOM = 5

/**
 * Zoom and pan for the public map. Wheel / trackpad pinch zooms around the cursor, drag pans,
 * two-finger pinch zooms on touch, double-click zooms in. Starts filled to the frame's width;
 * zooming out stops at the whole map. Remount (change `key`) to reset the view.
 */
export function ZoomPan({ aspect, children }: { aspect: number; children: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  /** null = the default view (fit width, centered); a number view once the reader moves the map. */
  const [view, setView] = useState<View | null>(null)
  const pointers = useRef(new Map<number, Pt>())

  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const contentH = size.w * aspect
  const fitK = size.w && contentH ? Math.min(1, size.h / contentH) : 1

  const clamp = useCallback((v: View): View => {
    const k = Math.min(MAX_ZOOM, Math.max(fitK, v.k))
    const cw = size.w * k, ch = contentH * k
    const x = cw <= size.w ? (size.w - cw) / 2 : Math.min(0, Math.max(size.w - cw, v.x))
    const y = ch <= size.h ? (size.h - ch) / 2 : Math.min(0, Math.max(size.h - ch, v.y))
    return { k, x, y }
  }, [fitK, size.w, size.h, contentH])

  const home = useCallback(() => clamp({ k: 1, x: 0, y: (size.h - contentH) / 2 }), [clamp, size.h, contentH])
  const current = useCallback((v: View | null) => (v ? clamp(v) : home()), [clamp, home])

  const zoomAt = useCallback((px: number, py: number, factor: number) => {
    setView((cur) => {
      const c = current(cur)
      const k = Math.min(MAX_ZOOM, Math.max(fitK, c.k * factor))
      return clamp({ k, x: px - ((px - c.x) * k) / c.k, y: py - ((py - c.y) * k) / c.k })
    })
  }, [current, clamp, fitK])

  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = stage.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  // Wheel must be a non-passive native listener so the page doesn't scroll while zooming.
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const p = local(e)
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('.zoom-controls')) return
    try { stage.current?.setPointerCapture(e.pointerId) } catch { /* pointer already gone; drag still tracks */ }
    pointers.current.set(e.pointerId, local(e))
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const ps = pointers.current
    const prev = ps.get(e.pointerId)
    if (!prev) return
    const now = local(e)
    if (ps.size === 1) {
      setView((cur) => { const c = current(cur); return clamp({ ...c, x: c.x + now.x - prev.x, y: c.y + now.y - prev.y }) })
    } else if (ps.size === 2) {
      const other = [...ps.entries()].find(([id]) => id !== e.pointerId)![1]
      const d0 = Math.hypot(prev.x - other.x, prev.y - other.y), d1 = Math.hypot(now.x - other.x, now.y - other.y)
      if (d0 > 0) zoomAt((now.x + other.x) / 2, (now.y + other.y) / 2, d1 / d0)
    }
    ps.set(e.pointerId, now)
  }
  const onPointerUp = (e: React.PointerEvent) => { pointers.current.delete(e.pointerId) }

  const v = current(view)
  const zoomed = v.k > fitK + 0.001

  return (
    <div
      ref={stage}
      className={`zoom-stage${zoomed ? ' zoomed' : ''}`}
      style={{ touchAction: zoomed ? 'none' : 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(e) => { if (!(e.target as Element).closest('.zoom-controls')) { const p = local(e); zoomAt(p.x, p.y, 2) } }}
    >
      <div className="zoom-content" style={{ width: size.w || undefined, transform: `translate(${v.x}px, ${v.y}px) scale(${v.k})` }}>
        {children}
      </div>
      <div className="zoom-controls">
        <button aria-label="Zoom in" title="Zoom in" onClick={() => zoomAt(size.w / 2, size.h / 2, 1.5)} disabled={v.k >= MAX_ZOOM}>+</button>
        <button aria-label="Zoom out" title="Zoom out" onClick={() => zoomAt(size.w / 2, size.h / 2, 1 / 1.5)} disabled={!zoomed}>−</button>
        <button className="whole" onClick={() => setView({ k: fitK, x: 0, y: 0 })} disabled={!zoomed}>Whole map</button>
      </div>
    </div>
  )
}
```


## RouteOverlay
- Path: `web/src/components/RouteOverlay.tsx`
- Description: SVG tank path, pull boundaries, and markers (boss, Start, LOS, notes) in floor-pixel space. `draw` animates the ink.
- Props: `section`, `size`, `draw?`, `selected?`, `onPick?`

```tsx
import type { Marker, Pt, Section } from '../types'

export interface OverlayHandlers {
  selected?: string | null
  onPick?: (id: string, e: React.PointerEvent) => void
}

const pts = (p: Pt[], [w, h]: [number, number]) => p.map(([x, y]) => `${x * w},${y * h}`).join(' ')

export function ArrowDefs() {
  return (
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="6.5" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse">
        <path d="M0,0.6 L10,5 L0,9.4 L2.4,5 z" className="arrowhead" />
      </marker>
    </defs>
  )
}

function MarkerGlyph({ m, size, sel }: { m: Marker; size: [number, number]; sel: boolean }) {
  const [x, y] = [m.pos[0] * size[0], m.pos[1] * size[1]]
  const cls = `marker marker-${m.type}${m.optional ? ' optional' : ''}${sel ? ' selected' : ''}`
  if (m.type === 'boss') {
    const label = m.optional && !m.order ? '★' : String(m.order ?? '?')
    return (
      <g className={cls} transform={`translate(${x},${y})`}>
        <circle r={13} />
        <text dy="0.36em">{label}</text>
        <title>{m.optional ? 'Optional boss' : `Boss ${m.order ?? ''}`}{m.text && m.text !== '*' ? ` (${m.text})` : ''}</title>
      </g>
    )
  }
  if (m.type === 'entrance') {
    return (
      <g className={cls} transform={`translate(${x},${y})`}>
        <rect className="hitbox" x={-28} y={-15} width={56} height={30} rx={4} />
        <text dy="0.32em">Start</text>
      </g>
    )
  }
  if (m.type === 'los') {
    return (
      <g className={cls} transform={`translate(${x},${y})`}>
        <rect x={-20} y={-11} width={40} height={22} rx={5} />
        <text dy="0.36em">LOS</text>
        <title>Line-of-sight pull: stand here so casters come to you{m.text ? ` (${m.text})` : ''}</title>
      </g>
    )
  }
  // Transitions and notes are lettered on the map by hand, like the original drawings.
  const text = m.text ?? (m.type === 'transition' ? 'To next area' : 'Note')
  const w = Math.max(36, text.length * 8 + 12)
  return (
    <g className={cls} transform={`translate(${x},${y})`}>
      <rect className="hitbox" x={-w / 2} y={-13} width={w} height={26} rx={4} />
      <text dy="0.32em">{text}</text>
    </g>
  )
}

/**
 * Draws one section's route in floor-pixel space; used by viewer and editor.
 * `draw` animates the path strokes in (the one motion moment of the site).
 */
export function RouteOverlay({ section, size, selected, onPick, draw = false }:
  { section: Section; size: [number, number]; draw?: boolean } & OverlayHandlers) {
  const pick = (id: string) => (onPick ? { onPointerDown: (e: React.PointerEvent) => onPick(id, e) } : {})
  return (
    <g className={`route${draw ? ' draw' : ''}`}>
      <ArrowDefs />
      {section.boundaries.map((b) => (
        <g key={b.id} {...pick(b.id)}>
          <polyline className="hit" points={pts(b.points, size)} />
          <polyline className={`boundary${selected === b.id ? ' selected' : ''}`} points={pts(b.points, size)} />
        </g>
      ))}
      {section.path.map((p, i) => (
        <g key={p.id} {...pick(p.id)} style={{ '--i': i } as React.CSSProperties}>
          <polyline className="hit" points={pts(p.points, size)} />
          <polyline className="path-outline" points={pts(p.points, size)} pathLength={1} />
          <polyline
            className={`path path-${p.style ?? 'main'}${selected === p.id ? ' selected' : ''}`}
            points={pts(p.points, size)}
            pathLength={1}
            markerEnd={p.arrow !== 'none' ? 'url(#arrow)' : undefined}
            markerStart={p.arrow === 'both' ? 'url(#arrow)' : undefined}
          />
        </g>
      ))}
      {section.markers.map((m) => (
        <g key={m.id} {...pick(m.id)}>
          <MarkerGlyph m={m} size={size} sel={selected === m.id} />
        </g>
      ))}
    </g>
  )
}
```


## RouteGlyph
- Path: `web/src/pages/IndexPage.tsx` (local function)
- Description: 26×13 green hand-drawn arrow marking an instance that has a route. No props.
