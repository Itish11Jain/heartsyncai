import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
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

type Stage = "paying" | "done-bundle" | "done-watermark";

interface Props {
  cardId: string;
  occasion: string;
  onClose: () => void;
  onSuccess: () => void;
  mode?: "photo" | "watermark";
}

export default function WatermarkPaywallModal({ cardId, occasion, onClose, onSuccess, mode = "watermark" }: Props) {
  /** Occasion-based price (₹99 birthday/sorry · ₹49 others) + discount anchor. */
  const { price, anchor } = getPriceConfigForOccasion(occasion);
  const [stage, setStage] = useState<Stage>("paying");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    if (stage !== "done-bundle" && stage !== "done-watermark") return;
    const t = setTimeout(() => onSuccess(), 2000);
    return () => clearTimeout(t);
  }, [stage, onSuccess]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handlePay = useCallback(async () => {
    if (payLoading) return;
    if (!cardId) { setPayError("No card ID — close and try again from the card page."); return; }
    setPayError("");
    setPayLoading(true);
    trackEvent({ event: "pay_now_clicked", occasion, card_id: cardId });
    const eventId = `hs_${cardId}_${Date.now()}`;
    const { fbp, fbc } = getMetaCookies();
    try {
      await payWithRazorpay({ kind: "card", cardId, occasion, verifyExtras: { eventId, fbp, fbc } });
      trackEvent({ event: "paywall_paid", occasion, card_id: cardId, price });
      const w = window as Window & { fbq?: (...a: unknown[]) => void };
      if (typeof window !== "undefined" && w.fbq) {
        w.fbq("track", "Purchase", { value: price, currency: "INR" }, { eventID: eventId });
      }
      setStage("done-bundle");
    } catch (err) {
      if (!(err instanceof PaymentCancelled)) {
        setPayError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      }
    } finally {
      setPayLoading(false);
    }
  }, [payLoading, cardId, occasion, price]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.72)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        overflowY: "auto",
        padding: "0 16px 40px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        style={{
          width: "100%", maxWidth: 400, marginTop: 48,
          background: "radial-gradient(ellipse at 50% 0%, #2a0050 0%, #0e0018 60%, #04000c 100%)",
          border: "1px solid rgba(168,85,247,0.25)",
          borderRadius: 24,
          padding: "24px 20px 28px",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}
      >
        <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <button
                onClick={onClose}
                style={{
                  width: 34, height: 34, borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "rgba(255,255,255,0.6)", fontSize: 18, flexShrink: 0,
                }}
              >←</button>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>
                    {mode === "photo" ? "Share with the photo included" : "Unlock & share your card"}
                  </div>
                  <span style={{
                    background: "rgba(255,80,50,0.18)", border: "1px solid rgba(255,80,50,0.45)",
                    color: "#ff7d5c", fontSize: 9, fontWeight: 800, padding: "2px 7px",
                    borderRadius: 99, letterSpacing: "0.05em", whiteSpace: "nowrap", flexShrink: 0,
                  }}>⚡ Limited Time</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                  <span style={{ color: "rgba(255,255,255,0.35)", textDecoration: "line-through", fontSize: 11, fontWeight: 500 }}>₹{anchor}</span>
                  <span style={{ color: "rgba(255,215,0,0.85)", fontSize: 11, fontWeight: 700 }}>₹{price}</span>
                  <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>· instant unlock</span>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">

              {/* Done: bundle */}
              {stage === "done-bundle" && (
                <motion.div key="done-bundle"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ textAlign: "center", paddingTop: 24 }}
                >
                  <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
                  <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 22, marginBottom: 8 }}>You're all set!</h2>
                  <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.55 }}>
                    Watermark removed & premium templates unlocked. Taking you back to your card…
                  </p>
                </motion.div>
              )}

              {/* Done: watermark only */}
              {stage === "done-watermark" && (
                <motion.div key="done-watermark"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ textAlign: "center", paddingTop: 24 }}
                >
                  <div style={{ fontSize: 56, marginBottom: 12 }}>✨</div>
                  <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Watermark removed!</h2>
                  <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.55 }}>
                    Your card will open clean. Taking you back…
                  </p>
                </motion.div>
              )}

              {/* Step 1: Pay */}
              {stage === "paying" && (
                <motion.div key="paying"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                >
                  {/* Benefits strip */}
                  <div style={{
                    display: "flex", flexWrap: "wrap", gap: "6px 10px",
                    marginBottom: 20, padding: "10px 14px",
                    background: "rgba(168,85,247,0.08)",
                    border: "1px solid rgba(168,85,247,0.2)",
                    borderRadius: 12,
                  }}>
                    {(mode === "photo"
                      ? ["📸 Photo in card", "🚫 No watermark", "✨ All templates"]
                      : ["🚫 No watermark", "✨ All templates", "📸 Photo in card"]
                    ).map((item) => (
                      <span key={item} style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", whiteSpace: "nowrap" }}>
                        {item}
                      </span>
                    ))}
                    <span style={{ width: "100%", fontSize: 11, color: "rgba(255,215,0,0.65)", fontWeight: 700, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                      All for{" "}
                      <span style={{ color: "rgba(255,255,255,0.3)", textDecoration: "line-through", fontWeight: 400 }}>₹{anchor}</span>
                      {" "}₹{price} — pay once, yours forever
                    </span>
                  </div>

                  {/* Trust line */}
                  <p style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
                    Secure payment via UPI, cards, netbanking & wallets — powered by Razorpay.
                  </p>

                  {/* Pay Now CTA */}
                  <button
                    onClick={() => { void handlePay(); }}
                    disabled={payLoading}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      width: "100%", height: 52, borderRadius: 14,
                      background: "linear-gradient(135deg, #FFD700, #FFA500)",
                      color: "#000", fontWeight: 800, fontSize: 16,
                      border: "none", cursor: payLoading ? "wait" : "pointer",
                      opacity: payLoading ? 0.7 : 1,
                      boxShadow: "0 4px 20px rgba(255,165,0,0.4)",
                    }}
                  >
                    {payLoading ? (
                      <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Opening payment…</>
                    ) : (
                      <>
                        <span style={{ textDecoration: "line-through", opacity: 0.5, fontWeight: 500, fontSize: 13, marginRight: 2 }}>₹{anchor}</span>
                        {" "}Pay ₹{price} Now <ArrowRight style={{ width: 18, height: 18 }} />
                      </>
                    )}
                  </button>

                  {payError && (
                    <p style={{ textAlign: "center", color: "#f87171", fontSize: 12, marginTop: 12 }}>{payError}</p>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </>
      </motion.div>
    </div>
  );
}
