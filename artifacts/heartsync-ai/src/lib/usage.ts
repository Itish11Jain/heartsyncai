import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth, useUser } from "@clerk/react";
import { SUPERUSER_EMAIL } from "@/lib/trackEvent";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

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
}

/** Whether this user can still create a card for free. */
export function canCreate(usage: CardUsage | null): boolean {
  if (!usage) return true;
  if (usage.is_superuser) return true;
  if (!usage.is_signed_in) return usage.anon_used < 2;
  return usage.signed_in_used < 2;
}

/** Which gate to show: "signin" | "paywall" | null */
export function gateNeeded(usage: CardUsage | null): "signin" | "paywall" | null {
  if (!usage) return null;
  if (usage.is_superuser) return null;
  if (!usage.is_signed_in && usage.anon_used >= 2) return "signin";
  if (usage.is_signed_in && usage.signed_in_used >= 2) return "paywall";
  return null;
}

export function useCardUsage() {
  const { isSignedIn, getToken, isLoaded } = useAuth();
  const { user } = useUser();
  const fingerprintRef = useRef<string>(makeFingerprint());
  const fingerprint = fingerprintRef.current;

  const userEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;

  const [usage, setUsage] = useState<CardUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    if (!isLoaded) return;
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
        const data: CardUsage = await res.json();
        if (userEmail === SUPERUSER_EMAIL) data.is_superuser = true;
        setUsage(data);
      }
    } catch {
      const isSuperUser = userEmail === SUPERUSER_EMAIL;
      setUsage({ anon_used: 0, signed_in_used: 0, is_signed_in: !!isSignedIn, is_superuser: isSuperUser });
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, isLoaded, fingerprint, getToken, userEmail]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const incrementUsage = useCallback(async () => {
    if (userEmail === SUPERUSER_EMAIL) return;
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
