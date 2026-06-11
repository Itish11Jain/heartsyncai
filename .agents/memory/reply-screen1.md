---
name: Reply flow screen-1 by variant
description: Which "open me" visual the /reply first screen uses per received-occasion variant.
---

# Reply flow (/reply) — screen 1 visual per variant

The reply experience's first screen (the "open me" hero) is chosen by the RECEIVED
occasion, and it is **not** the same mapping as the main card builder:

- **Non-sorry replies (variant A birthday, variant B feel_good/thank_you/congratulations/
  anniversary/default):** use the **blush GoldenEnvelope** (`isSorry` styling) + the
  blush rose slider ("Slide the rose to open").
- **Sorry reply (variant C):** uses a bespoke **kintsugi "MendingHeart"** — a cracked
  crimson heart whose two halves draw together and seal with a glowing gold seam on
  unlock — with a plain slider labelled "Slide to forgive". Defined inline in reply.tsx.

**Why:** the owner wanted the pretty blush envelope as the default for the happy
replies, and asked for something *new and original* (not an envelope) specifically for
the sorry reply. So the blush look was deliberately moved off sorry and onto everything
else, and sorry got its own concept.

**How to apply:** if you touch the reply screen-1 gating, keep this inversion. The page
background also flips: non-sorry uses the soft blush-dark radial; sorry uses a deeper
crimson radial to suit the heart. `SlideToUnlock` gained an optional `label` prop for the
"Slide to forgive" copy — additive, default behaviour unchanged for the card page.
