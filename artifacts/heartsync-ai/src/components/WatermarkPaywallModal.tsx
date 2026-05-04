import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, useClerk } from "@clerk/react";
import { ArrowRight, Check, Copy, Info, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

const UPI_DISPLAY = "110193250";
const UPI_VPA = "8905158970@upi";

function isValidUtr(v: string) {
  const t = v.trim();
  return /^\d{12}$/.test(t) || /^[A-Za-z]{4}[A-Za-z0-9]{12,18}$/.test(t);
}

function makeUpiUri(amount: number, note: string) {
  return `upi://pay?pa=${encodeURIComponent(UPI_VPA)}&pn=${encodeURIComponent("HeartSync AI")}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
}

function qrUrl(upiUri: string, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=6&data=${encodeURIComponent(upiUri)}`;
}

async function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch { /* ignore */ }
    document.body.removeChild(ta);
  }
  setCopied(true);
  setTimeout(() => setCopied(false), 1800);
}

type Stage = "choose" | "bundle-upi" | "done-bundle" | "done-watermark";

interface Props {
  cardId: string;
  onClose: () => void;
  onSuccess: () => void;
  mode?: "photo" | "watermark";
}

export default function WatermarkPaywallModal({ cardId, onClose, onSuccess, mode = "watermark" }: Props) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const clerk = useClerk();

  const [stage, setStage] = useState<Stage>("choose");

  const [bundleUtr, setBundleUtr] = useState("");
  const [bundleUtrError, setBundleUtrError] = useState("");
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleUpiCopied, setBundleUpiCopied] = useState(false);

  /* Auto-close to success after showing confirmation */
  useEffect(() => {
    if (stage !== "done-bundle" && stage !== "done-watermark") return;
    const t = setTimeout(() => onSuccess(), 2000);
    return () => clearTimeout(t);
  }, [stage, onSuccess]);

  /* Prevent body scroll while modal is open */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleBundleSubmit = useCallback(async () => {
    if (!isValidUtr(bundleUtr)) return;
    if (!cardId) { setBundleUtrError("No card ID — close and try again from the card page."); return; }
    if (!isSignedIn) { clerk.openSignIn({ redirectUrl: window.location.href }); return; }
    setBundleUtrError("");
    setBundleLoading(true);
    try {
      const token = await getToken();
      if (!token) { setBundleUtrError("Session expired — please refresh and try again."); return; }

      const unlockRes = await fetch(`${BASE}/api/usage/template-unlock-utr`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ utr: bundleUtr.trim(), plan: "bundle" }),
      });
      const unlockData = await unlockRes.json() as { ok?: boolean; message?: string };
      if (!unlockRes.ok) {
        setBundleUtrError(unlockData.message ?? "Submission failed. Please try again.");
        return;
      }

      const patchRes = await fetch(`${BASE}/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_watermarked: false, is_premium: true }),
      });
      if (!patchRes.ok) {
        const patchData = await patchRes.json().catch(() => ({})) as { message?: string };
        if (patchRes.status === 403 || patchRes.status === 401) {
          setBundleUtrError("Only the card sender can remove the watermark.");
        } else {
          setBundleUtrError(patchData.message ?? "Failed to finalise. Please try again.");
        }
        return;
      }

      setStage("done-bundle");
    } catch {
      setBundleUtrError("Submission failed. Please try again.");
    } finally {
      setBundleLoading(false);
    }
  }, [bundleUtr, cardId, isSignedIn, getToken, clerk]);

  const bundleUpiUri = makeUpiUri(49, "HeartSync Premium");

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
        {!isLoaded ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <button
                onClick={onClose}
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "rgba(255,255,255,0.6)", fontSize: 18, flexShrink: 0,
                }}
              >←</button>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>
                  {mode === "photo" ? "Share with the photo included" : "Remove watermark"}
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 }}>
                  Pay via UPI · instant unlock
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

              {/* Choose */}
              {stage === "choose" && (
                <motion.div key="choose"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <Sparkles style={{ width: 26, height: 26, color: "#a855f7", margin: "0 auto 8px" }} />
                    <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 19, marginBottom: 6 }}>
                      {mode === "photo" ? "Share with the photo included" : "Remove Watermark · Go Premium"}
                    </h1>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.55 }}>
                      One payment of ₹49 — yours forever.
                    </p>
                  </div>

                  <button
                    onClick={() => setStage("bundle-upi")}
                    style={{
                      width: "100%", marginBottom: 16, padding: "16px", borderRadius: 18,
                      background: "linear-gradient(135deg, rgba(168,85,247,0.22), rgba(236,72,153,0.14))",
                      border: "1.5px solid rgba(168,85,247,0.55)",
                      boxShadow: "0 0 20px rgba(168,85,247,0.18)",
                      cursor: "pointer", textAlign: "left",
                      display: "flex", alignItems: "flex-start", gap: 12,
                    }}
                  >
                    <div style={{ fontSize: 22, marginTop: 2 }}>👑</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                        Remove watermark & unlock all premium templates
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>✓ Removes watermark</span>
                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>✓ Unlocks Cosmic, Crystal, Vinyl</span>
                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>✓ Add a picture of them in your card</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginTop: 2 }}>
                      <span style={{ color: "#d8b4fe", fontWeight: 800, fontSize: 15 }}>₹49</span>
                      <ArrowRight size={14} color="rgba(216,180,254,0.6)" />
                    </div>
                  </button>

                  <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 12, lineHeight: 1.5 }}>
                    Only the card sender can remove the watermark.
                  </p>
                </motion.div>
              )}

              {/* Bundle UPI */}
              {stage === "bundle-upi" && (
                <motion.div key="bundle-upi"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <button
                      onClick={() => setStage("choose")}
                      style={{
                        width: 36, height: 36, borderRadius: "50%",
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.06)", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "rgba(255,255,255,0.6)", fontSize: 18, flexShrink: 0,
                      }}
                    >←</button>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Unlock all premium — ₹49</div>
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Pay once, use forever on all cards</div>
                    </div>
                  </div>

                  <div style={{
                    marginBottom: 16, borderRadius: 16, padding: "12px 16px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,165,0,0.10))",
                    border: "1.5px solid rgba(255,215,0,0.55)",
                  }}>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>₹49</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6 }}>
                        <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>✓ Removes watermark</span>
                        <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>✓ Unlocks premium templates</span>
                        <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>✓ Add a picture of them in your card</span>
                      </div>
                    </div>
                  </div>

                  <UpiPaySection
                    upiUri={bundleUpiUri}
                    amount={49}
                    utrValue={bundleUtr}
                    onUtrChange={(v) => { setBundleUtr(v); setBundleUtrError(""); }}
                    utrError={bundleUtrError}
                    loading={bundleLoading}
                    upiCopied={bundleUpiCopied}
                    onCopyUpi={() => copyToClipboard(UPI_DISPLAY, setBundleUpiCopied)}
                    onSubmit={handleBundleSubmit}
                    qrSrc={qrUrl(bundleUpiUri, 220)}
                    submitLabel={isSignedIn ? "Submit & unlock all" : "Sign in to pay →"}
                  />
                </motion.div>
              )}

            </AnimatePresence>
          </>
        )}
      </motion.div>
    </div>
  );
}

/* ── Shared UPI payment section ── */
interface UpiPaySectionProps {
  upiUri: string;
  amount: number;
  utrValue: string;
  onUtrChange: (v: string) => void;
  utrError: string;
  loading: boolean;
  upiCopied: boolean;
  onCopyUpi: () => void;
  onSubmit: () => void;
  qrSrc: string;
  submitLabel: string;
  disabled?: boolean;
}

function UpiPaySection({
  upiUri, amount, utrValue, onUtrChange, utrError,
  loading, upiCopied, onCopyUpi, onSubmit, qrSrc, submitLabel, disabled,
}: UpiPaySectionProps) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 20, padding: "16px",
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <a
          href={upiUri}
          style={{ background: "#fff", borderRadius: 12, padding: 6, flexShrink: 0, display: "block" }}
          title="Tap to open in your UPI app"
        >
          <img src={qrSrc} alt={`UPI QR ₹${amount}`} style={{ width: 88, height: 88, borderRadius: 8, display: "block" }} />
        </a>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 4 }}>
            UPI of <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Itisha</span> — Creator of HeartSync AI
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <p style={{ fontFamily: "monospace", fontWeight: 700, color: "#fff", fontSize: 14, flex: 1, minWidth: 0, overflowWrap: "break-word" }}>
              {UPI_DISPLAY}
            </p>
            <button
              type="button"
              onClick={onCopyUpi}
              style={{
                flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4,
                borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700,
                background: upiCopied ? "rgba(34,197,94,0.15)" : "rgba(255,215,0,0.15)",
                color: upiCopied ? "#4ade80" : "#FFD700",
                border: `1px solid ${upiCopied ? "rgba(34,197,94,0.4)" : "rgba(255,215,0,0.35)"}`,
                cursor: "pointer",
              }}
            >
              {upiCopied ? <><Check style={{ width: 12, height: 12 }} /> Copied</> : <><Copy style={{ width: 12, height: 12 }} /> Copy</>}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            <Info style={{ width: 11, height: 11, color: "rgba(255,255,255,0.25)", flexShrink: 0 }} />
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>
              Pay <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>exactly ₹{amount}</span> — scan, tap, or copy
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Input
          placeholder="Paste UTR / Transaction ID"
          value={utrValue}
          onChange={(e) => onUtrChange(e.target.value)}
          className="bg-white/5 border-white/10 h-11 text-sm rounded-xl placeholder:text-white/20 text-center text-white"
        />
        {utrError && (
          <p style={{ color: "#f87171", fontSize: 12, textAlign: "center", margin: 0 }}>{utrError}</p>
        )}
        <button
          onClick={onSubmit}
          disabled={(!isValidUtr(utrValue) || loading || disabled === true)}
          style={{
            width: "100%", height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #FFD700, #FFA500)",
            color: "#000", fontWeight: 700, fontSize: 14, border: "none",
            cursor: (!isValidUtr(utrValue) || loading || disabled) ? "default" : "pointer",
            opacity: (!isValidUtr(utrValue) || loading || disabled) ? 0.5 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "opacity 0.2s",
          }}
        >
          {loading
            ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Verifying…</>
            : <>{submitLabel} <ArrowRight style={{ width: 15, height: 15 }} /></>
          }
        </button>
      </div>
    </div>
  );
}
