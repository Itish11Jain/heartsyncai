---
name: Owner test-payment exclusion (Itisha)
description: How/why the owner's own UPI test payments are kept out of HeartSync analytics, and the matching constraints.
---

# Excluding the owner's own UPI test payments from analytics

The site owner (Itisha Jain) makes test payments from her own UPI; that data must
never appear in any `/analytics` or `/events/sales` metric. Centralized in
`EXCLUDED_PAYER_PATTERNS` in `artifacts/api-server/src/routes/events.ts`.

**Match rule:** payer **name** `Sender:\s*ITISHA JAIN` OR **anchored VPA**
`VPA:\s*8905158970` against `hs_received_payments.raw_sms`.

**Why anchored, never bare:**
- Never match a bare surname like `JAIN` — `SOMYA JAIN` (VPA `800573821`) is a
  real paying customer.
- The VPA pattern must stay field-anchored (`VPA:\s*...`), not a loose digit
  run, or the digit sequence could match unrelated text in a future SMS.
- Verified read-only in prod: the pair matches all of her records, catches no
  other customer, and leaves Somya untouched.

**How it's enforced (two layers):**
1. `ensureExcludedPayersPurged()` — one-shot transactional purge per server start:
   deletes her `hs_card_events` (via the `card_id`s her payments unlocked), then
   the `hs_cards` rows, then her `hs_received_payments` rows. Idempotent.
2. Analytics filters — `buildEventFilter()` drops events whose `card_id` ties to
   one of her payments (card_paid carries `recipient_name = NULL`, so the
   recipient-name filter alone misses them); `/events/sales` filters
   `hs_received_payments` directly with the same patterns.

**Key limitation:** the newest payment emails are stored as a redirect URL with
no readable payer name/VPA, so name/VPA matching only covers plaintext records —
her *future* test payments may be unidentifiable and slip through. Her cards also
have NULL fingerprint and no account, so fingerprint/login can't identify her
either; the payment-text match is the only reliable handle.
