/**
 * UnlockModal — animated paywall bottom-sheet.
 *
 * Phase 1 "preview"  — embedded iframe of the actual card (real animation) + "Pay ₹49 & Share" CTA
 * Phase 2 "paying"   — fires UPI deep-link, 2.5 s waiting state, then UTR input slides in
 * Phase 3 "success"  — celebration animation, then onSuccess() + onClose()
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trackEvent } from "@/lib/trackEvent";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
const UPI_ID = "9706900714@pthdfc";
const UPI_PARAMS = `pa=${UPI_ID}&pn=Itisha&am=49&cu=INR&tn=HeartSyncWebsitePayment`;

const UPI_APPS = [
  { label: "PhonePe", emoji: "💜", scheme: `phonepe://pay?${UPI_PARAMS}` },
  { label: "GPay",    emoji: "🔵", scheme: `gpay://upi/pay?${UPI_PARAMS}` },
  { label: "Paytm",   emoji: "🔷", scheme: `paytm://pay?${UPI_PARAMS}` },
  { label: "BHIM",    emoji: "🟠", scheme: `bhim://pay?${UPI_PARAMS}` },
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
  const [idCopied, setIdCopied] = useState(false);

  const copyUpiId = useCallback(() => {
    navigator.clipboard.writeText(UPI_ID).then(() => {
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 2500);
    }).catch(() => {});
  }, []);

  const hasPhoto = (() => {
    try { return new URLSearchParams(window.location.search).has("personalpicture"); } catch { return false; }
  })();

  /* Build the autoplay URL: current card page, sender stripped, autoplay=1 added.
     This makes the iframe self-advance through envelope → opening → orbs → finale
     without any touch input needed. */
  const autoplayUrl = (() => {
    try {
      const p = new URLSearchParams(window.location.search);
      p.delete("sender");
      p.set("autoplay", "1");
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

  /* After tapping Pay: 2.5 s wait → show UTR input */
  useEffect(() => {
    if (phase !== "paying") return;
    const t = setTimeout(() => setUtrVisible(true), 2500);
    return () => clearTimeout(t);
  }, [phase]);

  /* Auto-close after success animation */
  useEffect(() => {
    if (phase !== "success") return;
    const t = setTimeout(() => { onSuccess(); }, 1800);
    return () => clearTimeout(t);
  }, [phase, onSuccess]);

  async function handleConfirm() {
    const trimmed = utr.trim();
    if (!isValidUtr(trimmed) || utrLoading) return;
    setUtrLoading(true);
    setUtrError(null);
    try {
      const res = await fetch(`${BASE}/api/cards/${cardId}/pay-unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utr: trimmed }),
      });
      const data = (await res.json()) as { message?: string };
      if (res.ok) {
        trackEvent({ event: "card_paid", occasion, card_id: cardId });
        setPhase("success");
      } else {
        setUtrError(data.message ?? "Verification failed. Please check your digits.");
      }
    } catch {
      setUtrError("Network error. Please try again.");
    } finally {
      setUtrLoading(false);
    }
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
          maxWidth: 440,
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
                    <div style={{ color: "#FFD700", fontWeight: 800, fontSize: 18 }}>
                      Unlock &amp; Share 💌
                    </div>
                    <div style={{ color: "rgba(255,215,0,0.75)", fontSize: 13, marginTop: 3, fontWeight: 600, letterSpacing: "0.01em" }}>
                      One-time ₹49 · yours forever ✨
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
                  🔓 Pay ₹49 &amp; Share the card
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
                    onClick={() => { setPhase("preview"); setUtrVisible(false); setUtr(""); setUtrError(null); }}
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
                      /* Choose UPI app */
                      <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                          Choose your UPI app
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 12, marginBottom: 18, lineHeight: 1.5 }}>
                          Pay ₹49 · come back &amp; enter last 4 digits
                        </div>

                        {/* App buttons */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                          {UPI_APPS.map((app) => (
                            <motion.a
                              key={app.label}
                              href={app.scheme}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => trackEvent({ event: "upi_app_tapped", occasion, card_id: cardId, app: app.label })}
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                height: 48, borderRadius: 14, textDecoration: "none",
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#fff", fontWeight: 700, fontSize: 14,
                              }}
                            >
                              <span style={{ fontSize: 20 }}>{app.emoji}</span>
                              {app.label}
                            </motion.a>
                          ))}
                        </div>

                        {/* Divider */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                          <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 11 }}>or pay to UPI ID</span>
                          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                        </div>

                        {/* UPI ID copy row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 14px" }}>
                          <div style={{ flex: 1, color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: 600, letterSpacing: "0.02em", wordBreak: "break-all" }}>
                            {UPI_ID}
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={copyUpiId}
                            style={{
                              flexShrink: 0, height: 34, paddingInline: 14, borderRadius: 8,
                              background: idCopied ? "rgba(34,197,94,0.18)" : "rgba(255,215,0,0.12)",
                              border: `1px solid ${idCopied ? "rgba(34,197,94,0.35)" : "rgba(255,215,0,0.2)"}`,
                              color: idCopied ? "#4ade80" : "#FFD700",
                              fontWeight: 700, fontSize: 12, cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            {idCopied ? "Copied ✓" : "Copy"}
                          </motion.button>
                        </div>
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
                            {utrLoading ? "Verifying…" : "Confirm & Unlock 🔓"}
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
