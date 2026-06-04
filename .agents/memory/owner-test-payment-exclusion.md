---
name: Excluding internal/test activity from analytics
description: Durable rules for filtering the owner's own test transactions out of HeartSync analytics. Conceptual only — no identifiers stored here.
---

# Keep internal test activity out of analytics

The owner generates real test transactions against the live site. That activity
must never appear in any `/analytics` or `/events/sales` metric, or it inflates
the numbers the owner relies on.

Any concrete matching values used to recognize that activity live **only as code
constants** in `artifacts/api-server/src/routes/events.ts`. Keep this note
conceptual — never copy concrete matching values into memory or docs.

**Durable rules (easy to get wrong):**
- The match must be **specific enough to never drop a genuine customer**. A real
  customer can coincidentally overlap on a loosely-chosen attribute, so anchor to
  a full, structured field value — never a partial/loose match.
- Some test transactions carry **no recognizable signal** at all. There is no
  reliable automatic way to distinguish those from a genuine customer, so each
  must be excluded **by hand** via its exact reference. Assume no auto-detect.
- Enforce in **two layers**: a one-shot purge of the owner's existing rows at
  server start, and a live filter applied to every analytics/sales query.
- When filtering on a nullable column, always let nulls through
  (`col IS NULL OR col NOT IN (...)`) or you silently drop every other row.

**Better long-term fix:** capture the distinguishing attribute at ingestion so
the unrecognizable cases stop needing manual exclusion.
