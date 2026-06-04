---
name: Upload URL protocol (http vs https / mixed content)
description: Why uploaded photo/audio/sticker URLs must be https, and the two places that enforce it.
---

# Uploaded asset URLs must be https (mixed-content)

The api-server builds asset URLs from `req.protocol`/`req.get("host")`. Behind
Replit's proxy (dev preview AND Autoscale deploy) TLS is terminated at the proxy
and forwarded to the app over plain http, so by default `req.protocol` is `http`
and every returned photo/audio/sticker URL is `http://...`.

The card pages are served over `https`, so an `http://` subresource is mixed
content. Chrome silently auto-upgrades mixed-content images (so the plain photo
still appeared), which masks the bug — but it is fragile (Safari/Firefox differ)
and is NOT guaranteed for future Chrome. The birthday sticker symptom "shows the
full photo, not the cutout" can be caused by this when the cutout URL is blocked.

**Two enforcement points, keep BOTH:**
- Server: `app.set("trust proxy", true)` in api-server `app.ts` so `req.protocol`
  honors `x-forwarded-proto` (https). Fixes all three URL builders at the source.
- Client: when adopting any server-returned asset URL, force https
  (`url.replace(/^http:\/\//,"https://")`). Belt-and-suspenders for any path the
  server protocol fix misses.

**Sticker key caveat:** `/upload/sticker` only reuses the client's predicted
`stickerId` when `getStorage().exists(candidate)` returns `ok && value===false`;
if the existence check errors it falls back to a RANDOM key. So the client must
adopt the server's ACTUAL returned URL (protocol-normalized), NOT its own
predicted URL — otherwise the card polls a non-existent sticker and falls back to
the full photo.
