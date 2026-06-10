import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/trackEvent";
import { getPriceConfigForOccasion } from "@/lib/priceArm";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

const UPI_VPA = "9706900714@pthdfc";

/** Build the UPI deep link for a specific amount (₹49 or ₹99 by occasion). */
function buildUpiLink(amount: number) {
  return `upi://pay?pa=${UPI_VPA}&pn=Itisha&am=${amount}&cu=INR&tn=HeartSyncWebsitePayment`;
}

function qrUrl(deepLink: string, size = 240) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(deepLink)}`;
}

function isSequential(v: string): boolean {
  const d = v.trim().split("").map(Number);
  if (d.length !== 4) return false;
  if (d.every(x => x === d[0])) return true; // repeated: 0000, 1111
  if (d[1] === (d[0] + 1) % 10 && d[2] === (d[1] + 1) % 10 && d[3] === (d[2] + 1) % 10) return true; // ascending
  if (d[1] === (d[0] + 9) % 10 && d[2] === (d[1] + 9) % 10 && d[3] === (d[2] + 9) % 10) return true; // descending
  return false;
}

function isValidUtr(v: string) {
  const t = v.trim();
  return /^\d{4}$/.test(t) && !isSequential(t);
}

type Stage = "paying" | "utr" | "done-bundle" | "done-watermark";

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
  const upiDeepLink = buildUpiLink(price);
  const [stage, setStage] = useState<Stage>("paying");

  const [bundleUtr, setBundleUtr] = useState("");
  const [bundleUtrError, setBundleUtrError] = useState("");
  const [bundleLoading, setBundleLoading] = useState(false);

  const utrFiredRef = useRef(false);

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

  const handleBundleSubmit = useCallback(async () => {
    if (!isValidUtr(bundleUtr)) return;
    if (!cardId) { setBundleUtrError("No card ID — close and try again from the card page."); return; }
    trackEvent({ event: "confirm_unlock_clicked", occasion, card_id: cardId });
    setBundleUtrError("");
    setBundleLoading(true);
    const wmEventId = `hs_${cardId}_${Date.now()}`;
    try {
      const res = await fetch(`${BASE}/api/cards/${cardId}/pay-unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utr: bundleUtr.trim(), eventId: wmEventId }),
      });
      const data = await res.json() as { ok?: boolean; message?: string };
      if (!res.ok) {
        setBundleUtrError(data.message ?? "Submission failed. Please try again.");
        return;
      }
      trackEvent({ event: "paywall_paid", occasion, card_id: cardId, price });
      if (typeof window !== "undefined" && (window as Window & { fbq?: (...a: unknown[]) => void }).fbq) {
        (window as Window & { fbq?: (...a: unknown[]) => void }).fbq!("track", "Purchase", { value: price, currency: "INR" }, { eventID: wmEventId });
      }
      setStage("done-bundle");
    } catch {
      setBundleUtrError("Submission failed. Please try again.");
    } finally {
      setBundleLoading(false);
    }
  }, [bundleUtr, cardId]);

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
                onClick={stage === "utr" ? () => setStage("paying") : onClose}
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

                  {/* QR code */}
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
                      Scan with any UPI app
                    </p>
                    <a
                      href={upiDeepLink}
                      style={{
                        display: "inline-block",
                        background: "#fff", borderRadius: 16, padding: 10,
                        boxShadow: "0 4px 24px rgba(168,85,247,0.25)",
                      }}
                    >
                      <img
                        src={qrUrl(upiDeepLink, 200)}
                        alt={`UPI QR ₹${price}`}
                        style={{ width: 200, height: 200, borderRadius: 8, display: "block" }}
                      />
                    </a>
                    <p style={{ color: "rgba(255,255,255,0.22)", fontSize: 10, marginTop: 8 }}>
                      UPI of <span style={{ color: "rgba(255,255,255,0.45)" }}>Itisha</span> — Creator of HeartSync AI
                    </p>
                  </div>

                  {/* Pay Now CTA */}
                  <a
                    href={upiDeepLink}
                    onClick={() => { trackEvent({ event: "pay_now_clicked", occasion, card_id: cardId }); setTimeout(() => setStage("utr"), 600); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      width: "100%", height: 52, borderRadius: 14,
                      background: "linear-gradient(135deg, #FFD700, #FFA500)",
                      color: "#000", fontWeight: 800, fontSize: 16,
                      textDecoration: "none", boxShadow: "0 4px 20px rgba(255,165,0,0.4)",
                    }}
                  >
                    <span style={{ textDecoration: "line-through", opacity: 0.5, fontWeight: 500, fontSize: 13, marginRight: 2 }}>₹{anchor}</span>
                    {" "}Pay ₹{price} Now <ArrowRight style={{ width: 18, height: 18 }} />
                  </a>

                  <p style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 12 }}>
                    Opens your UPI app automatically
                  </p>
                </motion.div>
              )}

              {/* Step 2: Enter last 4 digits */}
              {stage === "utr" && (
                <motion.div key="utr"
                  initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>💸</div>
                    <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
                      Payment done? Almost there!
                    </h2>
                    <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.55 }}>
                      Enter the <span style={{ color: "rgba(255,215,0,0.85)", fontWeight: 700 }}>last 4 digits</span> of your payment reference number to confirm.
                    </p>
                  </div>

                  <div style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: 18, padding: "18px 16px",
                    display: "flex", flexDirection: "column", gap: 10,
                  }}>
                    <Input
                      placeholder="e.g. 4 2 8 7"
                      value={bundleUtr}
                      maxLength={4}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setBundleUtr(v);
                        setBundleUtrError(
                          v.length === 4 && isSequential(v)
                            ? "Don't use sequential (1234) or repeated (1111) codes — enter your actual last 4 digits."
                            : ""
                        );
                        if (v.length === 4 && !isSequential(v) && !utrFiredRef.current) {
                          utrFiredRef.current = true;
                          trackEvent({ event: "utr_entered", occasion, card_id: cardId });
                        }
                      }}
                      className="bg-white/5 border-white/10 h-14 text-xl rounded-xl placeholder:text-white/20 text-center text-white tracking-[0.35em] font-bold"
                    />

                    {bundleUtrError && (
                      <p style={{ color: "#f87171", fontSize: 12, textAlign: "center", margin: 0 }}>{bundleUtrError}</p>
                    )}

                    <button
                      onClick={handleBundleSubmit}
                      disabled={!isValidUtr(bundleUtr) || bundleLoading}
                      style={{
                        width: "100%", height: 48, borderRadius: 12,
                        background: "linear-gradient(135deg, #FFD700, #FFA500)",
                        color: "#000", fontWeight: 700, fontSize: 15, border: "none",
                        cursor: !isValidUtr(bundleUtr) || bundleLoading ? "default" : "pointer",
                        opacity: !isValidUtr(bundleUtr) || bundleLoading ? 0.5 : 1,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "opacity 0.2s",
                      }}
                    >
                      {bundleLoading
                        ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Confirming…</>
                        : <>Confirm & Unlock <ArrowRight style={{ width: 15, height: 15 }} /></>
                      }
                    </button>

                    <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 10, margin: 0 }}>
                      Find it in your UPI app under transaction details
                    </p>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </>
      </motion.div>
    </div>
  );
}
