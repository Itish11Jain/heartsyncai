---
name: Card image assets
description: Export greeting-card image assets web-optimized (small WebP) and preload them, or animations pop in piece-by-piece.
---

# Card image assets must be web-optimized + preloaded

Greeting-card art (flowers, stickers, props) used in animated card scenes must be
exported as small, resized WebP and warmed via the on-mount image preloader.

**Why:** The "sorry" floating-bouquet shipped as 11 source-resolution PNGs
(1024px, ~0.7–1.1 MB each, ~10 MB total) with no preload. On production the
bouquet rendered flower-by-flower as each PNG decoded, and the heavy main-thread
decode also caused a visible freeze on the explosion→collage transition.
Re-encoding to resized WebP dropped the set from ~10 MB to ~220 KB.

**How to apply:** When adding/replacing card scene art, resize to ~max on-screen
size × 2 (blooms fit ~360px, larger props ~512px), encode WebP q≈86 (ImageMagick
`magick in.png -resize 360x360 -quality 86 -define webp:method=6 out.webp`), and
add the imports to the relevant preload list — gated to the occasion that uses
them so other occasions download nothing extra. The card preloader lives in the
main Card component's on-mount effect in `artifacts/heartsync-ai/src/pages/card.tsx`.
