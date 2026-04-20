import { Router } from "express";
import crypto from "node:crypto";
import { requireAuth } from "../../middleware/requireAuth.js";
import { pool } from "../../lib/db.js";

const router = Router();

const UTR_SECRET = process.env["UTR_SIGNING_SECRET"];
if (!UTR_SECRET && process.env["NODE_ENV"] === "production") {
  throw new Error("UTR_SIGNING_SECRET environment variable is required in production");
}
const signingSecret = UTR_SECRET ?? "heartsync-utr-dev-secret";

const approvedSessions = new Map<string, { utrMasked: string; approvedAt: number }>();

function validateUtr(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= 12 &&
    value.trim().length <= 50 &&
    /^[A-Za-z0-9]+$/.test(value.trim())
  );
}

router.post("/payment/submit-utr", requireAuth, async (req, res) => {
  const { utr, reportSession } = req.body as { utr?: unknown; reportSession?: unknown };

  if (!validateUtr(utr)) {
    res.status(400).json({
      error: "validation_error",
      message: "UTR must be 12–50 alphanumeric characters.",
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

  const cleanUtr = utr!.trim();
  const cleanSession = reportSession.trim();
  const utrMasked = `${cleanUtr.slice(0, 4)}${"*".repeat(Math.max(0, cleanUtr.length - 8))}${cleanUtr.slice(-4)}`;

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
    [req.user!.userId, 5, "utr_payment"],
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
