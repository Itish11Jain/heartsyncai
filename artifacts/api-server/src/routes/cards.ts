import { Router } from "express";
import { getAuth } from "@clerk/express";
import { pool } from "../lib/db";

const router = Router();

function genId(len = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < len; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
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

router.post("/cards", async (req, res) => {
  try {
    const auth = getAuth(req);
    const clerkUserId = auth?.userId ?? null;

    const {
      template,
      occasion,
      relation,
      recipient_name,
      msg,
      fingerprint,
      is_watermarked,
    } = req.body as Record<string, unknown>;

    const id = await uniqueId();

    await pool.query(
      `INSERT INTO hs_cards
         (id, template, occasion, relation, recipient_name, msg, clerk_user_id, fingerprint, is_watermarked)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        typeof template === "string" ? template : null,
        typeof occasion === "string" ? occasion : null,
        typeof relation === "string" ? relation : null,
        typeof recipient_name === "string" ? recipient_name : null,
        typeof msg === "string" ? msg : null,
        clerkUserId,
        typeof fingerprint === "string" ? fingerprint : null,
        is_watermarked !== false,
      ],
    );

    res.json({ id });
  } catch (err) {
    console.error("[cards] POST /cards error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/cards/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, template, occasion, relation, recipient_name, is_watermarked, created_at
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

export default router;
