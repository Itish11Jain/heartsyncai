import { Router } from "express";
import { pool } from "../../lib/db.js";

const router = Router();

const ADMIN_KEY =
  process.env["ADMIN_SECRET"] ?? (() => {
    const generated = "hs-" + Math.random().toString(36).slice(2, 10);
    console.warn(`[HeartSync Admin] No ADMIN_SECRET set. Using generated key: ${generated}`);
    return generated;
  })();

function checkKey(req: { query: Record<string, unknown> }, res: { status: (n: number) => { json: (o: unknown) => void } }): boolean {
  if (req.query["key"] !== ADMIN_KEY) {
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

export default router;
