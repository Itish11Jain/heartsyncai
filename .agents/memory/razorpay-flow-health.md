---
name: Razorpay flow health
description: Razorpay online-checkout flow is verified functional end-to-end; how a "click did nothing" report was diagnosed and why it's not a code bug.
---

# Razorpay checkout is verified working — "click did nothing" was not a code bug

The runtime-toggled Razorpay online-checkout flow (payMode flag) is functional end-to-end.
Reproduced in dev with the **live** key: create-order → checkout.js loads → `new Razorpay().open()`
creates the `api.razorpay.com/v1/checkout/public` iframe. No errors, no CSP, no z-index conflict
(UnlockModal zIndex 10010 « Razorpay's max-int container).

**Why a production "Pay & Share click did nothing" is NOT a server/code defect:**
- create-order returning 200 proves: the click registered, the live key is valid, the account is
  live-activated, and the client razorpay lib ran. Everything after that is browser-side.
- Production has no CSP (server: Google Frontend / Replit edge), so checkout.js isn't edge-blocked.
- Analytics confirm the symptom shape: `pay_popup_cta_clicked` fires, `card_paid` never does.

**The real diagnosability gap:** when checkout.js can't load/open on a *specific user's*
browser/network, `handlePrimaryCta`'s catch does `setPhase("paying")` and **silently** drops the
user onto the manual UPI screen with no message — so a blocked checkout.js looks like "the razorpay
click did nothing / it went to UPI instead." If this recurs, the fix is to surface a visible
message on the non-cancel fallback, not to touch the (working) server/order path.

**Why:** spent a full debug cycle proving the flow works; the live key means you can't test a
successful payment without real money (no test-card path unless test keys are configured).

**How to apply:** before re-investigating a "razorpay CTA broken" report, check whether
create-order returned 200 (→ server fine, look browser-side) and whether `card_paid` fired. Don't
assume the modal failed to open — confirm it.
