import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useAuth, useClerk } from "@clerk/react";
import { useCardUsage } from "@/lib/usage";
import { trackEvent } from "@/lib/trackEvent";
import { envelope } from "@/lib/audio";
import WatermarkBadge from "@/components/WatermarkBadge";
import ClerkAuthLayer from "@/components/ClerkAuthLayer";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

type Phase = "envelope" | "opening" | "orbs" | "finale";

interface SenderPanelProps {
  senderShareUrl: string;
  recipientName: string;
  occasion: string;
  cardId: string;
  phase: Phase;
}

function SenderPanelInner({ senderShareUrl, recipientName, occasion, cardId, phase }: SenderPanelProps) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const clerk = useClerk();
  const { usage } = useCardUsage();
  const isPremiumUser = !!(usage?.is_superuser || (usage?.unlocked_templates?.length ?? 0) > 0);
  const [watermarkRemoved, setWatermarkRemoved] = useState(false);
  const [wmLoading, setWmLoading] = useState(false);
  const [wmError, setWmError] = useState<string | null>(null);
  const [waCopied, setWaCopied] = useState(false);
  const [igCopied, setIgCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  /* On mount: fetch the card's actual watermark status. */
  useEffect(() => {
    if (!cardId) return;
    fetch(`${BASE}/api/cards/${cardId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && data.is_watermarked === false) setWatermarkRemoved(true); })
      .catch(() => { /* ignore */ });
  }, [cardId]);

  /* Call the free-removal API — no payment needed, just auth. */
  const removeWatermarkFree = useCallback(async () => {
    if (!cardId) return;
    setWmLoading(true);
    setWmError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BASE}/api/cards/${cardId}/free-watermark-removal`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setWatermarkRemoved(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setWmError(data?.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setWmError("Network error. Please try again.");
    } finally {
      setWmLoading(false);
    }
  }, [cardId, getToken]);

  /* Auto-remove watermark for any signed-in user — no button tap needed.
     Fires as soon as Clerk confirms the session is loaded and active. */
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !cardId || watermarkRemoved) return;
    removeWatermarkFree();
  }, [isLoaded, isSignedIn, cardId, watermarkRemoved, removeWatermarkFree]);

  /* After Clerk redirects back with ?open_watermark=1, just clean the URL.
     Actual removal is handled by the auto-remove effect above. */
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("open_watermark") === "1") {
      p.delete("open_watermark");
      const clean = window.location.pathname + (p.toString() ? "?" + p.toString() : "");
      window.history.replaceState(null, "", clean);
    }
  }, [isLoaded, isSignedIn]);

  function handleRemoveWatermarkClick() {
    if (isLoaded && isSignedIn) {
      removeWatermarkFree();
      return;
    }
    const returnUrl = (() => {
      const u = new URL(window.location.href);
      u.searchParams.set("open_watermark", "1");
      return u.toString();
    })();
    (clerk.openSignIn as unknown as (opts: {
      forceRedirectUrl: string;
      afterSignUpUrl: string;
    }) => void)({ forceRedirectUrl: returnUrl, afterSignUpUrl: returnUrl });
  }

  function shareSenderWhatsApp() {
    envelope.copy();
    trackEvent({ event: "card_shared", channel: "whatsapp", occasion, template: "envelope" });
    setWaCopied(true);
    setTimeout(() => setWaCopied(false), 2500);
    const text = `💌 Hey ${recipientName}, I made you something special!\n\nYour surprise is waiting 👇\n${senderShareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  async function shareInstagram() {
    envelope.copy();
    trackEvent({ event: "card_shared", channel: "instagram", occasion, template: "envelope" });
    try {
      await navigator.clipboard.writeText(senderShareUrl);
      setIgCopied(true);
      setTimeout(() => setIgCopied(false), 2500);
    } catch { /* ignore */ }
    setTimeout(() => window.open("https://www.instagram.com", "_blank"), 300);
  }

  async function copySenderLink() {
    envelope.copy();
    trackEvent({ event: "card_shared", channel: "link", occasion, template: "envelope" });
    try {
      await navigator.clipboard.writeText(senderShareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch { /* ignore */ }
  }

  return (
    <>
      {/* Watermark badge — always visible to non-premium senders */}
      <WatermarkBadge
        id={cardId || undefined}
        showRemoveCta={false}
        prominent={false}
        hidden={isPremiumUser || watermarkRemoved}
      />

      {/* ── Sender share panel (finale only) ── */}
      {phase === "finale" && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.55 }}
          style={{
            position: "fixed",
            bottom: "max(96px, calc(env(safe-area-inset-bottom, 16px) + 76px))",
            left: 0,
            right: 0,
            width: "min(320px, calc(100vw - 32px))",
            marginLeft: "auto",
            marginRight: "auto",
            paddingBottom: 8,
            zIndex: 35,
          }}
        >
          <p style={{ fontSize: 12, color: "rgba(255,215,0,0.55)", textAlign: "center", marginBottom: 14, fontWeight: 600, letterSpacing: "0.04em" }}>
            ✨ Your card is ready — share it now!
          </p>

          {/* Icon share row */}
          <div style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "18px 20px 20px",
            backdropFilter: "blur(12px)",
          }}>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center", marginBottom: 18 }}>
              Share via
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 32 }}>

              {/* WhatsApp */}
              <motion.button
                whileTap={{ scale: 0.90 }}
                onClick={shareSenderWhatsApp}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 0 }}
              >
                <div style={{
                  width: 58, height: 58, borderRadius: "50%",
                  background: waCopied ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#25D366,#128C7E)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 20px rgba(37,211,102,0.4)",
                  transition: "background 0.25s",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <span style={{ fontSize: 11, color: waCopied ? "#4ade80" : "rgba(255,255,255,0.55)", fontWeight: 600, transition: "color 0.25s" }}>
                  {waCopied ? "Sent!" : "WhatsApp"}
                </span>
              </motion.button>

              {/* Instagram */}
              <motion.button
                whileTap={{ scale: 0.90 }}
                onClick={shareInstagram}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 0 }}
              >
                <div style={{
                  width: 58, height: 58, borderRadius: "50%",
                  background: igCopied ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 20px rgba(220,39,67,0.4)",
                  transition: "background 0.25s",
                }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <span style={{ fontSize: 11, color: igCopied ? "#4ade80" : "rgba(255,255,255,0.55)", fontWeight: 600, transition: "color 0.25s" }}>
                  {igCopied ? "Copied!" : "Instagram"}
                </span>
              </motion.button>

              {/* Copy Link */}
              <motion.button
                whileTap={{ scale: 0.90 }}
                onClick={copySenderLink}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 0 }}
              >
                <div style={{
                  width: 58, height: 58, borderRadius: "50%",
                  background: linkCopied ? "linear-gradient(135deg,#22c55e,#16a34a)" : "rgba(255,215,0,0.1)",
                  border: linkCopied ? "none" : "1.5px solid rgba(255,215,0,0.28)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: linkCopied ? "0 4px 20px rgba(34,197,94,0.35)" : "0 2px 12px rgba(255,215,0,0.08)",
                  transition: "background 0.25s, border 0.25s, box-shadow 0.25s",
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke={linkCopied ? "white" : "rgba(255,215,0,0.85)"}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                </div>
                <span style={{ fontSize: 11, color: linkCopied ? "#4ade80" : "rgba(255,215,0,0.65)", fontWeight: 600, transition: "color 0.25s" }}>
                  {linkCopied ? "Copied!" : "Copy Link"}
                </span>
              </motion.button>

            </div>
          </div>

          {/* Remove watermark CTA */}
          {!isPremiumUser && !watermarkRemoved && (
            <div style={{ marginTop: 14, textAlign: "center" }}>
              {wmError && (
                <p style={{ fontSize: 12, color: "#f87171", marginBottom: 6 }}>{wmError}</p>
              )}
              <button
                onClick={handleRemoveWatermarkClick}
                disabled={wmLoading}
                style={{
                  background: "none", border: "none", padding: 0,
                  cursor: wmLoading ? "default" : "pointer",
                  fontSize: 13, fontWeight: 700,
                  color: wmLoading ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.8)",
                  textDecoration: "underline",
                  textDecorationColor: "rgba(168,85,247,0.6)",
                  textUnderlineOffset: 3,
                  letterSpacing: "0.02em",
                }}
              >
                {wmLoading ? "Removing…" : "Remove watermark →"}
              </button>
            </div>
          )}

          {watermarkRemoved && (
            <div style={{ marginTop: 14, textAlign: "center", fontSize: 13, color: "#4ade80", fontWeight: 600 }}>
              ✓ Watermark removed!
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
