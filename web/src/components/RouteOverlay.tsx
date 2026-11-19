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
