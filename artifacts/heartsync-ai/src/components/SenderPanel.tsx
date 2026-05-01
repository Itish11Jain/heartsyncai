import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useAuth, useClerk } from "@clerk/react";
import { useCardUsage } from "@/lib/usage";
import { trackEvent } from "@/lib/trackEvent";
import { envelope } from "@/lib/audio";
import WatermarkBadge from "@/components/WatermarkBadge";
import WatermarkPaywallModal from "@/components/WatermarkPaywallModal";
import ClerkAuthLayer from "@/components/ClerkAuthLayer";

type Phase = "envelope" | "opening" | "orbs" | "finale";

interface SenderPanelProps {
  senderShareUrl: string;
  recipientName: string;
  occasion: string;
  cardId: string;
  phase: Phase;
}

function SenderPanelInner({ senderShareUrl, recipientName, occasion, cardId, phase }: SenderPanelProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const clerk = useClerk();
  const { usage } = useCardUsage();
  const isPremiumUser = !!(usage?.is_superuser || (usage?.unlocked_templates?.length ?? 0) > 0);
  const [showShareGate, setShowShareGate] = useState(false);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [watermarkRemoved, setWatermarkRemoved] = useState(false);
  const [senderCopied, setSenderCopied] = useState(false);
  const [senderIgCopied, setSenderIgCopied] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && showShareGate) {
      setShowShareGate(false);
    }
  }, [isLoaded, isSignedIn, showShareGate]);

  function requireSignIn(): boolean {
    if (isLoaded && isSignedIn) return false;
    trackEvent({ event: "signup_wall_shown", occasion, template: "envelope" });
    setShowShareGate(true);
    return true;
  }

  function shareSenderWhatsApp() {
    if (requireSignIn()) return;
    envelope.copy();
    trackEvent({ event: "card_shared", channel: "whatsapp", occasion, template: "envelope" });
    const text = `💌 Hey ${recipientName}, I made you something special!\n\nYour surprise is waiting 👇\n${senderShareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  async function copySenderLinkForInstagram() {
    if (requireSignIn()) return;
    envelope.copy();
    trackEvent({ event: "card_shared", channel: "instagram", occasion, template: "envelope" });
    try {
      await navigator.clipboard.writeText(senderShareUrl);
      setSenderIgCopied(true);
      setTimeout(() => setSenderIgCopied(false), 2500);
    } catch { /* ignore */ }
  }

  async function copySenderLink() {
    if (requireSignIn()) return;
    envelope.copy();
    trackEvent({ event: "card_shared", channel: "link", occasion, template: "envelope" });
    try {
      await navigator.clipboard.writeText(senderShareUrl);
      setSenderCopied(true);
      setTimeout(() => setSenderCopied(false), 2500);
    } catch { /* ignore */ }
  }

  return (
    <>
      {/* Watermark badge — computed from auth state */}
      <WatermarkBadge
        id={cardId || undefined}
        showRemoveCta={false}
        prominent={isSignedIn === true && phase === "finale"}
        hidden={isPremiumUser || watermarkRemoved || (phase === "finale" && !isSignedIn)}
      />

      {/* ── Sender share panel (finale only) ── */}
      {phase === "finale" && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.55 }}
          style={{
            position: "fixed",
            bottom: "max(16px, env(safe-area-inset-bottom, 16px))",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(340px, calc(100vw - 32px))",
            paddingBottom: 8,
            zIndex: 35,
          }}
        >
          <p style={{ fontSize: 12, color: "rgba(255,215,0,0.55)", textAlign: "center", marginBottom: 12, fontWeight: 600, letterSpacing: "0.04em" }}>
            ✨ Your card is ready — share it now!
          </p>

          {/* Primary share */}
          <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={shareSenderWhatsApp}
              style={{
                flex: 1, padding: "16px 10px", borderRadius: 16,
                background: "linear-gradient(135deg, #25D366, #128C7E)",
                color: "white", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7,
                boxShadow: "0 6px 24px rgba(37,211,102,0.35)",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={copySenderLinkForInstagram}
              style={{
                flex: 1, padding: "16px 10px", borderRadius: 16,
                background: senderIgCopied
                  ? "linear-gradient(135deg, #22c55e, #16a34a)"
                  : "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                color: "white", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7,
                boxShadow: "0 6px 24px rgba(220,39,67,0.3)", transition: "background 0.3s",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              {senderIgCopied ? "Copied!" : "Instagram"}
            </motion.button>
          </div>

          {/* Copy link secondary */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={copySenderLink}
            style={{
              width: "100%", padding: "12px", borderRadius: 12,
              background: senderCopied ? "linear-gradient(135deg, #22c55e, #16a34a)" : "rgba(255,215,0,0.08)",
              color: senderCopied ? "white" : "rgba(255,215,0,0.75)",
              fontWeight: 600, fontSize: 13, border: "1px solid rgba(255,215,0,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              cursor: "pointer", transition: "all 0.3s",
            }}
          >
            {senderCopied ? "✓ Link Copied!" : "🔗 Copy Link"}
          </motion.button>

          {/* Remove watermark section — only for signed-in non-premium senders */}
          {isSignedIn && !isPremiumUser && !watermarkRemoved && (
            <div style={{
              marginTop: 16,
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(168,85,247,0.08)",
              border: "1px solid rgba(168,85,247,0.2)",
              textAlign: "center",
            }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                background: "linear-gradient(135deg, #5B21B6 0%, #9333EA 55%, #7C3AED 100%)",
                borderRadius: 999,
                marginBottom: 10,
                boxShadow: "0 4px 18px rgba(168,85,247,0.45)",
              }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Made for free on HeartSync</span>
                <span style={{ fontSize: 14 }}>✨</span>
              </div>
              <div>
                <button
                  onClick={() => setShowWatermarkModal(true)}
                  style={{
                    background: "none", border: "none", padding: 0, cursor: "pointer",
                    fontSize: 14, fontWeight: 700,
                    color: "rgba(255,255,255,0.85)",
                    textDecoration: "underline",
                    textDecorationColor: "rgba(168,85,247,0.6)",
                    textUnderlineOffset: 3,
                    letterSpacing: "0.02em",
                  }}
                >
                  Remove watermark →
                </button>
              </div>
            </div>
          )}

          <div style={{ marginTop: 10, textAlign: "center" }}>
            <Link href="/send">
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", cursor: "pointer" }}>
                Make another card
              </span>
            </Link>
          </div>
        </motion.div>
      )}

      {/* ── Share gate: sign in before copying / sharing ── */}
      <AnimatePresence>
        {showShareGate && (
          <motion.div
            key="share-gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "radial-gradient(ellipse at 50% 30%, #1a0030 0%, #080112 55%, #020008 100%)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "24px", fontFamily: "'Segoe UI', system-ui, sans-serif",
            }}
          >
            <div style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                style={{ fontSize: 60, marginBottom: 12 }}
              >
                💌
              </motion.div>

              <motion.h2
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.18 }}
                style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8, lineHeight: 1.3 }}
              >
                Sign in to share your card
              </motion.h2>

              <motion.p
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.26 }}
                style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginBottom: 28, lineHeight: 1.55 }}
              >
                Free &amp; takes 10 seconds. Your card is ready and waiting.
              </motion.p>

              <motion.button
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.34 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  const redirectUrl = (() => {
                    const u = new URL(window.location.href);
                    u.searchParams.set("direct_share", "1");
                    return u.toString();
                  })();
                  /* `redirectUrl` is a valid Clerk openSignIn option at runtime
                   * but absent from some Clerk TS definition versions.
                   * Cast via `unknown` to the narrower type we actually need. */
                  (clerk.openSignIn as (opts: { redirectUrl: string }) => void)({ redirectUrl });
                }}
                style={{
                  width: "100%", padding: "14px 20px", borderRadius: 14,
                  background: "linear-gradient(135deg, #FFD700, #FFA500)",
                  color: "#1a0a00", fontWeight: 800, fontSize: 15,
                  border: "none", cursor: "pointer",
                  boxShadow: "0 6px 28px rgba(255,165,0,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </motion.button>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={() => setShowShareGate(false)}
                style={{
                  marginTop: 16, background: "none", border: "none",
                  color: "rgba(255,255,255,0.3)", fontSize: 13, cursor: "pointer",
                }}
              >
                ← Go back to card
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Watermark paywall modal ── */}
      <AnimatePresence>
        {showWatermarkModal && (
          <WatermarkPaywallModal
            cardId={cardId}
            onClose={() => setShowWatermarkModal(false)}
            onSuccess={() => {
              setShowWatermarkModal(false);
              setWatermarkRemoved(true);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function SenderPanel(props: SenderPanelProps) {
  return (
    <ClerkAuthLayer>
      <SenderPanelInner {...props} />
    </ClerkAuthLayer>
  );
}
