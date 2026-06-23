---
name: Birthday fbclid threading for Meta attribution
description: Why birthday under-attributes in Meta and the birthday-only client-funnel fix (not a CAPI change)
---

# Birthday Meta attribution — diagnosis + fix

## Diagnosis (data-proven)
Birthday purchases were under-attributing in Meta, but this is a **click-MATCH** problem, NOT a CAPI delivery problem. A full day of prod CAPI logs showed ₹99 tier (birthday+sorry) at ~94% `fbc=true` (34/36), overall 92.9% `fbc=true`. So purchases DO reach Meta with a click cookie — Meta just can't tie the `fbc` to a fresh birthday-ad click.

**Why:** birthday's `fbc` came from the `_fbc` cookie, which can be stale (returning visitor) or never refreshed (in-app browser blocked the Pixel). The birthday ad lands on HOME and the home→/send hop dropped `fbclid`, and birthday is a premium template so `fbc` was captured two hops downstream on `/birthday.html` — maximizing the chance of a stale/missing cookie.

## Fix (forward-only, birthday-gated)
Thread the fresh ad `fbclid` through the client funnel so the birthday card page rebuilds a fresh `_fbc` instead of trusting the cookie. Three gated points: home `occasionDeepLink` (occasion==="birthday"), send `buildCardUrl` (template==="birthday"), and UnlockModal `getMetaCookies(preferUrlFbclid)` passed `occasion==="birthday"` at all 3 pay call sites. **Never** change other occasions' funnels or the server CAPI send path.

**How to apply:** if asked to extend fbclid preservation to other occasions, gate each occasion explicitly; do not flip the shared cookie-first default for non-birthday flows.

## Backfill is NOT possible for past misses
The missed birthday purchases already fired CAPI with `fbc=true` and Meta deduped them by `event_id`. Re-sending identical events does nothing; we have no *better* `fbc` (the true birthday-ad `fbclid` was never captured for those rows). So lost attributions are unrecoverable — the fix is forward-only.

## "Meta REJECTED 2804050" logs are harmless
Each sale fires CAPI **twice on the same `event_id`**: first via the webhook path WITHOUT customer-info params (Meta rejects it, `error_subcode 2804050`), then ~3-20s later via the verify path WITH `fbp`+`fbc` (accepted, `events_received:1`). Every rejected id is followed by an accepted send. Do NOT treat these rejections as lost sales.
