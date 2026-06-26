---
name: Reply final-screen preview must never be blank
description: How the reply flow's final-screen card preview guarantees instant visuals instead of a blank/late iframe.
---

# Reply preview: instant poster + gated live iframe

The reply flow's final screen (`phase === "send"`) previews the card via an
iframe that boots the auto-driven `pv=1` route. Booting a full React route
inside an iframe is slow, and iOS/Safari throttles off-screen/just-mounted
iframes until they're visible or tapped — so a bare iframe shows a blank box
for seconds and appears to "start only on click."

**The rule:** never rely on the iframe alone for first paint. Paint an instant
static still (a `BloomPoster` built from the card's existing flower sprites)
as the bottom layer of the preview box, and layer the live iframe on top at
`opacity: 0`, fading it in (`opacity: 1`) only once the card has actually
rendered. The poster stays visible if the iframe is ever throttled/blocked, so
the box is guaranteed never blank.

**Why:** off-screen iframe "preload at root" tricks were tried before and stayed
blank on iOS/Android; a guaranteed instant poster is the only robust fix.

**How to apply:**
- Reveal the iframe via a postMessage handshake: the `pv=1` page posts
  `{ type: "heartsync-reply-preview-ready" }` to `window.parent` after a
  double-`requestAnimationFrame` (ensures a painted frame). Parent validates
  `event.source === iframe.contentWindow` before trusting it.
- Keep an `onLoad` + short delay fallback so the live card still appears if the
  handshake is ever missed.
- The poster should depict the card's richest state (the bloom), reusing the
  same sprite assets so it matches the live animation.
- Related iframe lessons: `bundle-previews.md`, `card-image-assets.md`.

**Also applies to UnlockModal's bottom-sheet card preview.** Same fix: an
instant occasion-aware CSS poster (gradient + twinkles + spinner) sits behind
the live iframe, which fades in only when ready. Reveal trigger = a
`heartsync-card-preview-ready` postMessage (the `preview=1` card route, e.g.
`birthday.tsx`, posts it on first painted frame; also accepts the reply
`heartsync-reply-preview-ready`) OR an `onLoad` + ~1400ms fallback. Re-arm the
poster (`setPreviewReady(false)`) when the previewed URL changes so a reused
modal never flashes a stale card.
