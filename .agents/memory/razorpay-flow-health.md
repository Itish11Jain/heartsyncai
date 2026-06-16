---
name: Razorpay flow health
description: How a "Pay & Share click did nothing" was diagnosed to a silent client-side hang after a successful create-order, and the hardening that fixed it.
---

# "Pay & Share did nothing" = silent client-side hang AFTER create-order

Owner made a real card on production with Razorpay mode on, clicked Pay, and
nothing happened. Production logs showed the canonical signature:
`/api/razorpay/create-order` returned **200**, then **no** `/api/razorpay/verify`
ever followed and the owner gave up ~18s later. So the server did its job; the
break was 100% browser-side, after order creation.

**Root cause / design defect (not a server bug):** in `payWithRazorpay`, after a
successful create-order, the flow loaded `checkout.js` then `rzp.open()`. If the
overlay never rendered (popup/iframe blocked, in-app webview quirk, slow/blocked
CDN) the returned Promise **never settled** — so `UnlockModal.handlePrimaryCta`
hung with `rzpLoading` stuck and `setRzpError`/`setPhase` never firing. Result:
the button shows absolutely nothing. Worse, the original catch did a *silent*
`setPhase("paying")` with no message, so even the caught-error path was
invisible.

**Important caution:** a standalone HTML test page that calls `rzp.open()`
directly does NOT prove the real flow works — it bypasses the React
`handlePrimaryCta` logic, the modal's body-scroll-lock, and the async gap
between user gesture and open(). Don't conclude "it works" from that.

**Hardening applied (keep these invariants):**
- `loadCheckoutScript` has a timeout (~12s) so a blocked CDN rejects instead of
  hanging.
- After `rzp.open()`, a ~6s watchdog checks the DOM for the Razorpay overlay
  (`.razorpay-container`/`.razorpay-checkout-frame`); if absent it rejects with a
  real error — the Promise can no longer hang forever.
- Non-cancel failures in the modal show a **visible** message AND fall back to
  the manual UPI screen (never silent). `PaymentCancelled` (user dismissed) is
  still a no-op.
- `[razorpay]` console breadcrumbs trace start → order created → script loaded →
  opening → failure, so a future "it didn't work" is self-diagnosing.

**Why:** the live key means you can't test a successful payment without real
money, and Playwright e2e is unavailable here (no X server). Visible errors +
breadcrumbs are the only way to diagnose remote device-specific failures.

**How to apply:** before re-investigating a "razorpay CTA broken" report, check
whether create-order returned 200 (→ server fine, look browser-side) and whether
`card_paid`/verify fired. Have the owner read the console `[razorpay]` lines.
Never let the open() path resolve only via Razorpay callbacks — keep the
watchdog.
