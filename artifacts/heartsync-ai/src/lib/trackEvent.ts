/**
 * Lightweight analytics event helper.
 * All calls are fire-and-forget — they never block the UI.
 * Events from SUPERUSER_EMAILS are dropped on the server too,
 * but we skip the network call entirely on the client for cleanliness.
 *
 * Uses fetch with keepalive:true (survives page navigation) instead of
 * sendBeacon, which fails through the Replit mTLS proxy.
 */

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

export const SUPERUSER_EMAIL = "jainitisha93@gmail.com";

export function isSuperUser(email: string | null | undefined): boolean {
  return email === SUPERUSER_EMAIL;
}

export type CardEventPayload = {
  event: string;
  fingerprint?: string;
  clerk_user_id?: string;
  email?: string;
  occasion?: string;
  template?: string;
  channel?: string;
  has_likes?: boolean;
  used_custom_msg?: boolean;
  is_free?: boolean;
  from_card_ref?: boolean;
  recipient_name?: string;
  card_id?: string;
};

export function trackEvent(payload: CardEventPayload): void {
  if (isSuperUser(payload.email)) return;

  const fp = (() => {
    try { return localStorage.getItem("hs_fp") ?? undefined; } catch { return undefined; }
  })();

  const body = JSON.stringify({ ...payload, fingerprint: payload.fingerprint ?? fp });

  // fetch with keepalive:true persists through page navigation and works
  // reliably through the Replit proxy (sendBeacon does not).
  try {
    void fetch(`${BASE}/api/events/card`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch { /* non-blocking */ }
}
