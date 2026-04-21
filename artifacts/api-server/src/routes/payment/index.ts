import { Router } from "express";
import crypto from "node:crypto";
import { requireAuth } from "../../middleware/requireAuth.js";
import { pool } from "../../lib/db.js";

const router = Router();

const signingSecret =
  process.env["UTR_SIGNING_SECRET"] ?? crypto.randomBytes(32).toString("hex");

const approvedSessions = new Map<string, { utrMasked: string; approvedAt: number }>();

function validateUtr(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  const isUpiRef = /^\d{12}$/.test(v);
  const isBankUtr = /^[A-Za-z]{4}[A-Za-z0-9]{12,18}$/.test(v);
  return isUpiRef || isBankUtr;
}

router.post("/payment/submit-utr", requireAuth, async (req, res) => {
  const { utr, reportSession } = req.body as { utr?: unknown; reportSession?: unknown };

  if (!validateUtr(utr)) {
    res.status(400).json({
      error: "validation_error",
      message:
        "Invalid UTR format. Enter the 12-digit UPI reference or bank transaction ID (e.g. HDFC0123456789012).",
    });
    return;
  }

  if (typeof reportSession !== "string" || reportSession.trim().length === 0) {
    res.status(400).json({
      error: "validation_error",
      message: "Invalid report session.",
    });
    return;
  }

  const cleanUtr = utr!.trim().toUpperCase();
  const cleanSession = reportSession.trim();
  const utrMasked = `${cleanUtr.slice(0, 4)}${"*".repeat(Math.max(0, cleanUtr.length - 8))}${cleanUtr.slice(-4)}`;

  const existing = await pool.query(
    "SELECT id FROM hs_utr_submissions WHERE utr = $1",
    [cleanUtr],
  );
  if ((existing.rowCount ?? 0) > 0) {
    res.status(409).json({
      error: "duplicate_utr",
      message:
        "This transaction ID has already been used. Please contact support if you think this is a mistake.",
    });
    return;
  }

  await pool.query(
    "INSERT INTO hs_utr_submissions (utr, user_id) VALUES ($1, $2)",
    [cleanUtr, req.user!.userId],
  );

  approvedSessions.set(cleanSession, { utrMasked, approvedAt: Date.now() });

  const token = crypto
    .createHmac("sha256", signingSecret)
    .update(`${cleanUtr}:${cleanSession}`)
    .digest("hex");

  const updated = await pool.query<{ credits: number }>(
    "UPDATE hs_users SET credits = credits + 5 WHERE id = $1 RETURNING credits",
    [req.user!.userId],
  );
  await pool.query(
    "INSERT INTO hs_credit_logs (user_id, delta, reason) VALUES ($1, $2, $3)",
    [req.user!.userId, 5, `utr_payment:${cleanUtr}`],
  );

  const creditsRemaining = updated.rows[0]?.credits ?? 5;

  req.log.info(
    { utrMasked, reportSession: cleanSession, userId: req.user!.userId, creditsRemaining },
    "UTR submission recorded, credits added",
  );

  res.json({ ok: true, token, reportSession: cleanSession, creditsRemaining });
});

router.get("/payment/status/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const record = approvedSessions.get(sessionId);
  if (record) {
    res.json({ approved: true, approvedAt: record.approvedAt });
  } else {
    res.json({ approved: false });
  }
});

export default router;
