import type { Request, Response, NextFunction } from "express";
import { verifySession, type SessionPayload } from "../lib/session.js";
import { pool } from "../lib/db.js";

export interface AuthUser extends SessionPayload {
  credits: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "Authentication required." });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifySession(token);

    const result = await pool.query<{ credits: number }>(
      "SELECT credits FROM hs_users WHERE id = $1",
      [payload.userId],
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: "unauthorized", message: "User not found." });
      return;
    }

    req.user = {
      userId: payload.userId,
      displayName: payload.displayName,
      credits: result.rows[0].credits,
    };

    next();
  } catch {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired session." });
  }
}
