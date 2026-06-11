---
name: Reply flow screen-1 by variant
description: Which "open me" visual the /reply first screen uses per received-occasion variant.
---

# Reply flow (/reply) — screen 1 visual per variant

The reply experience's first screen (the "open me" hero) is chosen by the RECEIVED
occasion, and each of the three variants now has its OWN distinct screen 1 (this is
deliberately not the same mapping as the main card builder):

- **Variant A — birthday** (`ro=birthday`): blush **GoldenEnvelope** + blush rose
  slider ("Slide the rose to open"), PLUS drifting pink-rose decor (`FloatingFlowers`,
  varied sizes) and `Twinkles` background sparkles. The envelope shows **no "To:"
  name** (the reply card has no named recipient).
- **Variant B — every other non-sorry occasion** (thank_you / feel_good /
  congratulations / anniversary / default): a single large bouquet bloom centered and
  slowly rotating (`SpinningFlower`); **tap it** and it bursts into flying petals, then
  advances. No envelope, no slider — just a "Tap the flower" hint.
- **Variant C — sorry** (`ro=sorry`): bespoke kintsugi **MendingHeart** + plain slider
  labelled "Slide to forgive".

**Why:** the owner wanted the blush envelope reserved for birthday (with floaty decor),
something brand-new and tap-driven for the generic happy replies, and a distinct
forgiveness concept for sorry. Each variant must feel different on open.

**How to apply:** route screen-1 visuals on `variant` (A/B/C), not on `content.isSorry`.
B's flower advances via the same `handleUnlock` (tap → `opening` → bloom). `SlideToUnlock`
has an optional `label` prop (additive; default unchanged for the card page). The
`GoldenEnvelope` "To:" block is gated on a truthy `recipientName`, so passing "" hides it
— don't pass an empty name on the card page if you want the label shown. Page background
also flips: sorry uses a deeper crimson radial, A/B use the softer blush-dark radial.

## Send/pay screen (phase "send") + in-iframe card preview

The replier's final "send" pay screen embeds a **live self-preview of the reply card by
loading `/reply` in an `<iframe>` with a `pv=1` preview flag** (no `id`). Preview mode must
stay **silent and non-interactive**: it boots to the `envelope` open-me hero, then a timed
loop auto-drives `opening`→`bloom`→back to `envelope` forever (nothing is tappable in the
iframe, so the slider/tap hint is hidden and the sequence is fired on timers). It hides the
advance button so it can never reach `send`, and early-returns out of the analytics effect
so the embed fires no funnel/`card_viewed` events.
**Why:** owner wanted the user to see the card they're about to send, with value-
justification copy + benefit bullets + a struck-through ₹49→₹29 CTA — without the embed
skewing analytics or recursively spawning more preview iframes.
**How to apply:** any new reply phase or analytics event must respect the `isPreview` guard,
and the preview iframe URL must never carry an `id` (keeps it non-recursive). The pay branch
scrolls itself — don't rely on the shared `overflow:hidden` send container to size it.

**Preload, don't lazy-mount:** the iframe is mounted ONCE at the component root for the whole
replier session (not inside the pay-screen JSX), so it loads during intro/envelope/bloom and
is already looping by the time the pay screen appears (lazy mount = long blank load). It's
anchored over a placeholder box via `getBoundingClientRect` (re-measured on resize/scroll) —
moving a fixed element by CSS never reloads it. It must hide INSTANTLY (transition:none on
hide) when the UPI modal opens, else it shows through during the modal's fade-in.
**Hide it ON-SCREEN, never at -10000:** iOS Safari does NOT load an iframe parked far
off-screen, so the preload silently fails (blank until reveal). Keep it within the viewport
(left/top 0) and hide via opacity 0 + zIndex -1 + pointerEvents none instead.
**Gate the persistent iframe with `!isPreview`** as well as `!isRecipient` — otherwise the
preview instance (pv=1, also non-recipient) recursively mounts its own preview iframe.
Box/iframe sizing must stay in sync: box 172x256 ⇒ iframe 376x560 at scale 0.457.
