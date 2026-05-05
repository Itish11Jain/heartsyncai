import { Router } from "express";
import { pool } from "../../lib/db.js";

const router = Router();

const ADMIN_KEY =
  process.env["ADMIN_SECRET"] ?? (() => {
    const generated = "hs-" + Math.random().toString(36).slice(2, 10);
    console.warn(`[HeartSync Admin] No ADMIN_SECRET set. Using generated key: ${generated}`);
    return generated;
  })();

function checkKey(req: { query: Record<string, unknown>; body?: Record<string, unknown> }, res: { status: (n: number) => { json: (o: unknown) => void } }): boolean {
  const key = req.query["key"] ?? req.body?.["key"];
  if (key !== ADMIN_KEY) {
    res.status(401).json({ error: "unauthorized", message: "Invalid admin key." });
    return false;
  }
  return true;
}

router.get("/admin/revoke", async (req, res) => {
  if (!checkKey(req as never, res as never)) return;

  const { email, credits } = req.query as Record<string, string>;
  if (!email) {
    res.status(400).json({ error: "bad_request", message: "email query param required." });
    return;
  }

  const deduct = Math.abs(parseInt(credits ?? "5", 10)) || 5;

  const user = await pool.query<{ id: number; credits: number; display_name: string }>(
    `SELECT id, credits, display_name FROM hs_users
     WHERE display_name ILIKE $1 OR id::text = $1
     LIMIT 1`,
    [email],
  );

  if ((user.rowCount ?? 0) === 0) {
    res.status(404).json({ error: "not_found", message: `No user found matching: ${email}` });
    return;
  }

  const u = user.rows[0]!;
  const newCredits = Math.max(0, u.credits - deduct);

  await pool.query("UPDATE hs_users SET credits = $1 WHERE id = $2", [newCredits, u.id]);
  await pool.query(
    "INSERT INTO hs_credit_logs (user_id, delta, reason) VALUES ($1, $2, $3)",
    [u.id, -deduct, "admin_revoke"],
  );

  res.json({
    ok: true,
    user: u.display_name,
    creditsBefore: u.credits,
    creditsAfter: newCredits,
    deducted: deduct,
  });
});

router.get("/admin/users", async (req, res) => {
  if (!checkKey(req as never, res as never)) return;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const rows = await pool.query(
    `SELECT u.id, u.display_name, u.credits, u.created_at,
            COUNT(DISTINCT s.id) AS utr_count,
            COUNT(DISTINCT m.id) FILTER (WHERE m.created_at >= $1) AS moments_this_month
     FROM hs_users u
     LEFT JOIN hs_utr_submissions s ON s.user_id = u.id
     LEFT JOIN hs_moments m ON m.user_id = u.id
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT 100`,
    [monthStart],
  );

  res.json({ users: rows.rows });
});

router.get("/admin/utrs", async (req, res) => {
  if (!checkKey(req as never, res as never)) return;

  const rows = await pool.query(
    `SELECT s.utr, u.display_name, u.id AS user_id, s.created_at
     FROM hs_utr_submissions s
     JOIN hs_users u ON u.id = s.user_id
     ORDER BY s.created_at DESC
     LIMIT 200`,
  );

  res.json({ submissions: rows.rows });
});

/** GET /api/admin/lookup-card?key=...&card_id=... */
router.get("/admin/lookup-card", async (req, res) => {
  if (!checkKey(req as never, res as never)) return;
  const { card_id } = req.query as Record<string, string>;
  if (!card_id?.trim()) {
    return res.status(400).json({ error: "bad_request", message: "card_id required." });
  }
  const row = await pool.query(
    `SELECT id, clerk_user_id, recipient_name, occasion, template,
            is_watermarked, is_premium, created_at
     FROM hs_cards WHERE id = $1`,
    [card_id.trim()],
  );
  if ((row.rowCount ?? 0) === 0) {
    return res.status(404).json({ error: "not_found", message: `No card found: ${card_id}` });
  }
  const card = row.rows[0] as Record<string, unknown>;
  // Enrich with owner email if available
  if (card["clerk_user_id"]) {
    const u = await pool.query<{ email: string }>(
      "SELECT email FROM hs_clerk_users WHERE clerk_user_id = $1",
      [card["clerk_user_id"]],
    );
    card["owner_email"] = u.rows[0]?.email ?? null;
  }
  return res.json({ card });
});

/** POST /api/admin/revoke-card — body: { key, card_id } */
router.post("/admin/revoke-card", async (req, res) => {
  if (!checkKey(req as never, res as never)) return;
  const { card_id } = req.body as { card_id?: string };
  if (!card_id?.trim()) {
    return res.status(400).json({ error: "bad_request", message: "card_id required." });
  }
  const result = await pool.query(
    `UPDATE hs_cards
     SET is_watermarked = true, is_premium = false
     WHERE id = $1
     RETURNING id, clerk_user_id, recipient_name, occasion`,
    [card_id.trim()],
  );
  if ((result.rowCount ?? 0) === 0) {
    return res.status(404).json({ error: "not_found", message: `No card found: ${card_id}` });
  }
  return res.json({ ok: true, revoked: result.rows[0] });
});

/** GET /api/admin/lookup-user?key=...&email=... */
router.get("/admin/lookup-user", async (req, res) => {
  if (!checkKey(req as never, res as never)) return;
  const { email } = req.query as Record<string, string>;
  if (!email?.trim()) {
    return res.status(400).json({ error: "bad_request", message: "email required." });
  }
  const row = await pool.query(
    `SELECT clerk_user_id, email, cards_used, unlocked_templates, created_at
     FROM hs_clerk_users WHERE email ILIKE $1`,
    [email.trim()],
  );
  if ((row.rowCount ?? 0) === 0) {
    return res.status(404).json({ error: "not_found", message: `No user found: ${email}` });
  }
  return res.json({ user: row.rows[0] });
});

/** POST /api/admin/revoke-premium — body: { key, email } */
router.post("/admin/revoke-premium", async (req, res) => {
  if (!checkKey(req as never, res as never)) return;
  const { email } = req.body as { email?: string };
  if (!email?.trim()) {
    return res.status(400).json({ error: "bad_request", message: "email required." });
  }
  const result = await pool.query(
    `UPDATE hs_clerk_users
     SET unlocked_templates = '{}'
     WHERE email ILIKE $1
     RETURNING clerk_user_id, email, unlocked_templates`,
    [email.trim()],
  );
  if ((result.rowCount ?? 0) === 0) {
    return res.status(404).json({ error: "not_found", message: `No user found: ${email}` });
  }
  return res.json({ ok: true, user: result.rows[0] });
});

/** DELETE /api/admin/purge-since?key=...&since=YYYY-MM-DD[&exclude_clerk_user_id=...]
 *  Deletes analytics + signup rows on/after `since`.
 *  If exclude_clerk_user_id is set, events from that user are kept;
 *  signups/usage/payments tables are always fully purged for the date range. */
router.delete("/admin/purge-since", async (req, res) => {
  if (!checkKey(req as never, res as never)) return;
  const { since, exclude_clerk_user_id } = req.query as Record<string, string>;
  if (!since || !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    return res.status(400).json({ error: "bad_request", message: "since param required (YYYY-MM-DD)" });
  }
  const results: Record<string, number> = {};

  // Events: optionally exclude one user's rows
  if (exclude_clerk_user_id) {
    const r = await pool.query(
      `DELETE FROM hs_card_events WHERE created_at >= $1 AND (clerk_user_id IS DISTINCT FROM $2) AND (email IS DISTINCT FROM (SELECT email FROM hs_clerk_users WHERE clerk_user_id = $2 LIMIT 1))`,
      [since, exclude_clerk_user_id],
    );
    results["hs_card_events"] = r.rowCount ?? 0;
  } else {
    const r = await pool.query(`DELETE FROM hs_card_events WHERE created_at >= $1`, [since]);
    results["hs_card_events"] = r.rowCount ?? 0;
  }

  // Signups, usage, payments — always full purge for the date range
  for (const tbl of ["hs_clerk_users", "hs_card_usage", "hs_template_unlock_payments"]) {
    const r = await pool.query(`DELETE FROM ${tbl} WHERE created_at >= $1`, [since]);
    results[tbl] = r.rowCount ?? 0;
  }

  return res.json({ ok: true, deleted: results });
});

export default router;
