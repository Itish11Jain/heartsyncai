---
name: Razorpay fulfillment idempotency
description: The exactly-once-vs-retry-safe invariant for Razorpay payment fulfillment, and the webhook success gate.
---

Razorpay fulfillment has TWO entry points for the same payment: the client `/razorpay/verify` call and the server-to-server `/razorpay/webhook` backstop. Both can fire (race or retry). `fulfillOrder` is the SOLE idempotency authority — callers must invoke it without their own status pre-gate.

**The core invariant (do not collapse the two layers):**
- ALWAYS run the idempotent fulfillment work on every call (the confirmed-payment row + the kind-specific unlock). This is what makes it retry-safe: a retry after a partial failure must be able to COMPLETE the unlock, never be skipped.
- Gate ONLY the non-idempotent one-time effects (the analytics `card_paid` event + the external Meta CAPI fire) behind an atomic claim, so they fire at most once across verify+webhook.

**Why:** an earlier version used the order's `paid` status as both "claimed" and "completed" and early-returned the whole fulfillment when the claim lost (and the webhook pre-gated on `status!='paid'`). That left orders marked paid but never unlocked after any crash between claim and unlock. The fix splits "always do the idempotent unlock" from "fire one-time effects once." The tiny crash window that can drop the best-effort analytics event/CAPI is acceptable; dropping the actual unlock is not.

**Webhook success gate:** a valid HMAC only proves the payload came from Razorpay, NOT that the payment succeeded. The webhook must additionally require a captured payment (success event / captured status) before fulfilling, or a signed failed/authorized event would wrongly unlock. The client verify path is fine on signature alone (Razorpay only hands the client a valid order|payment signature on success).

**How to apply:** any new payment "kind" added to `fulfillOrder` must run its idempotent unlock unconditionally and pass the one-time-fire flag down to gate only analytics/CAPI-type effects. Amounts are always server-derived from occasion pricing in `create-order` (never trusted from the client); the frontend reads the public key id from the create-order response (no `VITE_RAZORPAY_KEY_ID` needed). The legacy Android SMS-forwarder ingest is intentionally disabled (410, no DB write) so Razorpay stays the single source of confirmed payments.
