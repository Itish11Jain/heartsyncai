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
    ALTER TABLE hs_users ADD COLUMN IF NOT EXISTS moments_credits INTEGER NOT NULL DEFAULT 2;

    -- Clerk-based users (separate from legacy Firebase users)
    CREATE TABLE IF NOT EXISTS hs_clerk_users (
      id SERIAL PRIMARY KEY,
      clerk_user_id TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      email TEXT,
      cards_used INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    -- Per-user account-wide premium template entitlements.
    -- Default '{}' = no premium templates unlocked.
    -- Possible values inside the array: 'cosmic', 'crystal', 'vinyl'.
    ALTER TABLE hs_clerk_users
      ADD COLUMN IF NOT EXISTS unlocked_templates TEXT[] NOT NULL DEFAULT '{}'::text[];

    -- Records every premium-template payment (₹29 single, ₹49 bundle).
    -- For 'single', claimed_template starts NULL and is filled when the user
    -- picks which premium template to unlock after the payment is verified.
    -- For 'bundle', claimed_template stays NULL (all 3 are unlocked at once).
    CREATE TABLE IF NOT EXISTS hs_template_unlock_payments (
      id SERIAL PRIMARY KEY,
      clerk_user_id TEXT NOT NULL,
      utr TEXT UNIQUE NOT NULL,
      plan TEXT NOT NULL CHECK (plan IN ('single', 'bundle')),
      claimed_template TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS hs_tul_user_idx ON hs_template_unlock_payments(clerk_user_id);

    -- Lightweight migration tracker (one-shot data backfills).
    CREATE TABLE IF NOT EXISTS hs_migrations (
      name TEXT PRIMARY KEY,
      ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Grandfather migration: every Clerk user that existed before the
    -- premium-template paywall ships gets all 3 premium templates unlocked
    -- for free. Runs exactly once. ON CONFLICT DO NOTHING makes it safe
    -- against concurrent boots of multiple instances racing the marker insert.
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM hs_migrations WHERE name = 'grandfather_template_unlocks_v1'
      ) THEN
        UPDATE hs_clerk_users
          SET unlocked_templates = ARRAY['cosmic', 'crystal', 'vinyl']
          WHERE unlocked_templates = '{}'::text[];
        INSERT INTO hs_migrations (name)
          VALUES ('grandfather_template_unlocks_v1')
          ON CONFLICT (name) DO NOTHING;
      END IF;
    END $$;

    -- Anonymous fingerprint usage tracking (resists incognito via server-side counter)
    CREATE TABLE IF NOT EXISTS hs_card_usage (
      id SERIAL PRIMARY KEY,
      fingerprint TEXT NOT NULL,
      ip TEXT,
      cards_used INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS hs_card_usage_fp ON hs_card_usage(fingerprint);
    CREATE TABLE IF NOT EXISTS hs_credit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES hs_users(id),
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS hs_utr_submissions (
      id SERIAL PRIMARY KEY,
      utr TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL REFERENCES hs_users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS hs_moments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES hs_users(id),
      purpose TEXT NOT NULL,
      relation TEXT NOT NULL,
      recipient TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}
