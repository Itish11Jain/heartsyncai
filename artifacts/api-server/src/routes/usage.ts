import { Router } from "express";
import { pool } from "../lib/db";
import { getAuth } from "@clerk/express";

const SUPERUSER_EMAILS = ["jainitisha93@gmail.com", "itisha.a.jain.93@gmail.com"];

const PREMIUM_TEMPLATES = ["cosmic", "crystal", "vinyl"] as const;
type PremiumTemplate = (typeof PREMIUM_TEMPLATES)[number];

function isPremiumTemplate(v: unknown): v is PremiumTemplate {
  return typeof v === "string" && (PREMIUM_TEMPLATES as readonly string[]).includes(v);
}

function validateUtr(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^\d{4}$/.test(v) || /^\d{12}$/.test(v) || /^[A-Za-z]{4}[A-Za-z0-9]{12,18}$/.test(v);
}

function isSequential4(v: string): boolean {
  const d = v.split("").map(Number);
  if (d.length !== 4) return false;
  if (d.every(x => x === d[0])) return true;
  if (d[1] === (d[0] + 1) % 10 && d[2] === (d[1] + 1) % 10 && d[3] === (d[2] + 1) % 10) return true;
  if (d[1] === (d[0] + 9) % 10 && d[2] === (d[1] + 9) % 10 && d[3] === (d[2] + 9) % 10) return true;
  return false;
}

/** Check if a UTR has been used in any of our payment tables. Caller must hold the UTR advisory lock.
 *
 * IMPORTANT: in Postgres, ANY error inside a transaction puts the whole
 * transaction into an aborted state until ROLLBACK — even if the error
 * is caught in JS. The legacy `hs_utr_submissions` / `hs_card_utr_submissions`
 * tables don't always exist in fresh deployments, and a 42P01 ("relation
 * does not exist") aborted the entire UTR-submit transaction, surfacing
 * as a generic 500 → "Submission failed" on the client.
 *
 * Wrap each probe in a SAVEPOINT so a missing-table error is contained. */
async function isUtrAlreadyUsed(
  client: import("pg").PoolClient,
  cleanUtr: string,
): Promise<boolean> {
  const tables = [
    "hs_watermark_payments",
    "hs_card_utr_submissions",
    "hs_template_unlock_payments",
    "hs_utr_submissions",
  ];
  for (const table of tables) {
    await client.query("SAVEPOINT utr_table_probe");
    try {
      const r = await client.query(`SELECT 1 FROM ${table} WHERE utr = $1 LIMIT 1`, [cleanUtr]);
      await client.query("RELEASE SAVEPOINT utr_table_probe");
      if ((r.rowCount ?? 0) > 0) return true;
    } catch (err) {
      // Roll back the savepoint so the surrounding transaction stays usable.
      await client.query("ROLLBACK TO SAVEPOINT utr_table_probe");
      const code = (err as { code?: string } | null)?.code;
      if (code !== "42P01") throw err;
    }
  }
  return false;
}

/** Serialize concurrent UTR submissions on a hashed advisory lock + transaction. */
async function withUtrLock<T>(cleanUtr: string, fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)", [cleanUtr]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
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
  let unlockedTemplates: string[] = [];
  let pendingSingleUnlocks = 0;

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

    const userRow = await pool.query(
      "SELECT cards_used, unlocked_templates FROM hs_clerk_users WHERE clerk_user_id = $1",
      [clerkUserId]
    );
    if (userRow.rows.length > 0) {
      signedInUsed = userRow.rows[0].cards_used as number;
      const ut = userRow.rows[0].unlocked_templates;
      unlockedTemplates = Array.isArray(ut) ? (ut as string[]) : [];
    }

    // Count any single-template payments the user has paid for but not yet
    // claimed — these allow them to skip the paywall on a premium template.
    try {
      const pending = await pool.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM hs_template_unlock_payments
           WHERE clerk_user_id = $1 AND plan = 'single' AND claimed_template IS NULL`,
        [clerkUserId]
      );
      pendingSingleUnlocks = Number(pending.rows[0]?.n ?? "0");
    } catch {
      /* table may not exist on a brand-new env — treat as 0 */
    }
  }

  return res.json({
    anon_used: anonUsed,
    signed_in_used: signedInUsed,
    is_signed_in: !!clerkUserId,
    is_superuser: isSuperUser,
    unlocked_templates: unlockedTemplates,
    pending_single_unlocks: pendingSingleUnlocks,
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

  let duplicate = false;
  await withUtrLock(cleanUtr, async (client) => {
    if (await isUtrAlreadyUsed(client, cleanUtr)) {
      duplicate = true;
      return;
    }
    await client.query(
      "INSERT INTO hs_card_utr_submissions (utr, clerk_user_id) VALUES ($1, $2)",
      [cleanUtr, clerkUserId],
    );
    await client.query(
      `INSERT INTO hs_clerk_users (clerk_user_id, cards_used)
       VALUES ($1, 0)
       ON CONFLICT (clerk_user_id)
       DO UPDATE SET cards_used = GREATEST(0, hs_clerk_users.cards_used - 10)`,
      [clerkUserId],
    );
  });

  if (duplicate) {
    return res.status(409).json({
      error: "duplicate_utr",
      message: "This transaction ID has already been used. Contact support if you think this is a mistake.",
    });
  }

  return res.json({ ok: true, message: "10 cards added to your account." });
});

/**
 * POST /api/usage/template-unlock-utr
 * Body: { utr: string, plan: 'bundle' }
 * Requires Clerk auth.
 *  - Only plan='bundle' (₹49) is accepted (Tollbooth Phase 2+).
 *    Records the payment AND immediately adds all 3 premium templates
 *    (cosmic, crystal, vinyl) to the user's unlocked_templates list.
 */
router.post("/usage/template-unlock-utr", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    return res
      .status(401)
      .json({ error: "unauthorized", message: "Sign in to unlock premium templates." });
  }

  const { utr, plan } = req.body as { utr?: unknown; plan?: unknown };
  if (plan !== "bundle") {
    return res.status(400).json({
      error: "validation_error",
      message: "Invalid plan. Only the ₹49 bundle (all 3 templates) is available.",
    });
  }
  if (!validateUtr(utr)) {
    return res.status(400).json({
      error: "validation_error",
      message:
        "Invalid UTR format. Enter the 12-digit UPI reference or bank UTR (e.g. HDFC0123456789012).",
    });
  }

  const cleanUtr = (utr as string).trim().toUpperCase();

  // Reject trivially sequential / repeated 4-digit codes
  if (/^\d{4}$/.test(cleanUtr) && isSequential4(cleanUtr)) {
    return res.status(400).json({
      error: "validation_error",
      message: "That code looks sequential or repeated (e.g. 1234, 0000). Enter the actual last 4 digits of your UPI transaction.",
    });
  }

  await pool.query(
    `INSERT INTO hs_clerk_users (clerk_user_id) VALUES ($1) ON CONFLICT (clerk_user_id) DO NOTHING`,
    [clerkUserId],
  );

  // Ensure payment table exists before inserting
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hs_template_unlock_payments (
      id SERIAL PRIMARY KEY,
      clerk_user_id TEXT NOT NULL,
      utr TEXT UNIQUE NOT NULL,
      plan TEXT NOT NULL,
      claimed_template TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  let duplicate = false;
  let bundleUnlocked = false;

  await withUtrLock(cleanUtr, async (client) => {
    if (await isUtrAlreadyUsed(client, cleanUtr)) {
      duplicate = true;
      return;
    }
    await client.query(
      `INSERT INTO hs_template_unlock_payments (clerk_user_id, utr, plan)
         VALUES ($1, $2, $3)`,
      [clerkUserId, cleanUtr, plan],
    );
    if (plan === "bundle") {
      await client.query(
        `UPDATE hs_clerk_users
           SET unlocked_templates = ARRAY(
             SELECT DISTINCT unnest(unlocked_templates || ARRAY['cosmic','crystal','vinyl']::text[])
           )
           WHERE clerk_user_id = $1`,
        [clerkUserId],
      );
      bundleUnlocked = true;
    }
  });

  if (duplicate) {
    return res.status(409).json({
      error: "duplicate_utr",
      message:
        "This transaction ID has already been used. Contact support if you think this is a mistake.",
    });
  }

  return res.json({
    ok: true,
    plan: "bundle",
    unlocked_templates: ["cosmic", "crystal", "vinyl"],
    message: "All 3 premium templates are unlocked on your account.",
  });
});

/**
 * POST /api/usage/claim-template
 * Body: { template: 'cosmic' | 'crystal' | 'vinyl' }
 * Requires Clerk auth.
 * Consumes one un-claimed single-template payment for this user and adds
 * the chosen template to their unlocked_templates list. Idempotent if the
 * template is already unlocked (returns ok without consuming a payment).
 */
router.post("/usage/claim-template", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    return res
      .status(401)
      .json({ error: "unauthorized", message: "Sign in to claim a premium template." });
  }

  const { template } = req.body as { template?: unknown };
  if (!isPremiumTemplate(template)) {
    return res.status(400).json({
      error: "validation_error",
      message: "Invalid template. Choose cosmic, crystal, or vinyl.",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userRow = await client.query<{ unlocked_templates: string[] }>(
      "SELECT unlocked_templates FROM hs_clerk_users WHERE clerk_user_id = $1 FOR UPDATE",
      [clerkUserId],
    );
    const current = userRow.rows[0]?.unlocked_templates ?? [];
    if (current.includes(template)) {
      await client.query("COMMIT");
      return res.json({
        ok: true,
        already_unlocked: true,
        unlocked_templates: current,
      });
    }

    const picked = await client.query<{ id: number }>(
      `SELECT id FROM hs_template_unlock_payments
         WHERE clerk_user_id = $1 AND plan = 'single' AND claimed_template IS NULL
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`,
      [clerkUserId],
    );
    const paymentId = picked.rows[0]?.id;
    if (!paymentId) {
      await client.query("ROLLBACK");
      return res.status(402).json({
        error: "no_payment",
        message: "No unused premium payment found. Pay ₹29 first to unlock a template.",
      });
    }

    const consumed = await client.query(
      `UPDATE hs_template_unlock_payments
         SET claimed_template = $1
         WHERE id = $2 AND claimed_template IS NULL`,
      [template, paymentId],
    );
    if ((consumed.rowCount ?? 0) !== 1) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "race_condition",
        message: "That payment was just claimed. Please refresh and try again.",
      });
    }

    const updated = await client.query<{ unlocked_templates: string[] }>(
      `UPDATE hs_clerk_users
         SET unlocked_templates = ARRAY(SELECT DISTINCT unnest(unlocked_templates || ARRAY[$1::text]))
         WHERE clerk_user_id = $2
         RETURNING unlocked_templates`,
      [template, clerkUserId],
    );
    await client.query("COMMIT");
    return res.json({
      ok: true,
      unlocked_templates: updated.rows[0]?.unlocked_templates ?? [...current, template],
    });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
});

export default router;
