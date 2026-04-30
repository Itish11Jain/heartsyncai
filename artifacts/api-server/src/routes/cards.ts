import { Router } from "express";
import { randomBytes } from "crypto";
import { getAuth } from "@clerk/express";
import { pool } from "../lib/db";

const router = Router();

const ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Generate a cryptographically random 8-char alphanumeric ID (CSPRNG-backed). */
function genId(len = 8): string {
  const bytes = randomBytes(len * 2); // extra entropy for modulo bias reduction
  let id = "";
  for (let i = 0; i < len; i++) {
    id += ID_CHARS[bytes[i] % ID_CHARS.length];
  }
  return id;
}

async function uniqueId(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const id = genId(8);
    const { rowCount } = await pool.query(
      "SELECT 1 FROM hs_cards WHERE id = $1",
      [id],
    );
    if (!rowCount) return id;
  }
  throw new Error("Could not generate unique card ID");
}

function validateUtr(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^\d{12}$/.test(v) || /^[A-Za-z]{4}[A-Za-z0-9]{12,18}$/.test(v);
}

/**
 * Check all payment tables for a UTR — prevents a single UTR funding
 * both a template unlock and a watermark removal.
 * Uses SAVEPOINTs so a missing-table 42P01 error is contained.
 */
async function isUtrAlreadyUsed(
  client: import("pg").PoolClient,
  cleanUtr: string,
): Promise<boolean> {
  const tables = [
    "hs_watermark_payments",
    "hs_template_unlock_payments",
    "hs_card_utr_submissions",
    "hs_utr_submissions",
  ];
  for (const table of tables) {
    await client.query("SAVEPOINT utr_probe");
    try {
      const r = await client.query(`SELECT 1 FROM ${table} WHERE utr = $1 LIMIT 1`, [cleanUtr]);
      await client.query("RELEASE SAVEPOINT utr_probe");
      if ((r.rowCount ?? 0) > 0) return true;
    } catch (err) {
      await client.query("ROLLBACK TO SAVEPOINT utr_probe");
      const code = (err as { code?: string } | null)?.code;
      if (code !== "42P01") throw err;
    }
  }
  return false;
}

/** Serialize concurrent UTR submissions via advisory lock + transaction. */
async function withUtrLock<T>(
  cleanUtr: string,
  fn: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [cleanUtr]);
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

/**
 * POST /api/cards
 * Requires a valid Clerk session. Creates a card row with is_watermarked=true.
 * Body: { template, occasion, recipient_name, message_b64 }
 * Returns: { id }
 */
router.post("/cards", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;

  if (!clerkUserId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const { template, occasion, recipient_name, message_b64 } =
      req.body as Record<string, unknown>;

    const id = await uniqueId();

    await pool.query(
      `INSERT INTO hs_cards
         (id, clerk_user_id, template, occasion, recipient_name, message_b64, is_watermarked, is_premium)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE,FALSE)`,
      [
        id,
        clerkUserId,
        typeof template === "string" ? template : null,
        typeof occasion === "string" ? occasion : null,
        typeof recipient_name === "string" ? recipient_name : null,
        typeof message_b64 === "string" ? message_b64 : null,
      ],
    );

    res.json({ id });
  } catch (err) {
    console.error("[cards] POST /cards error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/cards/:id
 * Public — no auth. Returns minimal fields for recipient watermark check.
 */
router.get("/cards/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, is_watermarked, is_premium, template
       FROM hs_cards WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[cards] GET /cards/:id error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * PATCH /api/cards/:id
 * Requires Clerk auth. Caller must own the card (clerk_user_id match).
 * Body: { is_watermarked?: false, is_premium?: true }
 * Used by the ₹49 premium flow after template-unlock-utr succeeds.
 *
 * Entitlement enforcement:
 *   is_premium=true  → caller must have ≥1 row in hs_template_unlocks (bundle paid)
 *   is_watermarked=false → same requirement (bundle paid covers watermark removal)
 * Downgrades (is_premium=false / is_watermarked=true) are rejected — paid state is permanent.
 */
router.patch("/cards/:id", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const { id } = req.params;
    const { is_watermarked, is_premium } = req.body as {
      is_watermarked?: unknown;
      is_premium?: unknown;
    };

    // Reject downgrade attempts — paid state is permanent.
    if (is_premium === false) {
      res.status(400).json({ error: "downgrade_not_allowed" });
      return;
    }
    if (is_watermarked === true) {
      res.status(400).json({ error: "downgrade_not_allowed" });
      return;
    }

    // Check card ownership.
    const existing = await pool.query(
      "SELECT clerk_user_id FROM hs_cards WHERE id = $1",
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (existing.rows[0].clerk_user_id !== clerkUserId) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const wantPremium  = is_premium === true;
    const wantClean    = is_watermarked === false;

    if (!wantPremium && !wantClean) {
      res.status(400).json({ error: "nothing_to_update" });
      return;
    }

    // Entitlement check — caller must have paid the ₹49 bundle.
    // unlocked_templates is set by /api/usage/template-unlock-utr on success.
    const entitlementRow = await pool.query<{ unlocked_templates: string[] }>(
      "SELECT unlocked_templates FROM hs_clerk_users WHERE clerk_user_id = $1",
      [clerkUserId],
    );
    const unlockedTemplates: string[] = entitlementRow.rows[0]?.unlocked_templates ?? [];
    if (unlockedTemplates.length === 0) {
      res.status(403).json({ error: "payment_required", message: "No bundle payment found for this account." });
      return;
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (wantClean) {
      params.push(false);
      updates.push(`is_watermarked = $${params.length}`);
    }
    if (wantPremium) {
      params.push(true);
      updates.push(`is_premium = $${params.length}`);
    }

    params.push(id);
    await pool.query(
      `UPDATE hs_cards SET ${updates.join(", ")} WHERE id = $${params.length}`,
      params,
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("[cards] PATCH /cards/:id error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/cards/:id/remove-watermark
 * Requires Clerk auth + card ownership.
 * Body: { utr: string }
 * Validates the UTR (₹29 watermark removal payment), records it, and sets
 * is_watermarked=false on the card. Rejects duplicate UTRs.
 */
router.post("/cards/:id/remove-watermark", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { id } = req.params;
  const { utr } = req.body as { utr?: unknown };

  if (!validateUtr(utr)) {
    res.status(400).json({
      error: "validation_error",
      message: "Invalid UTR format. Enter the 12-digit UPI reference or bank UTR.",
    });
    return;
  }

  const cleanUtr = (utr as string).trim().toUpperCase();

  try {
    const existing = await pool.query(
      "SELECT clerk_user_id FROM hs_cards WHERE id = $1",
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (existing.rows[0].clerk_user_id !== clerkUserId) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    let duplicate = false;

    await withUtrLock(cleanUtr, async (client) => {
      if (await isUtrAlreadyUsed(client, cleanUtr)) {
        duplicate = true;
        return;
      }
      await client.query(
        `INSERT INTO hs_watermark_payments (clerk_user_id, card_id, utr) VALUES ($1, $2, $3)`,
        [clerkUserId, id, cleanUtr],
      );
      await client.query(
        `UPDATE hs_cards SET is_watermarked = FALSE WHERE id = $1`,
        [id],
      );
    });

    if (duplicate) {
      res.status(409).json({
        error: "duplicate_utr",
        message: "This transaction ID has already been used. Contact support if you think this is a mistake.",
      });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[cards] POST /cards/:id/remove-watermark error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
