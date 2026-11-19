# Page dependency trees

Local imports only. `node_modules` omitted. CSS is global, imported once from `main.tsx`.

## `#/` Index
Entry: `web/src/pages/IndexPage.tsx`
Dependencies:
- web/src/components/MapView.tsx
- web/src/components/RouteOverlay.tsx
- web/src/data.ts
- web/src/types.ts
- web/src/index.css (global, via web/src/main.tsx)
Reached from:
- web/src/App.tsx
  - web/src/components/ErrorBoundary.tsx
  - web/src/navGuard.ts

## `#/i/:slug` Instance
Entry: `web/src/pages/InstancePage.tsx`
Dependencies:
- web/src/components/MapView.tsx
- web/src/components/RouteOverlay.tsx
- web/src/components/ZoomPan.tsx
- web/src/data.ts
- web/src/types.ts
- web/src/index.css
Reached from:
- web/src/App.tsx

## `#/edit/:slug` Editor (dev only)
Entry: `web/src/editor/Editor.tsx`
Dependencies:
- web/src/components/MapView.tsx
- web/src/components/RouteOverlay.tsx
- web/src/editor/Inspector.tsx
  - web/src/editor/state.ts
- web/src/editor/state.ts
- web/src/data.ts
- web/src/types.ts
- web/src/navGuard.ts
- web/src/index.css
