/**
 * PremiumLockPanel
 *
 * Renders on the sender view of crystal/cosmic/vinyl card pages.
 * Implements the full 1-2 punch flow:
 *   locked → sign-in gate → paywall (UPI ₹49) → confetti + share unlock
 *
 * The parent is responsible for showing share buttons once `onUnlocked` fires.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, useClerk } from "@clerk/react";
import { Loader2 } from "lucide-react";
import { useCardUsage } from "@/lib/usage";
import { trackEvent } from "@/lib/trackEvent";
import { getPriceConfigForOccasion } from "@/lib/priceArm";
import { payWithRazorpay, PaymentCancelled } from "@/lib/razorpay";

/* ── Constants ─────────────────────────────────────────────────────────── */
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

/* ── Tiny canvas confetti burst ─────────────────────────────────────────── */
function fireConfetti() {
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;

  const COLORS = ["#FFD700","#FF69B4","#00E5FF","#B39DDB","#69F0AE","#FF6E40"];
  const particles = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height * 0.5 - 20,
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 3 + 2,
    size: Math.random() * 8 + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: 1,
    rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 6,
  }));

  let raf = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      if (p.alpha <= 0) continue;
      alive = true;
      p.x += p.vx; p.y += p.vy; p.vy += 0.08;
      p.rot += p.rotV; p.alpha -= 0.012;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (alive) { raf = requestAnimationFrame(draw); }
    else { canvas.remove(); }
  }
  raf = requestAnimationFrame(draw);
  setTimeout(() => { cancelAnimationFrame(raf); canvas.remove(); }, 4500);
}

/* ── Props ──────────────────────────────────────────────────────────────── */
export interface PremiumLockPanelProps {
  template: "crystal" | "cosmic" | "vinyl";
  occasion: string;
  recipientName: string;
  /** Raw URL search string (window.location.search) for re-building share URL */
  locationSearch: string;
  onUnlocked: (cardId?: string) => void;
}

/* ── Component ─────────────────────────────────────────────────────────── */
type Phase = "checking" | "locked" | "signin-gate" | "paying" | "done" | "dismissed";

export default function PremiumLockPanel({
  template, occasion, recipientName, locationSearch, onUnlocked,
}: PremiumLockPanelProps) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const clerk = useClerk();
  const { usage, loading: usageLoading, fingerprint, refetch: refetchUsage, userEmail } = useCardUsage();

  /** Occasion-based price (₹99 birthday/sorry · ₹49 others) + discount anchor. */
  const { price, anchor } = getPriceConfigForOccasion(occasion);

  const [phase, setPhase]       = useState<Phase>("checking");
  const [utrError, setUtrError] = useState("");
  const [utrLoading, setUtrLoading] = useState(false);

  /* Ref so we never double-fire onUnlocked */
  const unlockedFiredRef = useRef(false);
  /* Ref so a user-dismissed panel is never auto-re-shown by effects */
  const dismissedRef = useRef(false);

  /* ── Decide initial phase once Clerk + usage are ready ─────────────── */
  useEffect(() => {
    if (!isLoaded || usageLoading) return;
    if (dismissedRef.current) return;

    // Already paid — skip everything
    if (
      usage?.is_superuser ||
      (usage?.unlocked_templates ?? []).includes(template)
    ) {
      if (!unlockedFiredRef.current) {
        unlockedFiredRef.current = true;
        onUnlocked(undefined);
      }
      return;
    }

    // Signed in but not paid → auto-show paywall (1-2 punch step B)
    if (isSignedIn) {
      setPhase("paying");
      return;
    }

    // Anonymous → show lock screen
    setPhase("locked");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, usageLoading, isSignedIn, usage, template]);

  /* ── After sign-in redirect: Clerk flips isSignedIn → auto paywall ── */
  useEffect(() => {
    if (dismissedRef.current) return;
    if (phase === "locked" && isSignedIn && isLoaded && !usageLoading) {
      // Refetch usage and use the RETURNED data — avoids stale closure on `usage`.
      refetchUsage().then((fresh) => {
        if (
          fresh?.is_superuser ||
          (fresh?.unlocked_templates ?? []).includes(template)
        ) {
          if (!unlockedFiredRef.current) {
            unlockedFiredRef.current = true;
            onUnlocked(undefined);
          }
        } else {
          setPhase("paying");
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, isLoaded, phase]);

  /* ── Pay via Razorpay → unlock templates ─────────────────────────────── */
  const handlePremiumPay = useCallback(async () => {
    if (utrLoading) return;
    setUtrError("");
    setUtrLoading(true);

    try {
      const token = await getToken();

      /* Step 1: pay + unlock all 3 templates on the account (verified server-side) */
      await payWithRazorpay({ kind: "template", authToken: token });

      trackEvent({
        event: "paywall_paid",
        fingerprint,
        email: userEmail ?? undefined,
        occasion,
        template,
      });
      if (typeof window !== "undefined" && (window as Window & { fbq?: (...a: unknown[]) => void }).fbq) {
        (window as Window & { fbq?: (...a: unknown[]) => void }).fbq!("track", "Purchase", { value: price, currency: "INR" });
      }

      await refetchUsage();

      /* Step 2: create a card row in DB (marks premium + no watermark) */
      let cardId: string | undefined;
      if (token) {
        const p = new URLSearchParams(locationSearch);
        const msgParam = p.get("msg");
        const cardRes = await fetch(`${BASE}/api/cards`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            template,
            occasion,
            recipient_name: recipientName || undefined,
            ...(msgParam ? { message_b64: msgParam } : {}),
            price,
          }),
        });
        if (cardRes.ok) {
          const cd = await cardRes.json() as { id?: string };
          cardId = cd.id;
          if (cardId) {
            await fetch(`${BASE}/api/cards/${cardId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ is_watermarked: false, is_premium: true }),
            });
          }
        }
      }

      /* Step 3: celebrate + unlock share buttons */
      setPhase("done");
      setTimeout(() => {
        fireConfetti();
        if (!unlockedFiredRef.current) {
          unlockedFiredRef.current = true;
          onUnlocked(cardId);
        }
      }, 250);
    } catch (err) {
      if (!(err instanceof PaymentCancelled)) {
        setUtrError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      }
    } finally {
      setUtrLoading(false);
    }
  }, [utrLoading, getToken, fingerprint, userEmail, occasion, template, price, locationSearch, recipientName, refetchUsage, onUnlocked]);

  /* ── Render ─────────────────────────────────────────────────────────── */

  if (phase === "checking")   return null; // briefly invisible while Clerk + usage load
  if (phase === "done")       return null; // parent renders share buttons

  /* Dismissed — show locked placeholder buttons; clicking re-opens paywall */
  if (phase === "dismissed") {
    const reopenPaywall = () => {
      dismissedRef.current = false;
      setPhase("paying");
    };
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ width: "min(340px, 90vw)", marginTop: 22 }}
      >
        <p style={{ fontSize: 12, color: "rgba(190,160,255,0.28)", textAlign: "center", marginBottom: 12, letterSpacing: "0.08em" }}>
          🔒 unlock to share
        </p>
        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <button onClick={reopenPaywall} style={{
            flex: 1, padding: "12px 8px", borderRadius: 12,
            background: "rgba(37,211,102,0.04)", border: "1.5px solid rgba(37,211,102,0.14)",
            color: "rgba(37,211,102,0.45)", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>💬 WhatsApp</button>
          <button onClick={reopenPaywall} style={{
            flex: 1, padding: "12px 8px", borderRadius: 12,
            background: "rgba(200,100,200,0.04)", border: "1.5px solid rgba(200,100,200,0.14)",
            color: "rgba(220,140,255,0.45)", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>📸 Instagram</button>
        </div>
        <button onClick={reopenPaywall} style={{
          width: "100%", padding: "11px", borderRadius: 12,
          background: "rgba(180,130,255,0.04)", border: "1.5px solid rgba(180,130,255,0.14)",
          color: "rgba(200,170,255,0.45)", fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>🔗 Copy Link</button>
        <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.18)", marginTop: 10, cursor: "pointer" }}
          onClick={reopenPaywall}>
          Tap any button to unlock · ₹{price} one-time
        </p>
      </motion.div>
    );
  }

  /* Lock screen — anonymous user hasn't tapped Pay yet */
  if (phase === "locked") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        style={{ width: "min(340px, 90vw)", marginTop: 22, textAlign: "center" }}
      >
        <button
          onClick={() => {
            trackEvent({ event: "paywall_shown", fingerprint, email: userEmail ?? undefined, occasion, template });
            setPhase("signin-gate");
          }}
          style={{
            width: "100%",
            padding: "15px 12px",
            borderRadius: 16,
            background: "linear-gradient(135deg, #FFD700, #FFA500)",
            border: "none",
            color: "#000",
            fontWeight: 800,
            fontSize: 16,
            cursor: "pointer",
            letterSpacing: "0.01em",
            boxShadow: "0 0 28px rgba(255,215,0,0.35)",
          }}
        >
          ✨{" "}
          <span style={{ textDecoration: "line-through", opacity: 0.45, fontWeight: 500, fontSize: 13, marginRight: 2 }}>₹{anchor}</span>
          {" "}₹{price} · Unlock &amp; Share
          {" "}<span style={{
            background: "rgba(255,80,50,0.22)", border: "1px solid rgba(255,80,50,0.45)",
            color: "#ff6b4a", fontSize: 9, fontWeight: 800, padding: "2px 6px",
            borderRadius: 99, letterSpacing: "0.04em", verticalAlign: "middle",
          }}>⚡ Limited Time</span>
        </button>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, flexWrap: "wrap" }}>
          <span style={{ color: "rgba(255,255,255,0.2)", textDecoration: "line-through" }}>₹{anchor}</span>
          <span style={{ color: "rgba(255,255,255,0.35)" }}>₹{price} one-time · All 3 premium templates forever</span>
          <span style={{
            background: "rgba(255,80,50,0.18)", border: "1px solid rgba(255,80,50,0.4)",
            color: "#ff7d5c", fontSize: 9, fontWeight: 800, padding: "2px 6px",
            borderRadius: 99, letterSpacing: "0.04em",
          }}>⚡ Limited Time</span>
        </p>
      </motion.div>
    );
  }

  /* Sign-in gate overlay */
  if (phase === "signin-gate") {
    return (
      <AnimatePresence>
        <motion.div
          key="signin-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 90,
            background: "rgba(4, 0, 14, 0.92)",
            backdropFilter: "blur(8px)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "0 24px",
          }}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            style={{
              width: "100%", maxWidth: 360,
              background: "rgba(20,0,44,0.96)",
              border: "1px solid rgba(255,215,0,0.2)",
              borderRadius: 24,
              padding: "32px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 42, marginBottom: 12 }}>🔐</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
              Sign in to complete purchase
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 28, lineHeight: 1.5 }}>
              We'll save your purchase so it's never lost — even if you close this tab.
            </p>
            <button
              onClick={() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (clerk as any).openSignIn({ redirectUrl: window.location.href });
              }}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 14,
                background: "linear-gradient(135deg, #FFD700, #FFA500)",
                border: "none",
                color: "#000",
                fontWeight: 800,
                fontSize: 15,
                cursor: "pointer",
                marginBottom: 14,
              }}
            >
              Continue with Google →
            </button>
            <button
              onClick={() => setPhase("locked")}
              style={{
                background: "none", border: "none",
                color: "rgba(255,255,255,0.3)", fontSize: 12,
                cursor: "pointer", padding: "4px 0",
              }}
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  /* Paywall — UPI ₹49 (shown after sign-in) */
  return (
    <AnimatePresence>
      <motion.div
        key="paywall"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          position: "fixed", inset: 0, zIndex: 90,
          background: "radial-gradient(ellipse at 50% 30%, #1a0030 0%, #080112 55%, #020008 100%)",
          backdropFilter: "blur(6px)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "flex-start",
          padding: "24px 16px",
          overflowY: "auto",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ width: "100%", maxWidth: 360, margin: "auto" }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>✨</div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
              Unlock &amp; Share Your Card
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, flexWrap: "wrap" }}>
              <span style={{ color: "rgba(255,255,255,0.28)", textDecoration: "line-through" }}>₹{anchor}</span>
              <span style={{ color: "rgba(255,215,0,0.75)", fontWeight: 700 }}>₹{price}</span>
              — yours forever.
            </p>
          </div>

          {/* Plan pill */}
          <div style={{
            marginBottom: 16, borderRadius: 18, padding: "12px 16px",
            background: "linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,165,0,0.10))",
            border: "1.5px solid rgba(255,215,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>₹{price}</div>
                <span style={{ color: "rgba(255,255,255,0.3)", textDecoration: "line-through", fontSize: 15, fontWeight: 400 }}>₹{anchor}</span>
                <span style={{
                  background: "rgba(255,80,50,0.18)", border: "1px solid rgba(255,80,50,0.4)",
                  color: "#ff7d5c", fontSize: 9, fontWeight: 800, padding: "2px 6px",
                  borderRadius: 99, letterSpacing: "0.04em",
                }}>⚡ Limited Time</span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 4, lineHeight: 1.6 }}>
                <div>✓ Unlocks Crystal, Cosmic &amp; Vinyl — forever</div>
                <div>✓ No watermark · No subscription</div>
                <div>✓ Add a picture of them in your card</div>
              </div>
            </div>
          </div>

          {/* Razorpay payment card */}
          <div style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 20,
            padding: 16,
            marginBottom: 12,
          }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textAlign: "center", marginBottom: 14, lineHeight: 1.5 }}>
              Secure payment via UPI, cards, netbanking &amp; wallets — powered by Razorpay.
            </p>
            {utrError && (
              <p style={{ fontSize: 12, color: "#f87171", textAlign: "center", margin: "0 0 10px" }}>{utrError}</p>
            )}
            <button
              onClick={() => { void handlePremiumPay(); }}
              disabled={utrLoading}
              data-testid="premium-pay"
              style={{
                width: "100%", padding: "14px", borderRadius: 12,
                background: "linear-gradient(135deg, #FFD700, #FFA500)",
                border: "none", color: "#000",
                fontWeight: 800, fontSize: 15,
                cursor: utrLoading ? "wait" : "pointer",
                opacity: utrLoading ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {utrLoading
                ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Opening payment…</>
                : <>🔓 Pay ₹{price} &amp; Unlock ✨</>}
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.28)", marginBottom: 16 }}>
            Account-wide · Every card you ever send · No subscription
          </p>

          <button
            onClick={() => {
              dismissedRef.current = true;
              setPhase("dismissed");
            }}
            style={{
              display: "block", width: "100%", textAlign: "center",
              fontSize: 12, color: "rgba(255,255,255,0.28)",
              background: "none", border: "none", cursor: "pointer", padding: "4px 0",
            }}
          >
            Go back
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
