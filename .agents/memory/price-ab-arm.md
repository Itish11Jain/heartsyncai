---
name: Price A/B arm sourcing
description: How the ₹49/₹99 price experiment assigns, persists, and enforces a per-device arm — and the bypass pitfalls to avoid.
---

# Price A/B arm (₹49 vs ₹99)

The arm is a sticky per-device 50/50 split, bucketed deterministically from the
existing device fingerprint `hs_fp` and cached in `localStorage` (`hs_price_arm`).
Client reads it via `getPriceArm()` / `getPriceConfig()` (`lib/priceArm.ts`).
`trackEvent` auto-attaches the arm to every event body.

**Rule: card-creation POSTs must each send `price`.** There are multiple
independent `POST /api/cards` call sites (two in `send.tsx`, one in
`PremiumLockPanel.tsx`). If any omits `price`, that card lands with
`hs_cards.price = NULL` and silently drops out of per-arm analytics. Any new
creation path must include the arm too.

**Rule: unlock routes must derive the arm from the STORED card price first,**
falling back to the request body only when no row exists. Trusting the body's
`price` lets a client omit/tamper it and slip through the legacy `amount >= 49`
fallback gate, unlocking a ₹99 card with a ₹49 payment.
**Why:** the UPI amount gate is widened per-arm (49→[49,50], 99→[99,100]); the
gate is only as trustworthy as the arm it's keyed on.
**How to apply:** in `auto-unlock` / `pay-unlock`, `SELECT price FROM hs_cards`
then `normPrice(stored) ?? normPrice(body)` before computing the amount tier.

The Gmail Apps Script UTR forwarder amount allowlist must stay in sync with the
live arms (currently {49,50,99,100} ±0.5) or valid payments get dropped before
they ever reach the API.
