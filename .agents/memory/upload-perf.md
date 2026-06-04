---
name: Upload performance (photo/voice)
description: Why card-creation uploads were slow/stalling and the constraints that keep them fast.
---

# Photo / voice upload performance

The API server is a single Node process that also hosts the local RMBG-1.4
background-removal model. Two settings are required to keep uploads fast:

- **`uploadFromBytes` must pass `{ compress: false }`** for photo/audio/sticker.
  **Why:** object-storage gzips by default; JPEG/PNG/WebP/webm are already
  compressed, so gzip burns CPU per request for ~no size win and slows uploads.
  Do NOT pass `contentType` — it is not a valid `UploadOptions` field in
  `@replit/object-storage` v1 (only `compress` exists); the GET routes set the
  Content-Type header on download instead.
- **Do NOT warm the bg-removal model at startup.** Load it lazily on the first
  `/upload/sticker` request (birthday cards only).
  **Why:** warming makes every instance carry the model's memory even when no
  one removes a background; on a small prod instance that memory pressure causes
  GC pauses / restarts that stall ordinary photo/audio uploads.

- **Client uploads have a 60s AbortController timeout** so a stalled request
  surfaces a clear error instead of spinning forever. The photo `<input>` is
  `multiple` and the selected files are processed in order (preserves the
  birthday "first photo → sticker cutout" logic and preview↔url ordering).

**resvg fonts:** `@resvg/resvg-js` 2.6.2 has no `fontBuffers` option (silently
ignored → no glyphs). Load OG-image fonts via `fontFiles` (paths), not buffers.
