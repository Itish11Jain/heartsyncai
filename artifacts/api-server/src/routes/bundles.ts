import { Router } from "express";
import { pool } from "../lib/db";

const router = Router();

/**
 * POST /api/bundles/create
 * No auth required. Finds the most recent unused ₹49 payment (within last
 * 5 minutes) and creates a bundle with 2 card unlocks. Marks the payment
 * as used with unlock_method='bundle_purchase'.
 * Returns { token, cards_remaining: 2 }
 */
router.post("/bundles/create", async (req, res) => {
  try {
    const { rows } = await pool.query<{ id: number; utr: string; raw_sms: string | null }>(
      `SELECT id, utr, raw_sms FROM hs_received_payments
       WHERE used_at IS NULL
         AND created_at > NOW() - INTERVAL '5 minutes'
       ORDER BY created_at DESC LIMIT 1`,
    );

    if (rows.length === 0) {
      res.status(402).json({ error: "payment_not_found", message: "No recent payment detected yet." });
      return;
    }

    const payment = rows[0]!;

    // Extract payer name from raw SMS (optional, for display)
    let upiName: string | null = null;
    if (payment.raw_sms) {
      const nameMatch = payment.raw_sms.match(/from\s+([A-Za-z\s]+?)(?:\s+via|\s+on|\s+UPI|$)/i);
      if (nameMatch?.[1]) upiName = nameMatch[1].trim().slice(0, 60);
    }

    const bundleResult = await pool.query<{ id: string }>(
      `INSERT INTO hs_card_bundles (utr, upi_name, cards_remaining)
       VALUES ($1, $2, 2)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [payment.utr, upiName],
    );

    if (bundleResult.rows.length === 0) {
      res.status(409).json({ error: "duplicate_payment", message: "This payment has already been used." });
      return;
    }

    const token = bundleResult.rows[0]!.id;

    await pool.query(
      `UPDATE hs_received_payments SET used_at = NOW(), unlock_method = 'bundle_purchase' WHERE utr = $1`,
      [payment.utr],
    );

    console.log(`[bundles] created bundle=${token} utr=${payment.utr}`);
    res.json({ ok: true, token, cards_remaining: 2 });
  } catch (err) {
    console.error("[bundles] POST /bundles/create error", err);
    res.status(500).json({ error: "internal_error", message: "Something went wrong. Please try again." });
  }
});

/**
 * GET /api/bundles/:token
 * Returns bundle info: credits remaining + cards unlocked via this bundle.
 */
router.get("/bundles/:token", async (req, res) => {
  const { token } = req.params;

  if (!/^[0-9a-f-]{36}$/.test(token)) {
    res.status(400).json({ error: "invalid_token" });
    return;
  }

  try {
    const bundleRow = await pool.query<{
      id: string;
      cards_remaining: number;
      created_at: string;
      upi_name: string | null;
    }>(
      `SELECT id, cards_remaining, created_at, upi_name FROM hs_card_bundles WHERE id = $1`,
      [token],
    );

    if (bundleRow.rows.length === 0) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const bundle = bundleRow.rows[0]!;

    const cardsRow = await pool.query<{
      id: string;
      occasion: string | null;
      recipient_name: string | null;
      template: string | null;
      created_at: string;
    }>(
      `SELECT id, occasion, recipient_name, template, created_at
       FROM hs_cards WHERE bundle_id = $1
       ORDER BY created_at DESC`,
      [token],
    );

    res.json({
      ok: true,
      token,
      cards_remaining: bundle.cards_remaining,
      created_at: bundle.created_at,
      upi_name: bundle.upi_name,
      cards: cardsRow.rows,
    });
  } catch (err) {
    console.error("[bundles] GET /bundles/:token error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/bundles/:token/use-credit
 * No auth required. Decrements cards_remaining and unlocks the specified card.
 * Body: { card_id: string }
 * Returns { ok: true, cards_remaining: number }
 */
router.post("/bundles/:token/use-credit", async (req, res) => {
  const { token } = req.params;
  const { card_id } = (req.body ?? {}) as { card_id?: unknown };

  if (!/^[0-9a-f-]{36}$/.test(token)) {
    res.status(400).json({ error: "invalid_token" });
    return;
  }

  if (typeof card_id !== "string" || !/^[a-z0-9]{4,20}$/.test(card_id)) {
    res.status(400).json({ error: "invalid_card_id" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const bundleRow = await client.query<{ id: string; cards_remaining: number }>(
      `SELECT id, cards_remaining FROM hs_card_bundles WHERE id = $1 FOR UPDATE`,
      [token],
    );

    if (bundleRow.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "not_found", message: "Bundle not found." });
      return;
    }

    const bundle = bundleRow.rows[0]!;

    if (bundle.cards_remaining <= 0) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "no_credits", message: "No bundle credits remaining." });
      return;
    }

    // Check if card is already unlocked via this bundle
    const alreadyRow = await client.query(
      `SELECT 1 FROM hs_cards WHERE id = $1 AND bundle_id = $2 LIMIT 1`,
      [card_id, token],
    );
    if ((alreadyRow.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "already_used", message: "Card already unlocked with this bundle." });
      return;
    }

    // Check if card is already unlocked by any means
    const cardRow = await client.query<{ is_watermarked: boolean }>(
      `SELECT is_watermarked FROM hs_cards WHERE id = $1`,
      [card_id],
    );
    if ((cardRow.rowCount ?? 0) > 0 && !cardRow.rows[0]!.is_watermarked) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "already_unlocked", message: "Card is already unlocked." });
      return;
    }

    // Decrement credits
    const updated = await client.query<{ cards_remaining: number }>(
      `UPDATE hs_card_bundles SET cards_remaining = cards_remaining - 1
       WHERE id = $1 AND cards_remaining > 0
       RETURNING cards_remaining`,
      [token],
    );

    if (updated.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "no_credits", message: "No bundle credits remaining." });
      return;
    }

    const newRemaining = updated.rows[0]!.cards_remaining;

    // Unlock card
    await client.query(
      `INSERT INTO hs_cards (id, is_watermarked, is_premium, bundle_id)
       VALUES ($1, FALSE, TRUE, $2)
       ON CONFLICT (id) DO UPDATE
         SET is_watermarked = FALSE, is_premium = TRUE, bundle_id = EXCLUDED.bundle_id`,
      [card_id, token],
    );

    await client.query("COMMIT");

    console.log(`[bundles] use-credit bundle=${token} card=${card_id} remaining=${newRemaining}`);
    res.json({ ok: true, cards_remaining: newRemaining });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch { /* ignore */ }
    console.error("[bundles] POST /bundles/:token/use-credit error", err);
    res.status(500).json({ error: "internal_error", message: "Something went wrong. Please try again." });
  } finally {
    client.release();
  }
});

export default router;
