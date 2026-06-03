---
name: Bundle page card previews
description: Why the /bundle preview grid iframes must load React routes, not static public/*.html
---
The /bundle page's 6-tile preview grid must point its iframes at the live React
card routes (`/card`, `/cosmic`, `/crystal`, `/vinyl`, `/birthday`) with
`?preview=1&autoplay=1&speed=N`, NOT at the static `public/*.html` recipient
entry files.

**Why:** In dev, the `public/*.html` files never boot React (their build-time
`<!-- HS_INJECT_ASSETS -->` placeholder is only replaced at build), so they
freeze on their own pre-React splash ("Reading the stars for you…", "Hey,
{name}!"). What looked like "playing animations" was frozen splash text.

**How to apply:** Card pages carry the autoplay state machines (gated on
`isAutoplay`, scaled by `previewSpeed`). The `index.html` splash script must skip
the splash for ANY `preview=1` load, else /cosmic//crystal//vinyl//birthday
previews show a splash instead of the card. The working reference pattern is
UnlockModal's bottom-sheet "Preview" which builds an autoplay URL from the
current React route.
