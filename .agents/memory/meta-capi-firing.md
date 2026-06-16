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

## Dedup: only the /verify (and UPI client) path is safe
Browser Pixel + server CAPI dedup ONLY when they share the same `eventID`. That happens when the **client** triggers the unlock (client generates eventId, sends it as `verifyExtras.eventId`, server reuses it).
The **Razorpay webhook backstop** has no client eventId, so `capiEventId = hs_<cardId>_<ts>` (synthetic). `fireOnce` stops a second SERVER CAPI, but it does NOT make the synthetic id match the browser Pixel id — so if the webhook fires CAPI AND the browser Pixel later fires, Meta can double-count. In practice the webhook usually only "wins" when the buyer closed the tab (browser Pixel never fired), so the collision is rare but real.
**Fix if it ever matters:** persist a deterministic per-order eventId at create-order time and reuse it in browser Purchase + verify CAPI + webhook CAPI.

## Server CAPI shares ONE access token across ALL paths
Every server Purchase (Razorpay verify/webhook AND UPI auto_unlock/manual_utr) goes through the same `fireMetaCapi`, which uses the single `META_PIXEL_ACCESS_TOKEN`. So if "server events received" drops to ~0 across ALL unlock methods at once (not just one payment mode), suspect the **token** (expired/invalid → OAuthException 190), NOT the payment path. Diagnostic tell: UPI auto_unlock CAPI stopping at the same instant as Razorpay CAPI rules out a Razorpay-specific bug.
**Why:** on 16 Jun 2026 ~5PM IST server events flatlined right when Razorpay went live; DB proved 24 razorpay + 3 auto_unlock paid unlocks still happened after the cutoff, so fulfillment worked — only Meta delivery failed, and the common factor is the token.
**How to apply:** when CAPI "stops," first confirm fulfillment in the prod DB (`hs_razorpay_orders` paid / `hs_card_events` card_paid), then check token validity — don't chase the payment code.

## CAPI must NOT be fire-and-forget
`fireMetaCapi` now reads the fetch response: logs `[capi] Meta REJECTED status=.. body=..` on `!resp.ok`, else success with a response snippet. Previously it `await`ed the POST but ignored the result, so a token-rejected event logged `Purchase fired` identically to an accepted one — the outage was invisible for hours.
**Why:** blind logging hid a total Meta-delivery failure behind healthy-looking "fired" lines.
**How to apply:** never revert to ignoring the Graph API response; `events_received` / `error` is the only in-app signal that Meta actually accepted the event. Also omit empty `client_ip_address`/`client_user_agent` (webhook path) rather than sending empty strings.

## Verifying past payments
Deployment-log verification is unreliable after a republish: a new deployment starts a fresh log stream, so `/verify` + `[capi]` lines from payments on the PRIOR deployment are gone. Definitive check = Meta Events Manager (owner-controlled): confirm Purchase events arriving on both "Browser" and "Server" with deduplication, and value split by ₹49/₹99.
