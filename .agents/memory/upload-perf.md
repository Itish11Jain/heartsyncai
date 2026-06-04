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
- **Bg-removal runs IN-PROCESS (lazy-loaded, serialized), never warmed at
  startup, and MUST NOT run in a worker_thread.** A worker_thread attempt was
  reverted: `onnxruntime-node` is non-context-aware and a respawned worker fails
  with `Module did not self-register` (`ERR_DLOPEN_FAILED`), which broke the
  birthday sticker in production. See [bg-removal.md] for the addon-reload detail.
  ONNX inference already runs on libuv threads, so in-process does not hard-block
  the event loop; serialize jobs + downscale inputs to bound memory.

- **The birthday sticker must NOT make the client re-upload the photo bytes.**
  The first photo is uploaded once to `/upload/photo`; the sticker request then
  sends only the resulting `photoKey` and the server fetches it from Object
  Storage internally. **Why:** re-uploading the full image to `/upload/sticker`
  ran concurrently with photos 2 & 3 and saturated slow mobile uplinks, so the
  later photos "never loaded." Server-side photo uploads themselves are ~150ms;
  the stall was client uplink contention, not the server.

- **Client uploads have a 60s AbortController timeout** so a stalled request
  surfaces a clear error instead of spinning forever. The photo `<input>` is
  `multiple`. Multi-photo uploads run via a single `photoSlots` state where each
  slot uploads INDEPENDENTLY/IN PARALLEL — there is NO shared boolean guard or
  sequential `await`. **Why:** a shared in-flight lock made the 2nd photo "keep
  loading" until the 1st finished; on a slow uplink it looked stuck. Per-slot
  status + ID-targeted updates keep concurrent completions from clobbering each
  other. The birthday sticker is gated at selection time on
  `occasion==="birthday" && isFirstPhoto && !autoStickerUrlRef.current`, so it
  fires bg-removal once for the first photo (edge: if the first photo's upload
  fails, the sticker won't trigger).

**resvg fonts:** `@resvg/resvg-js` 2.6.2 has no `fontBuffers` option (silently
ignored → no glyphs). Load OG-image fonts via `fontFiles` (paths), not buffers.
