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
