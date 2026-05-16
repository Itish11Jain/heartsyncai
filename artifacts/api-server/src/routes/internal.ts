import { Router } from "express";
import { pool } from "../lib/db";

const router = Router();

/**
 * POST /api/internal/upi-payment
 * Called by the Android SMS Forwarder app when a ₹49 credit SMS is detected.
 * Secured with ADMIN_SECRET in Authorization header.
 * Body: { utr: string, raw_sms?: string, amount?: string }
 */
router.post("/internal/upi-payment", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const adminSecret = process.env["ADMIN_SECRET"];

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { utr, raw_sms, amount } = req.body as {
    utr?: unknown;
    raw_sms?: unknown;
    amount?: unknown;
  };

  if (typeof utr !== "string" || !/^\d{12}$/.test(utr.trim())) {
    res.status(400).json({
      error: "validation_error",
      message: "utr must be exactly 12 digits",
    });
    return;
  }

  const cleanUtr = utr.trim();
  const cleanAmount = typeof amount === "string" ? amount.slice(0, 20) : null;
  const cleanSms = typeof raw_sms === "string" ? raw_sms.slice(0, 500) : null;

  try {
    await pool.query(
      `INSERT INTO hs_received_payments (utr, amount, raw_sms)
       VALUES ($1, $2, $3)
       ON CONFLICT (utr) DO NOTHING`,
      [cleanUtr, cleanAmount, cleanSms],
    );
    res.json({ ok: true, utr: cleanUtr });
  } catch (err) {
    console.error("[internal] POST /internal/upi-payment error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * DELETE /api/internal/upi-payment/:utr
 * Remove a payment record (e.g. test entries). Admin-only.
 */
router.delete("/internal/upi-payment/:utr", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const adminSecret = process.env["ADMIN_SECRET"];

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { utr } = req.params;

  try {
    await pool.query(`DELETE FROM hs_received_payments WHERE utr = $1`, [utr]);
    await pool.query(`DELETE FROM hs_card_unlock_submissions WHERE full_utr = $1`, [utr]);
    res.json({ ok: true, deleted: utr });
  } catch (err) {
    console.error("[internal] DELETE /internal/upi-payment error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
