import jwt from "jsonwebtoken";

const SESSION_SECRET = process.env["SESSION_SECRET"] ?? "heartsync-dev-session-secret";

export interface SessionPayload {
  userId: number;
  displayName: string;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, SESSION_SECRET, { expiresIn: "90d" });
}

export function verifySession(token: string): SessionPayload {
  return jwt.verify(token, SESSION_SECRET) as SessionPayload;
}
