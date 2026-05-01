import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth, useUser } from "@clerk/react";
import { isSuperUser } from "@/lib/trackEvent";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

/* ─── Template gating ───────────────────────────────────────────────────── */

export type TemplateId = "envelope" | "cosmic" | "crystal" | "vinyl";
export const PREMIUM_TEMPLATES: ReadonlyArray<TemplateId> = ["cosmic", "crystal", "vinyl"];
export const FREE_TEMPLATE: TemplateId = "envelope";

export function isPremiumTemplate(t: string): t is "cosmic" | "crystal" | "vinyl" {
  return (PREMIUM_TEMPLATES as readonly string[]).includes(t);
}

/** Generate a stable browser fingerprint stored in localStorage. */
function makeFingerprint(): string {
  const stored = localStorage.getItem("hs_fp");
  if (stored) return stored;
  try {
    const parts = [
      navigator.userAgent,
      navigator.language,
      `${screen.width}x${screen.height}`,
      String(screen.colorDepth),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      String(navigator.hardwareConcurrency ?? ""),
    ].join("|");
    let h = 0;
    for (let i = 0; i < parts.length; i++) {
      h = (Math.imul(31, h) + parts.charCodeAt(i)) | 0;
    }
    const fp = Math.abs(h).toString(36);
    localStorage.setItem("hs_fp", fp);
    return fp;
  } catch {
    return "fallback";
  }
}

export interface CardUsage {
  anon_used: number;
  signed_in_used: number;
  is_signed_in: boolean;
  is_superuser: boolean;
  unlocked_templates: string[];
  pending_single_unlocks: number;
}

/**
 * Decide which gate (if any) is required to send a card with `template`.
 *  - "signin"  → show sign-in wall (anonymous user clicking any template).
 *  - "paywall" → signed-in user clicking a premium template they haven't
 *                unlocked via the ₹49 bundle.
 *  - null      → free to proceed.
 *
 * Rules (Tollbooth Phase 2):
 *   • All users must sign in before generating any card link.
 *   • Envelope (free) — signed-in users get unlimited Envelope cards.
 *   • Cosmic / Crystal / Vinyl (premium) — signed-in users need ALL THREE
 *     templates in unlocked_templates (i.e. the ₹49 bundle).
 *   • Superuser bypasses everything.
 *   • The old single-plan unlock (pending_single_unlocks) is no longer
 *     accepted as premium access — users on the old plan must pay ₹49.
 */
export function templateGate(
  usage: CardUsage | null,
  template: TemplateId,
): "signin" | "paywall" | null {
  if (!usage) return null; // optimistic until we've loaded
  if (usage.is_superuser) return null;

  // All users must be signed in to generate any card.
  if (!usage.is_signed_in) return "signin";

  if (template === FREE_TEMPLATE) return null; // Envelope always free for signed-in users

  // Premium template — must have it in unlocked_templates (bundle paid).
  if (usage.unlocked_templates.includes(template)) return null;
  return "paywall";
}

/** Quick check used in places that don't care which template (defaults to Envelope). */
export function canCreate(usage: CardUsage | null): boolean {
  return templateGate(usage, FREE_TEMPLATE) === null;
}

export function useCardUsage() {
  const { isSignedIn, getToken, isLoaded } = useAuth();
  const { user } = useUser();
  const fingerprintRef = useRef<string>(makeFingerprint());
  const fingerprint = fingerprintRef.current;

  const userEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;

  const [usage, setUsage] = useState<CardUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async (): Promise<CardUsage | null> => {
    if (!isLoaded) return null;
    try {
      const headers: Record<string, string> = {};
      if (isSignedIn) {
        const token = await getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      const emailQ = userEmail ? `&email=${encodeURIComponent(userEmail)}` : "";
      const res = await fetch(
        `${BASE}/api/usage/check?fingerprint=${encodeURIComponent(fingerprint)}${emailQ}`,
        { headers }
      );
      if (res.ok) {
        const raw = await res.json() as Partial<CardUsage>;
        const data: CardUsage = {
          anon_used: raw.anon_used ?? 0,
          signed_in_used: raw.signed_in_used ?? 0,
          is_signed_in: raw.is_signed_in ?? !!isSignedIn,
          is_superuser: raw.is_superuser ?? false,
          unlocked_templates: Array.isArray(raw.unlocked_templates) ? raw.unlocked_templates : [],
          pending_single_unlocks: raw.pending_single_unlocks ?? 0,
        };
        if (isSuperUser(userEmail)) data.is_superuser = true;
        setUsage(data);
        return data;
      }
    } catch {
      const fallback: CardUsage = {
        anon_used: 0,
        signed_in_used: 0,
        is_signed_in: !!isSignedIn,
        is_superuser: isSuperUser(userEmail),
        unlocked_templates: [],
        pending_single_unlocks: 0,
      };
      setUsage(fallback);
      return fallback;
    } finally {
      setLoading(false);
    }
    return null;
  }, [isSignedIn, isLoaded, fingerprint, getToken, userEmail]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const incrementUsage = useCallback(async () => {
    if (isSuperUser(userEmail)) return;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (isSignedIn) {
        const token = await getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      await fetch(`${BASE}/api/usage/increment`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          fingerprint,
          ...(userEmail ? { email: userEmail } : {}),
        }),
      });
      await fetchUsage();
    } catch {
      /* non-blocking */
    }
  }, [isSignedIn, fingerprint, fetchUsage, getToken, userEmail]);

  return { usage, loading, fingerprint, incrementUsage, refetch: fetchUsage, userEmail };
}
