---
name: Birthday funnel drop-off location
description: Where the birthday card funnel actually leaks (the paywall step, not the 6 scenes), and the windowing trap that hid it.
---

# Birthday under-conversion is a PAYWALL-step problem, not a scene-completion problem

Birthday converts ~7.6% (created→paid) vs ~12% for sorry/feel_good. The leak is NOT the 6-scene cinematic and NOT "people never reach the paywall."

On a window matched to when tracking went live (cards created after birthday `bundle_paywall_shown` + `birthday_sceneN_viewed` first fired, 2026-06-17):
- **Scenes are fine:** ~86% of creators reach scene 6; only ~14% lost across the entire 6-scene sequence; no single catastrophic scene.
- **Reaching the paywall is at parity:** birthday created→paywall ~84% vs sorry/feel_good 87–89%.
- **The real leak is AT the paywall:** birthday paywall→pay_click ~19% vs sorry 27% / feel_good 24%; and pay_click→paid ~47% vs 51–58%. Those two weaker steps compound to ~half the overall conversion.

**Price is NOT the cause:** sorry is also ₹99 and has the HIGHEST paywall→pay_click of all. So the ₹99 birthday price is not what suppresses clicks.

**Working hypothesis:** the birthday paywall auto-opens 3s after the sender has already passively enjoyed the full free cinematic (scene 6), so the card already feels "complete" → low urgency to pay. SenderPanel templates (sorry/feel_good) instead surface the paywall as part of the share/send action the user initiated, so intent is higher at the moment of the ask.

## Windowing trap (why the first analysis was wrong)
`bundle_paywall_shown` for birthday did not exist before 2026-06-17. Comparing all-time/30-day `card_created` against an event that only started firing recently makes created→paywall look catastrophically low (got a fake 44% vs real ~84%).
**Why:** denominator spans 30 days, numerator spans ~8 days.
**How to apply:** when any funnel step uses a recently-added event, anchor the WHOLE funnel to `MIN(created_at)` of that event and restrict to cards CREATED since then. Never compare counts of an old event vs a newly-added event across the same long window.
