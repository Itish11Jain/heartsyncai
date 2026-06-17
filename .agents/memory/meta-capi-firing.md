---
name: Meta Pixel / CAPI Purchase firing
description: How HeartSync's browser Pixel + server Conversions API fire on paid unlocks, the value-must-be-threaded rule, and the webhook dedup gap.
---

# Meta Pixel + Conversions API (CAPI) on card unlocks

Pixel ID `1510201040837057` is used in BOTH the client (index.html `fbq('init',...)`) and the server (`META_PIXEL_ID` in api-server `cards.ts`). They must stay equal.

## Two firing channels for a Purchase
1. **Browser Pixel** — `fbq('track','Purchase',{value:price,currency:'INR'},{eventID})` fires in the buyer's browser after the unlock resolves (UnlockModal / razorpay verify success). Uses the REAL per-occasion price.
2. **Server CAPI** — `fireMetaCapi(eventId, cardId, ip, ua, valueRupees)` POSTs to graph.facebook.com `.../events`. Fires once per unlock, gated by `fireOnce`, from every unlock path (Razorpay verify+webhook via `fulfillCardUnlock`; UPI `auto_unlock` + `manual_utr` in cards.ts).

## RULE: never hardcode the CAPI value
`fireMetaCapi`'s `custom_data.value` MUST come from the real amount threaded in (`amountRupees` on the Razorpay path, `eventPrice` on the UPI paths), fallback 49.
**Why:** it was previously hardcoded to `99.0`, so every ₹49 sale was reported to Meta as ₹99 — inflated revenue/ROAS for the cheaper occasions.
**How to apply:** any NEW price tier or NEW unlock path must pass the real rupee amount into `fireMetaCapi`. Don't reintroduce a constant.

## Dedup: persisted per-order eventId (verify AND webhook share the browser id)
Browser Pixel + server CAPI dedup ONLY when they share the same `eventID`. CANONICAL DESIGN: the client generates the Pixel eventId once, fires its browser Purchase with it, AND sends it to `create-order`, which persists it on `hs_razorpay_orders.event_id`. `fulfillOrder` then resolves `eventId = opts.eventId ?? order.event_id ?? undefined`, so BOTH unlock paths reuse the same id:
- `/verify` path → client-supplied `opts.eventId`
- `/webhook` backstop → persisted `order.event_id` (the webhook has no client cookies/eventId of its own)
Only when neither is present does `fulfillCardUnlock` fall back to a synthetic `hs_<cardId>_<ts>` (stale clients or pre-fix in-flight orders) — those can still double-count, but that window is bounded.
**Why this was needed:** publishing made the webhook CAPI succeed; before the persisted eventId, the webhook fired a synthetic id that never matched the browser Pixel, so every webhook-won sale double-counted (seen as 17 Meta purchases vs 14 real sales, 17 Jun 2026). Meta CAPI has no delete — historical dupes are unfixable and age out of attribution (~7d).
**How to apply:** any NEW card paywall must thread its browser eventId through `verifyExtras.eventId` (it already flows to create-order). Never reintroduce a webhook-only synthetic id as the primary CAPI id. `event_id` is validated server-side with `^[A-Za-z0-9_-]{1,80}$`; the column is added idempotently via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

## Server CAPI shares ONE access token across ALL paths
Every server Purchase (Razorpay verify/webhook AND UPI auto_unlock/manual_utr) goes through the same `fireMetaCapi`, which uses the single `META_PIXEL_ACCESS_TOKEN`. So if "server events received" drops to ~0 across ALL unlock methods at once (not just one payment mode), suspect the **token** (expired/invalid → OAuthException 190), NOT the payment path. Diagnostic tell: UPI auto_unlock CAPI stopping at the same instant as Razorpay CAPI rules out a Razorpay-specific bug.
**Why:** on 16 Jun 2026 ~5PM IST server events flatlined right when Razorpay went live; DB proved 24 razorpay + 3 auto_unlock paid unlocks still happened after the cutoff, so fulfillment worked — only Meta delivery failed, and the common factor is the token.
**How to apply:** when CAPI "stops," first confirm fulfillment in the prod DB (`hs_razorpay_orders` paid / `hs_card_events` card_paid), then check token validity — don't chase the payment code.

## CAPI must NOT be fire-and-forget
`fireMetaCapi` now reads the fetch response: logs `[capi] Meta REJECTED status=.. body=..` on `!resp.ok`, else success with a response snippet. Previously it `await`ed the POST but ignored the result, so a token-rejected event logged `Purchase fired` identically to an accepted one — the outage was invisible for hours.
**Why:** blind logging hid a total Meta-delivery failure behind healthy-looking "fired" lines.
**How to apply:** never revert to ignoring the Graph API response; `events_received` / `error` is the only in-app signal that Meta actually accepted the event. Also omit empty `client_ip_address`/`client_user_agent` (webhook path) rather than sending empty strings.

## Backfilling missed server Purchases (CAPI recovery)
When the token outage drops events, recover them by re-sending Purchase via CAPI — NOT Meta's offline-CSV upload. The offline CSV does NOT accept `fbp`/`fbc`, and HeartSync stores no email/phone on guest purchases, so the CSV would have almost nothing to match on; `fbp`/`fbc` (present on ~all cards via `hs_cards`) are the only strong match keys we hold, and only CAPI can use them.
Window: Meta accepts `event_time` up to **7 days** old — fine for a same-day outage. Use original `created_at`/`used_at` as `event_time`, real `value`, currency INR, `action_source:"website"`.
**Avoid double-counting** (no dedup help — original auto-fired `event_id`s aren't persisted, so a backfill mints new ids): manually exclude events OUTSIDE the broken window. Lower bound = the outage start (Meta chart drop); upper bound = when the new token went live in prod (the republish — confirm via a post-publish `[capi]` log showing a *business* rejection like "no customer information parameters" rather than an auth error). Drop any card with no `fbp` AND no `fbc` (unmatchable).
**Why:** re-inflating ROAS is the exact harm we fixed; a boundary event that already landed would be counted twice.

## Verifying past payments
Deployment-log verification is unreliable after a republish: a new deployment starts a fresh log stream, so `/verify` + `[capi]` lines from payments on the PRIOR deployment are gone. Definitive check = Meta Events Manager (owner-controlled): confirm Purchase events arriving on both "Browser" and "Server" with deduplication, and value split by ₹49/₹99.

## 2804050 ("no customer information") ≠ token problem — it's the Razorpay webhook race
Subcode **2804050** (code 100) means empty/insufficient `user_data` — auth is FINE (a bad token gives OAuthException **190**). Root cause seen 17 Jun 2026: Razorpay `fulfillOrder` fireOnce race — the server-to-server webhook backstop (no browser cookies) usually beats the client `/verify`, so it fired Purchase before `/verify` wrote `fbp/fbc` onto `hs_cards` → `fireMetaCapi`'s `SELECT fbp,fbc` returned null → empty user_data → 400. Cards look populated *after the fact* because `/verify` writes the cookies a few seconds later.
**Fix:** capture `fbp/fbc` at **create-order** (browser has them) and stamp onto `hs_cards` immediately (UPDATE … COALESCE), so whichever path wins fireOnce already has match keys. Client sends fbp/fbc to create-order; server also falls back to first-party `_fbp/_fbc` cookies for stale clients. UPI paths were never affected (same-handler upsert-before-fire).
**Why:** distinguishes a data/race outage from a token outage so you don't chase the wrong fix; dev DB ≠ prod DB here, so reproduce against prod data (executeSql production) + token, not the dev pool.
