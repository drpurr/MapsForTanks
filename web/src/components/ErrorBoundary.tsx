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
