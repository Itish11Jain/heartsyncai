/**
 * UnlockModal — animated paywall bottom-sheet.
 *
 * Phase 1 "preview"  — embedded iframe of the actual card (real animation) + "Pay ₹49 & Share" CTA
 * Phase 2 "paying"   — fires UPI deep-link, 2.5 s waiting state, then UTR input slides in
 * Phase 3 "success"  — celebration animation, then onSuccess() + onClose()
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trackEvent } from "@/lib/trackEvent";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

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

const UPI_ID = "9706900714@pthdfc";
const UPI_PARAMS = `pa=${UPI_ID}&pn=Itisha&am=99&cu=INR&tn=HeartSyncWebsitePayment`;

const UPI_APPS = [
  { label: "PhonePe", emoji: "💜", scheme: `phonepe://pay?${UPI_PARAMS}` },
  { label: "GPay",    emoji: "🔵", scheme: `tez://upi/pay?${UPI_PARAMS}` },
  { label: "Paytm",   emoji: "🔷", scheme: `paytmmp://pay?${UPI_PARAMS}` },
  { label: "BHIM",    emoji: "🟠", scheme: `upi://pay?${UPI_PARAMS}` },
];

type ModalPhase = "preview" | "paying" | "success";

function isSequential(v: string): boolean {
  const d = v.trim().split("").map(Number);
  if (d.length !== 4) return false;
  if (d.every((x) => x === d[0])) return true;
  if (d[1] === (d[0]! + 1) % 10 && d[2] === (d[1]! + 1) % 10 && d[3] === (d[2]! + 1) % 10) return true;
  if (d[1] === (d[0]! + 9) % 10 && d[2] === (d[1]! + 9) % 10 && d[3] === (d[2]! + 9) % 10) return true;
  return false;
}
function isValidUtr(v: string) {
  return /^\d{4}$/.test(v.trim()) && !isSequential(v.trim());
}

interface Props {
  cardId: string;
  recipientName: string;
  occasion: string;
  senderShareUrl: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UnlockModal({
  cardId,
  recipientName,
  occasion,
  senderShareUrl,
  onClose,
  onSuccess,
}: Props) {
  const [phase, setPhase] = useState<ModalPhase>("preview");
  const [utrVisible, setUtrVisible] = useState(false);
  const [utr, setUtr] = useState("");
  const [utrLoading, setUtrLoading] = useState(false);
  const [utrError, setUtrError] = useState<string | null>(null);
  const [utrCountdown, setUtrCountdown] = useState<number | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const [idCopied, setIdCopied] = useState(false);
  const utrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearUtrTimer = useCallback(() => {
    if (utrTimerRef.current !== null) {
      clearTimeout(utrTimerRef.current);
      utrTimerRef.current = null;
    }
  }, []);

  // Clear timer on unmount
  useEffect(() => clearUtrTimer, [clearUtrTimer]);

  const copyUpiId = useCallback(() => {
    clearUtrTimer();
    navigator.clipboard.writeText(UPI_ID).catch(() => {});
    setIdCopied(true);
    trackEvent({ event: "upi_id_copied", occasion, card_id: cardId });
  }, [clearUtrTimer, occasion, cardId]);

  const hasPhoto = (() => {
    try { return new URLSearchParams(window.location.search).has("personalpicture"); } catch { return false; }
  })();

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

  async function handlePaymentDone() {
    if (autoLoading) return;
    trackEvent({ event: "payment_done_clicked", occasion, card_id: cardId });
    setAutoLoading(true);

    const TIMEOUT_S = 60;
    const POLL_MS   = 3000;
    const deadline  = Date.now() + TIMEOUT_S * 1000;

    setAutoCountdown(TIMEOUT_S);
    const ticker = setInterval(() => {
      setAutoCountdown(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    }, 1000);

    const cleanup = () => {
      clearInterval(ticker);
      setAutoLoading(false);
      setAutoCountdown(null);
    };

    const autoEventId = `hs_${cardId}_${Date.now()}`;
    const { fbp: autoFbp, fbc: autoFbc } = getMetaCookies();

    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${BASE}/api/cards/${cardId}/auto-unlock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: autoEventId, fbp: autoFbp, fbc: autoFbc }),
        });
        if (res.ok) {
          cleanup();
          trackEvent({ event: "card_paid", occasion, card_id: cardId });
          if (typeof window !== "undefined" && (window as Window & { fbq?: (...a: unknown[]) => void }).fbq) {
            (window as Window & { fbq?: (...a: unknown[]) => void }).fbq!("track", "Purchase", { value: 99.00, currency: "INR" }, { eventID: autoEventId });
          }
          setPhase("success");
          return;
        }
        if (res.status !== 402) {
          cleanup();
          setUtrVisible(true);
          return;
        }
      } catch {
        // network blip — keep polling
      }
      await new Promise<void>((r) => setTimeout(r, Math.min(POLL_MS, deadline - Date.now())));
    }

    cleanup();
    // Timeout — fall back to manual UTR entry
    setUtrVisible(true);
  }

  async function handleConfirm() {
    const trimmed = utr.trim();
    if (!isValidUtr(trimmed) || utrLoading) return;
    setUtrLoading(true);
    setUtrError(null);

    const TIMEOUT_S = 60;
    const POLL_MS   = 3000;
    const deadline  = Date.now() + TIMEOUT_S * 1000;

    // Live countdown ticker
    setUtrCountdown(TIMEOUT_S);
    const ticker = setInterval(() => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setUtrCountdown(remaining);
    }, 1000);

    const cleanup = () => {
      clearInterval(ticker);
      setUtrLoading(false);
      setUtrCountdown(null);
    };

    const utrEventId = `hs_${cardId}_${Date.now()}`;
    const { fbp: utrFbp, fbc: utrFbc } = getMetaCookies();

    // Poll until success or timeout
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${BASE}/api/cards/${cardId}/pay-unlock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ utr: trimmed, eventId: utrEventId, fbp: utrFbp, fbc: utrFbc }),
        });
        if (res.ok) {
          cleanup();
          trackEvent({ event: "card_paid", occasion, card_id: cardId });
          if (typeof window !== "undefined" && (window as Window & { fbq?: (...a: unknown[]) => void }).fbq) {
            (window as Window & { fbq?: (...a: unknown[]) => void }).fbq!("track", "Purchase", { value: 99.00, currency: "INR" }, { eventID: utrEventId });
          }
          setPhase("success");
          return;
        }
        // 402 = UTR not in DB yet (payment pending) — keep polling. Any other error = stop.
        if (res.status !== 402) {
          const data = (await res.json()) as { message?: string };
          cleanup();
          setUtrError(data.message ?? "Verification failed. Please check your digits.");
          return;
        }
      } catch {
        // Network blip — keep trying until deadline
      }
      // Wait before next poll (but don't overshoot the deadline)
      await new Promise<void>((r) => setTimeout(r, Math.min(POLL_MS, deadline - Date.now())));
    }

    cleanup();
    setUtrError("Payment not found yet. Please wait a moment and try again.");
  }

  /* ── Card iframe preview dimensions ──
     We render the card at 390×693 (standard phone viewport) then scale it down
     so it fits in a 220×380 container inside the modal. */
  const IFRAME_W = 390;
  const IFRAME_H = 693;
  const PREVIEW_W = 220;
  const PREVIEW_H = 380;
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
        transition={{ type: "spring", stiffness: 300, damping: 35 }}
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
                      <span style={{ color: "rgba(255,255,255,0.35)", textDecoration: "line-through", fontSize: 13, fontWeight: 500 }}>₹149</span>
                      <span style={{ color: "rgba(255,215,0,0.9)", fontSize: 14, fontWeight: 800 }}>₹99</span>
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
                  onClick={() => {
                    trackEvent({ event: "bundle_paywall_shown", occasion, card_id: cardId });
                    trackEvent({ event: "pay_popup_cta_clicked", occasion, card_id: cardId });
                    setPhase("paying");
                  }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    width: "100%", height: 56, borderRadius: 16,
                    background: "linear-gradient(135deg, #FFD700 0%, #FFAA00 100%)",
                    color: "#000", fontWeight: 800, fontSize: 17,
                    border: "none", cursor: "pointer",
                    boxShadow: "0 6px 28px rgba(255,165,0,0.45)",
                    marginBottom: 10,
                  }}
                >
                  🔓{" "}
                  <span style={{ textDecoration: "line-through", opacity: 0.45, fontWeight: 500, fontSize: 14, marginRight: 2 }}>₹149</span>
                  {" "}Pay ₹99 &amp; Share
                </motion.button>
              </motion.div>
            )}

            {/* ── Paying phase ── */}
            {phase === "paying" && (
              <motion.div
                key="paying"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {/* Back header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                  <button
                    onClick={() => { clearUtrTimer(); if (utrVisible) { setUtrVisible(false); setUtr(""); setUtrError(null); } else { setPhase("preview"); setIdCopied(false); } }}
                    style={{
                      width: 32, height: 32, borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)", cursor: "pointer",
                      color: "rgba(255,255,255,0.6)", fontSize: 16,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    ←
                  </button>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Complete payment</div>
                </div>

                {/* Status card */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 20, padding: "32px 20px 28px",
                    textAlign: "center", marginBottom: 16,
                  }}
                >
                  <AnimatePresence mode="wait">
                    {!utrVisible ? (
                      /* UPI ID copy — only step before UTR entry */
                      <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div style={{ fontSize: 36, marginBottom: 10 }}>📲</div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 17, marginBottom: 6 }}>
                          Pay{" "}
                          <span style={{ color: "rgba(255,255,255,0.35)", textDecoration: "line-through", fontSize: 15, fontWeight: 500 }}>₹149</span>
                          {" "}
                          <span style={{ color: "#FFD700", fontSize: 21, fontWeight: 900 }}>₹99</span>
                          {" "}via any UPI App
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginBottom: 22, lineHeight: 1.6 }}>
                          Open PhonePe / GPay / Paytm → Send to this UPI ID
                        </div>

                        {/* UPI ID copy box */}
                        <div style={{
                          background: "rgba(255,215,0,0.05)",
                          border: "1.5px solid rgba(255,215,0,0.18)",
                          borderRadius: 16, padding: "18px 22px 14px",
                          marginBottom: 10,
                          marginInline: -8,
                        }}>
                          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                            UPI ID
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ flex: 1, color: "#fff", fontSize: 16, fontWeight: 700, letterSpacing: "0.03em", wordBreak: "break-all" }}>
                              {UPI_ID}
                            </div>
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              onClick={copyUpiId}
                              style={{
                                flexShrink: 0, height: 38, paddingInline: 12, borderRadius: 10,
                                background: idCopied ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg,#FFD700,#FFA500)",
                                border: "none",
                                color: idCopied ? "#4ade80" : "#000",
                                fontWeight: 800, fontSize: 13, cursor: "pointer",
                                transition: "all 0.25s",
                              }}
                            >
                              {idCopied ? "Copied ✓" : "Copy"}
                            </motion.button>
                          </div>

                          {/* Trust line */}
                          <div style={{
                            marginTop: 12, paddingTop: 10,
                            borderTop: "1px solid rgba(255,255,255,0.07)",
                            display: "flex", alignItems: "center", gap: 6,
                          }}>
                            <span style={{ fontSize: 14 }}>🔐</span>
                            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, lineHeight: 1.5 }}>
                              This belongs to <span style={{ color: "rgba(255,215,0,0.85)", fontWeight: 700 }}>Saurabh</span> — Creator of HeartSync AI
                            </span>
                          </div>
                        </div>

                        {/* Subtext above CTA — only shown once UPI is copied */}
                        {idCopied && (
                          <p style={{ fontSize: 11, color: "#FFD700", textAlign: "center", margin: "6px 0 2px", whiteSpace: "nowrap", fontWeight: 600 }}>
                            {autoLoading
                              ? "Please pay Rs. 99 now if you have not paid yet."
                              : "Only click this if you have made the payment successfully"}
                          </p>
                        )}

                        {/* Payment Done CTA — disabled until UPI ID is copied */}
                        <motion.button
                          whileTap={autoLoading || !idCopied ? {} : { scale: 0.97 }}
                          onClick={() => { if (idCopied && !autoLoading) void handlePaymentDone(); }}
                          disabled={autoLoading || !idCopied}
                          style={{
                            width: "100%", height: 54, borderRadius: 16, marginTop: idCopied ? 6 : 18,
                            background: autoLoading
                              ? "rgba(255,215,0,0.15)"
                              : idCopied
                                ? "linear-gradient(135deg, #FFD700 0%, #FFAA00 100%)"
                                : "rgba(255,255,255,0.06)",
                            color: autoLoading
                              ? "rgba(255,215,0,0.7)"
                              : idCopied ? "#000" : "rgba(255,255,255,0.2)",
                            fontWeight: 800, fontSize: 16,
                            border: idCopied && !autoLoading ? "none" : "1px solid rgba(255,255,255,0.08)",
                            cursor: idCopied && !autoLoading ? "pointer" : "default",
                            boxShadow: idCopied && !autoLoading ? "0 6px 24px rgba(255,165,0,0.35)" : "none",
                            transition: "all 0.3s",
                          }}
                        >
                          {autoLoading
                            ? `Checking payment… ${autoCountdown !== null ? `(${autoCountdown}s)` : ""}`
                            : "I've Paid ₹99 →"}
                        </motion.button>

                      </motion.div>
                    ) : (
                      /* UTR entry */
                      <motion.div key="utr" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                        <div style={{ fontSize: 38, marginBottom: 12 }}>💸</div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 17, marginBottom: 6 }}>
                          Payment done?
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.42)", fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>
                          Enter the{" "}
                          <span style={{ color: "rgba(255,215,0,0.85)", fontWeight: 700 }}>last 4 digits</span>{" "}
                          of your<br />UPI transaction reference
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 240, margin: "0 auto" }}>
                          <input
                            autoFocus
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="e.g. 9619"
                            value={utr}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                              setUtr(v);
                              setUtrError(null);
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") void handleConfirm(); }}
                            style={{
                              width: "100%", height: 56, borderRadius: 14,
                              border: `1.5px solid ${utrError ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.14)"}`,
                              background: "rgba(255,255,255,0.07)", color: "#fff",
                              fontSize: 28, fontWeight: 700, textAlign: "center",
                              letterSpacing: "0.3em", outline: "none", padding: "0 12px",
                              boxSizing: "border-box",
                              transition: "border-color 0.2s",
                            }}
                          />
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => void handleConfirm()}
                            disabled={!isValidUtr(utr) || utrLoading}
                            style={{
                              width: "100%", height: 50, borderRadius: 14,
                              background: isValidUtr(utr) && !utrLoading
                                ? "linear-gradient(135deg, #FFD700, #FFA500)"
                                : "rgba(255,255,255,0.07)",
                              color: isValidUtr(utr) && !utrLoading ? "#000" : "rgba(255,255,255,0.2)",
                              fontWeight: 800, fontSize: 15, border: "none",
                              cursor: isValidUtr(utr) && !utrLoading ? "pointer" : "default",
                              transition: "background 0.2s, color 0.2s",
                            }}
                          >
                            {utrLoading
                              ? `Checking payment… ${utrCountdown !== null ? `(${utrCountdown}s)` : ""}`
                              : "Confirm & Unlock 🔓"}
                          </motion.button>
                        </div>

                        <AnimatePresence>
                          {utrError && (
                            <motion.p
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              style={{ marginTop: 12, fontSize: 12, color: "#f87171", textAlign: "center" }}
                            >
                              {utrError}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
