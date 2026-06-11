---
name: Reply flow chrome (brand mark + twinkles)
description: Owner rules for where the HeartSync brand mark and the twinkle backdrop may appear in the /reply card flow
---

# Reply flow chrome conventions (owner-stated)

Two explicit owner rules for the /reply experience — preserve them; don't
"helpfully" spread or strip these.

## Brand mark: FIRST and LAST screen only, nowhere in between
The subtle `BrandMark` wordmark ("♥ HeartSync AI") appears only on:
- the intro screen (first), and
- each persona's final screen — replier's paid/share screen, and the
  recipient's looping bloom screen (`isRecipient`).
It must NOT appear on envelope, the pre-payment pay screen, or the replier's
bloom. **Why:** owner wants discreet bookend branding, not branding on every
screen.

## Twinkles: EVERY screen
`<Twinkles>` (animated starlight backdrop) must render on every reply phase —
intro, envelope (all variants, not just birthday), bloom (the bouquet screen),
and send. **Why:** owner noticed the bouquet/bloom screen had no twinkles and
wants the ambient sparkle consistent across the whole flow.
