import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { loadInstances, loadRouteIndex } from './data'
import { LoadProblem } from './components/ErrorBoundary'
import { allowNav } from './navGuard'
import { IndexPage } from './pages/IndexPage'
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
      window.scrollTo(0, 0)
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
  useEffect(() => {
    loadInstances().then(setInstances)
    loadRouteIndex().then((l) => setRouted(new Set(l)))
  }, [path])

  if (!instances) return <div className="book" aria-busy="true" />
  if (instances.length === 0) return <LoadProblem />
  const [, kind, slug] = path.split('/')
  const inst = instances.find((i) => i.slug === slug)

  if (kind === 'i' && inst) return <InstancePage key={inst.slug} inst={inst} />
  if (kind === 'edit' && inst && Editor) {
    return <Suspense fallback={<p>Loading editor…</p>}><Editor key={inst.slug} inst={inst} /></Suspense>
  }
  return <IndexPage instances={instances} routed={routed} />
}
