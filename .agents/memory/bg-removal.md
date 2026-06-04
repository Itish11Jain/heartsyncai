---
name: Background removal (sticker feature)
description: How HeartSync removes photo backgrounds for the birthday card sticker; why hosted APIs were abandoned.
---

# Background removal runs LOCALLY, not via any hosted API

The sticker cutout (Scene 5 of the birthday card) removes the photo background
using **RMBG-1.4 run locally** via `@huggingface/transformers` (onnxruntime-node
native binary) + `sharp` for alpha compositing. See `artifacts/api-server/src/lib/bgRemove.ts`.

**Why not a hosted API:**
- remove.bg → ran out of credits (HTTP 402 insufficient_credits).
- HF Inference API (`api-inference.huggingface.co` AND `router.huggingface.co/hf-inference/...`)
  no longer serves background-removal models: returns `{"error":"Model not supported by provider hf-inference"}`
  for briaai/RMBG-1.4, RMBG-2.0, ZhengPeng7/BiRefNet. The old api-inference host also DNS-fails in Replit prod egress.
- `@imgly/background-removal-node` does NOT work — its onnxruntime-node build fails to install in the Replit sandbox.

**Why local works:** `@huggingface/transformers` ships prebuilt onnxruntime-node
binaries (napi-v6/linux/x64) that ARE present without a build step. Model loads in
~0.5s once cached, inference ~0.5-1s. Model weights download once from huggingface.co
hub (the hub/CDN is reachable in prod even though api-inference is not).

**How to apply / gotchas:**
- esbuild must externalize `@huggingface/transformers`, `sharp`, `onnxruntime-*` (see build.mjs externals).
- `sharp` must be a direct dep of api-server (transformers nests its own copy that isn't resolvable).
- Inference is serialized (a promise chain mutex) and inputs downscaled to 1600px to bound memory — do not remove without a replacement backpressure mechanism.
- **Model load + inference + the RGBA compositing run in a dedicated worker
  thread** (`bgRemoveWorker.ts`, emitted as `dist/bgRemoveWorker.mjs` via a 2nd
  esbuild entry), spawned lazily by `bgRemove.ts` and terminated after 60s idle.
  Do NOT warm at startup and do NOT move it back in-process — see
  [upload-perf.md] for why (it was starving ordinary photo/voice uploads).

# Sticker delivery: predict-the-URL, never block on bg-removal
Bg-removal is slower than a user takes to fill in the card, so never block card
creation waiting for the cutout — the old approach (short blocking wait) baked the
full-photo fallback permanently into the card URL and discarded the cutout that
finished moments later. Instead let the client predict the sticker's final URL up
front (client-generated id), open the card immediately on the original photo, and
have the card swap the cutout in once it becomes fetchable.
**Why:** decouples a slow async server job from the synchronous card-creation step
without losing the result.
**How to apply / gotchas:**
- The sticker upload endpoint is unauthenticated, so only honour a client-supplied
  id when nothing is stored at that key yet — otherwise anyone who sees a card's
  sticker URL could overwrite/deface it.
- URL prediction only works while heartsync-ai is served at root (BASE_URL=/), so
  the client-built URL matches what the server returns; revisit if it ever moves
  under a path prefix.
