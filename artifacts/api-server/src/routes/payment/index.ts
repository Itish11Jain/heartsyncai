import { Router } from "express";
import crypto from "node:crypto";

const router = Router();

const UTR_SECRET = process.env.UTR_SIGNING_SECRET ?? "heartsync-utr-secret-v1";

router.post("/payment/submit-utr", (req, res) => {
  const { utr, reportSession } = req.body as { utr?: unknown; reportSession?: unknown };

  if (
    typeof utr !== "string" ||
    utr.trim().length < 12 ||
    utr.trim().length > 50 ||
    !/^[A-Za-z0-9]+$/.test(utr.trim())
  ) {
    res.status(400).json({
      error: "validation_error",
      message: "UTR must be 12–50 alphanumeric characters (letters and digits only).",
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

  const cleanUtr = utr.trim();
  const cleanSession = reportSession.trim();

  const token = crypto
    .createHmac("sha256", UTR_SECRET)
    .update(`${cleanUtr}:${cleanSession}`)
    .digest("hex");

  req.log.info({ utr: cleanUtr, reportSession: cleanSession }, "UTR submission received");

  res.json({ ok: true, token, reportSession: cleanSession });
});

export default router;
