/**
 * /bundle — Bundle purchase page.
 * Pay ₹49 → get 2 card unlocks → secret dashboard at /my-cards/:token
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { trackEvent } from "@/lib/trackEvent";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

const UPI_ID = "9706900714@pthdfc";
const UPI_PARAMS = `pa=${UPI_ID}&pn=Itisha&am=49&cu=INR&tn=HeartSyncBundlePayment`;

const UPI_APPS = [
  { label: "PhonePe", emoji: "💜", scheme: `phonepe://pay?${UPI_PARAMS}` },
  { label: "GPay",    emoji: "🔵", scheme: `tez://upi/pay?${UPI_PARAMS}` },
  { label: "Paytm",   emoji: "🔷", scheme: `paytmmp://pay?${UPI_PARAMS}` },
  { label: "BHIM",    emoji: "🟠", scheme: `upi://pay?${UPI_PARAMS}` },
];

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

type Phase = "info" | "paying" | "success";

export default function BundlePage() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("info");
  const [upiCopied, setUpiCopied] = useState(false);
  const [utrVisible, setUtrVisible] = useState(false);
  const [utr, setUtr] = useState("");
  const [utrLoading, setUtrLoading] = useState(false);
  const [utrError, setUtrError] = useState<string | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const [utrCountdown, setUtrCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { __clearHsSplash?: () => void }).__clearHsSplash?.();
    }
  }, []);

  const copyUpiId = useCallback(() => {
    navigator.clipboard.writeText(UPI_ID).catch(() => {});
    setUpiCopied(true);
    trackEvent({ event: "bundle_upi_copied" });
  }, []);

  async function handlePaymentDone() {
    if (autoLoading) return;
    trackEvent({ event: "bundle_payment_done_clicked" });
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

    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${BASE}/api/bundles/create`, { method: "POST" });
        if (res.ok) {
          const data = await res.json() as { token: string };
          cleanup();
          try { localStorage.setItem("hs_bundle_token", data.token); } catch { /* ignore */ }
          trackEvent({ event: "bundle_created" });
          setPhase("success");
          setTimeout(() => { navigate(`/my-cards/${data.token}`); }, 1800);
          return;
        }
        if (res.status !== 402) {
          cleanup();
          setUtrVisible(true);
          return;
        }
      } catch { /* network blip */ }
      await new Promise<void>((r) => setTimeout(r, Math.min(POLL_MS, deadline - Date.now())));
    }

    cleanup();
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

    setUtrCountdown(TIMEOUT_S);
    const ticker = setInterval(() => {
      setUtrCountdown(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    }, 1000);

    const cleanup = () => {
      clearInterval(ticker);
      setUtrLoading(false);
      setUtrCountdown(null);
    };

    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${BASE}/api/bundles/create`, { method: "POST" });
        if (res.ok) {
          const data = await res.json() as { token: string };
          cleanup();
          try { localStorage.setItem("hs_bundle_token", data.token); } catch { /* ignore */ }
          trackEvent({ event: "bundle_created_utr" });
          setPhase("success");
          setTimeout(() => { navigate(`/my-cards/${data.token}`); }, 1800);
          return;
        }
        if (res.status !== 402) {
          const d = await res.json() as { message?: string };
          cleanup();
          setUtrError(d.message ?? "Verification failed. Please check your digits.");
          return;
        }
      } catch { /* blip */ }
      await new Promise<void>((r) => setTimeout(r, Math.min(POLL_MS, deadline - Date.now())));
    }

    cleanup();
    setUtrError("Payment not found yet. Wait a moment and try again.");
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "radial-gradient(ellipse at 50% 0%, #1a003a 0%, #0a0014 55%, #04000c 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: "0 0 40px",
    }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 460, padding: "20px 20px 0" }}>
        <button
          onClick={() => window.history.back()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 14 }}
        >
          ← Back
        </button>
      </div>

      <div style={{ width: "100%", maxWidth: 460, padding: "0 20px" }}>
        <AnimatePresence mode="wait">

          {/* ── Info phase ── */}
          {phase === "info" && (
            <motion.div key="info" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ textAlign: "center", padding: "36px 0 28px" }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>💌💌</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#FFD700", marginBottom: 8 }}>
                  2 Cards for ₹49
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, maxWidth: 300, margin: "0 auto" }}>
                  One payment. Two beautiful cards unlocked.<br />
                  Share with two people who matter.
                </div>
              </div>

              {/* Value breakdown */}
              <div style={{
                background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.15)",
                borderRadius: 20, padding: "22px 24px", marginBottom: 24,
              }}>
                {[
                  { emoji: "💌", text: "Unlock any 2 premium cards" },
                  { emoji: "🔗", text: "Your personal dashboard link" },
                  { emoji: "♾️", text: "Share anytime — links never expire" },
                  { emoji: "🚫", text: "No login. No account needed." },
                ].map((item) => (
                  <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <span style={{ fontSize: 20 }}>{item.emoji}</span>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>{item.text}</span>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
                    <span style={{ textDecoration: "line-through", color: "rgba(255,255,255,0.3)" }}>₹98</span>
                    {" "}
                    <span style={{ color: "#FFD700" }}>₹49 total — you save ₹49</span>
                  </span>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { trackEvent({ event: "bundle_buy_clicked" }); setPhase("paying"); }}
                style={{
                  width: "100%", height: 58, borderRadius: 18,
                  background: "linear-gradient(135deg, #FFD700 0%, #FFAA00 100%)",
                  border: "none", color: "#000", fontWeight: 900, fontSize: 19,
                  cursor: "pointer", boxShadow: "0 8px 32px rgba(255,165,0,0.45)",
                }}
              >
                🔓 Get Bundle — ₹49
              </motion.button>

              <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 14 }}>
                Pay via UPI · Instant unlock · No hidden charges
              </p>
            </motion.div>
          )}

          {/* ── Paying phase ── */}
          {phase === "paying" && (
            <motion.div key="paying" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ textAlign: "center", padding: "28px 0 20px" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📲</div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 6 }}>
                  Pay <span style={{ color: "#FFD700" }}>₹49</span> via UPI
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                  Open any UPI app → Send to this ID
                </div>
              </div>

              {/* UPI ID copy box */}
              <div style={{
                background: "rgba(255,215,0,0.05)", border: "1.5px solid rgba(255,215,0,0.18)",
                borderRadius: 18, padding: "18px 20px 14px", marginBottom: 14,
              }}>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>UPI ID</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, color: "#fff", fontSize: 16, fontWeight: 700 }}>{UPI_ID}</div>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={copyUpiId}
                    style={{
                      flexShrink: 0, height: 38, paddingInline: 14, borderRadius: 10,
                      background: upiCopied ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg,#FFD700,#FFA500)",
                      border: "none", color: upiCopied ? "#4ade80" : "#000",
                      fontWeight: 800, fontSize: 13, cursor: "pointer",
                    }}
                  >
                    {upiCopied ? "Copied ✓" : "Copy"}
                  </motion.button>
                </div>
              </div>

              {/* UPI app deep links */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {UPI_APPS.map((app) => (
                  <motion.a
                    key={app.label}
                    href={app.scheme}
                    whileTap={{ scale: 0.92 }}
                    style={{
                      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                      gap: 4, padding: "12px 4px",
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12, cursor: "pointer", textDecoration: "none",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{app.emoji}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{app.label}</span>
                  </motion.a>
                ))}
              </div>

              {/* Payment done / UTR entry */}
              <AnimatePresence mode="wait">
                {!utrVisible ? (
                  <motion.div key="done-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {autoLoading ? (
                      <div style={{ textAlign: "center", padding: "14px 0" }}>
                        <div style={{ color: "#FFD700", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                          Checking payment… {autoCountdown !== null ? `(${autoCountdown}s)` : ""}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
                          Hang on while we verify your payment
                        </div>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handlePaymentDone}
                        style={{
                          width: "100%", height: 54, borderRadius: 16,
                          background: "linear-gradient(135deg,#FFD700,#FFAA00)",
                          border: "none", color: "#000", fontWeight: 800, fontSize: 17,
                          cursor: "pointer", boxShadow: "0 6px 24px rgba(255,165,0,0.4)",
                        }}
                      >
                        I've paid ₹49 ✓
                      </motion.button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="utr" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginBottom: 8, fontWeight: 600 }}>
                        Enter the last 4 digits of your UPI transaction ID
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={4}
                          value={utr}
                          onChange={(e) => { setUtr(e.target.value.replace(/\D/g, "").slice(0, 4)); setUtrError(null); }}
                          placeholder="e.g. 4827"
                          style={{
                            flex: 1, height: 48, borderRadius: 12, border: "1.5px solid rgba(255,215,0,0.25)",
                            background: "rgba(255,255,255,0.04)", color: "#fff",
                            fontSize: 18, fontWeight: 700, textAlign: "center",
                            outline: "none", letterSpacing: "0.15em",
                          }}
                        />
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          disabled={!isValidUtr(utr) || utrLoading}
                          onClick={handleConfirm}
                          style={{
                            height: 48, paddingInline: 20, borderRadius: 12,
                            background: isValidUtr(utr) ? "linear-gradient(135deg,#FFD700,#FFA500)" : "rgba(255,255,255,0.07)",
                            border: "none", color: isValidUtr(utr) ? "#000" : "rgba(255,255,255,0.25)",
                            fontWeight: 800, fontSize: 15, cursor: isValidUtr(utr) ? "pointer" : "default",
                            transition: "all 0.2s",
                          }}
                        >
                          {utrLoading ? (utrCountdown !== null ? `${utrCountdown}s…` : "…") : "Verify"}
                        </motion.button>
                      </div>
                      {utrError && (
                        <div style={{ marginTop: 8, fontSize: 12, color: "#f87171", fontWeight: 600 }}>{utrError}</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Success phase ── */}
          {phase === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
              <div style={{ color: "#FFD700", fontWeight: 900, fontSize: 24, marginBottom: 10 }}>Bundle activated!</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 14 }}>Taking you to your card dashboard…</div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
