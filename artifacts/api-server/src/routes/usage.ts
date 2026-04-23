import { Router } from "express";
import { pool } from "../lib/db";
import { getAuth } from "@clerk/express";

const SUPERUSER_EMAILS = ["jainitisha93@gmail.com"];

function validateUtr(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^\d{12}$/.test(v) || /^[A-Za-z]{4}[A-Za-z0-9]{12,18}$/.test(v);
}

const router = Router();

/**
 * GET /api/usage/check?fingerprint=xxx&email=xxx
 * Returns how many cards this fingerprint/user has used.
 * Optionally stores email in hs_clerk_users if provided + authed.
 */
router.get("/usage/check", async (req, res) => {
  const fingerprint = (req.query["fingerprint"] as string | undefined)?.trim();
  if (!fingerprint) {
    return res.status(400).json({ error: "fingerprint required" });
  }

  const emailParam = (req.query["email"] as string | undefined)?.trim() ?? null;
  const auth = getAuth(req);
  const clerkUserId = auth?.userId ?? null;
  const isSuperUser = !!emailParam && SUPERUSER_EMAILS.includes(emailParam);

  let anonUsed = 0;
  let signedInUsed = 0;

  // Always check anonymous fingerprint usage
  const anonRow = await pool.query(
    "SELECT cards_used FROM hs_card_usage WHERE fingerprint = $1",
    [fingerprint]
  );
  if (anonRow.rows.length > 0) {
    anonUsed = anonRow.rows[0].cards_used as number;
  }

  // If signed in, check their user-level usage and optionally store email
  if (clerkUserId) {
    const userRow = await pool.query(
      "SELECT cards_used FROM hs_clerk_users WHERE clerk_user_id = $1",
      [clerkUserId]
    );
    if (userRow.rows.length > 0) {
      signedInUsed = userRow.rows[0].cards_used as number;
    }
    // Ensure user row exists and update email if provided
    if (emailParam) {
      await pool.query(
        `INSERT INTO hs_clerk_users (clerk_user_id, email)
         VALUES ($1, $2)
         ON CONFLICT (clerk_user_id) DO UPDATE SET email = EXCLUDED.email`,
        [clerkUserId, emailParam]
      );
    } else {
      await pool.query(
        `INSERT INTO hs_clerk_users (clerk_user_id) VALUES ($1) ON CONFLICT (clerk_user_id) DO NOTHING`,
        [clerkUserId]
      );
    }
  }

  return res.json({
    anon_used: anonUsed,
    signed_in_used: signedInUsed,
    is_signed_in: !!clerkUserId,
    is_superuser: isSuperUser,
  });
});

/**
 * POST /api/usage/increment
 * Body: { fingerprint: string, email?: string }
 * Increments usage counter. Skips increment for superuser emails.
 */
router.post("/usage/increment", async (req, res) => {
  const { fingerprint, email: emailBody } = req.body as { fingerprint?: string; email?: string };
  if (!fingerprint) {
    return res.status(400).json({ error: "fingerprint required" });
  }

  const emailParam = emailBody?.trim() ?? null;
  const isSuperUser = !!emailParam && SUPERUSER_EMAILS.includes(emailParam);

  const auth = getAuth(req);
  const clerkUserId = auth?.userId ?? null;

  // Skip all incrementing for superusers
  if (isSuperUser) {
    if (clerkUserId && emailParam) {
      await pool.query(
        `INSERT INTO hs_clerk_users (clerk_user_id, email)
         VALUES ($1, $2)
         ON CONFLICT (clerk_user_id) DO UPDATE SET email = EXCLUDED.email`,
        [clerkUserId, emailParam]
      );
    }
    return res.json({ success: true, superuser: true });
  }

  const ip =
    ((req.headers["x-forwarded-for"] as string) ?? "")
      .split(",")[0]
      .trim() || req.socket?.remoteAddress || "";

  // Always increment anonymous fingerprint
  await pool.query(
    `INSERT INTO hs_card_usage (fingerprint, ip, cards_used)
     VALUES ($1, $2, 1)
     ON CONFLICT (fingerprint)
     DO UPDATE SET cards_used = hs_card_usage.cards_used + 1, updated_at = NOW()`,
    [fingerprint, ip]
  );

  // If signed in, also increment their user counter
  if (clerkUserId) {
    if (emailParam) {
      await pool.query(
        `INSERT INTO hs_clerk_users (clerk_user_id, email, cards_used)
         VALUES ($1, $2, 1)
         ON CONFLICT (clerk_user_id)
         DO UPDATE SET cards_used = hs_clerk_users.cards_used + 1, email = EXCLUDED.email`,
        [clerkUserId, emailParam]
      );
    } else {
      await pool.query(
        `INSERT INTO hs_clerk_users (clerk_user_id, cards_used)
         VALUES ($1, 1)
         ON CONFLICT (clerk_user_id)
         DO UPDATE SET cards_used = hs_clerk_users.cards_used + 1`,
        [clerkUserId]
      );
    }
  }

  return res.json({ success: true });
});

/**
 * POST /api/usage/card-pack-utr
 * Body: { utr: string }
 * Requires Clerk auth. Validates UTR, grants 10 card credits.
 */
router.post("/usage/card-pack-utr", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    return res.status(401).json({ error: "unauthorized", message: "Sign in to purchase a card pack." });
  }

  const { utr } = req.body as { utr?: unknown };
  if (!validateUtr(utr)) {
    return res.status(400).json({
      error: "validation_error",
      message: "Invalid UTR format. Enter the 12-digit UPI reference or bank UTR (e.g. HDFC0123456789012).",
    });
  }

  const cleanUtr = (utr as string).trim().toUpperCase();

  // Ensure table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hs_card_utr_submissions (
      id SERIAL PRIMARY KEY,
      utr TEXT UNIQUE NOT NULL,
      clerk_user_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Check duplicate UTR (across both date guide and card pack)
  const dupCard = await pool.query(
    "SELECT id FROM hs_card_utr_submissions WHERE utr = $1",
    [cleanUtr],
  );
  if ((dupCard.rowCount ?? 0) > 0) {
    return res.status(409).json({
      error: "duplicate_utr",
      message: "This transaction ID has already been used. Contact support if you think this is a mistake.",
    });
  }

  // Also check against the date guide UTR submissions to prevent cross-reuse
  try {
    const dupDg = await pool.query("SELECT id FROM hs_utr_submissions WHERE utr = $1", [cleanUtr]);
    if ((dupDg.rowCount ?? 0) > 0) {
      return res.status(409).json({
        error: "duplicate_utr",
        message: "This transaction ID has already been used. Contact support if you think this is a mistake.",
      });
    }
  } catch {
    /* Table may not exist in all environments — skip check */
  }

  // Record the card UTR
  await pool.query(
    "INSERT INTO hs_card_utr_submissions (utr, clerk_user_id) VALUES ($1, $2)",
    [cleanUtr, clerkUserId],
  );

  // Grant 10 more cards by reducing cards_used by 10 (min 0)
  await pool.query(
    `INSERT INTO hs_clerk_users (clerk_user_id, cards_used)
     VALUES ($1, 0)
     ON CONFLICT (clerk_user_id)
     DO UPDATE SET cards_used = GREATEST(0, hs_clerk_users.cards_used - 10)`,
    [clerkUserId],
  );

  return res.json({ ok: true, message: "10 cards added to your account." });
});

export default router;
