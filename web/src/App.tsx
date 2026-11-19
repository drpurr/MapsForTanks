import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { loadInstances, loadRouteIndex, loadRouteVideos } from './data'
import { LoadProblem } from './components/ErrorBoundary'
import { NavBar, type NavSection } from './components/NavBar'
import { CreditsPage } from './pages/CreditsPage'
import { allowNav } from './navGuard'
import { IndexPage, type Filter } from './pages/IndexPage'
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
  const page = useRef(location.hash.split('/').slice(0, 3).join('/'))
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
      // New page: start at the top. Another section of the same dungeon: keep the scroll position.
      const nextPage = location.hash.split('/').slice(0, 3).join('/')
      if (nextPage !== page.current) window.scrollTo(0, 0)
      page.current = nextPage
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
  const [videos, setVideos] = useState<Record<string, string>>({})
  useEffect(() => {
    loadInstances().then(setInstances)
    loadRouteIndex().then((l) => setRouted(new Set(l)))
    loadRouteVideos().then(setVideos)
  }, [path])

  if (!instances) return <div className="book" aria-busy="true" />
  if (instances.length === 0) return <LoadProblem />
  const [route, query = ''] = path.split('?')
  const [, kind, slug, sub] = route.split('/')
  const inst = instances.find((i) => i.slug === slug)

  if (kind === 'edit' && inst && Editor) {
    return <Suspense fallback={<p>Loading editor…</p>}><Editor key={inst.slug} inst={inst} /></Suspense>
  }
  const show = new URLSearchParams(query).get('show')
  const filter: Filter = show === 'raid' || show === 'routes' ? show : 'all'
  const page = kind === 'i' && inst ? 'instance' : kind === 'credits' ? 'credits' : 'index'
  const nav: NavSection = page === 'credits' ? 'credits' : page === 'index' ? (filter === 'raid' ? 'raids' : 'dungeons')
    : inst?.type === 'raid' ? 'raids' : 'dungeons'
  return (
    <>
      <NavBar current={nav} page={`${page}/${slug ?? ''}`} />
      {page === 'instance' && inst ? <InstancePage key={inst.slug} inst={inst} sub={sub} />
        : page === 'credits' ? <CreditsPage />
        : <IndexPage instances={instances} routed={routed} videos={videos} filter={filter} />}
    </>
  )
}
