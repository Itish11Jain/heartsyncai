import { Router } from "express";

const router = Router();

/**
 * POST /api/internal/upi-payment  — DEPRECATED / DISABLED
 *
 * Previously called by the Android SMS Forwarder app when a ₹49 credit SMS was
 * detected, to seed hs_received_payments by UTR. Payments are now handled by
 * Razorpay Standard Checkout: on a verified payment the Razorpay verify/webhook
 * flow writes the confirmed hs_received_payments row directly. To prevent stray
 * SMS-derived rows from creating phantom/unmatched payments, this ingest is
 * disabled and intentionally no longer writes anything.
 *
 * The auth check is preserved so the legacy forwarder app still receives a clean,
 * authenticated response (HTTP 410 Gone) and can stop retrying.
 */
router.post("/internal/upi-payment", (req, res) => {
  const authHeader = req.headers["authorization"];
  const adminSecret = process.env["ADMIN_SECRET"];

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  res.status(410).json({
    error: "gone",
    message:
      "SMS forwarder ingest is disabled. Payments are now processed via Razorpay.",
  });
});


export default router;
