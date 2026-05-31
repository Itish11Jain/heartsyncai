import { Router } from "express";
import { randomBytes } from "crypto";
import { getAuth } from "@clerk/express";
import { pool } from "../lib/db";

const router = Router();

const META_PIXEL_ID = "1510201040837057";

async function fireMetaCapi(
  eventId: string,
  cardId: string,
  ip: string,
  userAgent: string,
): Promise<void> {
  const token = process.env["META_PIXEL_ACCESS_TOKEN"];
  if (!token) return;
  try {
    // Fetch the Meta browser cookies stored at card-creation time.
    // These dramatically improve CAPI match quality without requiring PII.
    let fbp: string | null = null;
    let fbc: string | null = null;
    try {
      const row = await pool.query<{ fbp: string | null; fbc: string | null }>(
        "SELECT fbp, fbc FROM hs_cards WHERE id = $1",
        [cardId],
      );
      fbp = row.rows[0]?.fbp ?? null;
      fbc = row.rows[0]?.fbc ?? null;
    } catch { /* non-blocking — proceed without fbp/fbc */ }

    const userData: Record<string, string> = {
      client_ip_address: ip,
      client_user_agent: userAgent,
    };
    if (fbp) userData["fbp"] = fbp;
    if (fbc) userData["fbc"] = fbc;

    await fetch(
      `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            {
              event_name: "Purchase",
              event_time: Math.floor(Date.now() / 1000),
              event_id: eventId,
              action_source: "website",
              user_data: userData,
              custom_data: {
                value: 99.0,
                currency: "INR",
              },
            },
          ],
        }),
      },
    );
    console.log(`[capi] Purchase fired event_id=${eventId} card=${cardId} fbp=${!!fbp} fbc=${!!fbc}`);
  } catch (err) {
    console.warn("[capi] Non-blocking CAPI call failed", err);
  }
}

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
 * Cards start with is_watermarked=TRUE — payment is required to unlock.
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
    const { id: clientId, template, occasion, recipient_name, message_b64, photo_url, photo_urls, voice_note_url, fbp, fbc } =
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
          // Claim / already ours — just claim ownership, do NOT remove watermark
          await pool.query(
            "UPDATE hs_cards SET clerk_user_id = $1 WHERE id = $2 AND clerk_user_id IS NULL",
            [clerkUserId, id],
          );
          res.json({ id });
          return;
        }
        // Belongs to someone else — fall through to generate a fresh ID
        const freshId = await uniqueId();
        await pool.query(
          `INSERT INTO hs_cards
             (id, clerk_user_id, template, occasion, recipient_name, message_b64, is_watermarked, is_premium, photo_url, photo_urls, voice_note_url, fbp, fbc)
           VALUES ($1,$2,$3,$4,$5,$6,TRUE,FALSE,$7,$8,$9,$10,$11)`,
          [freshId, clerkUserId,
            typeof template === "string" ? template : null,
            typeof occasion === "string" ? occasion : null,
            typeof recipient_name === "string" ? recipient_name : null,
            typeof message_b64 === "string" ? message_b64 : null,
            typeof photo_url === "string" ? photo_url : null,
            Array.isArray(photo_urls) ? photo_urls.filter((u): u is string => typeof u === "string") : null,
            typeof voice_note_url === "string" ? voice_note_url : null,
            typeof fbp === "string" && fbp ? fbp : null,
            typeof fbc === "string" && fbc ? fbc : null],
        );
        res.json({ id: freshId });
        return;
      }
    }

    await pool.query(
      `INSERT INTO hs_cards
         (id, clerk_user_id, template, occasion, recipient_name, message_b64, is_watermarked, is_premium, photo_url, photo_urls, voice_note_url, fbp, fbc)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE,FALSE,$7,$8,$9,$10,$11)`,
      [
        id,
        clerkUserId,
        typeof template === "string" ? template : null,
        typeof occasion === "string" ? occasion : null,
        typeof recipient_name === "string" ? recipient_name : null,
        typeof message_b64 === "string" ? message_b64 : null,
        typeof photo_url === "string" ? photo_url : null,
        Array.isArray(photo_urls) ? photo_urls.filter((u): u is string => typeof u === "string") : null,
        typeof voice_note_url === "string" ? voice_note_url : null,
        typeof fbp === "string" && fbp ? fbp : null,
        typeof fbc === "string" && fbc ? fbc : null,
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
 * Public — no auth. Returns card fields plus is_paid which reflects
 * whether a real ₹99 payment exists in hs_received_payments for this card.
 */
router.get("/cards/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [cardResult, paymentResult] = await Promise.all([
      pool.query(
        `SELECT id, is_watermarked, is_premium, template, photo_url, photo_urls, voice_note_url
         FROM hs_cards WHERE id = $1`,
        [id],
      ),
      pool.query(
        `SELECT 1 FROM hs_received_payments WHERE card_id = $1 LIMIT 1`,
        [id],
      ),
    ]);
    const isPaid = paymentResult.rows.length > 0;
    if (cardResult.rows.length === 0) {
      res.json({ id, is_paid: isPaid });
      return;
    }
    res.json({ ...cardResult.rows[0], is_paid: isPaid });
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
    const { is_watermarked, is_premium, voice_note_url, photo_urls } = req.body as {
      is_watermarked?: unknown;
      is_premium?: unknown;
      voice_note_url?: unknown;
      photo_urls?: unknown;
    };

    // Reject downgrade attempts — paid state is permanent.
    if (is_premium === false || is_watermarked === true) {
      res.status(400).json({ error: "downgrade_not_allowed" });
      return;
    }

    const wantPremium = is_premium === true;
    const wantClean   = is_watermarked === false;
    const wantVoice   = voice_note_url !== undefined;
    const wantPhotos  = photo_urls !== undefined;

    if (!wantPremium && !wantClean && !wantVoice && !wantPhotos) {
      res.status(400).json({ error: "nothing_to_update" });
      return;
    }

    // Validate media field types if provided.
    if (wantVoice && voice_note_url !== null && typeof voice_note_url !== "string") {
      res.status(400).json({ error: "invalid_voice_note_url" });
      return;
    }
    if (wantPhotos && (!Array.isArray(photo_urls) || (photo_urls as unknown[]).some(u => typeof u !== "string"))) {
      res.status(400).json({ error: "invalid_photo_urls" });
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

    // Entitlement check (only required for premium/watermark upgrades, not media updates).
    // Bundle path (is_premium=true or is_watermarked=false with is_premium):
    //   Require ALL of cosmic/crystal/vinyl in unlocked_templates (₹49 bundle paid).
    // Per-card watermark-only path (is_watermarked=false, no is_premium):
    //   Accept hs_watermark_payments row for this card OR bundle entitlement.
    if (wantPremium || wantClean) {
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
        const wmRow = await pool.query(
          "SELECT 1 FROM hs_watermark_payments WHERE card_id = $1 AND clerk_user_id = $2 LIMIT 1",
          [id, clerkUserId],
        );
        if (wmRow.rows.length === 0) {
          res.status(403).json({ error: "payment_required", message: "Watermark payment (₹29) not found for this card." });
          return;
        }
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
    if (wantVoice) {
      params.push(voice_note_url ?? null);
      updates.push(`voice_note_url = $${params.length}`);
    }
    if (wantPhotos) {
      params.push(photo_urls as string[]);
      updates.push(`photo_urls = $${params.length}`);
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
 * POST /api/cards/:id/auto-unlock
 * No auth required. Finds the most recent unused ₹49 payment received in the
 * last 5 minutes and uses it to unlock the card — no UTR input needed.
 * Returns 402 if no matching payment found yet (caller should keep polling).
 */
router.post("/cards/:id/auto-unlock", async (req, res) => {
  const { id } = req.params;
  const { eventId, fbp, fbc } = (req.body ?? {}) as { eventId?: string; fbp?: string | null; fbc?: string | null };

  try {
    const { rows } = await pool.query<{ id: number; utr: string }>(
      `SELECT id, utr FROM hs_received_payments
       WHERE used_at IS NULL
         AND created_at > NOW() - INTERVAL '15 minutes'
         AND CAST(amount AS numeric) >= 49
       ORDER BY created_at DESC LIMIT 1`,
    );

    if (rows.length === 0) {
      res.status(402).json({ error: "payment_not_found", message: "No recent payment detected yet." });
      return;
    }

    const matchedUtr = rows[0]!.utr;

    await pool.query(
      `UPDATE hs_received_payments SET used_at = NOW(), card_id = $2, unlock_method = 'auto_unlock' WHERE utr = $1`,
      [matchedUtr, id],
    );

    await pool.query(
      `INSERT INTO hs_cards (id, is_watermarked, is_premium, fbp, fbc)
       VALUES ($1, FALSE, TRUE, $2, $3)
       ON CONFLICT (id) DO UPDATE SET is_watermarked = FALSE, is_premium = TRUE,
         fbp = COALESCE(EXCLUDED.fbp, hs_cards.fbp),
         fbc = COALESCE(EXCLUDED.fbc, hs_cards.fbc)`,
      [id, fbp ?? null, fbc ?? null],
    );

    const cardRow = await pool.query<{ occasion: string }>(
      `SELECT occasion FROM hs_cards WHERE id = $1`,
      [id],
    );
    const occasion = cardRow.rows[0]?.occasion ?? null;

    await pool.query(
      `INSERT INTO hs_card_unlock_submissions (card_id, utr_last4, full_utr, unlock_method) VALUES ($1, $2, $3, 'auto_unlock')`,
      [id, matchedUtr.slice(-4), matchedUtr],
    );

    await pool.query(
      `INSERT INTO hs_card_events (event, card_id, occasion, fingerprint, channel)
       VALUES ('card_paid', $1, $2, $3, 'auto_unlock')`,
      [id, occasion, `srv_${id}`],
    );

    console.log(`[unlock] auto_unlock card=${id} utr=${matchedUtr}`);
    const capiEventId = eventId ?? `hs_${id}_${Date.now()}`;
    const clientIp = ((req.headers["x-forwarded-for"] as string) ?? req.socket.remoteAddress ?? "").split(",")[0]!.trim();
    void fireMetaCapi(capiEventId, id, clientIp, String(req.headers["user-agent"] ?? ""));
    res.json({ ok: true });
  } catch (err) {
    console.error("[cards] POST /cards/:id/auto-unlock error", err);
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
  const { utr, eventId, fbp, fbc } = req.body as { utr?: unknown; eventId?: string; fbp?: string | null; fbc?: string | null };

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
         AND CAST(amount AS numeric) >= 49
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

    // Mark the full UTR as used, record which card and method consumed it
    await pool.query(
      `UPDATE hs_received_payments SET used_at = NOW(), card_id = $2, unlock_method = 'manual_utr' WHERE utr = $1`,
      [matchedUtr, id],
    );

    // Upsert card as unlocked — store fbp/fbc for CAPI match quality
    await pool.query(
      `INSERT INTO hs_cards (id, is_watermarked, is_premium, fbp, fbc)
       VALUES ($1, FALSE, TRUE, $2, $3)
       ON CONFLICT (id) DO UPDATE
         SET is_watermarked = FALSE, is_premium = TRUE,
           fbp = COALESCE(EXCLUDED.fbp, hs_cards.fbp),
           fbc = COALESCE(EXCLUDED.fbc, hs_cards.fbc)`,
      [id, fbp ?? null, fbc ?? null],
    );

    const cardRow = await pool.query<{ occasion: string }>(
      `SELECT occasion FROM hs_cards WHERE id = $1`,
      [id],
    );
    const occasion = cardRow.rows[0]?.occasion ?? null;

    // Record submission with full UTR and method for audit trail
    await pool.query(
      `INSERT INTO hs_card_unlock_submissions (card_id, utr_last4, full_utr, unlock_method) VALUES ($1, $2, $3, 'manual_utr')`,
      [id, last4, matchedUtr],
    );

    // Server-side card_paid event — recorded even if the client closes the page
    await pool.query(
      `INSERT INTO hs_card_events (event, card_id, occasion, fingerprint, channel)
       VALUES ('card_paid', $1, $2, $3, 'manual_utr')`,
      [id, occasion, `srv_${id}`],
    );

    console.log(`[unlock] manual_utr card=${id} utr=${matchedUtr}`);
    const capiEventId = eventId ?? `hs_${id}_${Date.now()}`;
    const clientIp = ((req.headers["x-forwarded-for"] as string) ?? req.socket.remoteAddress ?? "").split(",")[0]!.trim();
    void fireMetaCapi(capiEventId, id, clientIp, String(req.headers["user-agent"] ?? ""));
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
 * Requires Clerk auth AND a valid bundle payment (unlocked_templates must
 * contain all premium templates). Signing in alone is NOT sufficient.
 * This endpoint exists so the SenderPanel can auto-remove the watermark
 * for users who have already paid the ₹49 bundle on a previous card.
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

    // Require bundle payment (superuser OR all premium templates unlocked).
    const userRow = await pool.query<{ unlocked_templates: string[]; is_superuser: boolean }>(
      "SELECT unlocked_templates, is_superuser FROM hs_clerk_users WHERE clerk_user_id = $1",
      [clerkUserId],
    );
    const unlocked: string[] = userRow.rows[0]?.unlocked_templates ?? [];
    const isSuperuser = userRow.rows[0]?.is_superuser ?? false;
    const ALL_PREMIUM = ["cosmic", "crystal", "vinyl"];
    const hasBundle = isSuperuser || ALL_PREMIUM.every((t) => unlocked.includes(t));

    if (!hasBundle) {
      res.status(403).json({ error: "payment_required", message: "Bundle payment (₹49) required." });
      return;
    }

    const existing = await pool.query<{
      clerk_user_id: string | null;
      is_watermarked: boolean;
    }>(
      "SELECT clerk_user_id, is_watermarked FROM hs_cards WHERE id = $1",
      [id],
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "not_found" });
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

    await pool.query(
      "UPDATE hs_cards SET is_watermarked = FALSE, clerk_user_id = $1 WHERE id = $2",
      [clerkUserId, id],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("[cards] POST /cards/:id/free-watermark-removal error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
