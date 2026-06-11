---
name: OG/social link previews per route
description: How custom WhatsApp/Instagram/FB link previews are produced for specific routes
---

# Social link previews (Open Graph) are static-HTML only

Social crawlers (WhatsApp, Instagram, Facebook, Twitter) do NOT run JavaScript.
A React route (e.g. reply.tsx) can never set its own OG tags at runtime — the
crawler only sees the HTML the host returns. The root `index.html` has global OG
tags applied to ALL SPA-fallback routes (the main card-share preview lives there
— do NOT change it for per-route needs).

## The pattern (only correct way here)
Per-route custom OG = a build-time prerender that clones the built
`dist/public/index.html` into `dist/public/<route>/index.html` and overrides only
title + og/twitter title/description/url/image + canonical. Cloning the BUILT
index.html (not source) inherits hashed asset/preload tags so the SPA still boots
for real users. Static hosts (vite preview / sirv) resolve `/<route>` →
`/<route>/index.html` before SPA fallback — same mechanism `/messages` relies on.

**Why:** crawlers don't execute JS; query params (`?id=`) don't change file
resolution, so one static `/reply/index.html` covers every reply link.

**How to apply:** add the route to `scripts/prerender-share-pages.mjs` (mirrors
`prerender-messages.mjs`); it's chained in heartsync-ai `build`. ORIGIN is
hardcoded to `https://heartsync.in` (base path is site root).

## OG images are committed static assets, not build-generated
`/reply` uses `public/og-reply.jpg` (1200x630, on-brand gold serif text baked in).
It was generated ONCE via `scripts/gen-reply-og.mjs` (sharp+SVG; sharp lives in
api-server, required via createRequire). That script is intentionally NOT in the
build chain — keep generated OG images committed so the deploy build never depends
on api-server's native sharp. Re-run gen-reply-og.mjs manually only to regenerate.
