import { useCallback, useRef, useState } from 'react'
import type { Route, Section } from '../types'

export type Tool = 'select' | 'path' | 'boundary' | 'boss' | 'entrance' | 'transition' | 'note'

export const newId = (prefix: string) =>
  `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`

/** Route draft with undo/redo. `edit` snapshots first; `live` mutates without a snapshot (drags). */
export function useHistory(initial: Route) {
  const [route, setRoute] = useState(initial)
  const past = useRef<Route[]>([])
  const future = useRef<Route[]>([])
  const [dirty, setDirty] = useState(false)

  const edit = useCallback((fn: (r: Route) => void) => {
    setRoute((cur) => {
      past.current.push(cur)
      if (past.current.length > 200) past.current.shift()
      future.current = []
      const next = structuredClone(cur)
      fn(next)
      return next
    })
    setDirty(true)
  }, [])

  /** Commit a fully built next route (keeps its identity, so a save of `next` can be matched to state). */
  const replace = useCallback((next: Route) => {
    setRoute((cur) => { past.current.push(cur); future.current = []; return next })
    setDirty(true)
  }, [])

  const snapshot = useCallback(() => {
    setRoute((cur) => { past.current.push(cur); future.current = []; return cur })
  }, [])

  const live = useCallback((fn: (r: Route) => void) => {
    setRoute((cur) => { const next = structuredClone(cur); fn(next); return next })
    setDirty(true)
  }, [])

  const undo = useCallback(() => {
    setRoute((cur) => {
      const prev = past.current.pop()
      if (!prev) return cur
      future.current.push(cur)
      return prev
    })
    setDirty(true)
  }, [])

  const redo = useCallback(() => {
    setRoute((cur) => {
      const nxt = future.current.pop()
      if (!nxt) return cur
      past.current.push(cur)
      return nxt
    })
    setDirty(true)
  }, [])

  return { route, edit, replace, live, snapshot, undo, redo, dirty, setDirty }
}

export function findSection(r: Route, id: string | null): Section | undefined {
  return r.sections.find((s) => s.id === id)
}

/** Locate an element (path, boundary, marker) by id inside a section. */
export function findElement(s: Section | undefined, id: string | null) {
  if (!s || !id) return null
  const p = s.path.find((x) => x.id === id)
  if (p) return { kind: 'path' as const, el: p }
  const b = s.boundaries.find((x) => x.id === id)
  if (b) return { kind: 'boundary' as const, el: b }
  const m = s.markers.find((x) => x.id === id)
  if (m) return { kind: 'marker' as const, el: m }
  return null
}

export function removeElement(s: Section, id: string) {
  s.path = s.path.filter((x) => x.id !== id)
  s.boundaries = s.boundaries.filter((x) => x.id !== id)
  s.markers = s.markers.filter((x) => x.id !== id)
}

export async function saveRoute(route: Route) {
  const res = await fetch('/__editor/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: route.instance, route }),
  })
  const data = await res.json()
  if (!res.ok) {
    const detail = data.details?.map((d: { instancePath: string; message: string }) => `${d.instancePath} ${d.message}`).join('; ')
    throw new Error(detail || data.error || `HTTP ${res.status}`)
  }
  return data as { file: string }
}

export async function uploadBase(slug: string, file: File) {
  const name = file.name.toLowerCase().replace(/[^\w.-]+/g, '-')
  const res = await fetch(`/__editor/upload?slug=${slug}&name=${encodeURIComponent(name)}`, { method: 'POST', body: file })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data.path as string
}
