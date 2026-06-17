---
name: Manual CAPI backfill mechanics
description: How to safely re-send missed Meta Purchase events for past sales, and the env/idempotency constraints that make it work.
---

# Manual Meta CAPI backfill (re-sending missed Purchase events)

When a window of paid sales was NOT reported to Meta (e.g. a pre-deploy bug where
`fireMetaCapi` fired without customer-info params → `error_subcode 2804050`), you
can replay them. The replay payload must mirror `fireMetaCapi` in cards.ts exactly,
with two changes: `event_time` = the original purchase epoch, and `value` = the
card's real per-occasion price.

## Where the secret vs the data live (the annoying split)
- `META_PIXEL_ACCESS_TOKEN` is **NOT** in the `code_execution` sandbox (`process.env`
  is undefined there) and `viewEnvVars` only returns existence, never the value.
- It **IS** present in the **bash shell** env (`node -e` / tsx can read
  `process.env.META_PIXEL_ACCESS_TOKEN`).
- Production card data (fbp/fbc/price/created_at/order event_id) is only reachable
  via the sandbox's `executeSql({environment:"production"})` — bash node connects to
  the DEV db.
- **Bridge:** query prod in the sandbox → write rows to a temp JSON file → run the
  Meta POST loop in bash node (token from env) → delete the temp file (it holds
  fbp/fbc cookies; don't commit it).

## Idempotency / no double-count
- Re-send with the order's **persisted `event_id`** (often synthetic `hs_<card>_<ts>`).
  Meta dedups on it, so re-running the backfill is safe.
- A live send that was **rejected** (2804050) was never counted, so the backfill is
  the FIRST accepted event — no double count.
- **Why these were rejected pre-deploy:** the old `fireMetaCapi` didn't attach
  fbp/fbc. The cards still HAVE fbp/fbc stored, so replaying later (now attaching
  them) gets accepted. A card with neither fbp nor fbc cannot be backfilled — it
  will 2804050 again; exclude it.

## Gotchas
- `event_time` must be within Meta's 7-day window — use the original `created_at`
  epoch, not Date.now.
- Thread the **real price** as `value` (₹99 birthday/sorry, ₹49 others); never a
  constant.
- `hs_cards.occasion` is often NULL for Razorpay sales — read the real occasion from
  `hs_card_events` (template/occasion captured at send/view), not hs_cards.
