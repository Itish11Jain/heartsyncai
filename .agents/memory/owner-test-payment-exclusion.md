---
name: Owner test-payment exclusion
description: Why/how the site owner's own test payments are kept out of HeartSync analytics, and the matching constraints. No identifiers stored here.
---

# Exclude the owner's own test payments from analytics

The owner makes real UPI test payments to the live site; that revenue/activity
must never appear in any `/analytics` or `/events/sales` metric, or it inflates
the numbers the owner trusts.

The actual matching values (payer identifiers, payment reference numbers) live
**only in code constants** in `artifacts/api-server/src/routes/events.ts`. Never
copy those values into memory or docs — keep this note identifier-free.

**Durable constraints (the part that's easy to get wrong):**
- Match must be **specific enough to never drop a real customer**. A real paying
  customer can share the owner's surname, so never exclude on a bare surname or a
  loose digit run — anchor to a full, structured field value.
- Some newer test payments carry **no recognizable signal at all** (opaque
  redirect-URL emails, null recipient/fingerprint/account). There is no automatic
  way to tell those apart from a genuine customer, so each one must be excluded
  **by hand** via its exact payment reference. Assume no auto-detect exists.
- Enforce in **two layers**: a one-shot purge of the owner's existing rows at
  server start, and a live filter applied to every analytics/sales query.
- When excluding by a nullable column, always allow nulls through
  (`col IS NULL OR col NOT IN (...)`) or you silently drop every other row.

**Better long-term fix:** capture the real payer identifier at ingestion (the
SMS forwarder sees the raw bank SMS) so opaque payments stop needing manual
exclusion.
