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
 * GET /api/clerk/profile
 * Requires a valid Clerk session.
 * Returns the signed-in user's plan (free | premium) and their card list.
 */
router.get("/clerk/profile", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const ALL_PREMIUM = ["cosmic", "crystal", "vinyl"];

    const [userRow, cardsRow] = await Promise.all([
      pool.query<{ unlocked_templates: string[] }>(
        "SELECT unlocked_templates FROM hs_clerk_users WHERE clerk_user_id = $1",
        [clerkUserId],
      ),
      pool.query<{
        id: string;
        template: string | null;
        occasion: string | null;
        recipient_name: string | null;
        is_premium: boolean;
        is_watermarked: boolean;
        created_at: string;
      }>(
        `SELECT id, template, occasion, recipient_name, is_premium, is_watermarked, created_at
         FROM hs_cards
         WHERE clerk_user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [clerkUserId],
      ),
    ]);

    const unlocked: string[] = userRow.rows[0]?.unlocked_templates ?? [];
    const plan = ALL_PREMIUM.every((t) => unlocked.includes(t)) ? "premium" : "free";

    res.json({ plan, cards: cardsRow.rows });
  } catch (err) {
    console.error("[cards] GET /clerk/profile error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/cards
 * Requires a valid Clerk session. Creates a card row.
 * Signed-in users get is_watermarked=FALSE (sign-in = free watermark removal).
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
    const { id: clientId, template, occasion, recipient_name, message_b64, photo_url } =
      req.body as Record<string, unknown>;

    // Allow callers to supply a pre-existing client-generated tracking ID
    // (e.g. after UTR payment when the card was created anonymously and never
    // saved to DB). Must match the same character set as genId.
    const isValidClientId =
      typeof clientId === "string" &&
      /^[a-z0-9]{6,16}$/.test(clientId);

    const id = isValidClientId ? clientId as string : await uniqueId();

    // Upsert: if the ID already exists and belongs to this user (or is
    // unclaimed), claim it and set is_watermarked=FALSE.  If it belongs to
    // someone else, fall through and generate a fresh server ID instead.
    if (isValidClientId) {
      const existing = await pool.query<{ clerk_user_id: string | null }>(
        "SELECT clerk_user_id FROM hs_cards WHERE id = $1",
        [id],
      );
      if (existing.rows.length > 0) {
        const owner = existing.rows[0].clerk_user_id;
        if (owner === null || owner === clerkUserId) {
          // Claim / already ours — ensure is_watermarked=FALSE
          await pool.query(
            "UPDATE hs_cards SET is_watermarked = FALSE, clerk_user_id = $1 WHERE id = $2",
            [clerkUserId, id],
          );
          res.json({ id });
          return;
        }
        // Belongs to someone else — fall through to generate a fresh ID
        const freshId = await uniqueId();
        await pool.query(
          `INSERT INTO hs_cards
             (id, clerk_user_id, template, occasion, recipient_name, message_b64, is_watermarked, is_premium, photo_url)
           VALUES ($1,$2,$3,$4,$5,$6,FALSE,FALSE,$7)`,
          [freshId, clerkUserId,
            typeof template === "string" ? template : null,
            typeof occasion === "string" ? occasion : null,
            typeof recipient_name === "string" ? recipient_name : null,
            typeof message_b64 === "string" ? message_b64 : null,
            typeof photo_url === "string" ? photo_url : null],
        );
        res.json({ id: freshId });
        return;
      }
    }

    await pool.query(
      `INSERT INTO hs_cards
         (id, clerk_user_id, template, occasion, recipient_name, message_b64, is_watermarked, is_premium, photo_url)
       VALUES ($1,$2,$3,$4,$5,$6,FALSE,FALSE,$7)`,
      [
        id,
        clerkUserId,
        typeof template === "string" ? template : null,
        typeof occasion === "string" ? occasion : null,
        typeof recipient_name === "string" ? recipient_name : null,
        typeof message_b64 === "string" ? message_b64 : null,
        typeof photo_url === "string" ? photo_url : null,
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
      `SELECT id, is_watermarked, is_premium, template, photo_url
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
 *
 * Entitlement enforcement (server-side, cannot be bypassed):
 *   is_premium=true  → requires ₹49 bundle: ALL of cosmic/crystal/vinyl in
 *                      hs_clerk_users.unlocked_templates.
 *   is_watermarked=false (with is_premium) → same bundle requirement.
 *   is_watermarked=false (without is_premium) → also accepts per-card ₹29
 *                      payment in hs_watermark_payments for this card.
 *
 * Downgrades (is_premium=false / is_watermarked=true) are always rejected.
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
    if (is_premium === false || is_watermarked === true) {
      res.status(400).json({ error: "downgrade_not_allowed" });
      return;
    }

    const wantPremium = is_premium === true;
    const wantClean   = is_watermarked === false;

    if (!wantPremium && !wantClean) {
      res.status(400).json({ error: "nothing_to_update" });
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

    // Entitlement check.
    // Bundle path (is_premium=true or is_watermarked=false with is_premium):
    //   Require ALL of cosmic/crystal/vinyl in unlocked_templates (₹49 bundle paid).
    // Per-card watermark-only path (is_watermarked=false, no is_premium):
    //   Accept hs_watermark_payments row for this card OR bundle entitlement.
    const ALL_PREMIUM = ["cosmic", "crystal", "vinyl"];
    const userRow = await pool.query<{ unlocked_templates: string[] }>(
      "SELECT unlocked_templates FROM hs_clerk_users WHERE clerk_user_id = $1",
      [clerkUserId],
    );
    const unlocked: string[] = userRow.rows[0]?.unlocked_templates ?? [];
    const hasBundle = ALL_PREMIUM.every((t) => unlocked.includes(t));

    if (wantPremium && !hasBundle) {
      res.status(403).json({ error: "payment_required", message: "Bundle payment (₹49) required." });
      return;
    }

    if (wantClean && !hasBundle) {
      // Only accept watermark removal if there's a recorded per-card payment.
      const wmRow = await pool.query(
        "SELECT 1 FROM hs_watermark_payments WHERE card_id = $1 AND clerk_user_id = $2 LIMIT 1",
        [id, clerkUserId],
      );
      if (wmRow.rows.length === 0) {
        res.status(403).json({ error: "payment_required", message: "Watermark payment (₹29) not found for this card." });
        return;
      }
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
 * POST /api/cards/:id/payment-link-unlock
 * No auth, no UTR needed. Called from the /payment-success page after a
 * payment-gateway redirect confirms the customer has paid.
 */
router.post("/cards/:id/payment-link-unlock", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      `INSERT INTO hs_cards (id, is_watermarked, is_premium)
       VALUES ($1, FALSE, TRUE)
       ON CONFLICT (id) DO UPDATE
         SET is_watermarked = FALSE, is_premium = TRUE`,
      [id],
    );
    await pool.query(
      `INSERT INTO hs_card_unlock_submissions (card_id, utr_last4) VALUES ($1, $2)`,
      [id, "LINK"],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("[cards] payment-link-unlock error", err);
    res.status(500).json({ error: "internal_error", message: "Something went wrong. Please try again." });
  }
});

/**
 * POST /api/cards/:id/pay-unlock
 * No auth required. Accepts the last 4 digits of a UPI transaction ID,
 * matches against hs_received_payments (populated by the Android SMS forwarder),
 * marks the full UTR as used, and unlocks the card.
 * Body: { utr: string }  (exactly 4 digits, non-sequential)
 */
router.post("/cards/:id/pay-unlock", async (req, res) => {
  const { id } = req.params;
  const { utr } = req.body as { utr?: unknown };

  if (typeof utr !== "string" || !/^\d{4}$/.test(utr.trim())) {
    res.status(400).json({ error: "validation_error", message: "Enter the last 4 digits of your UPI transaction." });
    return;
  }

  const last4 = utr.trim();

  try {
    // Match against the last 4 digits of any unused received UTR
    const { rows } = await pool.query<{ id: number; utr: string }>(
      `SELECT id, utr FROM hs_received_payments
       WHERE RIGHT(utr, 4) = $1 AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [last4],
    );

    if (rows.length === 0) {
      res.status(402).json({
        error: "payment_not_verified",
        message: "Payment not verified. Please check your last 4 digits and try again, or contact hello@heartsync.in",
      });
      return;
    }

    const matchedUtr = rows[0]!.utr;

    // Mark the full UTR as used to prevent reuse
    await pool.query(
      `UPDATE hs_received_payments SET used_at = NOW() WHERE utr = $1`,
      [matchedUtr],
    );

    // Upsert card as unlocked
    await pool.query(
      `INSERT INTO hs_cards (id, is_watermarked, is_premium)
       VALUES ($1, FALSE, TRUE)
       ON CONFLICT (id) DO UPDATE
         SET is_watermarked = FALSE, is_premium = TRUE`,
      [id],
    );

    // Record submission for audit trail
    await pool.query(
      `INSERT INTO hs_card_unlock_submissions (card_id, utr_last4) VALUES ($1, $2)`,
      [id, last4],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("[cards] POST /cards/:id/pay-unlock error", err);
    res.status(500).json({ error: "internal_error", message: "Something went wrong. Please try again." });
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

/**
 * POST /api/cards/:id/free-watermark-removal
 * Requires Clerk auth. No payment needed — signing in is sufficient.
 *
 * Ownership rules:
 *   - Card has no owner (created anonymously) → claim it + remove watermark.
 *   - Card is owned by this user → remove watermark.
 *   - Card is owned by someone else → 403.
 *
 * Anonymous cards (no DB row): if an optional JSON body is provided with card
 * metadata (recipient_name, occasion, template), the card row is created on
 * the fly so the watermark can be removed. This handles the case where a user
 * creates a card anonymously, signs up via Google OAuth, and is redirected
 * back to the card page — the card needs to be claimed without the user having
 * to recreate it.
 */
router.post("/cards/:id/free-watermark-removal", async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const { id } = req.params;

    const existing = await pool.query<{
      clerk_user_id: string | null;
      is_watermarked: boolean;
    }>(
      "SELECT clerk_user_id, is_watermarked FROM hs_cards WHERE id = $1",
      [id],
    );

    if (existing.rows.length === 0) {
      /* Card not in DB — this is an anonymously-created card whose data lives
       * entirely in URL params. If the caller provides card metadata in the
       * request body, create the row and claim it for the signed-in user. */
      const body = req.body as {
        recipient_name?: string;
        occasion?: string;
        template?: string;
        message_b64?: string;
        photo_url?: string;
      } | null;

      const hasMetadata = body && (body.recipient_name || body.occasion);
      if (!hasMetadata) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      await pool.query(
        `INSERT INTO hs_cards
           (id, clerk_user_id, template, occasion, recipient_name, message_b64, photo_url, is_watermarked)
         VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          clerkUserId,
          body.template ?? "envelope",
          body.occasion ?? null,
          body.recipient_name ?? null,
          body.message_b64 ?? null,
          body.photo_url ?? null,
        ],
      );

      res.json({ ok: true });
      return;
    }

    const card = existing.rows[0];

    if (card.clerk_user_id !== null && card.clerk_user_id !== clerkUserId) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    if (!card.is_watermarked) {
      res.json({ ok: true, already_clean: true });
      return;
    }

    if (card.clerk_user_id === null) {
      /* Anonymous card — claim ownership and remove watermark in one step. */
      await pool.query(
        "UPDATE hs_cards SET is_watermarked = FALSE, clerk_user_id = $1 WHERE id = $2",
        [clerkUserId, id],
      );
    } else {
      await pool.query(
        "UPDATE hs_cards SET is_watermarked = FALSE WHERE id = $1",
        [id],
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[cards] POST /cards/:id/free-watermark-removal error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
