---
name: Price A/B arm sourcing
description: How the ₹49/₹99 price experiment assigns, persists, and enforces a per-device arm — and the bypass pitfalls to avoid.
---

# Price A/B arm (₹49 vs ₹99)

> NOTE: The A/B experiment is finished — price is now decided by OCCASION, not
> the device arm (`FORCE_ARM` is `null`). See occasion-pricing.md for the live
> strategy. The server-side enforcement rules below (per-tier amount gate,
> STORED-price-first unlock, hs_cards.price as the trustworthy source) STILL
> APPLY because ₹49 and ₹99 are still the two live price tiers.

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

**Rule: `card_paid` events do NOT carry a reliable arm in their own `price`
column — source the A/B `paid` count from the authoritative `hs_cards.price`.**
Two `card_paid` rows exist per unlock (server insert + client `trackEvent`) and
the event-level `price` is effectively always NULL, so any `card_paid ... WHERE
price IN (49,99)` filter silently counts zero. The panel's `paid` is computed
via a correlated subquery that maps each paid card to `hs_cards.price`; the same
`buildEventFilter` `whereSql` fragment is spliced into BOTH the outer query and
the subquery, reusing the one positional `params` array (Postgres allows the same
`$N` many times, and bare cols resolve to whichever scope they're injected in).
`created` stays sourced from the event-level `price` (`card_created` is tagged).
**How to apply:** keep `hs_cards.price` trustworthy — both unlock routes set it
via `armPrice = stored/body arm ?? armFromPaidAmount(matched payment amount)`
(49/50→49, 99/100→99) on the upsert AND the server `card_paid` event. That amount
fallback is the safety net when the client/stored arm is missing.

**Rule: the A/B panel counts ONE consistent tagged epoch — `created` from
arm-tagged `card_created` events and `paid` from `hs_cards.price`,
floored at `AB_EXPERIMENT_START` (do NOT mix real-payment counts into it).**
The arm tag lives only in the browser and only began persisting onto events
from the deploy that shipped tracking, so earlier conversions have a NULL arm
and can never be backfilled. An earlier attempt sourced `paid` from real
payments (`hs_received_payments.amount`) to recover historical numbers, but that
mixes a tagged numerator/denominator with an untagged baseline → owner found the
"₹49 paid 197 / created 0" readout confusing and asked to show only the clean
tagged window. So: floor every A/B query at `AB_EXPERIMENT_START` and keep
created+paid+conversion% all from tagged events.
**Why:** consistency over completeness — a small honest like-for-like window
beats a large mixed-epoch one that yields nonsense rates (e.g. >100%).
**How to apply:** `AB_EXPERIMENT_START` is a hardcoded UTC constant inlined as a
`::timestamptz` literal in events.ts; bump it only if tagging is reset. Real
total revenue by price still lives in the separate Sales section (payments).
