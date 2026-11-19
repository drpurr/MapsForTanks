import { useEffect, useMemo, useState } from 'react'
import { MapView } from '../components/MapView'
import { GuideSidebar } from '../components/GuideSidebar'
import { MapCredit } from '../components/MapCredit'
import { RouteOverlay } from '../components/RouteOverlay'
import { YouTubeLink } from '../components/YouTubeLink'
import { ZoomPan } from '../components/ZoomPan'
import { loadGuide, loadRoute, routeBounds, routeSummary, sectionBase, transitionTarget } from '../data'
import type { Instance, Marker, Route } from '../types'

/**
 * One dungeon. The section is part of the URL so it can be linked, bookmarked and stepped
 * through with Back: #/i/<slug>/<n> for the n-th route section, #/i/<slug>/map-<floor> for a
 * map without a route. A bare #/i/<slug> opens the first section.
 */
export function InstancePage({ inst, sub }: { inst: Instance; sub?: string }) {
  const [route, setRoute] = useState<Route | null | undefined>(undefined)
  useEffect(() => { loadRoute(inst.slug).then(setRoute) }, [inst])
  const [loadedGuide, setLoadedGuide] = useState<{ slug: string; text: string | null }>()
  useEffect(() => { loadGuide(inst.slug).then((text) => setLoadedGuide({ slug: inst.slug, text })) }, [inst])
  const guide = loadedGuide?.slug === inst.slug ? loadedGuide.text : null
  const [guideHidden, setGuideHidden] = useState(() => readGuideHidden())
  const toggleGuide = (hidden: boolean) => { setGuideHidden(hidden); writeGuideHidden(hidden) }
  const showGuide = guide !== null && !guideHidden

  const sections = useMemo(() => route?.sections ?? [], [route])
  const otherFloors = inst.floors.filter((f) => !sections.some((s) => s.floor === f.floor))
  const n = sub && /^\d+$/.test(sub) ? Number(sub) : NaN
  const mapFloor = sub?.match(/^map-(\d+)$/) ? Number(sub.slice(4)) : NaN
  const secIndex = sections[n - 1] ? n - 1 : !isNaN(mapFloor) || !sections.length ? -1 : 0
  const sec = secIndex >= 0 ? sections[secIndex] : undefined
  const floor = sec ? sec.floor : !isNaN(mapFloor) ? mapFloor : inst.floors[0]?.floor
  const base = sec ? sectionBase(inst, sec) : floor ? sectionBase(inst, { floor }) : null
  const focus = sec && base ? routeBounds(sec, base.size) ?? undefined : undefined
  const mapCredit = sec?.baseImage ? undefined : inst.floors.find((f) => f.floor === floor)?.credit
  const sectionHref = (i: number) => `#/i/${inst.slug}/${i + 1}`

  useEffect(() => {
    const where = sec && sections.length > 1 ? `${inst.name}: ${sec.title}` : inst.name
    document.title = `${where} – Tank Maps`
  }, [inst, sec, sections.length])

  if (route === undefined) return <main className="instance" aria-busy="true" />

  const linkFor = (m: Marker) => {
    const t = transitionTarget(m, sections, secIndex)
    return t >= 0 ? { href: sectionHref(t), label: `Go to ${sections[t].title}` } : undefined
  }

  return (
    <main className="instance">
      <header className="instance-head">
        <div className="title-row">
          <h1>{inst.name}</h1>
          <YouTubeLink url={route?.youtube} name={inst.name} />
          {guide !== null && guideHidden && (
            <button type="button" className="guide-show" onClick={() => toggleGuide(false)}>Show guide</button>
          )}
        </div>
        <p className="where">
          {inst.type === 'raid' ? 'Raid' : 'Dungeon'}{inst.zone ? ` in ${inst.zone}` : ''}
          {sections.length > 0 && `. ${routeSummary(sections)}.`}
        </p>
      </header>

      {(sections.length > 1 || (sections.length > 0 && otherFloors.length > 0) || otherFloors.length > 1) && (
        <nav className="steps" aria-label="Route sections, in order">
          {sections.length > 0 && (
            <ol>
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={sectionHref(i)} aria-current={i === secIndex ? 'step' : undefined}>
                    <span className="n">{i + 1}</span>{s.title}
                  </a>
                </li>
              ))}
            </ol>
          )}
          {otherFloors.length > 0 && (
            <div className="other-maps">
              <span>{sections.length ? 'Maps without a route' : 'Maps'}</span>
              {otherFloors.map((f) => (
                <a key={f.floor} href={`#/i/${inst.slug}/map-${f.floor}`}
                  aria-current={!sec && floor === f.floor ? 'page' : undefined}>{f.label}</a>
              ))}
            </div>
          )}
        </nav>
      )}

      <div className={showGuide ? 'instance-body with-guide' : 'instance-body'}>
      <div className="instance-map">
      {base ? (
        <ZoomPan key={sec?.id ?? `floor-${floor}`} aspect={base.size[1] / base.size[0]} focus={focus}>
          <MapView base={base.src} size={base.size}>
            {(size) => sec && <RouteOverlay key={sec.id} section={sec} size={size} linkFor={linkFor} draw />}
          </MapView>
        </ZoomPan>
      ) : (
        <div className="nomap">
          <p>The Forever client ships no map for {inst.name}, and nobody has drawn one yet.</p>
        </div>
      )}

      <footer className="instance-foot">
        {sec && <Legend links={sec.markers.some((m) => linkFor(m))} />}
        {sec?.notes && <p className="note">{sec.notes}</p>}
        {!sec && base && <p className="credit">No route on this map yet.</p>}
      </footer>
      </div>
      {showGuide && <GuideSidebar text={guide} current={sec?.title} onHide={() => toggleGuide(true)} />}
      </div>
      {sec?.sourceUrl && (
        <p className="credit-line">
          Drawn from the <a href={sec.sourceUrl} target="_blank" rel="noreferrer">MapsForTanks guide</a>.
        </p>
      )}
      {mapCredit && <MapCredit credit={mapCredit} className="credit-line" />}
    </main>
  )
}

const GUIDE_KEY = 'tankmaps.guideHidden'
function readGuideHidden() {
  try { return localStorage.getItem(GUIDE_KEY) === '1' } catch { return false }
}
function writeGuideHidden(hidden: boolean) {
  try { if (hidden) localStorage.setItem(GUIDE_KEY, '1'); else localStorage.removeItem(GUIDE_KEY) } catch { /* storage blocked */ }
}

function Legend({ links }: { links: boolean }) {
  return (
    <ul className="legend" aria-label="Legend">
      <li><svg viewBox="0 0 30 12" aria-hidden="true"><path className="lg-path" d="M2 8c8-6 14 2 24-3" /></svg>Tank path</li>
      <li><svg viewBox="0 0 12 18" aria-hidden="true"><path className="lg-boundary" d="M6 2v14" /></svg>Stop and pull here</li>
      <li><svg viewBox="0 0 22 22" aria-hidden="true"><circle className="lg-boss" cx="11" cy="11" r="9" /><text x="11" y="15">1</text></svg>Boss, in kill order</li>
      <li><svg viewBox="0 0 22 22" aria-hidden="true"><circle className="lg-boss optional" cx="11" cy="11" r="9" /><text x="11" y="15">★</text></svg>Optional boss</li>
      <li><span className="lg-los" aria-hidden="true">LOS</span>Line-of-sight pull spot</li>
      <li><span className="lg-start" aria-hidden="true">Start</span>Dungeon entrance</li>
      {links && <li><span className="lg-goto" aria-hidden="true">To next area</span>Click to open that map</li>}
    </ul>
  )
}
