/**
 * /bundle — Bundle purchase page.
 * Pay ₹49 → get 2 card unlocks → secret dashboard at /my-cards/:token
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { trackEvent } from "@/lib/trackEvent";
import { TemplatePreview } from "@/components/template-preview";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

const UPI_ID = "9706900714@pthdfc";
const UPI_PARAMS = `pa=${UPI_ID}&pn=Itisha&am=49&cu=INR&tn=HeartSyncBundlePayment`;

const TEMPLATE_PREVIEWS = [
  { id: "envelope" as const, label: "Envelope", badge: "FREE",    badgeColor: "#4ade80", desc: "Classic, heartfelt",  bg: "linear-gradient(145deg,#1a0a30,#3d1a5e)" },
  { id: "cosmic"   as const, label: "Cosmic",   badge: "PREMIUM", badgeColor: "#FFD700", desc: "Starry & magical",   bg: "linear-gradient(145deg,#04001a,#0d0034)" },
  { id: "crystal"  as const, label: "Crystal",  badge: "PREMIUM", badgeColor: "#FFD700", desc: "Mystical & glowing", bg: "linear-gradient(145deg,#04091a,#0a1e3d)" },
  { id: "vinyl"    as const, label: "Vinyl",     badge: "PREMIUM", badgeColor: "#FFD700", desc: "Warm & nostalgic",   bg: "linear-gradient(145deg,#120a04,#2a1608)" },
];

const OCCASIONS = [
  { id: "feel_good", emoji: "🌟", label: "Feel Good" },
  { id: "birthday", emoji: "🎂", label: "Birthday" },
  { id: "anniversary", emoji: "🥂", label: "Anniversary" },
  { id: "congratulations", emoji: "🏆", label: "Congrats" },
  { id: "thank_you", emoji: "🙏", label: "Thank You" },
  { id: "sorry", emoji: "💔", label: "Sorry" },
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
  const [successToken, setSuccessToken] = useState<string | null>(null);
  const [dashLinkCopied, setDashLinkCopied] = useState(false);
  const [upiCopied, setUpiCopied] = useState(false);
  const [utrVisible, setUtrVisible] = useState(false);
  const [utr, setUtr] = useState("");
  const [utrLoading, setUtrLoading] = useState(false);
  const [utrError, setUtrError] = useState<string | null>(null);
  const [utrCountdown, setUtrCountdown] = useState<number | null>(null);

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

  function activateBundle(token: string, fromUtr: boolean) {
    try { localStorage.setItem("hs_bundle_token", token); } catch { /* ignore */ }
    trackEvent({ event: fromUtr ? "bundle_created_utr" : "bundle_created" });
    setSuccessToken(token);
    setPhase("success");
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
        const res = await fetch(`${BASE}/api/bundles/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ utr_last4: trimmed }),
        });
        if (res.ok) {
          const data = await res.json() as { token: string };
          cleanup();
          activateBundle(data.token, true);
          return;
        }
        if (res.status === 402) {
          // keep polling — payment may arrive shortly
        } else {
          const d = await res.json().catch(() => ({})) as { message?: string };
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

  function copyDashLink() {
    if (!successToken) return;
    const url = `${window.location.origin}${BASE}/my-cards/${successToken}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setDashLinkCopied(true);
    trackEvent({ event: "bundle_dashboard_link_copied" });
  }

  function shareDashWhatsApp() {
    if (!successToken) return;
    const url = `${window.location.origin}${BASE}/my-cards/${successToken}`;
    const text = `💌 My HeartSync card bundle dashboard:\n${url}\n\nBookmark this link — it's my personal dashboard!`;
    const a = document.createElement("a");
    a.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
    a.target = "_blank"; a.rel = "noopener noreferrer";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    trackEvent({ event: "bundle_dashboard_shared_wa" });
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

          {/* ── Preview phase ── */}
          {phase === "info" && (
            <motion.div key="info" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ textAlign: "center", padding: "28px 0 20px" }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#FFD700", marginBottom: 6 }}>
                  2 Cards for ₹49
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                  One payment · Any template · Any occasion
                </div>
              </div>

              {/* Template carousel — uses real animated TemplatePreview components */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 12 }}>
                  Choose any template
                </div>
                <div style={{
                  display: "flex", gap: 12, overflowX: "auto",
                  paddingBottom: 6, scrollbarWidth: "none",
                  WebkitOverflowScrolling: "touch",
                }}>
                  {TEMPLATE_PREVIEWS.map((tpl, i) => (
                    <motion.div
                      key={tpl.id}
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.07 }}
                      style={{
                        flexShrink: 0, width: 136, borderRadius: 18,
                        background: tpl.bg,
                        padding: "16px 12px 12px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
                        display: "flex", flexDirection: "column", alignItems: "center",
                      }}
                    >
                      {/* Live animated template preview */}
                      <div style={{ marginBottom: 10, width: 88, height: 88, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <TemplatePreview id={tpl.id} size={tpl.id === "envelope" ? 88 : 80} />
                      </div>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 13, marginBottom: 3, textAlign: "center" }}>
                        {tpl.label}
                      </div>
                      <div style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
                        {tpl.desc}
                      </div>
                      <div style={{
                        padding: "2px 8px", borderRadius: 99,
                        background: tpl.badge === "FREE" ? "rgba(74,222,128,0.18)" : "rgba(255,215,0,0.15)",
                        border: `1px solid ${tpl.badge === "FREE" ? "rgba(74,222,128,0.4)" : "rgba(255,215,0,0.35)"}`,
                        fontSize: 9, fontWeight: 800, color: tpl.badgeColor,
                        letterSpacing: "0.06em",
                      }}>
                        {tpl.badge}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Occasions */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 10 }}>
                  Any occasion
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {OCCASIONS.map((occ) => (
                    <div key={occ.id} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 14px", borderRadius: 99,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 600,
                    }}>
                      <span style={{ fontSize: 14 }}>{occ.emoji}</span>
                      {occ.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Value summary */}
              <div style={{
                background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.12)",
                borderRadius: 16, padding: "14px 18px", marginBottom: 20,
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                {[
                  { emoji: "🔗", text: "Secret personal dashboard — no login needed" },
                  { emoji: "♾️", text: "Links never expire" },
                  { emoji: "✅", text: "₹98 worth · Pay only ₹49 — save ₹49" },
                ].map((item) => (
                  <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{item.emoji}</span>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>{item.text}</span>
                  </div>
                ))}
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

              {/* Payment done / UTR entry */}
              <AnimatePresence mode="wait">
                {!utrVisible ? (
                  <motion.div key="done-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setUtrVisible(true)}
                      style={{
                        width: "100%", height: 54, borderRadius: 16,
                        background: "linear-gradient(135deg,#FFD700,#FFAA00)",
                        border: "none", color: "#000", fontWeight: 800, fontSize: 17,
                        cursor: "pointer", boxShadow: "0 6px 24px rgba(255,165,0,0.4)",
                      }}
                    >
                      I've paid ₹49 ✓
                    </motion.button>
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
          {phase === "success" && successToken && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ padding: "40px 0" }}>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 60, marginBottom: 14 }}>🎉</div>
                <div style={{ color: "#FFD700", fontWeight: 900, fontSize: 24, marginBottom: 8 }}>Bundle activated!</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6 }}>
                  You have <strong style={{ color: "#FFD700" }}>2 card unlocks</strong>.<br />
                  Save your personal dashboard link below.
                </div>
              </div>

              {/* Personal dashboard link — prominent */}
              <div style={{
                background: "rgba(255,215,0,0.07)", border: "1.5px solid rgba(255,215,0,0.25)",
                borderRadius: 18, padding: "18px 20px", marginBottom: 14,
              }}>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                  Your Personal Dashboard
                </div>
                <div style={{
                  color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "monospace",
                  wordBreak: "break-all", marginBottom: 14, lineHeight: 1.5,
                }}>
                  {`${window.location.origin}${BASE}/my-cards/${successToken}`}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={copyDashLink}
                    style={{
                      flex: 1, height: 44, borderRadius: 12,
                      background: dashLinkCopied ? "rgba(74,222,128,0.15)" : "linear-gradient(135deg,#FFD700,#FFA500)",
                      border: dashLinkCopied ? "1px solid rgba(74,222,128,0.35)" : "none",
                      color: dashLinkCopied ? "#4ade80" : "#000",
                      fontWeight: 800, fontSize: 14, cursor: "pointer",
                    }}
                  >
                    {dashLinkCopied ? "Copied ✓" : "📋 Copy Link"}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={shareDashWhatsApp}
                    style={{
                      flex: 1, height: 44, borderRadius: 12,
                      background: "linear-gradient(135deg,#25D366,#128C7E)",
                      border: "none", color: "#fff",
                      fontWeight: 800, fontSize: 14, cursor: "pointer",
                    }}
                  >
                    📲 WhatsApp
                  </motion.button>
                </div>
              </div>

              <div style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14, padding: "12px 16px", marginBottom: 22,
                fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 1.6,
              }}>
                🔖 Bookmark this link — it's your secret dashboard.<br />
                You'll come back here to manage your cards.
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/my-cards/${successToken}`)}
                style={{
                  width: "100%", height: 52, borderRadius: 16,
                  background: "linear-gradient(135deg,#FFD700,#FFAA00)",
                  border: "none", color: "#000", fontWeight: 900, fontSize: 17,
                  cursor: "pointer", boxShadow: "0 6px 24px rgba(255,165,0,0.4)",
                }}
              >
                Go to My Dashboard →
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
