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

/* Reuse the exact flower sprites the bouquet/envelope use. rose_pink is the same
 * bloom tucked into the sorry envelope; the others give the burst variety. */
import rosePinkImg from "@assets/flowers/rose_pink.webp";
import cosmosPinkImg from "@assets/flowers/cosmos_pink.webp";
import anemonePurpleImg from "@assets/flowers/anemone_purple.webp";
import daisyWhiteImg from "@assets/flowers/daisy_white.webp";
import ranunculusYellowImg from "@assets/flowers/ranunculus_yellow.webp";

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
    envelopeHeadline: "Okay, okay… let's mend this 🌹",
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

/* ── Sorry reply, screen 1 — a NEW "kintsugi" mending heart ───────────────
 * A cracked crimson heart floats gently; the two halves sit slightly apart
 * with a faint gold fault line. When the user slides to forgive, the halves
 * draw together and the seam seals with a glowing gold kintsugi vein. This
 * is intentionally distinct from the envelope used by every other variant. */
function MendingHeart({ opening }: { opening: boolean }) {
  const heartPath =
    "M50 84 C 16 58, 6 36, 22 21 C 33 11, 46 16, 50 27 C 54 16, 67 11, 78 21 C 94 36, 84 58, 50 84 Z";
  const seam = "M50 19 L44 32 L55 44 L43 57 L54 70 L49 83";
  return (
    <div
      style={{
        position: "relative",
        width: "min(232px, 60vw)",
        height: "min(232px, 60vw)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* soft glow behind the heart — crimson while broken, warm gold as it seals */}
      <motion.div
        animate={{
          opacity: opening ? [0.5, 0.95, 0.6] : [0.3, 0.5, 0.3],
          scale: opening ? [1, 1.18, 1.05] : [1, 1.06, 1],
        }}
        transition={{ duration: opening ? 1 : 4.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: "6%",
          borderRadius: "50%",
          background: opening
            ? "radial-gradient(circle, rgba(255,205,110,0.6), transparent 68%)"
            : "radial-gradient(circle, rgba(224,64,95,0.5), transparent 70%)",
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />

      {/* gentle lifelike float for the whole heart */}
      <motion.div
        animate={opening ? { y: 0, rotate: 0, scale: [1, 1.07, 1] } : { y: [-6, 6, -6], rotate: [-2.5, 2.5, -2.5] }}
        transition={opening ? { duration: 0.9, ease: "easeOut" } : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "relative", width: "100%", height: "100%" }}
      >
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="mh-grad" x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0%" stopColor="#FF7D98" />
              <stop offset="52%" stopColor="#E0405F" />
              <stop offset="100%" stopColor="#A01F3A" />
            </linearGradient>
            <linearGradient id="mh-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFEDB0" />
              <stop offset="50%" stopColor="#F5C44E" />
              <stop offset="100%" stopColor="#E0A52E" />
            </linearGradient>
            <clipPath id="mh-left">
              <rect x="-6" y="-6" width="56" height="112" />
            </clipPath>
            <clipPath id="mh-right">
              <rect x="50" y="-6" width="56" height="112" />
            </clipPath>
            <filter id="mh-soft" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.4" floodColor="#6E0A1C" floodOpacity="0.55" />
            </filter>
          </defs>

          {/* left half — drifts left while broken, closes on forgive */}
          <motion.g
            clipPath="url(#mh-left)"
            initial={false}
            animate={{ x: opening ? 0 : -3.6, rotate: opening ? 0 : -2 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ transformOrigin: "50px 52px" }}
          >
            <path d={heartPath} fill="url(#mh-grad)" filter="url(#mh-soft)" />
            {/* top sheen */}
            <path d={heartPath} fill="url(#mh-grad)" opacity="0" />
            <ellipse cx="34" cy="32" rx="13" ry="9" fill="rgba(255,255,255,0.28)" />
          </motion.g>

          {/* right half */}
          <motion.g
            clipPath="url(#mh-right)"
            initial={false}
            animate={{ x: opening ? 0 : 3.6, rotate: opening ? 0 : 2 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ transformOrigin: "50px 52px" }}
          >
            <path d={heartPath} fill="url(#mh-grad)" filter="url(#mh-soft)" />
            <ellipse cx="63" cy="30" rx="9" ry="6" fill="rgba(255,255,255,0.16)" />
          </motion.g>

          {/* golden kintsugi seam — faint fault line that flares bright on forgive */}
          <motion.path
            d={seam}
            fill="none"
            stroke="url(#mh-gold)"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{
              opacity: opening ? 1 : 0.3,
              strokeWidth: opening ? 3.4 : 1.4,
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              filter: opening
                ? "drop-shadow(0 0 5px rgba(245,196,78,0.95))"
                : "drop-shadow(0 0 2px rgba(245,196,78,0.4))",
            }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

/* ── Birthday reply, screen-1 decor: pink roses drifting at varied sizes ──── */
// Kept to the top half and the side margins only — the slider is nearly
// full-width and sits low, so no floater may stray into the bottom band or it
// reads as an extra flower stuck on the slider.
const FLOAT_FLOWERS = [
  { left: "8%",  top: "10%", size: 46, dur: 7,   delay: 0,   rot: -12, op: 0.85 },
  { left: "82%", top: "8%",  size: 64, dur: 8.5, delay: 0.6, rot: 10,  op: 0.9  },
  { left: "49%", top: "4%",  size: 34, dur: 6.5, delay: 0.9, rot: 6,   op: 0.8  },
  { left: "18%", top: "24%", size: 30, dur: 6.2, delay: 2.0, rot: 4,   op: 0.72 },
  { left: "90%", top: "22%", size: 32, dur: 7.6, delay: 1.2, rot: -10, op: 0.74 },
  { left: "5%",  top: "38%", size: 38, dur: 8,   delay: 1.4, rot: -16, op: 0.8  },
  { left: "88%", top: "40%", size: 42, dur: 7.2, delay: 0.2, rot: 12,  op: 0.82 },
  { left: "12%", top: "52%", size: 28, dur: 6.8, delay: 1.7, rot: -6,  op: 0.78 },
  { left: "86%", top: "54%", size: 36, dur: 8.8, delay: 0.5, rot: 9,   op: 0.82 },
];

function FloatingFlowers() {
  const flowers = useMemo(() => FLOAT_FLOWERS.slice(0, scaleCount(FLOAT_FLOWERS.length)), []);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {flowers.map((f, i) => (
        <motion.img
          key={i}
          src={rosePinkImg}
          alt=""
          aria-hidden
          draggable={false}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: f.op, scale: 1, y: [0, -16, 0], rotate: [f.rot - 7, f.rot + 7, f.rot - 7] }}
          transition={{
            opacity: { duration: 1, delay: f.delay * 0.3 },
            scale: { duration: 1, delay: f.delay * 0.3 },
            y: { duration: f.dur, delay: f.delay, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: f.dur, delay: f.delay, repeat: Infinity, ease: "easeInOut" },
          }}
          style={{
            position: "absolute",
            left: f.left,
            top: f.top,
            width: f.size,
            height: f.size,
            objectFit: "contain",
            filter: "drop-shadow(0 6px 12px rgba(120,40,70,0.4))",
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}

function Twinkles() {
  const stars = useMemo(
    () =>
      Array.from({ length: scaleCount(22) }).map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 2 + Math.random() * 4,
        dur: 1.6 + Math.random() * 2.2,
        delay: Math.random() * 3,
      })),
    [],
  );
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {stars.map((s, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.1, 1, 0.1], scale: [0.6, 1.2, 0.6] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,225,150,0.5) 50%, transparent 70%)",
            boxShadow: "0 0 6px rgba(255,235,180,0.7)",
          }}
        />
      ))}
    </div>
  );
}

/* ── Non-sorry, non-birthday reply (variant B), screen 1 ──────────────────
 * One big bouquet bloom sits dead-center, slowly rotating. A tap shatters it
 * into its OWN petals (same pink rose, a few cosmos petals mixed in) that
 * emanate from the screen centre and scatter to fill the whole viewport before
 * the bouquet fades in on the next screen. */
const BURST_PETALS = [rosePinkImg, rosePinkImg, rosePinkImg, cosmosPinkImg];

function SpinningFlower({ exploding, onTap }: { exploding: boolean; onTap: () => void }) {
  // Full-screen scatter targets, computed once from the viewport so the petals
  // spread edge-to-edge rather than staying inside the flower box.
  const shards = useMemo(() => {
    const n = scaleCount(34);
    const vw = typeof window !== "undefined" ? window.innerWidth : 400;
    const vh = typeof window !== "undefined" ? window.innerHeight : 720;
    return Array.from({ length: n }).map((_, i) => ({
      img: BURST_PETALS[i % BURST_PETALS.length],
      x: (Math.random() - 0.5) * vw * 1.15,
      y: (Math.random() - 0.5) * vh * 1.15,
      size: 30 + Math.random() * 50,
      rot: (Math.random() - 0.5) * 560,
      delay: Math.random() * 0.12,
      dur: 0.85 + Math.random() * 0.55,
    }));
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "min(248px, 64vw)",
        height: "min(248px, 64vw)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* soft glow — flares on burst */}
      <motion.div
        animate={{
          opacity: exploding ? [0.6, 1, 0] : [0.3, 0.5, 0.3],
          scale: exploding ? [1, 2.2, 3] : [1, 1.08, 1],
        }}
        transition={{ duration: exploding ? 0.6 : 5, repeat: exploding ? 0 : Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: "8%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,150,190,0.55), transparent 70%)",
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />

      {/* full-screen petal scatter — overlay anchored at viewport centre */}
      {exploding && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40, pointerEvents: "none", overflow: "hidden" }}>
          {shards.map((s, i) => (
            <motion.img
              key={i}
              src={s.img}
              alt=""
              aria-hidden
              draggable={false}
              initial={{ x: 0, y: 0, scale: 0.3, opacity: 0, rotate: 0 }}
              animate={{ x: s.x, y: s.y, scale: [0.5, 1.15, 0.95], opacity: [1, 1, 0], rotate: s.rot }}
              transition={{ duration: s.dur, delay: s.delay, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: s.size,
                height: s.size,
                marginLeft: -s.size / 2,
                marginTop: -s.size / 2,
                objectFit: "contain",
                filter: "drop-shadow(0 4px 8px rgba(120,40,70,0.4))",
                willChange: "transform",
              }}
            />
          ))}
        </div>
      )}

      {/* the hero bloom — rotates forever, tap to shatter into petals */}
      <motion.img
        src={rosePinkImg}
        alt="Tap to open"
        draggable={false}
        onClick={() => {
          if (!exploding) onTap();
        }}
        animate={
          exploding
            ? { scale: [1, 1.3, 0], opacity: [1, 1, 0], rotate: 60 }
            : { rotate: 360, scale: [1, 1.05, 1] }
        }
        transition={
          exploding
            ? { duration: 0.45, ease: "easeIn" }
            : {
                rotate: { duration: 11, repeat: Infinity, ease: "linear" },
                scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              }
        }
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          cursor: exploding ? "default" : "pointer",
          filter: "drop-shadow(0 12px 26px rgba(150,40,90,0.5))",
          touchAction: "manipulation",
        }}
      />
    </div>
  );
}

export default function ReplyExperience() {
  const q = useQuery();
  const receivedOccasion = q.get("ro") || "thank_you";
  const received = q.get("received") || "envelope";
  const sharedId = q.get("id"); // present only when the original sender opens the paid reply
  const isRecipient = !!sharedId; // the original sender viewing the finished reply
  const isPreview = !sharedId && q.get("pv") === "1"; // small, non-interactive in-iframe card preview

  const variant = variantFor(receivedOccasion);
  const content = CONTENT[variant];
  const { price, anchor } = getReplyPriceConfig();

  // The replier (arriving from "Send Love") first sees a "Your reply is ready"
  // gate; the original sender opening the finished reply (id present) skips it.
  const [phase, setPhase] = useState<Phase>(sharedId ? "envelope" : isPreview ? "bloom" : "intro");
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
    if (isPreview) return; // silent in-iframe preview — don't skew the funnel
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

  // Idempotent: a slide and (variant B) a flower tap both call this, so guard
  // against fast double-fires queueing duplicate timers / analytics.
  const unlockingRef = useRef(false);
  const unlockTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (unlockTimerRef.current) window.clearTimeout(unlockTimerRef.current);
    },
    [],
  );
  function handleUnlock(delay?: number) {
    if (unlockingRef.current) return;
    unlockingRef.current = true;
    setOpening(true);
    // Variant B passes a longer delay so the full-screen petal scatter plays out
    // before the bouquet screen takes over; the slider uses the default.
    const d = typeof delay === "number" ? delay : 750;
    unlockTimerRef.current = window.setTimeout(() => {
      setPhase("bloom");
      trackEvent({ event: "reply_flow_advanced", occasion: receivedOccasion, template: "reply", index: 1 });
    }, d);
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
          ? "radial-gradient(ellipse at 50% 30%, #3a0f1c 0%, #190711 55%, #070205 100%)"
          : "radial-gradient(ellipse at 50% 25%, #2a1418 0%, #160a0e 55%, #0a0507 100%)",
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
              gap: "min(22px, 4.8vw)", padding: "32px 24px", textAlign: "center",
            }}
          >
            {/* twinkling, drifting starlight behind the intro — all templates */}
            <Twinkles />

            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 130, delay: 0.1 }}
              style={{ position: "relative", zIndex: 2 }}
            >
              <Heart className="w-12 h-12 mx-auto" style={{ color: "#FFD700", filter: "drop-shadow(0 4px 14px rgba(255,180,0,0.45))" }} />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              style={{ ...goldText, position: "relative", zIndex: 2, fontSize: "min(34px, 8.4vw)", fontWeight: 700, margin: 0, maxWidth: 360, lineHeight: 1.18 }}
            >
              A little something back,
              <br />
              just for them 💛
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              style={{
                ...goldText,
                fontFamily: "inherit",
                fontWeight: 600,
                position: "relative", zIndex: 2, margin: 0, maxWidth: 340,
                fontSize: "min(16px, 4.2vw)", lineHeight: 1.5,
              }}
            >
              Your reply is ready — preview it, then send it to the heart who first thought of you.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              style={{ position: "relative", zIndex: 2 }}
            >
              <motion.button
                whileTap={{ scale: 0.95 }}
                animate={{
                  scale: [1, 1.045, 1],
                  boxShadow: [
                    "0 8px 26px rgba(224,165,46,0.5)",
                    "0 12px 36px rgba(224,165,46,0.9)",
                    "0 8px 26px rgba(224,165,46,0.5)",
                  ],
                }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                onClick={handleIntroContinue}
                style={{
                  position: "relative", overflow: "hidden",
                  padding: "14px 40px", borderRadius: 999, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg, #FFE9A8 0%, #F5C44E 50%, #E0A52E 100%)",
                  color: "#5A3A05", fontSize: 20, fontWeight: 700,
                  fontFamily: "'Dancing Script', cursive",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}
              >
                {/* sweeping shine */}
                <motion.span
                  aria-hidden
                  animate={{ x: ["-130%", "230%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
                  style={{
                    position: "absolute", top: 0, bottom: 0, left: 0, width: "45%",
                    background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.7), transparent)",
                    transform: "skewX(-18deg)", pointerEvents: "none",
                  }}
                />
                <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  Preview Now! <ArrowRight className="w-4 h-4" />
                </span>
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {/* ════════ SCREEN 1 — OPEN-ME (envelope / flower / mending heart) ════════ */}
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
            {/* Birthday reply: drifting pink roses + background twinkles */}
            {variant === "A" && (
              <>
                <Twinkles />
                <FloatingFlowers />
              </>
            )}

            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              style={{ ...goldText, position: "relative", zIndex: 2, fontSize: "min(26px, 6.6vw)", fontWeight: 600, textAlign: "center", margin: 0, maxWidth: 340 }}
            >
              {content.envelopeHeadline}
            </motion.p>

            <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "center", width: "100%" }}>
              {variant === "C" ? (
                <MendingHeart opening={opening} />
              ) : variant === "B" ? (
                <SpinningFlower exploding={opening} onTap={() => handleUnlock(1050)} />
              ) : (
                <GoldenEnvelope recipientName="" opening={opening} isSorry />
              )}
            </div>

            {!opening &&
              (variant === "B" ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.55, 1, 0.55] }}
                  transition={{ delay: 0.6, duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    position: "relative", zIndex: 2, margin: 0,
                    color: "rgba(255,255,255,0.72)",
                    fontFamily: "'Dancing Script', cursive",
                    fontSize: "min(22px, 5.6vw)", fontWeight: 600,
                  }}
                >
                  Tap the flower 🌸
                </motion.p>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  style={{ position: "relative", zIndex: 2, width: "min(320px, 86vw)" }}
                >
                  <SlideToUnlock
                    onUnlock={handleUnlock}
                    isSorry={variant === "A"}
                    label={variant === "C" ? "Slide to forgive →" : undefined}
                  />
                </motion.div>
              ))}
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

            {!isPreview && (
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
            )}
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

            {!isRecipient && !paid && <Twinkles />}

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
              <div
                style={{
                  position: "relative", zIndex: 2, textAlign: "center",
                  width: "min(360px, 92vw)", maxHeight: "92vh", overflowY: "auto",
                  display: "flex", flexDirection: "column", alignItems: "center",
                }}
              >
                <p style={{ ...goldText, fontSize: "min(28px, 7vw)", fontWeight: 700, margin: "0 0 12px" }}>
                  Your reply is ready
                </p>

                {/* Live preview of the card they just saw */}
                <div
                  style={{
                    position: "relative", width: 188, height: 280, borderRadius: 22,
                    overflow: "hidden", flex: "0 0 auto", marginBottom: 14,
                    border: "1px solid rgba(255,215,120,0.35)",
                    boxShadow: "0 12px 36px rgba(0,0,0,0.5), 0 0 0 6px rgba(255,215,120,0.06)",
                  }}
                >
                  <iframe
                    title="Your reply preview"
                    src={`${BASE}/reply?pv=1&ro=${encodeURIComponent(receivedOccasion)}&received=${encodeURIComponent(received)}`}
                    scrolling="no"
                    style={{
                      width: 376, height: 560, border: "none",
                      transform: "scale(0.5)", transformOrigin: "top left",
                      pointerEvents: "none",
                    }}
                  />
                </div>

                <p style={{ color: "rgba(255,255,255,0.74)", fontSize: 13.5, lineHeight: 1.65, margin: "0 0 16px", maxWidth: 322 }}>
                  They put a lot of effort into making you a custom card. You can do at
                  least this much — it&rsquo;ll surprise them and make them feel truly
                  valued. 💛
                </p>

                {/* What you get */}
                <div style={{ width: "100%", textAlign: "left", margin: "0 0 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    "Easy UPI payment",
                    "Get a shareable link after payment",
                    "Share on WhatsApp or Instagram",
                  ].map((b) => (
                    <div key={b} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Check className="w-4 h-4" style={{ color: "#FFD700", flex: "0 0 auto" }} />
                      <span style={{ color: "rgba(255,255,255,0.84)", fontSize: 13.5 }}>{b}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={openPay}
                  style={{
                    width: "100%", padding: "15px", borderRadius: 14, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg, #FFD700, #FFA500)",
                    color: "#1a0800", fontWeight: 700, fontSize: 16,
                    boxShadow: "0 4px 18px rgba(255,180,0,0.35)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
                  }}
                >
                  Pay{" "}
                  <span style={{ textDecoration: "line-through", opacity: 0.5, fontWeight: 600 }}>₹{anchor}</span>{" "}
                  ₹{price} &amp; Share 💛
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
