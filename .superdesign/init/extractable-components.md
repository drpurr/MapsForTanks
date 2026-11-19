# Extractable components

No shared layout component is used on more than one route. Masthead, instance header, editor bar, legend, and colophon are written inside their page files. Do not extract them as reusable DraftComponents for a first redesign of a single page; they are not shared chrome.

## MapView
- Source: `web/src/components/MapView.tsx`
- Category: basic
- Description: Aspect-ratio map frame with floor art and an SVG overlay slot
- Extractable props: none that change per page beyond the image URL, which is content
- Hardcoded: `.mapview` frame, shadow, radius, stone-deep well

## ZoomPan
- Source: `web/src/components/ZoomPan.tsx`
- Category: basic
- Description: Pan and zoom stage with +, −, and Whole map
- Extractable props: none
- Hardcoded: control labels, bottom-right cluster, stone well

## RouteGlyph
- Source: `web/src/pages/IndexPage.tsx`
- Category: basic
- Description: Small green route arrow beside instances that have a route
- Extractable props: none
- Hardcoded: path geometry, `.route-glyph` stroke
