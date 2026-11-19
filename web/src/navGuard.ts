// Lets a page veto in-app (hash) navigation, e.g. to ask about unsaved changes.
// The guard returns true to allow the navigation, or false to block it (and handle it itself).
type Guard = (toHash: string) => boolean

let guard: Guard | null = null

export const setNavGuard = (g: Guard | null) => { guard = g }
export const allowNav = (toHash: string) => !guard || guard(toHash)
