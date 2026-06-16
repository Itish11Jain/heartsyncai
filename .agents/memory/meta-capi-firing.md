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

## Verifying past payments
Deployment-log verification is unreliable after a republish: a new deployment starts a fresh log stream, so `/verify` + `[capi]` lines from payments on the PRIOR deployment are gone. Definitive check = Meta Events Manager (owner-controlled): confirm Purchase events arriving on both "Browser" and "Server" with deduplication, and value split by ₹49/₹99.
