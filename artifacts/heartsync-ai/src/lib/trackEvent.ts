/**
 * Lightweight analytics event helper.
 * All calls are fire-and-forget — they never block the UI.
 * Events from SUPERUSER_EMAILS are dropped on the server too,
 * but we skip the network call entirely on the client for cleanliness.
 *
 * Uses fetch with keepalive:true (survives page navigation) instead of
 * sendBeacon, which fails through the Replit mTLS proxy.
 *
 * UTM attribution: on first landing with utm_* params we persist them in
 * localStorage as the visitor's "first-touch" source. Every subsequent
 * trackEvent call automatically attaches them so we can attribute
 * downstream events (cta_clicked, card_created, paywall_paid, ...) back
 * to the campaign that brought the user.
 */

import { getPriceArm } from "./priceArm";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
const UTM_KEY = "hs_utm";

const SUPERUSER_EMAILS = ["jainitisha93@gmail.com", "itisha.a.jain.93@gmail.com"];

export function isSuperUser(email: string | null | undefined): boolean {
  return !!email && SUPERUSER_EMAILS.includes(email);
}

type StoredUtm = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

/**
 * Capture utm_source / utm_medium / utm_campaign from the current URL on
 * first landing and persist them as the visitor's first-touch attribution.
 * Idempotent — once stored, subsequent visits with new utm params do not
 * overwrite (so we don't lose the original campaign that paid for them).
 */
function captureFirstTouchUtm(): void {
  if (typeof window === "undefined") return;
  try {
    const sp = new URLSearchParams(window.location.search);
    const utm_source = sp.get("utm_source");
    const utm_medium = sp.get("utm_medium");
    const utm_campaign = sp.get("utm_campaign");
    if (!utm_source && !utm_medium && !utm_campaign) return;
    if (localStorage.getItem(UTM_KEY)) return; // first-touch wins
    const payload: StoredUtm = {};
    if (utm_source)   payload.utm_source   = utm_source.slice(0, 60);
    if (utm_medium)   payload.utm_medium   = utm_medium.slice(0, 60);
    if (utm_campaign) payload.utm_campaign = utm_campaign.slice(0, 80);
    localStorage.setItem(UTM_KEY, JSON.stringify(payload));
  } catch { /* ignore */ }
}

function readStoredUtm(): StoredUtm {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(UTM_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredUtm;
  } catch { return {}; }
}

// Run capture immediately on module load so the very first trackEvent call
// (e.g. website_visited_from_card on home mount) already carries UTM context.
captureFirstTouchUtm();

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
  has_photo?: boolean;
  has_voice_note?: boolean;
  photo_count?: number;
  app?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  /** Price A/B arm (₹49 or ₹99). Auto-attached from the device's sticky arm. */
  price?: number;
  /** Zero-based index, e.g. which memory star was unlocked. */
  index?: number;
};

/** Returns true when running on a non-production origin (Replit dev proxy or localhost). */
function isDevOrigin(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h.endsWith(".replit.dev") || h.endsWith(".janeway.replit.dev");
}

export function trackEvent(payload: CardEventPayload): void {
  if (isSuperUser(payload.email)) return;
  // Never send analytics from the dev / staging environment.
  if (isDevOrigin()) return;

  const fp = (() => {
    try { return localStorage.getItem("hs_fp") ?? undefined; } catch { return undefined; }
  })();

  const utm = readStoredUtm();

  // Stored UTM + price arm attach to every event but the caller may override
  // per-event. Attaching the arm to every event lets the analytics readout
  // slice any funnel step (created → paid) by price arm.
  const body = JSON.stringify({
    ...utm,
    price: getPriceArm(),
    ...payload,
    fingerprint: payload.fingerprint ?? fp,
  });

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
