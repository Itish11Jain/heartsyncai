---
name: Owner test-payment exclusion
description: How/why the owner's own UPI test payments are kept out of HeartSync analytics, and the matching constraints.
---

# Excluding the owner's own UPI test payments from analytics

The site owner makes test payments from her own UPI; that data must never appear
in any `/analytics` or `/events/sales` metric. The literal payer name + VPA
patterns are the source of truth in `EXCLUDED_PAYER_PATTERNS` in
`artifacts/api-server/src/routes/events.ts` (kept in code, not duplicated here, to
avoid storing PII in memory).

**Match rule:** field-anchored payer **name** (`Sender:\s*...`) OR field-anchored
**VPA** (`VPA:\s*...`) against `hs_received_payments.raw_sms`.

**Why anchored, never bare:**
- Never match a bare surname — a real paying customer shares the owner's surname,
  so a bare-surname pattern would wrongly drop that customer's revenue.
- The VPA pattern must stay field-anchored (`VPA:\s*...`), not a loose digit
  run, or the digit sequence could match unrelated text in a future SMS.
- Verified read-only in prod: the anchored pair matches all of the owner's
  records, catches no other customer, and leaves the same-surname customer
  untouched.

**How it's enforced (two layers):**
1. `ensureExcludedPayersPurged()` — one-shot transactional purge per server start:
   deletes her `hs_card_events` (via the `card_id`s her payments unlocked), then
   the `hs_cards` rows, then her `hs_received_payments` rows. Idempotent.
2. Analytics filters — `buildEventFilter()` drops events whose `card_id` ties to
   one of her payments (card_paid carries `recipient_name = NULL`, so the
   recipient-name filter alone misses them); `/events/sales` filters
   `hs_received_payments` directly with the same patterns.

**Gotcha — bare `card_id` in the filter is ambiguous on joins:** the
`buildEventFilter()` exclusion clause uses an unqualified `card_id NOT IN (...)`.
That breaks (`column reference "card_id" is ambiguous`, HTTP 500) in any analytics
query whose FROM exposes `card_id` from two tables — e.g. the "recent cards"
query joins `hs_card_events c` to a view-count subquery that also selected
`card_id`. Fix is to alias the *subquery's* `card_id` (e.g. `AS vc`) so the outer
`card_id` resolves to `c.card_id`; do NOT qualify the shared filter string itself,
since other queries apply it to a single unaliased `hs_card_events`.

**Key limitation:** the newest payment emails are stored as a redirect URL with
no readable payer name/VPA, so name/VPA matching only covers plaintext records —
her *future* test payments may be unidentifiable and slip through. Her cards also
have NULL fingerprint and no account, so fingerprint/login can't identify her
either; the payment-text match is the only reliable handle.
