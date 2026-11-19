# Theme tokens

## Compact token summary

Dark dungeon-stone UI around parchment type. Route inks match the original MapsForTanks drawings. No Tailwind. No light theme.

### Color
| Token | Value | Role |
| --- | --- | --- |
| `--stone` | `#232c35` | Page background |
| `--stone-raised` | `#2e3944` | Buttons, hover rows, modal |
| `--stone-deep` | `#1c242c` | Inputs, map well, segmented track |
| `--mortar` | `#46535f` | Borders, dividers |
| `--parchment` | `#eadfc8` | Primary text |
| `--lichen` | `#9fadb8` | Secondary text, idle controls |
| `--lamplight` | `#e2bf6a` | Links, active controls, primary button fill |
| lamplight hover | `#ecd08b` | `.caption .open:hover` only |
| `--ink-green` | `#63e6a0` | Tank path, Start, route glyph |
| `--ink-red` | `#ff6b5e` | Pull-boundary strokes |
| `--ink-cyan` | `#4cc9e6` | Boss rings and numbers |
| `--ink-yellow` | `#f6dc84` | Handwritten notes |
| `--ink-orange` | `#ffa552` | LOS badges |
| alt path | `#f28ad8` | `.path-alt` only, not a token |
| `--danger` | `#ff8a7a` | Destructive text |
| boss fill | `#12303a` | Boss circle fill |
| selected | `#fff` | Editor selection stroke |

### Type
- UI: `'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif` (`--ui`)
- Hand: `'Patrick Hand', 'Comic Neue', cursive` (`--hand`) — map annotations, empty-map message, section notes
- Loaded from Google Fonts in `web/index.html`: Barlow Semi Condensed 400/500/600/700 + italic 400, Patrick Hand
- Scale (1.25 on a 17px base): `--t-sm` 0.8125rem, `--t-base` 1.0625rem, `--t-md` 1.25rem, `--t-lg` 1.5625rem, `--t-xl` 1.9375rem, `--t-2xl` 2.4375rem, `--t-3xl` 3.0625rem
- Body line-height 1.45. Headings weight 700, letter-spacing -0.005em.
- `color-scheme: dark`

### Space, radius, shadow, breakpoints
- Page padding: book `32px 24px 48px` (20/16/40 under 820px); instance `24px 24px 48px`; columns gap 44px
- Radius: buttons 6px, inputs and segmented and open-link 7px, map frame 4px, zoom stage 6px, modal 10px, focus ring 3px
- Map shadow: `0 1px 0 var(--mortar), 0 22px 48px rgba(10, 14, 18, 0.55)`
- Modal shadow: `0 18px 48px rgba(10, 14, 18, 0.6)`
- Editor bar: sticky, `rgba(35, 44, 53, 0.94)` plus 6px blur
- Breakpoints: 960px editor stacks to one column; 820px the book stacks, the preview hides, the wordmark drops to `--t-2xl`, the zoom stage uses the map aspect ratio instead of a viewport height
- Motion: route strokes draw in over 0.9s (`ink`), markers fade in after 0.7s (`settle`). Disabled under `prefers-reduced-motion`.
- Focus: 2px lamplight outline, 2px offset

## Raw source

`web/index.html` font links and theme-color `#232c35`. No `tailwind.config`. No theme provider.

### `web/src/index.css`

```css
/* Tank Maps: dungeon stone around parchment maps. Route inks are the MapsForTanks colours. */
:root {
  --stone: #232c35;
  --stone-raised: #2e3944;
  --stone-deep: #1c242c;
  --mortar: #46535f;
  --parchment: #eadfc8;
  --lichen: #9fadb8;
  --lamplight: #e2bf6a;
  --ink-green: #63e6a0;
  --ink-red: #ff6b5e;
  --ink-cyan: #4cc9e6;
  --ink-yellow: #f6dc84;
  --ink-orange: #ffa552;
  --danger: #ff8a7a;

  /* 1.25 scale on a 17px condensed base */
  --t-sm: 0.8125rem;
  --t-base: 1.0625rem;
  --t-md: 1.25rem;
  --t-lg: 1.5625rem;
  --t-xl: 1.9375rem;
  --t-2xl: 2.4375rem;
  --t-3xl: 3.0625rem;

  --ui: 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif;
  --hand: 'Patrick Hand', 'Comic Neue', cursive;

  color-scheme: dark;
  font-family: var(--ui);
  line-height: 1.45;
  color: var(--parchment);
  background: var(--stone);
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--stone); font-size: var(--t-base); }
a { color: var(--lamplight); text-underline-offset: 0.18em; text-decoration-thickness: 1px; }
a:hover { text-decoration-thickness: 2px; }
:focus-visible { outline: 2px solid var(--lamplight); outline-offset: 2px; border-radius: 3px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.muted { color: var(--lichen); }
h1, h2 { font-weight: 700; letter-spacing: -0.005em; }

button {
  font: inherit; color: var(--parchment); background: var(--stone-raised); border: 1px solid var(--mortar);
  border-radius: 6px; padding: 6px 12px; cursor: pointer;
}
button:hover { border-color: var(--lichen); }
button.on { background: var(--lamplight); color: var(--stone-deep); border-color: var(--lamplight); }
button.primary { background: var(--lamplight); color: var(--stone-deep); border-color: var(--lamplight); font-weight: 600; }
button.danger { color: var(--danger); }
button:disabled { opacity: 0.5; cursor: not-allowed; }
kbd { font: inherit; font-size: 0.75em; opacity: 0.65; margin-left: 3px; }

/* segmented control: one outline, divided options */
.segmented { display: inline-flex; border: 1px solid var(--mortar); border-radius: 7px; overflow: hidden; background: var(--stone-deep); }
.segmented button { border: 0; border-radius: 0; background: transparent; color: var(--lichen); padding: 7px 14px; }
.segmented button + button { border-left: 1px solid var(--mortar); }
.segmented button.on { background: var(--lamplight); color: var(--stone-deep); font-weight: 600; }
.segmented button:focus-visible { outline-offset: -3px; }

/* ---------- index: the route book ---------- */
.book { max-width: 1320px; margin: 0 auto; padding: 32px 24px 48px; }
.masthead { display: grid; grid-template-columns: 1fr auto; gap: 4px 32px; align-items: end; padding-bottom: 28px; }
.wordmark { font-size: var(--t-3xl); line-height: 1; margin: 0; }
.lede { grid-column: 1; margin: 6px 0 0; font-size: var(--t-md); color: var(--lichen); max-width: 52ch; }
.controls { grid-column: 2; grid-row: 1 / span 2; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
.search input {
  font: inherit; color: var(--parchment); background: var(--stone-deep); border: 1px solid var(--mortar);
  border-radius: 7px; padding: 7px 12px; width: 15rem;
}
.search input::placeholder { color: var(--lichen); opacity: 0.8; }

.book-body { display: grid; grid-template-columns: minmax(250px, 330px) 1fr; gap: 44px; align-items: start; }
.contents h2 { font-size: var(--t-base); font-weight: 600; color: var(--lichen); margin: 22px 0 4px; }
.contents .zone:first-child h2 { margin-top: 0; }
.contents ul { list-style: none; margin: 0; padding: 0; }
.contents li { position: relative; }
.contents li > a:first-child {
  display: flex; align-items: baseline; gap: 8px; padding: 4px 10px; margin: 0 -10px;
  border-radius: 5px; color: var(--lichen); text-decoration: none; font-size: var(--t-md);
}
.contents li.has-route > a:first-child { color: var(--parchment); font-weight: 500; }
.contents li > a:first-child:hover, .contents li.current > a:first-child { background: var(--stone-raised); color: var(--lamplight); }
.contents .kind { font-size: var(--t-sm); font-style: italic; color: var(--lichen); font-weight: 400; }
.route-glyph { width: 26px; height: 13px; flex: none; align-self: center; margin-left: auto; fill: none; stroke: var(--ink-green); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.contents .edit-link { position: absolute; right: -44px; top: 7px; font-size: var(--t-sm); opacity: 0; }
.contents li:hover .edit-link, .contents .edit-link:focus { opacity: 1; }
.nothing { color: var(--lichen); }

.preview { position: sticky; top: 20px; }
.caption { display: grid; grid-template-columns: 1fr auto; gap: 2px 24px; align-items: end; margin-top: 16px; }
.caption h2 { font-size: var(--t-2xl); line-height: 1.05; margin: 0; }
.caption p { margin: 0; color: var(--lichen); font-size: var(--t-md); grid-column: 1; }
.caption .open {
  grid-column: 2; grid-row: 1 / span 2; background: var(--lamplight); color: var(--stone-deep); font-weight: 600;
  text-decoration: none; border-radius: 7px; padding: 9px 18px; white-space: nowrap;
}
.caption .open:hover { background: #ecd08b; }
.colophon { margin-top: 56px; padding-top: 16px; border-top: 1px solid var(--mortar); color: var(--lichen); font-size: var(--t-sm); }

.nomap {
  display: grid; place-items: center; aspect-ratio: 1002 / 668; border: 1.5px dashed var(--mortar); border-radius: 6px;
  background: var(--stone-deep); padding: 24px; text-align: center;
}
.nomap p { font-family: var(--hand); font-size: var(--t-xl); color: var(--lichen); max-width: 22ch; margin: 0; line-height: 1.2; }

/* ---------- instance ---------- */
.instance { max-width: 1600px; margin: 0 auto; padding: 24px 24px 48px; min-height: 60vh; }
.back { color: var(--lichen); text-decoration: none; }
.back:hover { color: var(--lamplight); text-decoration: underline; }
.instance-head { margin: 10px 0 18px; }
.instance-head h1 { font-size: var(--t-3xl); line-height: 1; margin: 0; }
.where { margin: 6px 0 0; color: var(--lichen); font-size: var(--t-md); }

.steps { display: flex; flex-wrap: wrap; gap: 10px 28px; align-items: center; margin-bottom: 16px; }
.steps ol { display: flex; flex-wrap: wrap; list-style: none; margin: 0; padding: 0; gap: 6px 0; }
.steps li { display: flex; align-items: center; }
.steps li + li::before { content: ''; width: 18px; height: 2px; background: var(--mortar); margin: 0 4px; }
.steps button { display: inline-flex; align-items: center; gap: 8px; background: transparent; border: 0; color: var(--lichen); padding: 5px 8px 5px 4px; }
.steps .n {
  display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 50%;
  border: 1.5px solid var(--mortar); font-weight: 700; font-size: var(--t-sm); color: var(--lichen);
}
.steps button:hover { color: var(--parchment); }
.steps button[aria-current] { color: var(--parchment); font-weight: 600; }
.steps button[aria-current] .n { background: var(--lamplight); border-color: var(--lamplight); color: var(--stone-deep); }
.other-maps { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; color: var(--lichen); font-size: var(--t-sm); }
.other-maps span { margin-right: 4px; }
.other-maps button { font-size: var(--t-sm); padding: 3px 9px; color: var(--lichen); }
.other-maps button[aria-current] { color: var(--stone-deep); background: var(--lamplight); border-color: var(--lamplight); }

.instance-foot { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 14px; text-align: center; }
.legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 22px; list-style: none; margin: 0; padding: 0; color: var(--lichen); }
.legend li { display: inline-flex; align-items: center; gap: 7px; }
.legend svg { height: 22px; width: auto; overflow: visible; }
.legend text { font: 700 11px var(--ui); text-anchor: middle; fill: var(--ink-cyan); }
.lg-path { fill: none; stroke: var(--ink-green); stroke-width: 3; stroke-linecap: round; }
.lg-boundary { stroke: var(--ink-red); stroke-width: 4; stroke-linecap: round; }
.lg-boss { fill: #12303a; stroke: var(--ink-cyan); stroke-width: 2; }
.lg-boss.optional { stroke-dasharray: 3 2.5; }
.lg-los { font: 700 11px/1 var(--ui); color: var(--stone-deep); background: var(--ink-orange); border-radius: 4px; padding: 4px 6px; letter-spacing: 0.04em; }
.lg-start { font: 21px/1 var(--hand); color: var(--ink-green); text-shadow: 0 0 3px rgba(36, 24, 8, 0.9); }
.credit, .note { margin: 0; color: var(--lichen); max-width: 75ch; }
.note { font-family: var(--hand); font-size: var(--t-md); color: var(--ink-yellow); }

/* ---------- map view ---------- */
.mapview {
  position: relative; width: 100%; overflow: hidden; border-radius: 4px; background: var(--stone-deep);
  box-shadow: 0 1px 0 var(--mortar), 0 22px 48px rgba(10, 14, 18, 0.55); user-select: none;
}
.mapview-base, .mapview-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.mapview-source { position: absolute; inset: 0; pointer-events: none; }
.mapview-source img { position: absolute; left: 0; top: 0; transform-origin: 0 0; max-width: none; }
.mapview-svg { touch-action: none; }

/* ---------- route overlay (SVG, floor-pixel space) ---------- */
.route polyline { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.route .hit { stroke: transparent; stroke-width: 14; }
.route .path-outline { stroke: rgba(28, 18, 6, 0.6); stroke-width: 7.5; }
.route .path { stroke: var(--ink-green); stroke-width: 3.6; }
.route .path-alt { stroke: #f28ad8; }
.route .path-optional { stroke-dasharray: 9 7; }
.route .arrowhead { fill: var(--ink-green); stroke: rgba(28, 18, 6, 0.7); stroke-width: 0.7; }
.route .boundary { stroke: var(--ink-red); stroke-width: 4.5; filter: drop-shadow(0 0 1.5px rgba(28, 18, 6, 0.9)); }
.route .selected { stroke: #fff !important; }
.marker text { text-anchor: middle; pointer-events: none; }
.marker-boss circle { fill: #12303a; stroke: var(--ink-cyan); stroke-width: 2.5; }
.marker-boss.optional circle { stroke-dasharray: 4 3; }
.marker-boss text { fill: #c4f2ff; font: 700 15px var(--ui); }
/* "Start" is lettered like the other annotations, in the route's green so it reads as the path's beginning */
.marker-entrance text {
  font: 25px var(--hand); fill: var(--ink-green); stroke: rgba(28, 18, 6, 0.9); stroke-width: 5px;
  paint-order: stroke; stroke-linejoin: round;
}
.marker .hitbox { fill: transparent; }
.marker-los rect { fill: var(--ink-orange); stroke: rgba(28, 18, 6, 0.85); stroke-width: 1.5; }
.marker-los text { fill: var(--stone-deep); font: 700 13px var(--ui); letter-spacing: 0.04em; }
.marker-transition text, .marker-note text {
  font: 21px var(--hand); fill: var(--ink-yellow); stroke: rgba(36, 24, 8, 0.85); stroke-width: 4.5px;
  paint-order: stroke; stroke-linejoin: round;
}
.marker-note text { fill: #f3efe2; }
.marker.selected circle, .marker.selected path, .marker-los.selected rect { stroke: #fff; stroke-width: 3; }
.marker.selected .hitbox { stroke: #fff; stroke-dasharray: 4 3; stroke-width: 1.5; }

/* the one motion moment: routes draw themselves in, then the markers settle */
.route.draw .path, .route.draw .path-outline {
  stroke-dasharray: 1; stroke-dashoffset: 1;
  animation: ink 0.9s cubic-bezier(0.3, 0.1, 0.3, 1) forwards;
  animation-delay: calc(var(--i, 0) * 45ms);
}
.route.draw .marker { opacity: 0; animation: settle 0.35s ease-out forwards; animation-delay: 0.7s; }
@keyframes ink { to { stroke-dashoffset: 0; } }
@keyframes settle { to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .route.draw .path, .route.draw .path-outline, .route.draw .marker { animation: none; stroke-dashoffset: 0; opacity: 1; }
}

/* ---------- editor (dev only) ---------- */
.editor { padding: 0 12px 12px; }
/* toolbar floats at the top while the page scrolls under it */
.editor-bar {
  position: sticky; top: 0; z-index: 5; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
  margin: 0 -12px; padding: 8px 12px; background: rgba(35, 44, 53, 0.94); backdrop-filter: blur(6px);
  border-bottom: 1px solid var(--mortar); box-shadow: 0 6px 18px rgba(10, 14, 18, 0.35);
}
.editor-body > .sections, .editor-body > .inspector {
  position: sticky; top: calc(var(--bar-h, 56px) + 10px);
  max-height: calc(100vh - var(--bar-h, 56px) - 20px); overflow-y: auto; overscroll-behavior: contain;
}
.dev-badge { background: var(--ink-red); color: var(--stone-deep); font-size: var(--t-sm); font-weight: 700; padding: 1px 8px; border-radius: 4px; }
.tools { display: flex; gap: 4px; flex-wrap: wrap; }
.status { color: var(--lichen); font-size: var(--t-sm); }
.editor-body { display: grid; grid-template-columns: 200px 1fr 260px; gap: 12px; margin-top: 10px; align-items: start; }
.sections { display: flex; flex-direction: column; gap: 6px; }
.sections button { text-align: left; }
.sections small { display: block; color: var(--lichen); font-size: var(--t-sm); }
.sections button.on small { color: #4a3a17; }
.opacity { display: flex; flex-direction: column; font-size: var(--t-sm); color: var(--lichen); margin-top: 10px; }
.hint { margin: 0 0 6px; color: var(--lichen); font-size: var(--t-sm); }
.mapview-svg.editing { cursor: crosshair; }
.mapview-svg.tool-select { cursor: default; }
.mapview-svg.tool-select .route > g { cursor: move; }
.handle { fill: #fff; stroke: #000; stroke-width: 2; cursor: grab; }
.handle.active { fill: var(--lamplight); stroke: #fff; stroke-width: 2.5; }
.draft { fill: none; stroke: #fff; stroke-width: 2.5; stroke-dasharray: 6 4; }
.editor .empty { padding: 40px; text-align: center; background: var(--stone-deep); border: 1.5px dashed var(--mortar); border-radius: 6px; color: var(--lichen); }
.inspector { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.inspector fieldset { border: 1px solid var(--mortar); border-radius: 7px; padding: 8px 10px 10px; display: flex; flex-direction: column; gap: 8px; }
.inspector legend { color: var(--lamplight); font-size: var(--t-sm); font-weight: 600; padding: 0 4px; }
.inspector label { display: flex; flex-direction: column; gap: 3px; font-size: var(--t-sm); color: var(--lichen); }
.inspector label.row { flex-direction: row; align-items: center; gap: 6px; color: var(--parchment); }
.inspector input:not([type=checkbox]), .inspector select, .inspector textarea {
  font: inherit; color: var(--parchment); background: var(--stone-deep); border: 1px solid var(--mortar);
  border-radius: 5px; padding: 5px 7px; width: 100%; min-width: 0;
}
.inspector textarea { min-height: 60px; resize: vertical; }
.inspector code { font-size: 0.75rem; color: var(--parchment); word-break: break-all; }
.inspector p { margin: 0; font-size: var(--t-sm); }
.modal-backdrop { position: fixed; inset: 0; background: rgba(16, 21, 26, 0.7); display: grid; place-items: center; z-index: 10; padding: 16px; }
.modal { background: var(--stone-raised); border: 1px solid var(--mortar); border-radius: 10px; padding: 18px 20px; max-width: 440px; width: 100%; box-shadow: 0 18px 48px rgba(10, 14, 18, 0.6); }
.modal h2 { margin: 0 0 8px; font-size: var(--t-lg); color: var(--lamplight); }
.modal p { margin: 0 0 12px; }
.modal .error { color: var(--danger); font-size: var(--t-sm); }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }

/* ---------- small screens ---------- */
@media (max-width: 960px) {
  .editor-body { grid-template-columns: 1fr; }
  .editor-body > .sections, .editor-body > .inspector { position: static; max-height: none; overflow: visible; }
}
@media (max-width: 820px) {
  .book { padding: 20px 16px 40px; }
  .masthead { grid-template-columns: 1fr; }
  .controls { grid-column: 1; grid-row: auto; justify-content: flex-start; margin-top: 14px; }
  .search, .search input { width: 100%; }
  .book-body { grid-template-columns: 1fr; }
  .preview { display: none; }
  .contents .edit-link { position: static; opacity: 1; margin-left: 6px; }
  .instance { padding: 16px 16px 40px; }
  .instance-head h1 { font-size: var(--t-2xl); }
  .wordmark { font-size: var(--t-2xl); }
}

.instance > .nomap { aspect-ratio: auto; min-height: 220px; }

/* zoomable map frame: as tall as the window allows; the map starts filled to its width */
.zoom-stage {
  position: relative; overflow: hidden; height: clamp(420px, calc(100vh - 236px), 1200px);
  border-radius: 6px; background: var(--stone-deep); box-shadow: 0 1px 0 var(--mortar), 0 22px 48px rgba(10, 14, 18, 0.55);
  cursor: grab; user-select: none;
}
.zoom-stage:active { cursor: grabbing; }
.zoom-content { position: absolute; left: 0; top: 0; transform-origin: 0 0; will-change: transform; }
.zoom-content .mapview { border-radius: 0; box-shadow: none; }
.zoom-controls {
  position: absolute; right: 12px; bottom: 12px; display: flex; gap: 0; z-index: 2;
  border: 1px solid var(--mortar); border-radius: 7px; overflow: hidden; background: rgba(28, 36, 44, 0.9);
  box-shadow: 0 4px 14px rgba(10, 14, 18, 0.45); cursor: default;
}
.zoom-controls button { border: 0; border-radius: 0; background: transparent; min-width: 38px; height: 36px; padding: 0 10px; font-size: var(--t-md); line-height: 1; }
.zoom-controls button + button { border-left: 1px solid var(--mortar); }
.zoom-controls button.whole { font-size: var(--t-sm); }
.zoom-controls button:hover:not(:disabled) { background: var(--stone-raised); color: var(--lamplight); }
.credit-line { margin: 18px 0 0; text-align: center; font-size: var(--t-sm); color: var(--lichen); }
@media (max-width: 820px) {
  .contents .edit-link { display: none; }
  .zoom-stage { height: auto; aspect-ratio: 1002 / 668; }
}

/* error and load-failure screens */
.problem { max-width: 60ch; margin: 12vh auto 0; padding: 0 16px; }
.problem h1 { font-size: var(--t-2xl); line-height: 1.1; margin: 0 0 12px; }
.problem p { margin: 0 0 12px; font-size: var(--t-md); }
.problem code { font-size: 0.9em; color: var(--lamplight); }
```
