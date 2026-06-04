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
- **Bg-removal runs in a dedicated WORKER THREAD, never in-process, never warmed
  at startup.** `bgRemove.ts` lazily spawns `bgRemoveWorker.ts` (model + ONNX
  inference + RGBA compositing) on the first `/upload/sticker` (birthday only)
  and `worker.terminate()`s it after 60s idle to reclaim the model's memory.
  **Why:** in-process, the model's resident memory + the synchronous pixel loop
  competed with the same Node process that serves uploads, so birthday cards
  (the only flow that loads the model) stalled photo/voice uploads — sometimes
  forever. A worker isolates its V8 heap + CPU and lets us free it when idle.
  **How to apply:** worker is a 2nd esbuild entry → `dist/bgRemoveWorker.mjs`
  (sibling of index.mjs); resolve its path via `fileURLToPath(import.meta.url)`.
  Scope worker `error`/`exit` handlers with `if (worker !== w) return;` so an
  idle-terminated worker never rejects the next worker's in-flight jobs.

- **Client uploads have a 60s AbortController timeout** so a stalled request
  surfaces a clear error instead of spinning forever. The photo `<input>` is
  `multiple` and the selected files are processed in order (preserves the
  birthday "first photo → sticker cutout" logic and preview↔url ordering).

**resvg fonts:** `@resvg/resvg-js` 2.6.2 has no `fontBuffers` option (silently
ignored → no glyphs). Load OG-image fonts via `fontFiles` (paths), not buffers.
