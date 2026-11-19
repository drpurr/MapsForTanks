# Written guides

One Markdown file per dungeon: `data/guides/<slug>.md` (same slug as `data/routes/<slug>.json`).
When the file exists, the dungeon page shows it in a sidebar beside the map; readers can hide it.

Supported: `#`–`####` headings, paragraphs, `-` and `1.` lists, `>` quotes (shown hand-lettered),
`---`, **bold**, *italic*, `code`, and links (`https://…`, or in-app `#/…`).

A `##` heading whose text matches a route section title (e.g. `## Moonshrine Sanctum`) is
highlighted and scrolled into view while that section is open on the map.

This README isn't served (only lowercase `<slug>.md` files are).
