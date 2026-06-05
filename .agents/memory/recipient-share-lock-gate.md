---
name: Recipient "locked for sharing" gate uses is_paid, not is_watermarked
description: Why a watermark-free card can still show the recipient "Card is locked for sharing" overlay, and how to truly unlock one.
---

# Recipient share-lock gate is driven by is_paid (payment-row presence)

The recipient-facing card view shows the "Card is locked 🔒 — hasn't been
unlocked for sharing" overlay based on `is_paid`, **not** `is_watermarked`.
`GET /api/cards/:id` computes `is_paid` purely as "does a `hs_received_payments`
row exist whose `card_id` = this card". A code comment near the gate claims
recipients are gated on `is_watermarked=false` — that comment is misleading;
the actual fetch checks `is_paid`.

**Why this bites:** unlock paths split into two kinds.
- `pay-unlock` / `auto-unlock` link an existing received payment to the card
  (set `card_id`, fire `card_paid`) → `is_paid` becomes true.
- `share-unlock` / `payment-link-unlock` / admin manual only flip
  `is_watermarked=false` and never create the payment linkage.
So a card can be `is_watermarked=false, is_premium=true` yet still `is_paid=false`,
and the recipient still sees the lock.

**How to truly unlock a card for sharing (incl. owner's own card):** create the
payment→card linkage so `is_paid=true`. In production (DB is read-only from the
agent sandbox) do it via the app's own endpoints: `POST /api/internal/upi-payment`
(Bearer ADMIN_SECRET; utr must be 12 digits) to insert a payment, then
`POST /api/cards/:id/pay-unlock` with the **last 4 digits** of that utr (matches an
unused payment with amount ≥ card price tier, default ≥49). Verify with
`GET /api/cards/:id` → `is_paid:true`.

**If it's an owner/test unlock (no real money):** add that 12-digit utr to
`EXCLUDED_PAYMENT_UTRS` in events.ts so it stays out of analytics + sales. Note:
the one-shot purge only deletes by `raw_sms` payer patterns, so a UTR-list entry
filters live queries but does NOT delete the row; and the exclusion only applies
once the new code is deployed.
