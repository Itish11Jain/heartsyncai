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

    -- Card storage: each generated card gets a persistent row so recipients
    -- can be looked up later (watermark check, future analytics, etc.)
    CREATE TABLE IF NOT EXISTS hs_cards (
      id              TEXT PRIMARY KEY,
      clerk_user_id   TEXT,           -- NOT NULL enforced at app layer (POST /api/cards requires Clerk auth)
      template        TEXT,
      occasion        TEXT,
      recipient_name  TEXT,
      message_b64     TEXT,
      is_watermarked  BOOLEAN NOT NULL DEFAULT TRUE,
      is_premium      BOOLEAN NOT NULL DEFAULT FALSE,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );
    -- Schema migrations for hs_cards (idempotent)
    ALTER TABLE hs_cards ADD COLUMN IF NOT EXISTS message_b64 TEXT;
    ALTER TABLE hs_cards ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE hs_cards ADD COLUMN IF NOT EXISTS photo_url TEXT;
    ALTER TABLE hs_card_events ADD COLUMN IF NOT EXISTS has_photo BOOLEAN;
    CREATE INDEX IF NOT EXISTS hs_cards_clerk_idx ON hs_cards(clerk_user_id);
    CREATE INDEX IF NOT EXISTS hs_cards_created_idx ON hs_cards(created_at);

    -- Watermark removal payments (₹29 per card, envelope path)
    CREATE TABLE IF NOT EXISTS hs_watermark_payments (
      id            SERIAL PRIMARY KEY,
      clerk_user_id TEXT NOT NULL,
      card_id       TEXT NOT NULL REFERENCES hs_cards(id),
      utr           TEXT NOT NULL UNIQUE,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS hs_wm_payments_user_idx ON hs_watermark_payments(clerk_user_id);
    CREATE INDEX IF NOT EXISTS hs_wm_payments_card_idx ON hs_watermark_payments(card_id);

    -- Anonymous card unlock submissions (no auth required, last-4-digit UTR)
    CREATE TABLE IF NOT EXISTS hs_card_unlock_submissions (
      id             SERIAL PRIMARY KEY,
      card_id        TEXT NOT NULL,
      utr_last4      TEXT NOT NULL,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS hs_card_unlock_card_idx ON hs_card_unlock_submissions(card_id);
    ALTER TABLE hs_card_unlock_submissions ADD COLUMN IF NOT EXISTS full_utr TEXT;
    ALTER TABLE hs_card_unlock_submissions ADD COLUMN IF NOT EXISTS unlock_method TEXT;
    -- Voice notes + multi-photo collage
    ALTER TABLE hs_cards ADD COLUMN IF NOT EXISTS voice_note_url TEXT;
    ALTER TABLE hs_cards ADD COLUMN IF NOT EXISTS photo_urls TEXT[];

    -- Confirmed UPI payments received via Gmail/SMS forwarder
    CREATE TABLE IF NOT EXISTS hs_received_payments (
      id             SERIAL PRIMARY KEY,
      utr            TEXT NOT NULL UNIQUE,
      amount         TEXT,
      raw_sms        TEXT,
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      used_at        TIMESTAMPTZ,
      card_id        TEXT,
      unlock_method  TEXT
    );
    CREATE INDEX IF NOT EXISTS hs_received_payments_utr_idx ON hs_received_payments(utr);
    -- Functional index on the last-4 digits of UTR so the card unlock query
    -- (WHERE RIGHT(utr, 4) = $1) uses an index scan instead of a full table scan.
    CREATE INDEX IF NOT EXISTS hs_received_payments_utr_last4_idx ON hs_received_payments (RIGHT(utr, 4));
    ALTER TABLE hs_received_payments ADD COLUMN IF NOT EXISTS card_id TEXT;
    ALTER TABLE hs_received_payments ADD COLUMN IF NOT EXISTS unlock_method TEXT;
    ALTER TABLE hs_received_payments ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
    ALTER TABLE hs_received_payments ADD COLUMN IF NOT EXISTS refund_note TEXT;
  `);

  /* ── One-time data cleanup: remove AYUSHI JAIN & ITISHA JAIN test/internal
   * payments permanently. Uses hs_migrations so this runs exactly once. ── */
  const already = await pool.query(
    `SELECT 1 FROM hs_migrations WHERE name = 'remove_ayushi_itisha_payments'`
  );
  if (already.rowCount === 0) {
    await pool.query(`
      DELETE FROM hs_received_payments
      WHERE UPPER(raw_sms) LIKE '%AYUSHI%'
         OR UPPER(raw_sms) LIKE '%ITISHA%';
      INSERT INTO hs_migrations (name) VALUES ('remove_ayushi_itisha_payments');
    `);
  }
}
