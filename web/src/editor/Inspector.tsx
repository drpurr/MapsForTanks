import { useState } from 'react'
import type { Instance, Route } from '../types'
import { youtubeUrl } from '../youtube'
import { findElement, findSection, removeElement, uploadBase } from './state'

interface Props {
  inst: Instance
  route: Route
  secId: string | null
  selected: string | null
  edit: (fn: (r: Route) => void) => void
  setSelected: (id: string | null) => void
  vertex: number | null
  onDeletePoint: (index: number) => void
  onFloorChange: (floor: number) => void
}

/** Properties for the selected element, the current section, and the route. */
export function Inspector({ inst, route, secId, selected, edit, setSelected, vertex, onDeletePoint, onFloorChange }: Props) {
  const sec = findSection(route, secId)
  const found = findElement(sec, selected)
  const withSec = (fn: (s: NonNullable<typeof sec>) => void) =>
    edit((r) => { const s = findSection(r, secId); if (s) fn(s) })
  const withEl = <T,>(fn: (el: T) => void) =>
    withSec((s) => { const f = findElement(s, selected); if (f) fn(f.el as T) })

  return (
    <aside className="inspector">
      {found?.kind === 'marker' && (
        <fieldset>
          <legend>Marker</legend>
          <label>Type
            <select value={found.el.type} onChange={(e) => withEl<typeof found.el>((m) => { m.type = e.target.value as typeof m.type })}>
              {[['boss', 'Boss'], ['entrance', 'Start'], ['transition', 'Transition'], ['note', 'Note'], ['los', 'LOS pull']].map(([t, label]) =>
                <option key={t} value={t}>{label}</option>)}
            </select>
          </label>
          <label>Order
            <input type="number" min={1} value={found.el.order ?? ''} onChange={(e) =>
              withEl<typeof found.el>((m) => { if (e.target.value) m.order = Number(e.target.value); else delete m.order })} />
          </label>
          <label className="row"><input type="checkbox" checked={!!found.el.optional} onChange={(e) =>
            withEl<typeof found.el>((m) => { if (e.target.checked) m.optional = true; else delete m.optional })} /> Optional</label>
          <label>Text
            <input value={found.el.text ?? ''} onChange={(e) =>
              withEl<typeof found.el>((m) => { if (e.target.value) m.text = e.target.value; else delete m.text })} />
          </label>
          {found.el.type === 'transition' && (
            <label>Goes to section
              <select value={found.el.toSection ?? ''} onChange={(e) =>
                withEl<typeof found.el>((m) => { if (e.target.value) m.toSection = e.target.value; else delete m.toSection })}>
                <option value="">—</option>
                {route.sections.filter((s) => s.id !== secId).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </label>
          )}
        </fieldset>
      )}
      {found?.kind === 'path' && (
        <fieldset>
          <legend>Path · {found.el.points.length} points</legend>
          <label>Arrow
            <select value={found.el.arrow} onChange={(e) => withEl<typeof found.el>((p) => { p.arrow = e.target.value as typeof p.arrow })}>
              <option value="end">end</option><option value="both">both</option><option value="none">none</option>
            </select>
          </label>
          <label>Style
            <select value={found.el.style ?? 'main'} onChange={(e) => withEl<typeof found.el>((p) => { p.style = e.target.value as typeof p.style })}>
              <option value="main">main</option><option value="alt">alternate</option><option value="optional">optional</option>
            </select>
          </label>
          <button onClick={() => withEl<typeof found.el>((p) => { p.points.reverse() })}>Reverse direction</button>
          {vertex !== null && vertex < found.el.points.length ? (
            <button onClick={() => onDeletePoint(vertex)} disabled={found.el.points.length <= 2}
              title={found.el.points.length <= 2 ? 'A path needs at least two points' : 'Delete or Backspace'}>
              Delete point {vertex + 1}
            </button>
          ) : (
            <p className="muted">Click a point to select it, then Delete removes just that point.</p>
          )}
        </fieldset>
      )}
      {found?.kind === 'boundary' && <fieldset><legend>Pull boundary</legend><p className="muted">Drag the end handles to adjust.</p></fieldset>}
      {found && (
        <button className="danger" onClick={() => { withSec((s) => removeElement(s, found.el.id)); setSelected(null) }}>
          Delete {found.kind}
        </button>
      )}

      {sec && (
        <fieldset>
          <legend>Section</legend>
          <label>Title <input value={sec.title} onChange={(e) => withSec((s) => { s.title = e.target.value })} /></label>
          <label>Floor
            <select value={sec.floor} onChange={(e) => onFloorChange(Number(e.target.value))}>
              {(inst.floors.length ? inst.floors : [{ floor: 1, label: 'Custom' }]).map((f) =>
                <option key={f.floor} value={f.floor}>{f.label}</option>)}
            </select>
          </label>
          <label>Custom base image {sec.baseImage && <code>{sec.baseImage}</code>}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              try {
                const p = await uploadBase(inst.slug, f)
                withSec((s) => { s.baseImage = p })
              } catch (err) { alert(`Upload failed: ${err}`) }
            }} />
          </label>
          {sec.baseImage && <button onClick={() => withSec((s) => { delete s.baseImage })}>Use game map instead</button>}
          <label>Notes <textarea value={sec.notes ?? ''} onChange={(e) =>
            withSec((s) => { if (e.target.value) s.notes = e.target.value; else delete s.notes })} /></label>
        </fieldset>
      )}

      <fieldset>
        <legend>Route</legend>
        <YouTubeField key={route.youtube ?? ''} value={route.youtube}
          onChange={(v) => edit((r) => { if (v) r.youtube = v; else delete r.youtube })} />
        <label className="row"><input type="checkbox" checked={route.reviewed}
          onChange={(e) => edit((r) => { r.reviewed = e.target.checked })} /> Reviewed</label>
        <p className="muted">Source: {route.source}. Reviewed routes are never overwritten by <code>build_routes.py</code>.</p>
      </fieldset>
    </aside>
  )
}

/** Run video link. Accepts any common YouTube link and stores it in one standard form. */
function YouTubeField({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const [draft, setDraft] = useState(value ?? '')
  const [error, setError] = useState('')
  const commit = () => {
    if (!draft.trim()) { setError(''); if (value) onChange(undefined); return }
    const url = youtubeUrl(draft)
    if (!url) { setError('That isn’t a YouTube video link. Paste one like https://www.youtube.com/watch?v=… or https://youtu.be/…'); return }
    setError('')
    setDraft(url)
    if (url !== value) onChange(url)
  }
  return (
    <>
      <label>YouTube video
        <input type="url" inputMode="url" placeholder="https://youtu.be/…" value={draft} aria-invalid={!!error}
          onChange={(e) => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }} />
      </label>
      {error ? <p className="field-error" role="alert">{error}</p>
        : <p className="muted">{value ? 'Shows a play icon next to the dungeon name.' : 'Optional. Leave empty and nothing shows.'}</p>}
      {value && <button onClick={() => { setDraft(''); onChange(undefined) }}>Remove video</button>}
    </>
  )
}
