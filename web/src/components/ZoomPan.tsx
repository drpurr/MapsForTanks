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
