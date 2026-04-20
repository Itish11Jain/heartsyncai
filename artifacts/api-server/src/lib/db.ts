import { Pool } from "pg";

if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const pool = new Pool({
  connectionString: process.env["DATABASE_URL"],
  max: 10,
});

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hs_users (
      id SERIAL PRIMARY KEY,
      firebase_uid TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      credits INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS hs_credit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES hs_users(id),
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}
