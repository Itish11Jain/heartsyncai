/**
 * Web Vitals tracker — captures real-user load performance.
 *
 * Fires LCP, FCP, TTFB, INP, CLS to /api/events/vitals using
 * fetch + keepalive (survives page navigation; works through
 * the Replit mTLS proxy where sendBeacon doesn't).
 *
 * Skips superuser, bots, and prerender visits. Each metric is
 * sent at most once per page view.
 */

import { isSuperUser } from "./trackEvent";
import { authStore } from "./auth-store";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

type VitalPayload = {
  metric_name: "LCP" | "FCP" | "TTFB" | "INP" | "CLS";
  value_ms: number;
  page_path: string;
  fingerprint?: string;
  connection_type?: string;
};

function isLikelyBot(): boolean {
  if (typeof navigator === "undefined") return true;
  const ua = navigator.userAgent || "";
  return /bot|crawler|spider|crawling|preview|facebookexternalhit|whatsapp|telegram|slack|prerender|lighthouse|pagespeed/i.test(
    ua,
  );
}

function getConnectionType(): string | undefined {
  try {
    const c = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
    return c?.effectiveType;
  } catch {
    return undefined;
  }
}

function getFingerprint(): string | undefined {
  try {
    return localStorage.getItem("hs_fp") ?? undefined;
  } catch {
    return undefined;
  }
}

function getCurrentEmail(): string | null {
  return authStore.email;
}

function send(payload: VitalPayload): void {
  try {
    void fetch(`${BASE}/api/events/vitals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* fire-and-forget */
  }
}

let started = false;

export function startTrackingVitals(): void {
  if (started) return;
  started = true;

  if (typeof window === "undefined") return;
  if (isLikelyBot()) return;
  if (isSuperUser(getCurrentEmail())) return;

  // Don't track in dev — only production-built bundles
  if (import.meta.env.DEV) return;

  const fp = getFingerprint();
  const conn = getConnectionType();
  const path = window.location.pathname || "/";

  void import("web-vitals").then((wv) => {
    const handler = (metric: { name: string; value: number }) => {
      const name = metric.name as VitalPayload["metric_name"];
      // CLS is unitless, others are ms — server stores as numeric value, name preserves the meaning
      send({
        metric_name: name,
        value_ms: Math.round(metric.value * 1000) / 1000,
        page_path: path,
        fingerprint: fp,
        connection_type: conn,
      });
    };

    wv.onLCP(handler);
    wv.onFCP(handler);
    wv.onTTFB(handler);
    wv.onINP(handler);
    wv.onCLS(handler);
  }).catch(() => {
    /* web-vitals failed to load — silent */
  });
}
