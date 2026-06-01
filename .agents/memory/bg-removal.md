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
- Model is warmed at server startup (`warmBgRemove()` in index.ts) so the first user request is fast.

# Sticker delivery: predict-the-URL, never block on bg-removal
Removal takes ~3-10s (serialized under load), longer than a user takes to fill in
the card. Do NOT block card creation waiting for the cutout. Instead the client
generates a UUID, predicts the sticker URL (`/api/stickers/sticker/<uuid>.png`),
sends that `stickerId` to `POST /upload/sticker`, and the card opens immediately
with the ORIGINAL photo. Scene 5 polls the predicted URL (Image() with `?r=N`
cache-bust, ~20 tries @1.5s) and swaps the cutout in once it 404→200s.
**Why:** the old 4s blocking wait baked the full-photo fallback into the card URL,
permanently discarding the cutout that finished a second later.
**How to apply / gotchas:**
- `/upload/sticker` only honours a client `stickerId` when `exists(key)` is false
  — otherwise it falls back to a random key. This stops an attacker who sees a
  card's sticker URL from overwriting/defacing it (endpoint is unauthenticated).
- Predicted URL parity depends on heartsync-ai being served at root (BASE_URL=/);
  server returns `${req.protocol}://${host}/api/stickers/...`. Holds for prod.
- On upload success/failure the client overwrites the ref with the server URL /
  plain photo, so a failed removal stops the card polling for a file never made.
