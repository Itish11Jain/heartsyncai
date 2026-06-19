---
name: Per-occasion fixed pricing
description: HeartSync card price is decided by occasion (not the A/B arm); the single source of truth and the rule for keeping every paywall consistent.
---

# Per-occasion fixed pricing

A card's price is decided by its **occasion**, not the old ₹49/₹99 A/B device
arm (that experiment is finished; `FORCE_ARM` is `null`).

- Birthday, Sorry & Father's Day → ₹99 (anchor ₹149)
- Feel Good, Thank You, Congratulations → ₹49 (anchor ₹99)
- unmapped → ₹49

**Two maps must stay in lockstep** — the client `priceArm.ts PRICE_BY_OCCASION`
AND the server `occasionPrice()` in `api-server/src/routes/razorpay.ts` (used by
the Razorpay create-order `kind:"card"` fallback when no card row exists yet).
A drift here is exactly what made Father's Day show ₹99 on the CTA but ₹49 in the
Razorpay modal. When adding/repricing an occasion, edit BOTH.

**Single source of truth:** `lib/priceArm.ts` `PRICE_BY_OCCASION`, read via
`getOccasionPrice(occasion)` / `getPriceConfigForOccasion(occasion)`. Change the
strategy by editing only that map. Occasion ids must match `card-templates.ts`
OCCASIONS exactly.

**Rule: every price the user SEES or PAYS must derive from the occasion, never a
literal — and the modal that does it must receive `occasion` by prop.**
**Why:** a single card template (cosmic/vinyl/crystal) can be used for ANY
occasion, so a hardcoded ₹49 teaser or UPI deep link silently undercharges a ₹99
birthday/sorry card. The desktop QR unlock modal in particular builds a *real*
UPI deep link (`am=<price>`) and fires the Meta browser Purchase pixel — both
are real money/attribution, not just display.
**How to apply:** when adding any paywall/teaser/price surface, thread the card's
`occasion` in and call `getPriceConfigForOccasion`; after, grep `₹49`/`₹99` and
confirm only comments/dead code remain.

**Separate products — do NOT occasion-price:** the ₹29 watermark-only flow and
the "2 cards for ₹49" bundle.

**Analytics:** `trackEvent` uses the occasion price when an event carries
`occasion`, else the device-arm fallback. Server-side unlock enforcement still
keys off STORED `hs_cards.price` — see price-ab-arm.md (₹49/₹99 gate rules still
hold).
