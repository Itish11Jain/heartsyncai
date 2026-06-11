import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Loader2, ArrowRight, Info, Sparkles, Heart } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";
import { getReplyPriceConfig } from "@/lib/priceArm";
import { scaleCount } from "@/lib/deviceCapability";

/* Reuse the existing card scene art — no new 3D/bouquet logic is authored here.
 * These are the exact components the recipient card uses (envelope, slider,
 * floating 3D bouquet, falling petals, flower burst). */
import {
  GoldenEnvelope,
  SlideToUnlock,
  FloatingBouquet,
  PetalRain,
  FlowerBurst,
} from "@/pages/card";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

/* ── Manual UPI details (identical to the builder paywall) ─────────────── */
const UPI_DISPLAY = "110193250";
const UPI_VPA = "8905158970@upi";

type Variant = "A" | "B" | "C";

/** Pick the reply experience from the occasion the user just RECEIVED. */
function variantFor(receivedOccasion: string): Variant {
  if (receivedOccasion === "sorry") return "C";
  if (receivedOccasion === "birthday") return "A";
  // feel_good, thank_you, congratulations, anniversary, unknown → Blooming Burst
  return "B";
}

interface VariantContent {
  name: string;
  isSorry: boolean;
  envelopeHeadline: string;
  bloomMessage: string[];
  ctaLabel: string;
  shareTitle: string;
  shareMessage: string;
}

const CONTENT: Record<Variant, VariantContent> = {
  A: {
    name: "Gratitude Bloom",
    isSorry: false,
    envelopeHeadline: "A little thank-you, just for you 💛",
    bloomMessage: [
      "Thank you for thinking of me —",
      "your wishes truly made my day. 🌻",
    ],
    ctaLabel: "Send my thanks",
    shareTitle: "Your thank-you is ready 💛",
    shareMessage: "Thank you so much — your wishes made my day! I made you something back 💛",
  },
  B: {
    name: "Blooming Burst",
    isSorry: false,
    envelopeHeadline: "Something lovely, coming your way ✨",
    bloomMessage: [
      "You made me smile —",
      "so here's a little burst of joy, right back at you. 🌸",
    ],
    ctaLabel: "Send love back",
    shareTitle: "Your reply is ready 🌸",
    shareMessage: "You made me smile — so here's a little something back 🌸",
  },
  C: {
    name: "Playful Forgiveness",
    isSorry: true,
    envelopeHeadline: "Okay, okay… let's see what you've got 🌹",
    bloomMessage: [
      "Apology accepted — this time. 😌",
      "Now go make it up to me. 🌹",
    ],
    ctaLabel: "Send my reply",
    shareTitle: "All is forgiven 🌹",
    shareMessage: "Apology accepted — this time 😌🌹 Made you something back.",
  },
};

function useQuery() {
  return useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);
}

type Phase = "intro" | "envelope" | "bloom" | "send";

export default function ReplyExperience() {
  const q = useQuery();
  const receivedOccasion = q.get("ro") || "thank_you";
  const received = q.get("received") || "envelope";
  const sharedId = q.get("id"); // present only when the original sender opens the paid reply
  const isRecipient = !!sharedId; // the original sender viewing the finished reply

  const variant = variantFor(receivedOccasion);
  const content = CONTENT[variant];
  const { price, anchor } = getReplyPriceConfig();

  // The replier (arriving from "Send Love") first sees a "Your reply is ready"
  // gate; the original sender opening the finished reply (id present) skips it.
  const [phase, setPhase] = useState<Phase>(sharedId ? "envelope" : "intro");
  const [opening, setOpening] = useState(false);

  // Replier payment + share state
  const [paid, setPaid] = useState(false);
  const [cardId, setCardId] = useState<string | null>(sharedId);
  const [showPay, setShowPay] = useState(false);
  const [utr, setUtr] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [upiCopied, setUpiCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const petalCount = useMemo(() => scaleCount(10), []);

  /* ── Analytics: card_viewed for the original sender; reply_flow_opened for the replier ── */
  const openedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    if (isRecipient) {
      trackEvent({
        event: "card_viewed",
        occasion: receivedOccasion,
        template: "reply",
        card_id: sharedId ?? undefined,
        channel: "viral_reply",
      });
    } else {
      trackEvent({
        event: "reply_flow_opened",
        occasion: receivedOccasion,
        template: "reply",
        channel: received,
        price,
      });
    }
  }, [isRecipient, receivedOccasion, received, sharedId, price]);

  function handleIntroContinue() {
    setPhase("envelope");
    trackEvent({ event: "reply_flow_advanced", occasion: receivedOccasion, template: "reply", index: 0 });
  }

  function handleUnlock() {
    setOpening(true);
    window.setTimeout(() => {
      setPhase("bloom");
      trackEvent({ event: "reply_flow_advanced", occasion: receivedOccasion, template: "reply", index: 1 });
    }, 750);
  }

  function handleBloomContinue() {
    setPhase("send");
    trackEvent({ event: "reply_flow_advanced", occasion: receivedOccasion, template: "reply", index: 2 });
  }

  function openPay() {
    setShowPay(true);
    setPayError("");
    trackEvent({ event: "reply_pay_clicked", occasion: receivedOccasion, template: "reply", price });
  }

  const shareUrl = useMemo(() => {
    if (!cardId) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}${BASE}/reply?id=${cardId}&ro=${encodeURIComponent(receivedOccasion)}&received=${encodeURIComponent(received)}`;
  }, [cardId, receivedOccasion, received]);

  async function handleCopyUpi() {
    try {
      await navigator.clipboard.writeText(UPI_DISPLAY);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = UPI_DISPLAY;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setUpiCopied(true);
    window.setTimeout(() => setUpiCopied(false), 1800);
  }

  async function handleCopyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1800);
  }

  function handleWhatsApp() {
    if (!shareUrl) return;
    trackEvent({ event: "reply_shared", occasion: receivedOccasion, template: "reply", channel: "whatsapp", card_id: cardId ?? undefined });
    const text = `${content.shareMessage} ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  async function handlePayUtrSubmit() {
    const last4 = utr.trim();
    if (!/^\d{4}$/.test(last4)) {
      setPayError("Enter the last 4 digits of your UPI transaction.");
      return;
    }
    setPayLoading(true);
    setPayError("");
    trackEvent({ event: "reply_utr_submitted", occasion: receivedOccasion, template: "reply", price });

    try {
      // Mint the reply card server-side so the ₹29 tier is fixed by the server
      // (never the client). Reuse the same id across retries.
      let newId = cardId;
      if (!newId) {
        const mint = await fetch(`${BASE}/api/cards/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ occasion: receivedOccasion }),
        });
        if (!mint.ok) {
          setPayError("Something went wrong. Please try again.");
          setPayLoading(false);
          return;
        }
        const minted = await mint.json();
        const mintedId = typeof minted?.id === "string" ? (minted.id as string) : null;
        if (!mintedId) {
          setPayError("Something went wrong. Please try again.");
          setPayLoading(false);
          return;
        }
        newId = mintedId;
        setCardId(newId);
      }
      const res = await fetch(`${BASE}/api/cards/${newId}/pay-unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utr: last4, price }),
      });
      if (!res.ok) {
        let msg = "Payment not verified. Please check your last 4 digits and try again.";
        try {
          const data = await res.json();
          if (data?.message) msg = data.message;
        } catch { /* ignore */ }
        setPayError(msg);
        setPayLoading(false);
        return;
      }
      setCardId(newId);
      setPaid(true);
      setShowPay(false);
      setPayLoading(false);
      trackEvent({ event: "reply_unlocked", occasion: receivedOccasion, template: "reply", price, card_id: newId });
    } catch {
      setPayError("Something went wrong. Please try again.");
      setPayLoading(false);
    }
  }

  const goldText = {
    fontFamily: "'Dancing Script', cursive",
    backgroundImage: "linear-gradient(135deg, #FFE9A8, #F5C44E 45%, #E0A52E)",
    WebkitBackgroundClip: "text" as const,
    backgroundClip: "text" as const,
    color: "transparent",
    WebkitTextFillColor: "transparent" as const,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: content.isSorry
          ? "radial-gradient(ellipse at 50% 25%, #2a1418 0%, #160a0e 55%, #0a0507 100%)"
          : "radial-gradient(ellipse at 50% 25%, #1a1206 0%, #0f0a04 55%, #060402 100%)",
      }}
    >
      <AnimatePresence mode="wait">
        {/* ════════ SCREEN 0 — "YOUR REPLY IS READY" GATE ════════ */}
        {phase === "intro" && (
          <motion.div
            key="reply-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            style={{
              position: "fixed", inset: 0, zIndex: 30,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "min(26px, 5.5vw)", padding: "32px 24px", textAlign: "center",
            }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 130, delay: 0.1 }}
            >
              <Heart className="w-12 h-12 mx-auto" style={{ color: "#FFD700", filter: "drop-shadow(0 4px 14px rgba(255,180,0,0.45))" }} />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              style={{ ...goldText, fontSize: "min(34px, 8.4vw)", fontWeight: 700, margin: 0, maxWidth: 340 }}
            >
              Your reply is ready
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleIntroContinue}
              style={{
                padding: "14px 40px", borderRadius: 999, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #FFE9A8 0%, #F5C44E 50%, #E0A52E 100%)",
                color: "#5A3A05", fontSize: 20, fontWeight: 700,
                fontFamily: "'Dancing Script', cursive",
                boxShadow: "0 8px 26px rgba(224,165,46,0.5)",
                display: "inline-flex", alignItems: "center", gap: 8,
              }}
            >
              Click here to see <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}

        {/* ════════ SCREEN 1 — ENVELOPE ════════ */}
        {phase === "envelope" && (
          <motion.div
            key="reply-envelope"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            style={{
              position: "fixed", inset: 0, zIndex: 30,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "min(30px, 6vw)", padding: "32px 22px",
            }}
          >
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              style={{ ...goldText, fontSize: "min(26px, 6.6vw)", fontWeight: 600, textAlign: "center", margin: 0, maxWidth: 340 }}
            >
              {content.envelopeHeadline}
            </motion.p>

            <GoldenEnvelope recipientName="" opening={opening} isSorry={content.isSorry} />

            {!opening && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                style={{ width: "min(320px, 86vw)" }}
              >
                <SlideToUnlock onUnlock={handleUnlock} isSorry={content.isSorry} />
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ════════ SCREEN 2 — BLOOM REVEAL ════════ */}
        {phase === "bloom" && (
          <motion.div
            key="reply-bloom"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            transition={{ duration: 0.6 }}
            style={{
              position: "fixed", inset: 0, zIndex: 35,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "min(26px, 5vw)", padding: "32px 24px", overflow: "hidden",
            }}
          >
            <PetalRain count={petalCount} />

            <motion.div
              style={{ position: "relative", zIndex: 1 }}
              initial={{ scale: 0.6, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", damping: 14, stiffness: 120, delay: 0.15 }}
            >
              <FloatingBouquet />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              style={{ ...goldText, position: "relative", zIndex: 1, fontSize: "min(23px, 5.9vw)", fontWeight: 600, textAlign: "center", lineHeight: 1.45, maxWidth: 380, margin: 0 }}
            >
              {content.bloomMessage[0]}
              <br />
              {content.bloomMessage[1]}
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.5 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleBloomContinue}
              style={{
                position: "relative", zIndex: 1, marginTop: 4,
                padding: "12px 44px", borderRadius: 999, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #FFE9A8 0%, #F5C44E 50%, #E0A52E 100%)",
                color: "#5A3A05", fontSize: 20, fontWeight: 700,
                fontFamily: "'Dancing Script', cursive",
                boxShadow: "0 8px 26px rgba(224,165,46,0.5)",
              }}
            >
              Continue →
            </motion.button>
          </motion.div>
        )}

        {/* ════════ SCREEN 3 — SEND / PAY / SHARE ════════ */}
        {phase === "send" && (
          <motion.div
            key="reply-send"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "fixed", inset: 0, zIndex: 35,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 22, padding: "32px 24px", overflow: "hidden",
            }}
          >
            <PetalRain count={Math.max(4, Math.round(petalCount / 2))} />

            {(isRecipient || paid) && <FlowerBurst />}

            {/* ─── Original sender opened the finished reply (finale, no pay) ─── */}
            {isRecipient ? (
              <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 360 }}>
                <p style={{ ...goldText, fontSize: "min(30px, 7.5vw)", fontWeight: 700, margin: "0 0 6px" }}>
                  {content.shareTitle}
                </p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.6, margin: "0 0 26px" }}>
                  Someone sent a little love right back to you. 💛
                </p>
                <a
                  href={`${BASE}/send`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "14px 28px", borderRadius: 14, textDecoration: "none",
                    background: "linear-gradient(135deg, #FFD700, #FFA500)",
                    color: "#1a0800", fontWeight: 700, fontSize: 15,
                    boxShadow: "0 4px 18px rgba(255,180,0,0.35)",
                  }}
                >
                  Create your own <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            ) : paid ? (
              /* ─── Replier paid → reveal share link + WhatsApp ─── */
              <div style={{ position: "relative", zIndex: 2, textAlign: "center", width: "min(360px, 90vw)" }}>
                <p style={{ ...goldText, fontSize: "min(28px, 7vw)", fontWeight: 700, margin: "0 0 6px" }}>
                  {content.shareTitle}
                </p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
                  Send it back so they can open it. 💛
                </p>

                <button
                  onClick={handleWhatsApp}
                  style={{
                    width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg, #25D366, #128C7E)",
                    color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 10,
                    boxShadow: "0 4px 18px rgba(37,211,102,0.3)",
                  }}
                >
                  Send back on WhatsApp
                </button>

                <button
                  onClick={handleCopyLink}
                  style={{
                    width: "100%", padding: "12px", borderRadius: 14, cursor: "pointer",
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff", fontWeight: 600, fontSize: 14,
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {linkCopied ? <><Check className="w-4 h-4" /> Link copied</> : <><Copy className="w-4 h-4" /> Copy link</>}
                </button>
              </div>
            ) : (
              /* ─── Replier preview → pay ₹29 to share ─── */
              <div style={{ position: "relative", zIndex: 2, textAlign: "center", width: "min(360px, 90vw)" }}>
                <Heart className="w-7 h-7 mx-auto mb-2" style={{ color: "#FFD700" }} />
                <p style={{ ...goldText, fontSize: "min(27px, 6.8vw)", fontWeight: 700, margin: "0 0 6px" }}>
                  Your reply is ready
                </p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.6, margin: "0 0 22px" }}>
                  Send it back for just{" "}
                  <span style={{ textDecoration: "line-through", opacity: 0.45 }}>₹{anchor}</span>{" "}
                  <span style={{ color: "#FFD700", fontWeight: 700 }}>₹{price}</span> — no sign-in needed.
                </p>

                <button
                  onClick={openPay}
                  style={{
                    width: "100%", padding: "15px", borderRadius: 14, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg, #FFD700, #FFA500)",
                    color: "#1a0800", fontWeight: 700, fontSize: 16,
                    boxShadow: "0 4px 18px rgba(255,180,0,0.35)",
                  }}
                >
                  Pay ₹{price} &amp; share 💛
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ ₹29 MANUAL UPI / UTR MODAL (mirrors the builder paywall) ════ */}
      <AnimatePresence>
        {showPay && (
          <motion.div
            key="reply-pay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[90] backdrop-blur-sm flex flex-col items-center justify-start px-4 py-6 overflow-y-auto"
            style={{ background: "radial-gradient(ellipse at 50% 30%, #1a0030 0%, #080112 55%, #020008 100%)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-sm my-auto"
            >
              <div className="text-center mb-5">
                <Sparkles className="w-7 h-7 text-yellow-400 mx-auto mb-2" />
                <h1 className="text-xl font-bold text-white mb-1 leading-tight">Send your reply</h1>
                <p className="text-white/55 text-sm flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="line-through text-white/25">₹{anchor}</span>
                  <span className="text-yellow-300/80 font-bold">₹{price}</span>
                  — one tap, sent back instantly.
                </p>
              </div>

              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
                {(() => {
                  const upiParams = [
                    `pa=${encodeURIComponent(UPI_VPA)}`,
                    `pn=${encodeURIComponent("HeartSync AI")}`,
                    `am=${price.toFixed(2)}`,
                    `cu=INR`,
                    `tn=${encodeURIComponent("HeartSync Reply")}`,
                  ].join("&");
                  const upiUri = `upi://pay?${upiParams}`;
                  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(upiUri)}`;
                  return (
                    <div className="flex gap-3 items-center mb-4">
                      <a href={upiUri} className="bg-white rounded-xl p-1.5 shadow-lg shrink-0 block" title="Tap to open in your UPI app">
                        <img src={qrSrc} alt={`UPI QR Code ₹${price}`} className="w-24 h-24 rounded-lg" />
                      </a>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-[10px] text-white/45 mb-1 leading-tight">
                          UPI of <span className="text-white/70 font-semibold">Itisha</span> — Creator of HeartSync AI
                        </p>
                        <div className="flex items-center gap-1.5">
                          <p className="font-mono font-bold text-white text-sm break-all flex-1 min-w-0">{UPI_DISPLAY}</p>
                          <button
                            type="button" onClick={handleCopyUpi}
                            aria-label={upiCopied ? "Copied" : "Copy UPI ID"}
                            className="shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors"
                            style={{
                              background: upiCopied ? "rgba(34,197,94,0.15)" : "rgba(255,215,0,0.15)",
                              color: upiCopied ? "#4ade80" : "#FFD700",
                              border: `1px solid ${upiCopied ? "rgba(34,197,94,0.4)" : "rgba(255,215,0,0.35)"}`,
                            }}
                          >
                            {upiCopied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                          </button>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Info className="w-3 h-3 text-white/25 shrink-0" />
                          <p className="text-[10px] text-white/30">Pay <span className="text-white/60 font-semibold">exactly ₹{price}</span> — scan, tap, or copy</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2">
                  <input
                    placeholder="Last 4 digits of UPI transaction"
                    value={utr}
                    inputMode="numeric"
                    maxLength={4}
                    onChange={(e) => { setUtr(e.target.value.replace(/\D/g, "").slice(0, 4)); setPayError(""); }}
                    data-clarity-mask="true"
                    className="w-full bg-white/5 border border-white/10 h-11 text-sm rounded-xl placeholder:text-white/20 text-center text-white outline-none focus:border-yellow-400/50"
                  />
                  {payError && <p className="text-xs text-red-400 text-center">{payError}</p>}
                  <button
                    onClick={handlePayUtrSubmit}
                    disabled={!/^\d{4}$/.test(utr) || payLoading}
                    className="w-full h-11 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                    style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", color: "#000" }}
                  >
                    {payLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin text-black" /> Verifying…</>
                      : <>Verify &amp; share <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowPay(false)}
                className="w-full text-center text-white/40 text-sm mt-4 py-2"
              >
                Maybe later
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
