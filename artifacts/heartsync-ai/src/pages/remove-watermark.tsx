import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, useClerk } from "@clerk/react";
import { ArrowRight, Check, Copy, Info, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

function useQueryParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function isValidUtr(v: string) {
  const t = v.trim();
  return /^\d{12}$/.test(t) || /^[A-Za-z]{4}[A-Za-z0-9]{12,18}$/.test(t);
}

type Stage = "choose" | "bundle-upi" | "watermark-upi" | "done-bundle" | "done-watermark";

const UPI_DISPLAY = "110193250";
const UPI_VPA = "8905158970@upi";

function makeUpiUri(amount: number, note: string) {
  const p = [
    `pa=${encodeURIComponent(UPI_VPA)}`,
    `pn=${encodeURIComponent("HeartSync AI")}`,
    `am=${amount.toFixed(2)}`,
    `cu=INR`,
    `tn=${encodeURIComponent(note)}`,
  ].join("&");
  return `upi://pay?${p}`;
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

export default function RemoveWatermark() {
  const params = useQueryParams();
  const cardId = params.get("id") ?? "";
  const backParam = params.get("back") ?? "";
  /* URLSearchParams.get() already decodes the value — no extra decodeURIComponent needed.
     Restrict to relative same-origin paths to prevent open-redirect abuse. */
  const backUrl = backParam.startsWith("/") && !backParam.startsWith("//") ? backParam : "/";

  const { isSignedIn, isLoaded, getToken } = useAuth();
  const clerk = useClerk();

  const [stage, setStage] = useState<Stage>("choose");

  /* ── Bundle (₹49) state ── */
  const [bundleUtr, setBundleUtr] = useState("");
  const [bundleUtrError, setBundleUtrError] = useState("");
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleUpiCopied, setBundleUpiCopied] = useState(false);

  /* ── Watermark-only (₹29) state ── */
  const [wmUtr, setWmUtr] = useState("");
  const [wmUtrError, setWmUtrError] = useState("");
  const [wmLoading, setWmLoading] = useState(false);
  const [wmUpiCopied, setWmUpiCopied] = useState(false);

  /* Auto-redirect after success — 2 s gives time to read the confirmation */
  useEffect(() => {
    if (stage !== "done-bundle" && stage !== "done-watermark") return;
    const t = setTimeout(() => { window.location.href = backUrl; }, 2000);
    return () => clearTimeout(t);
  }, [stage, backUrl]);

  function goBack() { window.location.href = backUrl; }

  /* ── Bundle UTR submit ── */
  const handleBundleSubmit = useCallback(async () => {
    if (!isValidUtr(bundleUtr)) return;
    if (!cardId) { setBundleUtrError("No card ID — go back to the card and tap Remove again."); return; }
    /* Require sign-in before submitting payment */
    if (!isSignedIn) { clerk.openSignIn(); return; }
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

      /* Clear watermark on this card — blocking: must succeed */
      const patchRes = await fetch(`${BASE}/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_watermarked: false, is_premium: true }),
      });
      if (!patchRes.ok) {
        const patchData = await patchRes.json().catch(() => ({})) as { message?: string };
        if (patchRes.status === 403 || patchRes.status === 401) {
          setBundleUtrError("Only the card sender can remove the watermark. Share this link with them.");
        } else {
          setBundleUtrError(patchData.message ?? "Failed to finalise card. Please try again.");
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

  /* ── Watermark-only UTR submit ── */
  const handleWmSubmit = useCallback(async () => {
    if (!isValidUtr(wmUtr) || !cardId) return;
    /* Require sign-in before submitting payment */
    if (!isSignedIn) { clerk.openSignIn(); return; }
    setWmUtrError("");
    setWmLoading(true);
    try {
      const token = await getToken();
      if (!token) { setWmUtrError("Session expired — please refresh and try again."); return; }
      const res = await fetch(`${BASE}/api/cards/${cardId}/remove-watermark`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ utr: wmUtr.trim() }),
      });
      const data = await res.json() as { ok?: boolean; message?: string };
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          setWmUtrError("Only the card sender can remove the watermark. Share this link with them.");
        } else {
          setWmUtrError(data.message ?? "Verification failed. Try again.");
        }
        return;
      }
      setStage("done-watermark");
    } catch {
      setWmUtrError("Submission failed. Please try again.");
    } finally {
      setWmLoading(false);
    }
  }, [wmUtr, cardId, isSignedIn, getToken, clerk]);

  const bundleUpiUri = makeUpiUri(49, "HeartSync Premium");
  const wmUpiUri    = makeUpiUri(29, "HeartSync Watermark");

  const outerStyle: React.CSSProperties = {
    position: "fixed", inset: 0,
    background: "radial-gradient(ellipse at 50% 30%, #1a0030 0%, #080112 55%, #020008 100%)",
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "flex-start", overflowY: "auto",
    padding: "24px 16px 40px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  };

  /* Loading skeleton while Clerk initialises */
  if (!isLoaded) {
    return (
      <div style={{ ...outerStyle, justifyContent: "center" }}>
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div style={outerStyle}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, marginTop: 8 }}>
          <button
            onClick={goBack}
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(255,255,255,0.6)", fontSize: 18, flexShrink: 0,
            }}
          >←</button>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>Remove watermark</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 }}>
              Choose a plan and pay via UPI
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ── DONE: bundle ── */}
          {stage === "done-bundle" && (
            <motion.div key="done-bundle"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: "center", paddingTop: 32 }}
            >
              <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
              <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 22, marginBottom: 8 }}>You're all set!</h2>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginBottom: 28, lineHeight: 1.55 }}>
                All 3 premium templates unlocked and watermark removed. Taking you back to your card…
              </p>
              <button
                onClick={() => { window.location.href = backUrl; }}
                style={{
                  width: "100%", padding: "14px", borderRadius: 14,
                  background: "linear-gradient(135deg, #FFD700, #FFA500)",
                  color: "#000", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer",
                }}
              >
                ✨ View card now
              </button>
            </motion.div>
          )}

          {/* ── DONE: watermark only ── */}
          {stage === "done-watermark" && (
            <motion.div key="done-watermark"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: "center", paddingTop: 32 }}
            >
              <div style={{ fontSize: 64, marginBottom: 12 }}>✨</div>
              <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Watermark removed!</h2>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginBottom: 28, lineHeight: 1.55 }}>
                Your card will open clean — no HeartSync branding. Taking you back…
              </p>
              <button
                onClick={() => { window.location.href = backUrl; }}
                style={{
                  width: "100%", padding: "14px", borderRadius: 14,
                  background: "linear-gradient(135deg, #FFD700, #FFA500)",
                  color: "#000", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer",
                }}
              >
                ✨ View clean card now
              </button>
            </motion.div>
          )}

          {/* ── CHOOSE ── */}
          {stage === "choose" && (
            <motion.div key="choose"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <Sparkles style={{ width: 28, height: 28, color: "#a855f7", margin: "0 auto 8px" }} />
                <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 6 }}>
                  Remove watermark from card
                </h1>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.55 }}>
                  Pay once via UPI — pick the plan that works for you.
                </p>
              </div>

              {/* Option 1 — ₹49 bundle */}
              <button
                onClick={() => setStage("bundle-upi")}
                style={{
                  width: "100%", marginBottom: 12, padding: "16px", borderRadius: 18,
                  background: "linear-gradient(135deg, rgba(168,85,247,0.22), rgba(236,72,153,0.14))",
                  border: "1.5px solid rgba(168,85,247,0.55)",
                  boxShadow: "0 0 20px rgba(168,85,247,0.18)",
                  cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "flex-start", gap: 12,
                }}
              >
                <div style={{ fontSize: 22, marginTop: 2 }}>👑</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 3 }}>
                    Unlock all premium templates
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, lineHeight: 1.4 }}>
                    No watermarks ever · Cosmic + Crystal + Vinyl · Yours forever
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginTop: 2 }}>
                  <span style={{ color: "#d8b4fe", fontWeight: 800, fontSize: 15 }}>₹49</span>
                  <ArrowRight size={14} color="rgba(216,180,254,0.6)" />
                </div>
              </button>

              {/* Option 2 — ₹29 watermark only */}
              <button
                onClick={() => setStage("watermark-upi")}
                style={{
                  width: "100%", marginBottom: 20, padding: "16px", borderRadius: 18,
                  background: "linear-gradient(135deg, rgba(255,215,0,0.13), rgba(255,165,0,0.07))",
                  border: "1.5px solid rgba(255,215,0,0.4)",
                  cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "flex-start", gap: 12,
                }}
              >
                <div style={{ fontSize: 22, marginTop: 2 }}>✨</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 3 }}>
                    Remove watermark — this card only
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, lineHeight: 1.4 }}>
                    Clean card, no badge · One-time ₹29 per card
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginTop: 2 }}>
                  <span style={{ color: "#FFD700", fontWeight: 800, fontSize: 15 }}>₹29</span>
                  <ArrowRight size={14} color="rgba(255,215,0,0.5)" />
                </div>
              </button>

              <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 12, lineHeight: 1.5 }}>
                Not the one who sent this card? Share this page link with the sender — only they can remove the watermark.
              </p>
            </motion.div>
          )}

          {/* ── BUNDLE UPI ── */}
          {stage === "bundle-upi" && (
            <motion.div key="bundle-upi"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <button
                  onClick={() => setStage("choose")}
                  style={{
                    width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)",
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

              {/* ₹49 plan badge */}
              <div style={{
                marginBottom: 16, borderRadius: 16, padding: "12px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,165,0,0.10))",
                border: "1.5px solid rgba(255,215,0,0.55)",
              }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>₹49</div>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>Cosmic + Crystal + Vinyl — all 3</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginTop: 1 }}>No watermark · Pay once, use forever</div>
                </div>
                <div style={{
                  background: "linear-gradient(135deg, #FFD700, #FFA500)",
                  color: "#000", fontWeight: 800, fontSize: 9,
                  padding: "3px 8px", borderRadius: 99, letterSpacing: "0.04em",
                }}>BEST VALUE</div>
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

          {/* ── WATERMARK UPI ── */}
          {stage === "watermark-upi" && (
            <motion.div key="watermark-upi"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <button
                  onClick={() => setStage("choose")}
                  style={{
                    width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "rgba(255,255,255,0.6)", fontSize: 18, flexShrink: 0,
                  }}
                >←</button>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Remove watermark — ₹29</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Pay once for this card only</div>
                </div>
              </div>

              {!cardId && (
                <div style={{
                  padding: "12px 16px", marginBottom: 16, borderRadius: 12,
                  background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                  color: "#fca5a5", fontSize: 13,
                }}>
                  No card ID found. Please go back and try again from the card page.
                </div>
              )}

              <UpiPaySection
                upiUri={wmUpiUri}
                amount={29}
                utrValue={wmUtr}
                onUtrChange={(v) => { setWmUtr(v); setWmUtrError(""); }}
                utrError={wmUtrError}
                loading={wmLoading}
                upiCopied={wmUpiCopied}
                onCopyUpi={() => copyToClipboard(UPI_DISPLAY, setWmUpiCopied)}
                onSubmit={handleWmSubmit}
                qrSrc={qrUrl(wmUpiUri, 200)}
                submitLabel={isSignedIn ? "Verify & remove watermark" : "Sign in to pay →"}
                disabled={!cardId}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
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
