/**
 * UnlockModal — animated paywall bottom-sheet.
 *
 * Phase 1 "preview"  — embedded iframe of the actual card (real animation) + "Pay ₹X & Share" CTA
 * Phase 2 "success"  — celebration animation, then onSuccess() + onClose()
 *
 * Payment is handled by Razorpay Standard Checkout (payWithRazorpay). The amount
 * is derived server-side from the occasion; on a verified payment the server
 * unlocks the card and the modal advances to the success phase.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trackEvent } from "@/lib/trackEvent";
import { getPriceConfigForOccasion } from "@/lib/priceArm";
import { payWithRazorpay, PaymentCancelled } from "@/lib/razorpay";

function getMetaCookies(): { fbp: string | null; fbc: string | null } {
  try {
    const cookieMap = Object.fromEntries(
      document.cookie.split(";").map((c) => {
        const eq = c.indexOf("=");
        return eq === -1 ? [c.trim(), ""] : [c.slice(0, eq).trim(), c.slice(eq + 1).trim()];
      }),
    );
    const fbp = cookieMap["_fbp"] ?? null;
    let fbc = cookieMap["_fbc"] ?? null;
    if (!fbc) {
      const fbclid = new URLSearchParams(window.location.search).get("fbclid");
      if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
    }
    return { fbp: fbp || null, fbc: fbc || null };
  } catch {
    return { fbp: null, fbc: null };
  }
}

type ModalPhase = "preview" | "success";

interface Props {
  cardId: string;
  recipientName: string;
  occasion: string;
  senderShareUrl: string;
  onClose: () => void;
  onSuccess: () => void;
  slowOpen?: boolean;
}

export default function UnlockModal({
  cardId,
  recipientName,
  occasion,
  senderShareUrl,
  onClose,
  onSuccess,
  slowOpen = false,
}: Props) {
  /** Occasion-based price (₹99 birthday/sorry · ₹49 others) + discount anchor. */
  const { price, anchor } = getPriceConfigForOccasion(occasion);
  const [phase, setPhase] = useState<ModalPhase>("preview");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  /* Build the autoplay URL: current card page, sender stripped, autoplay=1 and
     preview=1 added. preview=1 tells card.tsx this is an in-modal iframe so it
     skips the recipient payment gate entirely (no "card isn't ready yet" screen).
     autoplay=1 self-advances the animation through all phases and loops. */
  const autoplayUrl = (() => {
    try {
      const p = new URLSearchParams(window.location.search);
      p.delete("sender");
      p.set("autoplay", "1");
      p.set("preview", "1");
      return `${window.location.origin}${window.location.pathname}?${p.toString()}`;
    } catch {
      return senderShareUrl;
    }
  })();

  /* Lock body scroll while open */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* Auto-close after success animation */
  useEffect(() => {
    if (phase !== "success") return;
    const t = setTimeout(() => { onSuccess(); }, 1800);
    return () => clearTimeout(t);
  }, [phase, onSuccess]);

  async function startRazorpay() {
    if (payLoading) return;
    setPayError(null);
    setPayLoading(true);
    trackEvent({ event: "bundle_paywall_shown", occasion, card_id: cardId });
    trackEvent({ event: "pay_popup_cta_clicked", occasion, card_id: cardId });
    const eventId = `hs_${cardId}_${Date.now()}`;
    const { fbp, fbc } = getMetaCookies();
    try {
      await payWithRazorpay({ kind: "card", cardId, occasion, verifyExtras: { eventId, fbp, fbc } });
      trackEvent({ event: "card_paid", occasion, card_id: cardId, price });
      const w = window as Window & { fbq?: (...a: unknown[]) => void };
      if (typeof window !== "undefined" && w.fbq) {
        w.fbq("track", "Purchase", { value: price, currency: "INR" }, { eventID: eventId });
      }
      setPhase("success");
    } catch (err) {
      if (!(err instanceof PaymentCancelled)) {
        setPayError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      }
    } finally {
      setPayLoading(false);
    }
  }

  /* ── Card iframe preview dimensions ──
     Birthday cards are designed for 844 px tall viewports; other templates for 693 px.
     We always scale to a 220 px wide container, then compute the container height to match. */
  const IFRAME_W = 390;
  const IFRAME_H = occasion === "birthday" ? 760 : 693;
  const PREVIEW_W = 220;
  const PREVIEW_H = Math.round(IFRAME_H * (PREVIEW_W / IFRAME_W));
  const scale = PREVIEW_W / IFRAME_W;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10010,
        background: "rgba(0,0,0,0.88)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={slowOpen
          ? { type: "spring", stiffness: 192, damping: 28 }
          : { type: "spring", stiffness: 300, damping: 35 }}
        style={{
          width: "100%",
          maxWidth: 480,
          background:
            "radial-gradient(ellipse at 50% 0%, #1a003a 0%, #0a0014 55%, #04000c 100%)",
          border: "1px solid rgba(255,215,0,0.12)",
          borderBottom: "none",
          borderRadius: "28px 28px 0 0",
          paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))",
          overflow: "hidden",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 6px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.12)" }} />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 22px 10px" }}>
          <AnimatePresence mode="wait">

            {/* ── Preview phase ── */}
            {phase === "preview" && (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <div style={{ color: "#FFD700", fontWeight: 800, fontSize: 18 }}>
                        Unlock &amp; Share 💌
                      </div>
                      <span style={{
                        background: "rgba(255,80,50,0.18)", border: "1px solid rgba(255,80,50,0.45)",
                        color: "#ff7d5c", fontSize: 9, fontWeight: 800, padding: "2px 7px",
                        borderRadius: 99, letterSpacing: "0.05em", whiteSpace: "nowrap",
                      }}>⚡ Limited Time</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 0 }}>
                      <span style={{ color: "rgba(255,255,255,0.35)", textDecoration: "line-through", fontSize: 13, fontWeight: 500 }}>₹{anchor}</span>
                      <span style={{ color: "rgba(255,215,0,0.9)", fontSize: 14, fontWeight: 800 }}>₹{price}</span>
                      <span style={{ color: "rgba(255,215,0,0.6)", fontSize: 12, fontWeight: 600 }}>· Get Link. Send on WhatsApp Instantly</span>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    style={{
                      width: 32, height: 32, borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      cursor: "pointer", color: "rgba(255,255,255,0.5)",
                      fontSize: 16, display: "flex",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* ── Live card preview iframe ── */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                  <div
                    style={{
                      width: PREVIEW_W,
                      height: PREVIEW_H,
                      borderRadius: 18,
                      overflow: "hidden",
                      position: "relative",
                      border: "1.5px solid rgba(255,215,0,0.15)",
                      boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
                      flexShrink: 0,
                      background: "#050210",
                    }}
                  >
                    <iframe
                      src={autoplayUrl}
                      title={`Card preview for ${recipientName}`}
                      sandbox="allow-scripts allow-same-origin"
                      scrolling="no"
                      style={{
                        width: IFRAME_W,
                        height: IFRAME_H,
                        border: "none",
                        transformOrigin: "top left",
                        transform: `scale(${scale})`,
                        pointerEvents: "none",
                        display: "block",
                        background: "#050210",
                      }}
                    />
                    {/* Subtle gradient overlay at the bottom so the iframe blends in */}
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
                      background: "linear-gradient(to bottom, transparent, rgba(4,0,12,0.75))",
                      pointerEvents: "none",
                    }} />
                  </div>
                </div>

                <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.72)", marginBottom: 18, fontWeight: 600 }}>
                  This is what <span style={{ color: "#FFD700" }}>{recipientName}</span> will experience ✨
                </p>

                {/* Pay CTA */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={payLoading}
                  onClick={() => { void startRazorpay(); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    width: "100%", height: 56, borderRadius: 16,
                    background: "linear-gradient(135deg, #FFD700 0%, #FFAA00 100%)",
                    color: "#000", fontWeight: 800, fontSize: 17,
                    border: "none", cursor: payLoading ? "wait" : "pointer",
                    opacity: payLoading ? 0.7 : 1,
                    boxShadow: "0 6px 28px rgba(255,165,0,0.45)",
                    marginBottom: 10,
                  }}
                >
                  {payLoading ? (
                    "Opening payment…"
                  ) : (
                    <>
                      🔓{" "}
                      <span style={{ textDecoration: "line-through", opacity: 0.45, fontWeight: 500, fontSize: 14, marginRight: 2 }}>₹{anchor}</span>
                      {" "}Pay ₹{price} &amp; Share
                    </>
                  )}
                </motion.button>
                {payError && (
                  <p style={{ textAlign: "center", fontSize: 12, color: "#ff8a8a", marginBottom: 6 }}>{payError}</p>
                )}
              </motion.div>
            )}

            {/* ── Success phase ── */}
            {phase === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                style={{ textAlign: "center", padding: "48px 20px" }}
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -8, 8, 0], scale: [1, 1.18, 1] }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  style={{ fontSize: 72, marginBottom: 20 }}
                >
                  🎉
                </motion.div>
                <div style={{ color: "#FFD700", fontWeight: 800, fontSize: 22, marginBottom: 8 }}>
                  Card unlocked!
                </div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                  Share it with {recipientName} now ✨
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
