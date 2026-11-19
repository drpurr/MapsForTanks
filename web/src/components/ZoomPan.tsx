import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

type View = { k: number; x: number; y: number }
type Pt = { x: number; y: number }
/** Normalized (0..1) box the default view should keep in frame, e.g. the route's extent. */
export type Focus = { x0: number; y0: number; x1: number; y1: number }

const MAX_ZOOM = 5
const DRAG_THRESHOLD = 4
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/**
 * Zoom and pan for the public map.
 * - Default view frames `focus` (the route) as large as possible: never smaller than the whole map,
 *   never larger than the frame's width. Without `focus`, it shows the whole map.
 * - Ctrl/⌘ + wheel and trackpad pinch zoom; a plain wheel scrolls the page and shows a hint.
 * - Drag pans (pointer capture starts only after real movement, so clicks on map links still work);
 *   two-finger pinch zooms on touch; double-click zooms in.
 * Remount (change `key`) to reset the view.
 */
export function ZoomPan({ aspect, focus, children }: { aspect: number; focus?: Focus; children: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  /** Frame height = the window space below the frame's top edge (headers vary: steps can wrap). */
  const [frameH, setFrameH] = useState<number | undefined>(undefined)
  /** null = the default view; a number view once the reader moves the map. */
  const [view, setView] = useState<View | null>(null)
  const [hint, setHint] = useState(false)
  const hintTimer = useRef<number | undefined>(undefined)
  const pointers = useRef(new Map<number, Pt>())
  const dragStart = useRef<Pt | null>(null)
  const moved = useRef(false)

  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const fit = () => {
      // Narrow screens use the map's own aspect ratio (CSS); wider ones fill the window below the header.
      if (window.matchMedia('(max-width: 820px)').matches) { setFrameH(undefined); return }
      const top = el.getBoundingClientRect().top + window.scrollY
      setFrameH(Math.round(Math.max(420, Math.min(1200, window.innerHeight - top - 16))))
    }
    fit()
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    window.addEventListener('resize', fit)
    return () => { ro.disconnect(); window.removeEventListener('resize', fit) }
  }, [])
  useEffect(() => () => window.clearTimeout(hintTimer.current), [])

  const contentH = size.w * aspect
  const fitK = size.w && contentH ? Math.min(1, size.h / contentH) : 1

  const clamp = useCallback((v: View): View => {
    const k = Math.min(MAX_ZOOM, Math.max(fitK, v.k))
    const cw = size.w * k, ch = contentH * k
    const x = cw <= size.w ? (size.w - cw) / 2 : Math.min(0, Math.max(size.w - cw, v.x))
    const y = ch <= size.h ? (size.h - ch) / 2 : Math.min(0, Math.max(size.h - ch, v.y))
    return { k, x, y }
  }, [fitK, size.w, size.h, contentH])

  const home = useCallback((): View => {
    if (!focus || !size.w) return clamp({ k: fitK, x: 0, y: 0 })
    const fx0 = focus.x0 * size.w, fx1 = focus.x1 * size.w, fy0 = focus.y0 * contentH, fy1 = focus.y1 * contentH
    const k = Math.min(1, Math.max(fitK, Math.min(size.w / (fx1 - fx0), size.h / (fy1 - fy0))))
    return clamp({ k, x: size.w / 2 - ((fx0 + fx1) / 2) * k, y: size.h / 2 - ((fy0 + fy1) / 2) * k })
  }, [focus, size.w, size.h, contentH, fitK, clamp])
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

  // Native non-passive listener: zoom only on Ctrl/⌘ + wheel (trackpad pinch sends ctrlKey).
  // A plain wheel is left alone so the page scrolls, and the hint explains how to zoom.
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        setHint(true)
        window.clearTimeout(hintTimer.current)
        hintTimer.current = window.setTimeout(() => setHint(false), 1400)
        return
      }
      e.preventDefault()
      setHint(false)
      const p = local(e)
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('.zoom-controls')) return
    pointers.current.set(e.pointerId, local(e))
    dragStart.current = local(e)
    moved.current = false
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const ps = pointers.current
    const prev = ps.get(e.pointerId)
    if (!prev) return
    const now = local(e)
    if (!moved.current && dragStart.current &&
        Math.hypot(now.x - dragStart.current.x, now.y - dragStart.current.y) > DRAG_THRESHOLD) {
      moved.current = true
      try { stage.current?.setPointerCapture(e.pointerId) } catch { /* pointer already gone */ }
    }
    if (!moved.current && ps.size === 1) return
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
      style={{ touchAction: zoomed ? 'none' : 'pan-y', height: frameH }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      // A drag that ends on a map link must not follow the link.
      onClickCapture={(e) => { if (moved.current) { e.preventDefault(); e.stopPropagation(); moved.current = false } }}
      onDoubleClick={(e) => {
        if ((e.target as Element).closest('.zoom-controls, a')) return
        const p = local(e)
        zoomAt(p.x, p.y, 2)
      }}
    >
      <div className="zoom-content" style={{ width: size.w || undefined, transform: `translate(${v.x}px, ${v.y}px) scale(${v.k})` }}>
        {children}
      </div>
      <div className={`zoom-hint${hint ? ' show' : ''}`} aria-hidden="true">
        Hold {IS_MAC ? '⌘' : 'Ctrl'} and scroll to zoom
      </div>
      <div className="zoom-controls">
        <button aria-label="Zoom in" title={`Zoom in (or ${IS_MAC ? '⌘' : 'Ctrl'} + scroll)`} onClick={() => zoomAt(size.w / 2, size.h / 2, 1.5)} disabled={v.k >= MAX_ZOOM}>+</button>
        <button aria-label="Zoom out" title="Zoom out" onClick={() => zoomAt(size.w / 2, size.h / 2, 1 / 1.5)} disabled={!zoomed}>−</button>
        <button className="whole" onClick={() => setView({ k: fitK, x: 0, y: 0 })} disabled={!zoomed}>Whole map</button>
      </div>
    </div>
  )
}
