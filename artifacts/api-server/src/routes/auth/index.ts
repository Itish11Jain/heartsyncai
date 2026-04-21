import { Router } from "express";
import { verifyFirebaseToken } from "../../lib/firebase-admin.js";
import { pool } from "../../lib/db.js";
import { signSession } from "../../lib/session.js";

const router = Router();

router.post("/auth/verify", async (req, res) => {
  const { idToken } = req.body as { idToken?: string };

  if (!idToken || typeof idToken !== "string") {
    res.status(400).json({ error: "validation_error", message: "idToken is required." });
    return;
  }

  try {
    const { uid, displayName } = await verifyFirebaseToken(idToken);

    const result = await pool.query<{
      id: number;
      credits: number;
      inserted: boolean;
    }>(
      `INSERT INTO hs_users (firebase_uid, display_name, credits)
       VALUES ($1, $2, 1)
       ON CONFLICT (firebase_uid) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id, credits, (xmax = 0) AS inserted`,
      [uid, displayName],
    );

    const user = result.rows[0];

    if (user.inserted) {
      await pool.query(
        "INSERT INTO hs_credit_logs (user_id, delta, reason) VALUES ($1, $2, $3)",
        [user.id, 1, "free_signup"],
      );
    }

    const sessionToken = signSession({ userId: user.id, displayName });

    req.log.info({ userId: user.id, displayName, isNew: user.inserted }, "User authenticated");

    res.json({ sessionToken, credits: user.credits, displayName });
  } catch (err) {
    req.log.error({ err }, "Auth verification failed");
    res
      .status(401)
      .json({ error: "auth_failed", message: "Could not verify your login. Please try again." });
  }
});

router.get("/me", async (req, res) => {
  const authHeader = req.headers["authorization"] ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "unauthorized", message: "No session token." });
    return;
  }

  try {
    const { verifySession } = await import("../../lib/session.js");
    const { userId } = verifySession(token);

    const result = await pool.query<{ credits: number }>(
      "SELECT credits FROM hs_users WHERE id = $1",
      [userId],
    );

    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ error: "not_found", message: "User not found." });
      return;
    }

    res.json({ credits: result.rows[0]!.credits });
  } catch {
    res.status(401).json({ error: "unauthorized", message: "Invalid session token." });
  }
});

export default router;
