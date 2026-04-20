import { Router } from "express";
import crypto from "node:crypto";

const router = Router();

const UTR_SECRET = process.env.UTR_SIGNING_SECRET ?? "heartsync-utr-secret-v1";

const approvedSessions = new Map<string, { utr: string; approvedAt: number }>();

function validateUtr(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= 12 &&
    value.trim().length <= 50 &&
    /^[A-Za-z0-9]+$/.test(value.trim())
  );
}

router.post("/payment/submit-utr", (req, res) => {
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

  approvedSessions.set(cleanSession, { utr: cleanUtr, approvedAt: Date.now() });

  const token = crypto
    .createHmac("sha256", UTR_SECRET)
    .update(`${cleanUtr}:${cleanSession}`)
    .digest("hex");

  req.log.info({ utr: cleanUtr, reportSession: cleanSession }, "UTR submission approved");

  res.json({ ok: true, token, reportSession: cleanSession });
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
