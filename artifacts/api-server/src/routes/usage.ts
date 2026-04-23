import { Router } from "express";
import { pool } from "../lib/db";
import { getAuth } from "@clerk/express";

const router = Router();

/**
 * GET /api/usage/check?fingerprint=xxx
 * Returns how many cards this fingerprint/user has used.
 */
router.get("/usage/check", async (req, res) => {
  const fingerprint = (req.query["fingerprint"] as string | undefined)?.trim();
  if (!fingerprint) {
    return res.status(400).json({ error: "fingerprint required" });
  }

  const auth = getAuth(req);
  const clerkUserId = auth?.userId ?? null;

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

  // If signed in, check their user-level usage
  if (clerkUserId) {
    const userRow = await pool.query(
      "SELECT cards_used FROM hs_clerk_users WHERE clerk_user_id = $1",
      [clerkUserId]
    );
    if (userRow.rows.length > 0) {
      signedInUsed = userRow.rows[0].cards_used as number;
    }
    // Ensure user row exists
    await pool.query(
      `INSERT INTO hs_clerk_users (clerk_user_id) VALUES ($1) ON CONFLICT (clerk_user_id) DO NOTHING`,
      [clerkUserId]
    );
  }

  return res.json({
    anon_used: anonUsed,
    signed_in_used: signedInUsed,
    is_signed_in: !!clerkUserId,
  });
});

/**
 * POST /api/usage/increment
 * Body: { fingerprint: string }
 * Increments usage counter for anon fingerprint or signed-in user.
 */
router.post("/usage/increment", async (req, res) => {
  const { fingerprint } = req.body as { fingerprint?: string };
  if (!fingerprint) {
    return res.status(400).json({ error: "fingerprint required" });
  }

  const auth = getAuth(req);
  const clerkUserId = auth?.userId ?? null;

  // Always increment anonymous fingerprint
  const ip =
    ((req.headers["x-forwarded-for"] as string) ?? "")
      .split(",")[0]
      .trim() || req.socket?.remoteAddress || "";

  await pool.query(
    `INSERT INTO hs_card_usage (fingerprint, ip, cards_used)
     VALUES ($1, $2, 1)
     ON CONFLICT (fingerprint)
     DO UPDATE SET cards_used = hs_card_usage.cards_used + 1, updated_at = NOW()`,
    [fingerprint, ip]
  );

  // If signed in, also increment their user counter
  if (clerkUserId) {
    await pool.query(
      `INSERT INTO hs_clerk_users (clerk_user_id, cards_used)
       VALUES ($1, 1)
       ON CONFLICT (clerk_user_id)
       DO UPDATE SET cards_used = hs_clerk_users.cards_used + 1`,
      [clerkUserId]
    );
  }

  return res.json({ success: true });
});

export default router;
