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

export default router;
