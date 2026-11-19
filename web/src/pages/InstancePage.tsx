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
