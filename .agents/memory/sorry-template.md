---
name: Sorry template Screen 1 (envelope)
description: How the sorry-occasion envelope/slider differ from the default surprise flow in card.tsx
---

# Sorry template — envelope screen (Screen 1)

The envelope screen (`phase === "envelope"`) is shared between the default "surprise"
flow and the `occasion=sorry` flow. All sorry-specific visuals are gated behind an
`isSorry` prop passed to `GoldenEnvelope` and `SlideToUnlock` (default `false`), so
the surprise flow is untouched.

Sorry-only treatment, matching the bouquet screen's look:
- Envelope uses a soft blush-cream "stationery paper" palette (not the gold of
  the default flow), centralized in a `pal` object inside `GoldenEnvelope`.
- Realistic paper texture = SVG fractal-noise grain (data URI, mixBlendMode
  multiply) + woven repeating-linear-gradient fibers + a radial top-light sheen.
  Lightweight/procedural — no image asset needed.
- Envelope wrapped in a continuous gentle 3D float (paused while `opening`) + deeper
  multi-layer drop-shadow, mirroring `FloatingBouquet`'s 3D drift.
- A decorative rose (`rosePinkImg`) + small eucalyptus sprig tucked into the
  envelope's top-right corner. Keep it low enough (`top` ~ -13%) so it does NOT
  overlap the cursive heading above.
- `SlideToUnlock` knob is a draggable rose image instead of the round button.
  Drag/unlock math is unchanged.
- Headline + slider text use `'Dancing Script', cursive` with the gold gradient.

**Why:** the slider track uses `overflow: hidden` for the default flow, but the rose
thumb is larger than its 52px hitbox and would clip at the track's left/right
extremes. For sorry, the track is set to `overflow: visible` and the progress-fill
bar is given `borderRadius: 999` so it still reads as a pill. Don't revert the track
to `overflow: hidden` for sorry or the rose clips again.
