/**
 * UnlockModal — animated paywall bottom-sheet.
 *
 * Phase 1 "preview"  — auto-cycling card-journey preview + "Pay ₹49 & Share" CTA
 * Phase 2 "paying"   — fires UPI deep-link, 2.5 s waiting state, then UTR input slides in
 * Phase 3 "success"  — celebration animation, then onSuccess() + onClose()
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TemplatePreview } from "@/components/template-preview";
import { trackEvent } from "@/lib/trackEvent";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
const UPI_DEEP_LINK =
  "upi://pay?pa=9706900714@pthdfc&pn=Itisha&am=49&cu=INR&tn=HeartSyncWebsitePayment";

type ModalPhase = "preview" | "paying" | "success";
type TemplateId = "envelope" | "cosmic" | "crystal" | "vinyl";

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

function readUrlParams() {
  const p = new URLSearchParams(window.location.search);
  const templateId = (p.get("t") ?? "envelope") as TemplateId;
  const hasPhoto = p.has("personalpicture");
  const rawMsg = p.get("msg");
  let message = "";
  if (rawMsg) {
    try {
      message = decodeURIComponent(escape(atob(rawMsg)));
    } catch {
      message = "";
    }
  }
  return { templateId, hasPhoto, message };
}

interface Props {
  cardId: string;
  recipientName: string;
  occasion: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UnlockModal({ cardId, recipientName, occasion, onClose, onSuccess }: Props) {
  const [phase, setPhase] = useState<ModalPhase>("preview");
  const [previewStep, setPreviewStep] = useState(0);
  const [utrVisible, setUtrVisible] = useState(false);
  const [utr, setUtr] = useState("");
  const [utrLoading, setUtrLoading] = useState(false);
  const [utrError, setUtrError] = useState<string | null>(null);

  const { templateId, hasPhoto, message } = readUrlParams();

  const STEPS = [
    {
      icon: templateId === "envelope" ? "💌" : templateId === "cosmic" ? "✨" : templateId === "crystal" ? "🔮" : "🎵",
      label: "Your card is ready",
      desc: `You made something special for ${recipientName}`,
    },
    {
      icon: "📬",
      label: "They tap to open it",
      desc: "The envelope opens into a magical reveal animation",
    },
    {
      icon: hasPhoto ? "📸" : "🌟",
      label: "Surprise moments unfold",
      desc: `Personalised just for ${recipientName}${hasPhoto ? " — with their photo" : " — with special moments"}`,
    },
    {
      icon: "💝",
      label: "The final card appears",
      desc: message
        ? `"${message.length > 70 ? message.slice(0, 70) + "…" : message}"`
        : "Your heartfelt message, beautifully presented",
    },
  ];

  const step = STEPS[previewStep]!;

  /* Lock body scroll while open */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /* Auto-advance preview steps every 2.5 s */
  useEffect(() => {
    if (phase !== "preview") return;
    const t = setInterval(() => setPreviewStep((s) => (s + 1) % 4), 2500);
    return () => clearInterval(t);
  }, [phase]);

  /* After tapping Pay: 2.5 s wait → show UTR input */
  useEffect(() => {
    if (phase !== "paying") return;
    const t = setTimeout(() => setUtrVisible(true), 2500);
    return () => clearTimeout(t);
  }, [phase]);

  /* Auto-close after success animation */
  useEffect(() => {
    if (phase !== "success") return;
    const t = setTimeout(() => {
      onSuccess();
      onClose();
    }, 1800);
    return () => clearTimeout(t);
  }, [phase, onSuccess, onClose]);

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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
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
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 99,
              background: "rgba(255,255,255,0.12)",
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 22px 10px" }}>
          <AnimatePresence mode="wait">
            {/* ── Preview ── */}
            {phase === "preview" && (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <div style={{ color: "#FFD700", fontWeight: 800, fontSize: 18 }}>
                      Unlock &amp; Share 💌
                    </div>
                    <div
                      style={{ color: "rgba(255,255,255,0.32)", fontSize: 12, marginTop: 2 }}
                    >
                      One-time ₹49 · yours forever
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Animated card journey preview */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,215,0,0.07)",
                    borderRadius: 20,
                    padding: "28px 20px 24px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    marginBottom: 14,
                    minHeight: 280,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Ambient glow */}
                  <div
                    style={{
                      position: "absolute",
                      top: "15%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 220,
                      height: 220,
                      borderRadius: "50%",
                      background:
                        "radial-gradient(circle, rgba(255,215,0,0.055) 0%, transparent 70%)",
                      pointerEvents: "none",
                    }}
                  />

                  {/* Template preview pulses in on each step */}
                  <motion.div
                    key={`tpl-${previewStep}`}
                    initial={{ scale: 0.82, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                    style={{ marginBottom: 22 }}
                  >
                    <TemplatePreview id={templateId} size={150} />
                  </motion.div>

                  {/* Progress dots */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                    {STEPS.map((_, i) => (
                      <div
                        key={i}
                        style={{
                          height: 3,
                          borderRadius: 99,
                          width: i === previewStep ? 22 : 8,
                          background:
                            i === previewStep
                              ? "#FFD700"
                              : "rgba(255,255,255,0.14)",
                          transition: "all 0.4s ease",
                        }}
                      />
                    ))}
                  </div>

                  {/* Step text */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={previewStep}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                      style={{ textAlign: "center" }}
                    >
                      <div
                        style={{
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 16,
                          marginBottom: 7,
                        }}
                      >
                        {step.icon} {step.label}
                      </div>
                      <div
                        style={{
                          color: "rgba(255,255,255,0.42)",
                          fontSize: 13,
                          lineHeight: 1.6,
                          maxWidth: 260,
                          fontStyle: previewStep === 3 && message ? "italic" : "normal",
                        }}
                      >
                        {step.desc}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Benefits pills */}
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    marginBottom: 4,
                  }}
                >
                  {[
                    "🚫 No watermark",
                    hasPhoto ? "📸 Photo included" : "✨ All templates",
                    "🔒 Unlock forever",
                  ].map((b) => (
                    <div
                      key={b}
                      style={{
                        background: "rgba(255,215,0,0.055)",
                        border: "1px solid rgba(255,215,0,0.12)",
                        borderRadius: 20,
                        padding: "5px 12px",
                        color: "rgba(255,255,255,0.62)",
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {b}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Paying ── */}
            {phase === "paying" && (
              <motion.div
                key="paying"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {/* Back header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 22,
                  }}
                >
                  <button
                    onClick={() => { setPhase("preview"); setUtrVisible(false); setUtr(""); setUtrError(null); }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ←
                  </button>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>
                    Complete payment
                  </div>
                </div>

                {/* Status card */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 20,
                    padding: "32px 20px 28px",
                    textAlign: "center",
                    marginBottom: 16,
                  }}
                >
                  <AnimatePresence mode="wait">
                    {!utrVisible ? (
                      /* Waiting for payment */
                      <motion.div
                        key="waiting"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{
                            duration: 1.6,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          style={{ fontSize: 52, marginBottom: 16 }}
                        >
                          📱
                        </motion.div>
                        <div
                          style={{
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 17,
                            marginBottom: 8,
                          }}
                        >
                          Opening UPI app…
                        </div>
                        <div
                          style={{
                            color: "rgba(255,255,255,0.38)",
                            fontSize: 13,
                            lineHeight: 1.6,
                          }}
                        >
                          Complete the ₹49 payment,
                          <br />
                          then come back here
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 6,
                            marginTop: 22,
                          }}
                        >
                          {[0, 0.22, 0.44].map((delay, i) => (
                            <motion.div
                              key={i}
                              animate={{ opacity: [0.2, 1, 0.2] }}
                              transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                delay,
                              }}
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: "#FFD700",
                              }}
                            />
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      /* UTR entry */
                      <motion.div
                        key="utr"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <div
                          style={{ fontSize: 38, marginBottom: 12 }}
                        >
                          💸
                        </div>
                        <div
                          style={{
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 17,
                            marginBottom: 6,
                          }}
                        >
                          Payment done?
                        </div>
                        <div
                          style={{
                            color: "rgba(255,255,255,0.42)",
                            fontSize: 13,
                            marginBottom: 22,
                            lineHeight: 1.6,
                          }}
                        >
                          Enter the{" "}
                          <span
                            style={{
                              color: "rgba(255,215,0,0.85)",
                              fontWeight: 700,
                            }}
                          >
                            last 4 digits
                          </span>{" "}
                          of your
                          <br />
                          UPI transaction reference
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            maxWidth: 270,
                            margin: "0 auto",
                          }}
                        >
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
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void handleConfirm();
                            }}
                            style={{
                              flex: 1,
                              height: 50,
                              borderRadius: 12,
                              border: `1.5px solid ${utrError ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.14)"}`,
                              background: "rgba(255,255,255,0.07)",
                              color: "#fff",
                              fontSize: 24,
                              fontWeight: 700,
                              textAlign: "center",
                              letterSpacing: "0.25em",
                              outline: "none",
                              padding: "0 8px",
                              transition: "border-color 0.2s",
                            }}
                          />
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => void handleConfirm()}
                            disabled={!isValidUtr(utr) || utrLoading}
                            style={{
                              height: 50,
                              paddingInline: 18,
                              borderRadius: 12,
                              background:
                                isValidUtr(utr) && !utrLoading
                                  ? "linear-gradient(135deg, #FFD700, #FFA500)"
                                  : "rgba(255,255,255,0.07)",
                              color:
                                isValidUtr(utr) && !utrLoading
                                  ? "#000"
                                  : "rgba(255,255,255,0.2)",
                              fontWeight: 700,
                              fontSize: 14,
                              border: "none",
                              cursor:
                                isValidUtr(utr) && !utrLoading
                                  ? "pointer"
                                  : "default",
                              transition: "background 0.2s, color 0.2s",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {utrLoading ? "…" : "Confirm"}
                          </motion.button>
                        </div>

                        <AnimatePresence>
                          {utrError && (
                            <motion.p
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              style={{
                                marginTop: 10,
                                fontSize: 12,
                                color: "#f87171",
                                textAlign: "center",
                              }}
                            >
                              {utrError}
                            </motion.p>
                          )}
                        </AnimatePresence>

                        <p
                          style={{
                            marginTop: 12,
                            fontSize: 11,
                            color: "rgba(255,255,255,0.18)",
                            textAlign: "center",
                          }}
                        >
                          Find it in your UPI app under transaction details
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* ── Success ── */}
            {phase === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: "center", paddingTop: 28, paddingBottom: 28 }}
              >
                <motion.div
                  animate={{ scale: [0.7, 1.25, 1], rotate: [0, -12, 12, 0] }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  style={{ fontSize: 68, marginBottom: 18, display: "inline-block" }}
                >
                  🎉
                </motion.div>
                <h2
                  style={{
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 26,
                    marginBottom: 10,
                  }}
                >
                  Card unlocked!
                </h2>
                <p
                  style={{
                    color: "rgba(255,255,255,0.48)",
                    fontSize: 15,
                    lineHeight: 1.6,
                  }}
                >
                  Share it with {recipientName} right now ✨
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 14,
                    marginTop: 28,
                  }}
                >
                  {[0, 0.18, 0.36].map((delay, i) => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -8, 0] }}
                      transition={{
                        duration: 1.3,
                        repeat: Infinity,
                        delay,
                      }}
                      style={{ fontSize: 20, color: "#FFD700" }}
                    >
                      ✦
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Pay CTA (preview phase only) ── */}
        <AnimatePresence>
          {phase === "preview" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              style={{ padding: "4px 22px 0" }}
            >
              <motion.a
                href={UPI_DEEP_LINK}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  trackEvent({
                    event: "bundle_paywall_shown",
                    occasion,
                    card_id: cardId,
                  });
                  setPhase("paying");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                  height: 56,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #FFD700 0%, #FFAA00 100%)",
                  color: "#000",
                  fontWeight: 800,
                  fontSize: 17,
                  textDecoration: "none",
                  boxShadow: "0 6px 28px rgba(255,165,0,0.45)",
                }}
              >
                🔓 Pay ₹49 &amp; Share the card
              </motion.a>
              <button
                onClick={onClose}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "center",
                  marginTop: 12,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.2)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 0",
                }}
              >
                Maybe later
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
