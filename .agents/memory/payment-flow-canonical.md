---
name: Payment flow — manual UPI/UTR default, Razorpay behind a runtime toggle
description: Manual "I've paid"+UTR is the default UX; a restored Razorpay flow sits dormant behind a DB-backed payment_mode flag, flippable by admin with no redeploy.
---

# Payment flow: manual UPI/UTR default, Razorpay dormant behind a flag

The **default** payment UX across HeartSync is the **manual UPI flow**: show the UPI ID
(copy) + QR (`upi://pay`), an **"I've paid"** CTA, then a **UTR / transaction-ID entry**
field that the server verifies. This applies to every paywall surface — the card
unlock/share modal, the watermark paywall, the builder (send) paywall, the bundle page,
the premium template lock, the remove-watermark page, the reply paywall, and Reports top-up.

**Razorpay is restored but DORMANT, gated by a runtime flag.** A full Razorpay Standard
Web Checkout flow exists again, but it only activates when the server-side payment mode is
flipped to `razorpay`. The default is `upi`, so production behaves exactly like the manual
flow until the owner flips the switch.

**Why:** Razorpay was first built, briefly live, then fully reverted (owner was unsure).
Later the owner asked to restore it but keep it **off by default and flippable instantly
without a redeploy** — so it was reintroduced behind a DB-backed toggle rather than ripped
back in wholesale. Do NOT make Razorpay the default or remove the flag without an explicit
owner request.

**The toggle (source of truth = server):**
- `hs_app_config(key,value,updated_at)` row `payment_mode` ∈ {`upi`,`razorpay`}, default `upi`.
- `appConfig.ts`: `getPaymentMode()` / `setPaymentMode()` with a short in-memory TTL cache.
- Public `GET /api/payment-mode` returns `razorpay` ONLY when mode=razorpay AND keys present,
  else `upi` — so a mis-flip can never strand users on a checkout that can't create orders.
- Admin flip (key-gated by `ADMIN_SECRET`): `GET /api/admin/payment-mode` (read) and
  `GET /api/admin/payment-mode/set?key=...&mode=razorpay|upi` (write). Flip takes effect in seconds.

**Server is authoritative for PRICE too** (client never sends amounts): card unlock price
comes from the card row (₹49/₹99; ₹29 only for server-minted reply cards), bundle ₹49,
template ₹49, watermark ₹29. `razorpay/create-order` derives the amount server-side.

**Gating rules (important):**
- `create-order` is gated: 409 when mode≠razorpay, 503 when keys missing.
- `verify` + `webhook` are intentionally NOT mode-gated — an in-flight payment made just
  before a flip back to UPI must still be fulfillable. `fulfillOrder` is idempotent.
- Razorpay `kind:"template"` only unlocks the 3 templates account-wide; it does NOT create
  a card. The client must still create the card row + PATCH is_premium/is_watermarked=false
  afterward (the same finish-steps the manual flow runs).

**Client fallback contract on every razorpay-capable surface:** prefetch mode (or check at
CTA time), render the online button when active; on `PaymentCancelled` (user dismissed) stay
put; on any other failure fall back to the manual UPI flow (flip local `payMode` to `upi`
or `setPhase("paying")`) so the user can still pay.

**UPI payee-name label is wrong in some production paywalls:** the displayed payee NAME in
WatermarkPaywallModal/UnlockModal/bundle is hardcoded to a name that is NOT the real account
holder; the reply paywall uses the correct one. When fixing a payee label, copy the name
from `UPI_PAYEE` in `reply.tsx`. The VPA is identical across surfaces; only the name differs.
