import { pool } from "./db";

/**
 * Runtime app configuration backed by the hs_app_config table.
 *
 * The only setting today is the active payment mode, which lets the owner flip
 * the live paywall between the manual UPI flow ("upi") and Razorpay online
 * checkout ("razorpay") instantly — no redeploy. A short in-memory cache keeps
 * the hot path fast while still propagating a flip across instances within a
 * few seconds.
 */
export type PaymentMode = "upi" | "razorpay";

const DEFAULT_MODE: PaymentMode = "upi";
const CACHE_TTL_MS = 5_000;

let cache: { mode: PaymentMode; at: number } | null = null;

function normMode(value: string | null | undefined): PaymentMode {
  return value === "razorpay" ? "razorpay" : "upi";
}

/** Active payment mode. Cached ~5s so a flip propagates quickly everywhere. */
export async function getPaymentMode(): Promise<PaymentMode> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.mode;
  try {
    const r = await pool.query<{ value: string }>(
      `SELECT value FROM hs_app_config WHERE key = 'payment_mode'`,
    );
    const mode = normMode(r.rows[0]?.value);
    cache = { mode, at: Date.now() };
    return mode;
  } catch {
    // On a transient DB error, fall back to the last known mode (or the safe
    // default) so the paywall never hard-fails on a config read.
    return cache?.mode ?? DEFAULT_MODE;
  }
}

/** Flip the active payment mode (admin only). Updates the local cache at once. */
export async function setPaymentMode(mode: PaymentMode): Promise<PaymentMode> {
  const next = normMode(mode);
  await pool.query(
    `INSERT INTO hs_app_config (key, value, updated_at) VALUES ('payment_mode', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [next],
  );
  cache = { mode: next, at: Date.now() };
  return next;
}
