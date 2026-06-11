---
name: Payment flow — manual UPI/UTR is canonical
description: Razorpay was tried then fully reverted; the manual "I've paid" + UTR flow is the chosen payment UX everywhere.
---

# Payment flow: manual UPI/UTR "I've paid", not Razorpay

The canonical payment UX across HeartSync is the **manual UPI flow**: show the UPI ID
(copy) + QR (`upi://pay`), an **"I've paid"** CTA, then a **UTR / transaction-ID entry**
field that the server verifies. This applies to every paywall surface — the card
unlock/share modal, the watermark paywall, the builder (send) paywall, the bundle page,
the premium template lock, the remove-watermark page, and the Reports top-up.

**Why:** A full Razorpay Standard Web Checkout migration was built and briefly live, then
the owner reverted ALL of it ("revert the razorpay work — we are not sure about it yet")
and asked for the old "I've paid" flow back everywhere. The owner is undecided on
Razorpay, so do NOT reintroduce it without an explicit, fresh request.

**UPI payee-name label is wrong in production paywalls:** The payee NAME shown in the
production paywall UI (WatermarkPaywallModal, UnlockModal, bundle) is hardcoded to a name
that is NOT the real account holder. The reply paywall was corrected to the real owner's
name — when adding or fixing any payee label, copy the name from `UPI_PAYEE` in
`reply.tsx`, not from the production paywalls. The VPA is the same across all surfaces and
is unchanged; only the displayed name differs.

**How to apply:**
- Do not add Razorpay (SDK, `checkout.js`, `payWithRazorpay`, create-order/verify/webhook
  endpoints, `VITE_RAZORPAY_*`) to any surface unless the owner explicitly asks again.
- Manual UTR submission endpoints live in api-server (`/api/usage/utr-submit`,
  `/api/usage/template-unlock-utr`, `/api/cards/:id/remove-watermark`); UTRs are
  deduped via advisory locks across the hs_*_payments / hs_*_utr tables. Reuse these.
- Razorpay's auto-unlock wrote to `hs_received_payments`; the manual flow records into
  its per-context UTR tables and PATCHes the card. Keep that separation.
- The revert restored the payment files to the pre-Razorpay commit and deleted the new
  razorpay modules; if reintroducing later, expect to re-touch send/bundle/UnlockModal/
  WatermarkPaywallModal/PremiumLockPanel + api-server app/db/routes.
