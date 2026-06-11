import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ArrowRight, Info, Sparkles, Heart, Smartphone, Link2, Share2 } from "lucide-react";
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

/** Read Meta pixel cookies so auto/UTR unlocks can carry CAPI match quality. */
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

/* ── Manual UPI details (same account as the production paywall) ────────── */
const UPI_VPA = "9706900714@pthdfc";
const UPI_DISPLAY = UPI_VPA;
const UPI_PAYEE = "Saurabh";

/** Reject obviously fake last-4 codes (1234, 4321, 1111) — mirrors prod paywall. */
function isSequentialCode(v: string): boolean {
  const d = v.trim().split("").map(Number);
  if (d.length !== 4 || d.some(Number.isNaN)) return false;
  if (d.every((x) => x === d[0])) return true;
  if (d[1] === (d[0] + 1) % 10 && d[2] === (d[1] + 1) % 10 && d[3] === (d[2] + 1) % 10) return true;
  if (d[1] === (d[0] + 9) % 10 && d[2] === (d[1] + 9) % 10 && d[3] === (d[2] + 9) % 10) return true;
  return false;
}
function isValidPayCode(v: string): boolean {
  return /^\d{4}$/.test(v.trim()) && !isSequentialCode(v);
}

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
    envelopeHeadline: "A little thank-you, just for you",
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
      delay: Math.random() * 0.16,
      dur: 1.4 + Math.random() * 0.7,
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
        transition={{ duration: exploding ? 0.95 : 5, repeat: exploding ? 0 : Infinity, ease: "easeInOut" }}
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
            ? { duration: 0.8, ease: "easeIn" }
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
  // Dev-only: jump straight to the post-payment ("paid") share screen for visual
  // review. Inert in production (gated on import.meta.env.DEV).
  const devPaidPreview = import.meta.env.DEV && !sharedId && q.get("paid_preview") === "1";

  const variant = variantFor(receivedOccasion);
  const content = CONTENT[variant];
  const { price, anchor } = getReplyPriceConfig();

  // The replier (arriving from "Send Love") first sees a "Your reply is ready"
  // gate; the original sender opening the finished reply (id present) skips it.
  const [phase, setPhase] = useState<Phase>(sharedId ? "envelope" : isPreview ? "envelope" : devPaidPreview ? "send" : "intro");
  const [opening, setOpening] = useState(false);

  // Replier payment + share state
  const [paid, setPaid] = useState(devPaidPreview);
  const [cardId, setCardId] = useState<string | null>(sharedId ?? (devPaidPreview ? "preview" : null));
  const [showPay, setShowPay] = useState(false);
  const [payStage, setPayStage] = useState<"paying" | "done">("paying");
  const [utr, setUtr] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [upiCopied, setUpiCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [igCopied, setIgCopied] = useState(false);
  // Production-style "Complete payment" → "Checking payment… (Ns)" → UTR fallback.
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const [utrVisible, setUtrVisible] = useState(false);
  const [utrCountdown, setUtrCountdown] = useState<number | null>(null);
  const payTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (payTimerRef.current) clearInterval(payTimerRef.current); }, []);

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

  // In the embedded preview iframe nothing is tappable, so auto-drive the
  // open-me hero → bouquet reveal sequence on a timer and loop it forever.
  useEffect(() => {
    if (!isPreview) return;
    let cancelled = false;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) =>
      timers.push(window.setTimeout(() => { if (!cancelled) fn(); }, ms));
    function cycle() {
      if (cancelled) return;
      setPhase("envelope");
      setOpening(false);
      at(1700, () => setOpening(true));      // trigger the open / burst animation
      at(2900, () => setPhase("bloom"));     // reveal the bouquet
      at(6600, cycle);                       // hold, then loop back to the envelope
    }
    cycle();
    return () => { cancelled = true; timers.forEach((t) => window.clearTimeout(t)); };
  }, [isPreview]);

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

  // Receiver (original sender opening the finished reply) replays the card from
  // the very start — back to the sealed envelope, ready to be opened again.
  function handleReplay() {
    unlockingRef.current = false;
    if (unlockTimerRef.current) { window.clearTimeout(unlockTimerRef.current); unlockTimerRef.current = null; }
    setOpening(false);
    setPhase("envelope");
    trackEvent({ event: "reply_replayed", occasion: receivedOccasion, template: "reply" });
  }

  function openPay() {
    if (payTimerRef.current) { clearInterval(payTimerRef.current); payTimerRef.current = null; }
    setShowPay(true);
    setPayStage("paying");
    setUtr("");
    setPayError("");
    setUpiCopied(false);
    setUtrVisible(false);
    setAutoLoading(false);
    setAutoCountdown(null);
    setUtrCountdown(null);
    trackEvent({ event: "reply_pay_clicked", occasion: receivedOccasion, template: "reply", price });
  }

  // After the success ("done") screen plays, reveal the share screen — mirrors
  // the production paywall, which shows a celebratory beat then continues.
  useEffect(() => {
    if (payStage !== "done") return;
    const t = window.setTimeout(() => {
      setPaid(true);
      setShowPay(false);
    }, 2000);
    return () => window.clearTimeout(t);
  }, [payStage]);

  const shareUrl = useMemo(() => {
    if (!cardId) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}${BASE}/reply?id=${cardId}&ro=${encodeURIComponent(receivedOccasion)}&received=${encodeURIComponent(received)}`;
  }, [cardId, receivedOccasion, received]);

  /* ── Preview iframe: mount it ONCE at the component root for the whole replier
   * session so it loads during the intro/envelope/bloom screens and is already
   * playing by the time the pay screen appears (avoids a slow blank load). It's
   * kept off-screen until the pay screen, then anchored over a placeholder box —
   * moving a fixed element via CSS never reloads it. */
  const previewUrl = useMemo(
    () => `${BASE}/reply?pv=1&ro=${encodeURIComponent(receivedOccasion)}&received=${encodeURIComponent(received)}`,
    [receivedOccasion, received],
  );
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
    // Sticky like production UnlockModal: once copied, the gate stays open so the
    // "I've Paid" CTA remains enabled however long the user takes. Reset on
    // open/back only.
    setUpiCopied(true);
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

  // Instagram has no web share target — mirror production (SenderPanel): copy the
  // link so the user can paste it into their story/DM.
  async function handleInstagram() {
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
    trackEvent({ event: "reply_shared", occasion: receivedOccasion, template: "reply", channel: "instagram", card_id: cardId ?? undefined });
    setIgCopied(true);
    window.setTimeout(() => setIgCopied(false), 2500);
    // Mirror production SenderPanel: link is on the clipboard, then open Instagram
    // so the user can paste it into their story/DM.
    window.setTimeout(() => window.open("https://www.instagram.com", "_blank"), 300);
  }

  // Mint the reply card server-side so the ₹29 tier is fixed by the server
  // (never the client). Idempotent — reuse the same id across retries.
  async function mintReplyCard(): Promise<string | null> {
    if (cardId) return cardId;
    try {
      const mint = await fetch(`${BASE}/api/cards/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion: receivedOccasion }),
      });
      if (!mint.ok) return null;
      const minted = await mint.json();
      const mintedId = typeof minted?.id === "string" ? (minted.id as string) : null;
      if (mintedId) setCardId(mintedId);
      return mintedId;
    } catch {
      return null;
    }
  }

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  // "I've Paid ₹29 →" — mirrors the production UnlockModal: poll auto-unlock for
  // 60s (the server matches the incoming UPI deposit), counting down in the CTA.
  // On a miss we fall through to the manual "Payment done?" (last-4) screen.
  async function handlePaymentDone() {
    if (autoLoading) return;
    setAutoLoading(true);
    setPayError("");
    trackEvent({ event: "reply_payment_done_clicked", occasion: receivedOccasion, template: "reply", price });

    const id = await mintReplyCard();
    if (!id) {
      setAutoLoading(false);
      setPayError("Something went wrong. Please try again.");
      return;
    }

    const TIMEOUT_S = 60;
    const POLL_MS = 3000;
    const deadline = Date.now() + TIMEOUT_S * 1000;
    setAutoCountdown(TIMEOUT_S);
    if (payTimerRef.current) clearInterval(payTimerRef.current);
    payTimerRef.current = setInterval(() => {
      setAutoCountdown(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    }, 1000);
    const cleanup = () => {
      if (payTimerRef.current) { clearInterval(payTimerRef.current); payTimerRef.current = null; }
      setAutoLoading(false);
      setAutoCountdown(null);
    };

    const eventId = `hs_${id}_${Date.now()}`;
    const { fbp, fbc } = getMetaCookies();

    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${BASE}/api/cards/${id}/auto-unlock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, fbp, fbc, price }),
        });
        if (res.ok) {
          cleanup();
          setPayStage("done");
          trackEvent({ event: "reply_unlocked", occasion: receivedOccasion, template: "reply", price, card_id: id });
          return;
        }
        // 402 = not matched yet; keep polling. Other codes are hard failures.
        if (res.status !== 402) break;
      } catch { /* network blip — keep polling */ }
      await sleep(Math.min(POLL_MS, Math.max(0, deadline - Date.now())));
    }

    // Timed out / hard failure → manual last-4 confirmation.
    cleanup();
    setUtr("");
    setPayError("");
    setUtrVisible(true);
  }

  // "Confirm & Unlock 🔓" — last-4 fallback. Polls pay-unlock for 60s so a deposit
  // that lands a moment later still confirms, matching the production flow.
  async function handlePayUtrSubmit() {
    const last4 = utr.trim();
    if (!/^\d{4}$/.test(last4)) {
      setPayError("Enter the last 4 digits of your UPI transaction.");
      return;
    }
    if (isSequentialCode(last4)) {
      setPayError("Please enter the real last 4 digits from your payment app.");
      return;
    }
    if (payLoading) return;
    setPayLoading(true);
    setPayError("");
    trackEvent({ event: "reply_utr_submitted", occasion: receivedOccasion, template: "reply", price });

    const id = await mintReplyCard();
    if (!id) {
      setPayLoading(false);
      setPayError("Something went wrong. Please try again.");
      return;
    }

    const TIMEOUT_S = 60;
    const POLL_MS = 3000;
    const deadline = Date.now() + TIMEOUT_S * 1000;
    setUtrCountdown(TIMEOUT_S);
    if (payTimerRef.current) clearInterval(payTimerRef.current);
    payTimerRef.current = setInterval(() => {
      setUtrCountdown(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    }, 1000);
    const cleanup = () => {
      if (payTimerRef.current) { clearInterval(payTimerRef.current); payTimerRef.current = null; }
      setPayLoading(false);
      setUtrCountdown(null);
    };

    const eventId = `hs_${id}_${Date.now()}`;
    const { fbp, fbc } = getMetaCookies();
    let lastMsg = "Payment not verified. Please check your last 4 digits and try again.";

    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${BASE}/api/cards/${id}/pay-unlock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ utr: last4, eventId, fbp, fbc, price }),
        });
        if (res.ok) {
          cleanup();
          setPayStage("done");
          trackEvent({ event: "reply_unlocked", occasion: receivedOccasion, template: "reply", price, card_id: id });
          return;
        }
        if (res.status !== 402) {
          try { const data = await res.json(); if (data?.message) lastMsg = data.message; } catch { /* ignore */ }
          break;
        }
      } catch { /* network blip — keep polling */ }
      await sleep(Math.min(POLL_MS, Math.max(0, deadline - Date.now())));
    }

    cleanup();
    setPayError(lastMsg);
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
                fontFamily: "inherit",
                color: "rgba(255,255,255,0.55)",
                fontWeight: 400,
                position: "relative", zIndex: 2, margin: 0, maxWidth: 330,
                fontSize: "min(14px, 3.9vw)", lineHeight: 1.55,
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
                <SpinningFlower exploding={opening} onTap={() => handleUnlock(1500)} />
              ) : (
                <GoldenEnvelope recipientName="" opening={opening} isSorry />
              )}
            </div>

            {!opening && !isPreview &&
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
                onClick={isRecipient ? handleReplay : handleBloomContinue}
                style={{
                  position: "relative", zIndex: 1, marginTop: 4,
                  padding: "12px 44px", borderRadius: 999, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg, #FFE9A8 0%, #F5C44E 50%, #E0A52E 100%)",
                  color: "#5A3A05", fontSize: 20, fontWeight: 700,
                  fontFamily: "'Dancing Script', cursive",
                  boxShadow: "0 8px 26px rgba(224,165,46,0.5)",
                }}
              >
                {isRecipient ? "↻ Replay" : "Continue →"}
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
              gap: 22, padding: "18px 22px", overflow: "hidden",
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
              /* ─── Replier paid → preview + share icons + bundle upsell ─── */
              <div
                style={{
                  position: "relative", zIndex: 2, textAlign: "center",
                  width: "min(360px, 92vw)", maxHeight: "100%", overflowY: "auto",
                  display: "flex", flexDirection: "column", alignItems: "center",
                }}
              >
                <p style={{ ...goldText, fontSize: "min(28px, 7vw)", fontWeight: 700, margin: "0 0 6px" }}>
                  {content.shareTitle}
                </p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.6, margin: "0 0 16px" }}>
                  Send it back so they can open it. 💛
                </p>

                {/* Live preview of the unlocked reply card */}
                <div
                  style={{
                    position: "relative", width: 172, height: 256, borderRadius: 22,
                    overflow: "hidden", flex: "0 0 auto", marginBottom: 16,
                    border: "1px solid rgba(255,215,120,0.35)",
                    boxShadow: "0 12px 36px rgba(0,0,0,0.5), 0 0 0 6px rgba(255,215,120,0.06)",
                    background: "radial-gradient(ellipse at 50% 35%, #2a1418 0%, #160a0e 55%, #0a0507 100%)",
                  }}
                >
                  {!isPreview && (
                    <iframe
                      title="Your reply preview"
                      src={previewUrl}
                      scrolling="no"
                      style={{
                        position: "absolute", top: 0, left: 0,
                        width: 376, height: 560, border: "none",
                        transform: "scale(0.457)", transformOrigin: "top left",
                        pointerEvents: "none",
                      }}
                    />
                  )}
                </div>

                {/* Share via — WhatsApp / Instagram / Copy link */}
                <div style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "16px 18px 18px",
                  marginBottom: 12,
                }}>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center", marginBottom: 16 }}>
                    Share via
                  </p>

                  <div style={{ display: "flex", justifyContent: "center", gap: 28 }}>

                    {/* WhatsApp */}
                    <motion.button
                      whileTap={{ scale: 0.90 }}
                      onClick={handleWhatsApp}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 0 }}
                    >
                      <div style={{
                        width: 54, height: 54, borderRadius: "50%",
                        background: "linear-gradient(135deg,#25D366,#128C7E)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 4px 20px rgba(37,211,102,0.4)",
                      }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>WhatsApp</span>
                    </motion.button>

                    {/* Instagram */}
                    <motion.button
                      whileTap={{ scale: 0.90 }}
                      onClick={handleInstagram}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 0 }}
                    >
                      <div style={{
                        width: 54, height: 54, borderRadius: "50%",
                        background: igCopied ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 4px 20px rgba(220,39,67,0.4)",
                        transition: "background 0.25s",
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: 11, color: igCopied ? "#4ade80" : "rgba(255,255,255,0.55)", fontWeight: 600, transition: "color 0.25s" }}>
                        {igCopied ? "Copied!" : "Instagram"}
                      </span>
                    </motion.button>

                    {/* Copy Link */}
                    <motion.button
                      whileTap={{ scale: 0.90 }}
                      onClick={handleCopyLink}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 0 }}
                    >
                      <div style={{
                        width: 54, height: 54, borderRadius: "50%",
                        background: linkCopied ? "linear-gradient(135deg,#22c55e,#16a34a)" : "rgba(255,215,0,0.1)",
                        border: linkCopied ? "none" : "1.5px solid rgba(255,215,0,0.28)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: linkCopied ? "0 4px 20px rgba(34,197,94,0.35)" : "0 2px 12px rgba(255,215,0,0.08)",
                        transition: "background 0.25s, border 0.25s, box-shadow 0.25s",
                      }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                          stroke={linkCopied ? "white" : "rgba(255,215,0,0.85)"}
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: 11, color: linkCopied ? "#4ade80" : "rgba(255,215,0,0.65)", fontWeight: 600, transition: "color 0.25s" }}>
                        {linkCopied ? "Copied!" : "Copy Link"}
                      </span>
                    </motion.button>

                  </div>
                </div>

                {/* Bundle upsell */}
                <a href={`${BASE}/bundle`} style={{ textDecoration: "none", width: "100%" }}>
                  <div
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "11px 16px", borderRadius: 14,
                      background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.15)",
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#FFD700", marginBottom: 1 }}>
                        💌 2 cards for ₹49
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                        Next card is on us — get a bundle
                      </div>
                    </div>
                    <span style={{ color: "rgba(255,215,0,0.6)", fontSize: 14 }}>→</span>
                  </div>
                </a>
              </div>
            ) : (
              /* ─── Replier preview → pay ₹29 to share ─── */
              <div
                style={{
                  position: "relative", zIndex: 2, textAlign: "center",
                  width: "min(360px, 92vw)", maxHeight: "100%", overflowY: "auto",
                  display: "flex", flexDirection: "column", alignItems: "center",
                }}
              >
                <p style={{ ...goldText, fontSize: "min(26px, 6.6vw)", fontWeight: 700, margin: "0 0 8px" }}>
                  Your reply is ready
                </p>

                {/* Live preview of the card they just saw — the iframe is rendered
                    directly inside this box so it loads reliably on mobile (the old
                    off-screen "preload" trick stayed blank on iOS/Android). */}
                <div
                  style={{
                    position: "relative", width: 172, height: 256, borderRadius: 22,
                    overflow: "hidden", flex: "0 0 auto", marginBottom: 12,
                    border: "1px solid rgba(255,215,120,0.35)",
                    boxShadow: "0 12px 36px rgba(0,0,0,0.5), 0 0 0 6px rgba(255,215,120,0.06)",
                    background: "radial-gradient(ellipse at 50% 35%, #2a1418 0%, #160a0e 55%, #0a0507 100%)",
                  }}
                >
                  {!isPreview && (
                    <iframe
                      title="Your reply preview"
                      src={previewUrl}
                      scrolling="no"
                      style={{
                        position: "absolute", top: 0, left: 0,
                        width: 376, height: 560, border: "none",
                        transform: "scale(0.457)", transformOrigin: "top left",
                        pointerEvents: "none",
                      }}
                    />
                  )}
                </div>

                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 1.55, margin: "0 0 12px", maxWidth: 322 }}>
                  They made you a one-of-a-kind card. Sending a little something back is a
                  sweet way to keep the moment going.
                </p>

                {/* What you get */}
                <div style={{ width: "100%", textAlign: "left", margin: "0 0 14px", display: "flex", flexDirection: "column", gap: 9 }}>
                  {[
                    { Icon: Smartphone, text: "Easy UPI payment" },
                    { Icon: Link2, text: "Get a shareable link after payment" },
                    { Icon: Share2, text: "Share on WhatsApp or Instagram" },
                  ].map(({ Icon, text }) => (
                    <div key={text} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <span
                        style={{
                          flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 28, height: 28, borderRadius: 9,
                          background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.22)",
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: "#FFD700" }} />
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.92)", fontSize: 13.5, fontWeight: 600 }}>{text}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={openPay}
                  style={{
                    width: "100%", padding: "13px", borderRadius: 14, border: "none", cursor: "pointer",
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

      {/* ════ ₹29 REPLY PAYWALL — replicates the production UnlockModal "Complete payment" flow ════ */}
      <AnimatePresence>
        {showPay && (
          <motion.div
            key="reply-pay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed", inset: 0, zIndex: 10010,
              background: "rgba(0,0,0,0.88)",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              fontFamily: "'Segoe UI', system-ui, sans-serif",
            }}
            onClick={(e) => { if (e.target === e.currentTarget && payStage !== "done") setShowPay(false); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 35 }}
              style={{
                width: "100%", maxWidth: 480,
                background: "radial-gradient(ellipse at 50% 0%, #1a003a 0%, #0a0014 55%, #04000c 100%)",
                border: "1px solid rgba(255,215,0,0.12)",
                borderBottom: "none",
                borderRadius: "28px 28px 0 0",
                paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))",
                overflow: "hidden",
                maxHeight: "92vh",
                display: "flex", flexDirection: "column",
              }}
            >
              {/* Drag handle */}
              <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 6px" }}>
                <div style={{ width: 40, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.12)" }} />
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "0 22px 10px" }}>
                <AnimatePresence mode="wait">

                  {/* ── Success ── */}
                  {payStage === "done" && (
                    <motion.div key="reply-success"
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
                      >🎉</motion.div>
                      <div style={{ color: "#FFD700", fontWeight: 800, fontSize: 22, marginBottom: 8 }}>
                        Reply unlocked!
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                        Your shareable link is ready ✨
                      </div>
                    </motion.div>
                  )}

                  {/* ── Complete payment ── */}
                  {payStage !== "done" && (
                    <motion.div key="reply-paying"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {/* Back header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                        <button
                          onClick={() => {
                            if (payTimerRef.current) { clearInterval(payTimerRef.current); payTimerRef.current = null; }
                            if (utrVisible) {
                              setUtrVisible(false); setUtr(""); setPayError("");
                              setUtrCountdown(null); setPayLoading(false);
                            } else {
                              setShowPay(false);
                            }
                          }}
                          style={{
                            width: 32, height: 32, borderRadius: "50%",
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(255,255,255,0.06)", cursor: "pointer",
                            color: "rgba(255,255,255,0.6)", fontSize: 16,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >←</button>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Complete payment</div>
                      </div>

                      {/* Status card */}
                      <div style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 20, padding: "32px 20px 28px",
                        textAlign: "center", marginBottom: 16,
                      }}>
                        <AnimatePresence mode="wait">
                          {!utrVisible ? (
                            /* UPI ID copy — only step before UTR entry */
                            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                              <div style={{ fontSize: 36, marginBottom: 10 }}>📲</div>
                              <div style={{ color: "#fff", fontWeight: 700, fontSize: 17, marginBottom: 6 }}>
                                Pay{" "}
                                <span style={{ color: "rgba(255,255,255,0.35)", textDecoration: "line-through", fontSize: 15, fontWeight: 500 }}>₹{anchor}</span>
                                {" "}
                                <span style={{ color: "#FFD700", fontSize: 21, fontWeight: 900 }}>₹{price}</span>
                                {" "}via any UPI App
                              </div>
                              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginBottom: 22, lineHeight: 1.6 }}>
                                Open PhonePe / GPay / Paytm → Send to this UPI ID
                              </div>

                              {/* UPI ID copy box */}
                              <div style={{
                                background: "rgba(255,215,0,0.05)",
                                border: "1.5px solid rgba(255,215,0,0.18)",
                                borderRadius: 16, padding: "18px 22px 14px",
                                marginBottom: 10, marginInline: -8,
                              }}>
                                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                                  UPI ID
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div style={{ flex: 1, color: "#fff", fontSize: 16, fontWeight: 700, letterSpacing: "0.03em", wordBreak: "break-all", textAlign: "left" }}>
                                    {UPI_DISPLAY}
                                  </div>
                                  <motion.button
                                    whileTap={{ scale: 0.92 }}
                                    onClick={handleCopyUpi}
                                    style={{
                                      flexShrink: 0, height: 38, paddingInline: 12, borderRadius: 10,
                                      background: upiCopied ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg,#FFD700,#FFA500)",
                                      border: "none",
                                      color: upiCopied ? "#4ade80" : "#000",
                                      fontWeight: 800, fontSize: 13, cursor: "pointer",
                                      transition: "all 0.25s",
                                    }}
                                  >
                                    {upiCopied ? "Copied ✓" : "Copy"}
                                  </motion.button>
                                </div>

                                {/* Trust line */}
                                <div style={{
                                  marginTop: 12, paddingTop: 10,
                                  borderTop: "1px solid rgba(255,255,255,0.07)",
                                  display: "flex", alignItems: "center", gap: 6,
                                }}>
                                  <span style={{ fontSize: 14 }}>🔐</span>
                                  <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, lineHeight: 1.5, textAlign: "left" }}>
                                    This belongs to <span style={{ color: "rgba(255,215,0,0.85)", fontWeight: 700 }}>{UPI_PAYEE}</span> — Creator of HeartSync AI
                                  </span>
                                </div>
                              </div>

                              {/* Subtext above CTA — only once UPI ID is copied */}
                              {upiCopied && (
                                <p style={{ fontSize: 11, color: "#FFD700", textAlign: "center", margin: "6px 0 2px", whiteSpace: "nowrap", fontWeight: 600 }}>
                                  {autoLoading
                                    ? `Please pay Rs. ${price} now if you have not paid yet.`
                                    : "Only click this if you have made the payment successfully"}
                                </p>
                              )}

                              {payError && !autoLoading && (
                                <p style={{ color: "#f87171", fontSize: 12, textAlign: "center", margin: "6px 0 0" }}>{payError}</p>
                              )}

                              {/* Payment Done CTA — disabled until UPI ID is copied */}
                              <motion.button
                                whileTap={autoLoading || !upiCopied ? {} : { scale: 0.97 }}
                                onClick={() => { if (upiCopied && !autoLoading) void handlePaymentDone(); }}
                                disabled={autoLoading || !upiCopied}
                                style={{
                                  width: "100%", height: 54, borderRadius: 16, marginTop: upiCopied ? 6 : 18,
                                  background: autoLoading
                                    ? "rgba(255,215,0,0.15)"
                                    : upiCopied
                                      ? "linear-gradient(135deg, #FFD700 0%, #FFAA00 100%)"
                                      : "rgba(255,255,255,0.06)",
                                  color: autoLoading
                                    ? "rgba(255,215,0,0.7)"
                                    : upiCopied ? "#000" : "rgba(255,255,255,0.2)",
                                  fontWeight: 800, fontSize: 16,
                                  border: upiCopied && !autoLoading ? "none" : "1px solid rgba(255,255,255,0.08)",
                                  cursor: upiCopied && !autoLoading ? "pointer" : "default",
                                  boxShadow: upiCopied && !autoLoading ? "0 6px 24px rgba(255,165,0,0.35)" : "none",
                                  transition: "all 0.3s",
                                }}
                              >
                                {autoLoading
                                  ? `Checking payment… ${autoCountdown !== null ? `(${autoCountdown}s)` : ""}`
                                  : `I've Paid ₹${price} →`}
                              </motion.button>
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
                                  data-clarity-mask="true"
                                  onChange={(e) => {
                                    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                                    setUtr(v);
                                    setPayError(
                                      v.length === 4 && isSequentialCode(v)
                                        ? "Don't use sequential (1234) or repeated (1111) codes — enter your actual last 4 digits."
                                        : ""
                                    );
                                  }}
                                  onKeyDown={(e) => { if (e.key === "Enter") void handlePayUtrSubmit(); }}
                                  style={{
                                    width: "100%", height: 56, borderRadius: 14,
                                    border: `1.5px solid ${payError ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.14)"}`,
                                    background: "rgba(255,255,255,0.07)", color: "#fff",
                                    fontSize: 28, fontWeight: 700, textAlign: "center",
                                    letterSpacing: "0.3em", outline: "none", padding: "0 12px",
                                    boxSizing: "border-box", transition: "border-color 0.2s",
                                  }}
                                />
                                <motion.button
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => void handlePayUtrSubmit()}
                                  disabled={!isValidPayCode(utr) || payLoading}
                                  style={{
                                    width: "100%", height: 50, borderRadius: 14,
                                    background: isValidPayCode(utr) && !payLoading
                                      ? "linear-gradient(135deg, #FFD700, #FFA500)"
                                      : "rgba(255,255,255,0.07)",
                                    color: isValidPayCode(utr) && !payLoading ? "#000" : "rgba(255,255,255,0.2)",
                                    fontWeight: 800, fontSize: 15, border: "none",
                                    cursor: isValidPayCode(utr) && !payLoading ? "pointer" : "default",
                                    transition: "background 0.2s, color 0.2s",
                                  }}
                                >
                                  {payLoading
                                    ? `Checking payment… ${utrCountdown !== null ? `(${utrCountdown}s)` : ""}`
                                    : "Confirm & Unlock 🔓"}
                                </motion.button>
                              </div>

                              <AnimatePresence>
                                {payError && (
                                  <motion.p
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    style={{ marginTop: 12, fontSize: 12, color: "#f87171", textAlign: "center" }}
                                  >
                                    {payError}
                                  </motion.p>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
