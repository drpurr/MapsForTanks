# Tank Maps design system

## Product
Tank Maps is a reading tool for World of Warcraft Forever tanks. It shows pull routes for Classic-era dungeons and raids, drawn on the game's own floor maps. Routes are adapted from the 2011–12 MapsForTanks image guides. The public site has two screens: a route book (`#/`) and a single-instance map (`#/i/:slug`). A dev-only editor (`#/edit/:slug`) is not part of the public UI.

The reader is a tank who wants the next pull, the boss order, and where to stand. They scan by zone, open one dungeon, and follow numbered sections on a map they can zoom.

## Voice
Plain, specific, a little handwritten where the original guides were lettered by hand. No marketing slogans. Example copy that already exists and should stay recognizable:
- Wordmark: Tank Maps
- Lede: Pull routes for every WoW Forever dungeon and raid, drawn on the in-game maps.
- Search placeholder: Find a dungeon or zone
- Filters: Everything / Has a route / Raids
- Empty search: Nothing matches “{query}”. Try a zone name, like Feralas.
- Empty map: The Forever client ships no map for {name} yet.
- Primary action: Open route / View maps / View details
- Back: Back to all dungeons
- Colophon: Routes adapted from the MapsForTanks guides. Map art belongs to Blizzard Entertainment.

## Brand
There is no logo lockup in the page. The wordmark is the text "Tank Maps" in Barlow Semi Condensed, weight 700, size `--t-3xl`, parchment color, tight line-height. Do not replace it with initials, an emoji, a shield icon, or an invented mark. The only drawn mark in the index list is the small green route arrow (RouteGlyph) next to instances that have a route.

Favicon (`web/public/favicon.svg`) is a 32px stone tile with that same green arrow. It is a browser icon, not a header logo.

## Color
Use only these. Do not add purple, neon, pink gradients, or a new accent.

- Stone page `#232c35`, raised `#2e3944`, deep well `#1c242c`
- Mortar borders `#46535f`
- Parchment text `#eadfc8`, lichen secondary `#9fadb8`
- Lamplight `#e2bf6a` for links, the active filter, the primary button, and the current step number. Hover on the open-route button is `#ecd08b`. Active button text is deep stone `#1c242c`.
- Route inks, used on the map and the legend only: green path `#63e6a0`, red stop `#ff6b5e`, cyan bosses `#4cc9e6` on `#12303a`, yellow notes `#f6dc84`, orange LOS `#ffa552`, pink alternate path `#f28ad8`
- Danger text `#ff8a7a`

## Type
- UI: Barlow Semi Condensed, fallback Arial Narrow, system-ui. Weights 400, 500, 600, 700. Italic 400 for the small "raid" and "no map" tags.
- Hand: Patrick Hand for Start, transition labels, section notes, and the empty-map sentence. Not for UI chrome, buttons, or the wordmark.
- Sizes: 0.8125rem, 1.0625rem, 1.25rem, 1.5625rem, 1.9375rem, 2.4375rem, 3.0625rem.

## Components
- Buttons: 6px radius, 1px mortar border, raised stone fill, parchment text. Primary and `.on` flip to lamplight fill and deep-stone text, weight 600.
- Segmented filter: one deep-stone track, mortar outline, 7px radius, options divided by mortar rules. The selected option is lamplight.
- Search: deep-stone field, mortar border, 7px radius, padding 7px 12px, placeholder in lichen.
- Links: lamplight, underline offset 0.18em. The back link and contents rows are lichen until hover, then lamplight, and the row hover fills with raised stone.
- Map frame: deep-stone well, 4px radius, the long stone shadow. Zoom stage is taller (about viewport minus chrome), 6px radius, with a bottom-right cluster of + / − / Whole map.
- Legend sits centered under the map: path, stop line, numbered boss, dashed optional boss, LOS pill, handwritten Start.
- Focus ring: 2px lamplight, 2px offset.

## Layout
- Index desktop: max-width 1320px. Masthead is wordmark plus lede on the left, search and filter on the right. Body is a 250–330px contents column and a sticky preview. Caption under the preview: name, one-line summary, lamplight "Open route" button.
- Index under 820px: one column, preview hidden, filters wrap, search full width.
- Instance: max-width 1600px. Back link, then a large title, then a where-line. Section steps are a row of numbered circles joined by mortar dashes. The current step's number is a lamplight disc.

## Motion
One moment: when a route is shown, the green path draws itself in over 0.9s and the markers settle after. Respect reduced motion by showing the finished route immediately. No other animation.

## Redesign constraint
Layout, density, and what is emphasized may change. Fonts, the color tokens above, the route inks, the handwritten notes, and the real dungeon names may not. Do not introduce fonts, colors, gradients, or component styles that are not defined here.
