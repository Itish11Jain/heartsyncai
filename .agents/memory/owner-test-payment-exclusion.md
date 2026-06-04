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

**Opaque payments → exclude by exact UTR (`EXCLUDED_PAYMENT_UTRS`):** the newest
payment emails are stored as a redirect URL with no readable payer name/VPA, AND
her test cards carry NULL `recipient_name`, NULL fingerprint, and no account — so
name/VPA/recipient/fingerprint/login can ALL miss them. There is no automatic data
signal that distinguishes such an owner test payment from a real customer's. The
only stable handle is the exact UPI reference number (UTR). `EXCLUDED_PAYMENT_UTRS`
(digit-only, validated, inlined into SQL — safe only because hardcoded constants)
is wired into `buildEventFilter()` (drops events on the unlocked card), the
`/events/sales` shared `whereSql` (totals/daily/byOccasion), and the rolling-24h
query. Always use `(utr IS NULL OR utr NOT IN (...))` — bare `utr NOT IN` would
drop NULL-utr rows.
**Why:** owner flagged a ₹99 redirect-URL test payment that nothing else could
catch; verified in prod it dropped that one unlock (19/₹1031 → 18/₹932) and no
other.
**How to apply:** each *future* opaque owner test payment must have its UTR added
to `EXCLUDED_PAYMENT_UTRS` by hand — there is no auto-detect. A better long-term
fix would be capturing the real payer VPA at ingestion (the Android SMS forwarder
sees the raw bank SMS) instead of only the redirect URL.
