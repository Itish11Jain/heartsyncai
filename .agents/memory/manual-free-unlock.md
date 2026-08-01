---
name: Manual free unlock of a card in production
description: How to grant a free card unlock in prod without polluting revenue analytics or Meta CAPI.
---

Prod DB is READ-ONLY from the workspace (`executeSql` production is a read replica). All prod writes must go through deployed endpoints.

**Recipe (owner-approved free unlock):**
1. `POST /api/internal/upi-payment` (Bearer ADMIN_SECRET) with a synthetic 12-digit UTR (use an obviously fake prefix like `8888…`), `amount:"49"` (or "99" — must match the card's price tier or pay-unlock rejects it), and a `raw_sms` note explaining the grant.
2. `POST /api/cards/:id/pay-unlock` with the UTR's last 4 digits + `price` — links the payment, upserts hs_cards unlocked, fires server card_paid.
3. Immediately `POST /api/admin/refund-payment?key=ADMIN_SECRET` with the payment row id + note — sets `refunded_at`, which EXCLUDES it from sales/revenue analytics while the recipient gate (any hs_received_payments row for the card_id, no refund filter) stays unlocked.

**Why:** direct SQL inserts are impossible; skipping step 3 inflates revenue by a payment never received.

**CAPI note:** pay-unlock fires a server CAPI Purchase, but with no fbp/fbc on the card Meta rejects it (2804050) — harmless. No browser Pixel fires when done via curl.

**Leftover pollution:** one `card_paid` event (channel manual_utr) in hs_card_events — minor funnel noise; acceptable.
