---
name: Reply (₹29) paywall mirrors UnlockModal
description: Which production paywall the /reply ₹29 flow must replicate, and the mint+poll mechanics behind it.
---

The /reply "viral reply" ₹29 paywall must replicate the production **UnlockModal**
"Complete payment" flow — NOT WatermarkPaywallModal/QR. Layout: bottom-sheet, back
arrow + "Complete payment" title, "Pay ₹anchor→₹price via any UPI App", a copy-only
UPI-ID box (Copy → sticky "Copied ✓"), 🔐 trust line, a **copy-gated** "I've Paid →"
CTA that polls auto-unlock with a live countdown, and a UTR fallback ("Payment done?"
last-4 input) that polls pay-unlock with its own countdown, then 🎉 success.

**Why:** owner supplied screenshots of UnlockModal; an earlier rebuild wrongly mirrored
WatermarkPaywallModal's QR layout and was rejected.

**How to apply:**
- Mint the reply card up-front (`POST /api/cards/reply`) so auto-unlock has an id to poll.
- ₹29 is server-authoritative (stored price wins); client price in bodies is advisory.
- Copy gate must be **sticky** — never auto-reset `upiCopied` on a timer (that re-disables
  the CTA mid-flow); reset only on modal open/back, exactly like UnlockModal's `idCopied`.
- Keep reply-funnel analytics (reply_pay_clicked / reply_payment_done_clicked /
  reply_utr_submitted / reply_unlocked / reply_shared) and recipient `card_viewed`.
- Payee/trust name on /reply is intentionally "Saurabh" (UnlockModal shows "Itisha") — do
  not "fix" this divergence.
