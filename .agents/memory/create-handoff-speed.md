---
name: Create→card handoff speed
description: Why the send→card redirect delay should stay small, and why the card pages don't need it for a smooth handoff.
---

# Create→card handoff speed

After a sender taps "create" on the send page, the app shows a brief "creating your card"
screen and then does a full-document `window.location.href` navigation to the card page
(e.g. `/birthday.html`). The wait before that navigation is controlled by
`CREATE_REDIRECT_DELAY_MS` in `send.tsx` (used by both create-flow redirects — premium incl.
birthday, and envelope). The post-payment redirects use their own (longer) delay and are
intentionally NOT tied to this constant.

**Rule:** keep `CREATE_REDIRECT_DELAY_MS` small. It used to be 1800ms, which production data
showed was the single dominant latency component in the create→Scene 1 path (~21% of
birthday senders never reached Scene 1; p50 time-to-scene1 ≈ 2.5s, of which 1.8s was this
timer). Cutting it is the highest-confidence, lowest-risk latency win.

**Why it's safe to keep small:** the card entry HTML files (e.g. `public/birthday.html`)
render a full-screen static splash (`#hs-splash`, z-index 9999) immediately on document load.
That splash covers the ENTIRE SPA boot (including the lazy route chunk) and is only removed
when React calls `window.__clearHsSplash()` — which the card page does in a mount `useEffect`
the moment its first scene paints. So there is **no blank/white gap** between navigation and
first frame; the pre-redirect delay buys nothing visually and is pure dead time.

**How to apply:** don't reintroduce a large fixed delay before the create redirect "for a
loading feel" — the destination already has a branded splash. No create-path async work
depends on the delay: `incrementUsage()` and signed-in `/api/cards` creation are awaited
first, `clearDraft()` is synchronous, and `card_created` is sent with `keepalive` so it
survives navigation. Background sticker generation is fire-and-forget (Scene 5 polls and
falls back to the full photo), so a faster redirect does not break it.
