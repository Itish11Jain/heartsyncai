import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const name = "Priya";
const age = 25;

/* ─────────────────────────────────────────
   BALLOON GARLAND
   Organic clusters along both sides + top
───────────────────────────────────────── */
const GARLAND: {
  x: number; y: number; r: number;
  color: string; shine: string;
  confetti?: boolean; delay: number;
}[] = [
  // ── LEFT BASE ──
  { x: 26,  y: 762, r: 32, color: "#c084fc", shine: "#e9d5ff", delay: 0.0 },
  { x: 58,  y: 748, r: 28, color: "#fbbf24", shine: "#fef08a", confetti: true, delay: 0.05 },
  { x: 14,  y: 728, r: 20, color: "#f472b6", shine: "#fbcfe8", delay: 0.1 },
  { x: 74,  y: 768, r: 18, color: "#e0d7ff", shine: "#ffffff", delay: 0.15 },

  // ── LEFT LOWER ──
  { x: 32,  y: 678, r: 30, color: "#f472b6", shine: "#fbcfe8", delay: 0.1 },
  { x: 65,  y: 662, r: 24, color: "#e0d7ff", shine: "#ffffff", delay: 0.2 },
  { x: 18,  y: 648, r: 17, color: "#fbbf24", shine: "#fef08a", confetti: true, delay: 0.0 },
  { x: 52,  y: 695, r: 16, color: "#c084fc", shine: "#e9d5ff", delay: 0.3 },

  // ── LEFT MID ──
  { x: 28,  y: 575, r: 28, color: "#e0d7ff", shine: "#ffffff", delay: 0.15 },
  { x: 62,  y: 558, r: 22, color: "#c084fc", shine: "#e9d5ff", delay: 0.05 },
  { x: 15,  y: 546, r: 16, color: "#f472b6", shine: "#fbcfe8", delay: 0.25 },
  { x: 50,  y: 585, r: 15, color: "#fbbf24", shine: "#fef08a", confetti: true, delay: 0.1 },

  // ── LEFT UPPER ──
  { x: 32,  y: 465, r: 26, color: "#f472b6", shine: "#fbcfe8", delay: 0.2 },
  { x: 65,  y: 448, r: 20, color: "#fbbf24", shine: "#fef08a", confetti: true, delay: 0.0 },
  { x: 18,  y: 440, r: 15, color: "#e0d7ff", shine: "#ffffff", delay: 0.3 },
  { x: 52,  y: 474, r: 13, color: "#c084fc", shine: "#e9d5ff", delay: 0.15 },

  // ── LEFT SHOULDER ──
  { x: 42,  y: 360, r: 24, color: "#c084fc", shine: "#e9d5ff", delay: 0.05 },
  { x: 76,  y: 340, r: 20, color: "#e0d7ff", shine: "#ffffff", delay: 0.2 },
  { x: 26,  y: 338, r: 16, color: "#f472b6", shine: "#fbcfe8", delay: 0.1 },
  { x: 62,  y: 365, r: 13, color: "#fbbf24", shine: "#fef08a", confetti: true, delay: 0.35 },

  // ── TOP LEFT ──
  { x: 88,  y: 260, r: 30, color: "#f472b6", shine: "#fbcfe8", delay: 0.1 },
  { x: 122, y: 238, r: 26, color: "#fbbf24", shine: "#fef08a", confetti: true, delay: 0.05 },
  { x: 72,  y: 234, r: 20, color: "#e0d7ff", shine: "#ffffff", delay: 0.2 },
  { x: 108, y: 266, r: 16, color: "#c084fc", shine: "#e9d5ff", delay: 0.3 },

  // ── TOP CENTER ──
  { x: 152, y: 192, r: 34, color: "#c084fc", shine: "#e9d5ff", delay: 0.15 },
  { x: 191, y: 165, r: 40, color: "#f472b6", shine: "#fbcfe8", delay: 0.0 },
  { x: 230, y: 180, r: 34, color: "#e0d7ff", shine: "#ffffff", delay: 0.1 },
  { x: 173, y: 155, r: 24, color: "#fbbf24", shine: "#fef08a", confetti: true, delay: 0.2 },
  { x: 213, y: 148, r: 22, color: "#fbbf24", shine: "#fef08a", confetti: true, delay: 0.05 },
  { x: 195, y: 128, r: 18, color: "#c084fc", shine: "#e9d5ff", delay: 0.25 },

  // ── TOP RIGHT ──
  { x: 268, y: 232, r: 28, color: "#e0d7ff", shine: "#ffffff", delay: 0.1 },
  { x: 300, y: 250, r: 24, color: "#f472b6", shine: "#fbcfe8", delay: 0.2 },
  { x: 256, y: 252, r: 18, color: "#c084fc", shine: "#e9d5ff", delay: 0.0 },
  { x: 284, y: 215, r: 20, color: "#fbbf24", shine: "#fef08a", confetti: true, delay: 0.15 },

  // ── RIGHT SHOULDER ──
  { x: 316, y: 348, r: 26, color: "#f472b6", shine: "#fbcfe8", delay: 0.1 },
  { x: 350, y: 360, r: 22, color: "#c084fc", shine: "#e9d5ff", delay: 0.05 },
  { x: 362, y: 334, r: 16, color: "#e0d7ff", shine: "#ffffff", delay: 0.25 },
  { x: 334, y: 374, r: 13, color: "#fbbf24", shine: "#fef08a", confetti: true, delay: 0.3 },

  // ── RIGHT UPPER ──
  { x: 325, y: 448, r: 26, color: "#e0d7ff", shine: "#ffffff", delay: 0.2 },
  { x: 358, y: 434, r: 20, color: "#f472b6", shine: "#fbcfe8", delay: 0.1 },
  { x: 372, y: 462, r: 14, color: "#c084fc", shine: "#e9d5ff", delay: 0.0 },
  { x: 340, y: 466, r: 13, color: "#fbbf24", shine: "#fef08a", confetti: true, delay: 0.35 },

  // ── RIGHT MID ──
  { x: 326, y: 544, r: 28, color: "#c084fc", shine: "#e9d5ff", delay: 0.05 },
  { x: 360, y: 528, r: 22, color: "#fbbf24", shine: "#fef08a", confetti: true, delay: 0.2 },
  { x: 374, y: 558, r: 15, color: "#e0d7ff", shine: "#ffffff", delay: 0.1 },
  { x: 342, y: 562, r: 14, color: "#f472b6", shine: "#fbcfe8", delay: 0.3 },

  // ── RIGHT LOWER ──
  { x: 323, y: 642, r: 30, color: "#e0d7ff", shine: "#ffffff", delay: 0.15 },
  { x: 356, y: 628, r: 24, color: "#c084fc", shine: "#e9d5ff", delay: 0.05 },
  { x: 370, y: 652, r: 18, color: "#f472b6", shine: "#fbcfe8", delay: 0.2 },
  { x: 340, y: 660, r: 15, color: "#fbbf24", shine: "#fef08a", confetti: true, delay: 0.0 },

  // ── RIGHT BASE ──
  { x: 318, y: 738, r: 34, color: "#f472b6", shine: "#fbcfe8", delay: 0.1 },
  { x: 354, y: 724, r: 28, color: "#e0d7ff", shine: "#ffffff", delay: 0.2 },
  { x: 370, y: 752, r: 20, color: "#fbbf24", shine: "#fef08a", confetti: true, delay: 0.05 },
  { x: 336, y: 758, r: 17, color: "#c084fc", shine: "#e9d5ff", delay: 0.3 },
];

/* Confetti dots for gold balloons */
const CONFETTI_DOTS = [
  [0.3, 0.25], [0.55, 0.35], [0.45, 0.55], [0.65, 0.6],
  [0.3, 0.65], [0.6, 0.2], [0.4, 0.42], [0.7, 0.45],
];

function GarlandBalloon({ x, y, r, color, shine, confetti, delay }: typeof GARLAND[0]) {
  const id = `gb${Math.round(x)}${Math.round(y)}`;
  const floatY = -4 - (delay * 3);
  return (
    <motion.div
      style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, zIndex: 8, pointerEvents: "none" }}
      animate={{ y: [0, floatY, 0, floatY * 0.5, 0] }}
      transition={{ duration: 2.8 + delay * 1.5, repeat: Infinity, ease: "easeInOut", delay }}>
      <svg width={r * 2} height={r * 2} viewBox={`0 0 ${r * 2} ${r * 2}`}>
        <defs>
          <radialGradient id={`${id}g`} cx="35%" cy="30%" r="60%">
            <stop offset="0%" stopColor={shine} />
            <stop offset="50%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity={0.75} />
          </radialGradient>
        </defs>
        {confetti ? (
          <>
            <circle cx={r} cy={r} r={r} fill={`url(#${id}g)`} opacity={0.88} />
            {CONFETTI_DOTS.map(([dx, dy], i) => (
              <circle key={i} cx={dx * r * 2} cy={dy * r * 2} r={r * 0.1}
                fill={["#fbbf24","#f472b6","#c084fc","#38bdf8","#fbbf24","#f472b6","#c084fc","#fbbf24"][i]}
                opacity={0.8} />
            ))}
          </>
        ) : (
          <circle cx={r} cy={r} r={r} fill={`url(#${id}g)`} />
        )}
        {/* Shine */}
        <ellipse cx={r * 0.62} cy={r * 0.42} rx={r * 0.22} ry={r * 0.14}
          fill="white" opacity={0.45} transform={`rotate(-30,${r * 0.62},${r * 0.42})`} />
      </svg>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   STARS / NEBULAE
───────────────────────────────────────── */
const STARS = Array.from({ length: 110 }, (_, i) => ({
  x: (i * 137.5) % 390,
  y: (i * 83.7) % 844,
  r: 0.5 + (i % 4) * 0.55,
  delay: (i * 0.23) % 4,
  dur: 2 + (i % 6) * 0.45,
}));

function StarField() {
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none" }}>
      {STARS.map((s, i) => (
        <motion.circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white"
          animate={{ opacity: [0.1, 0.9, 0.1] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: "easeInOut" }} />
      ))}
    </svg>
  );
}

function Nebulae() {
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none" }}>
      <ellipse cx={55}  cy={200} rx={90}  ry={70}  fill="#4c1d95" opacity={0.2} />
      <ellipse cx={335} cy={180} rx={75}  ry={60}  fill="#1e3a5f" opacity={0.18} />
      <ellipse cx={195} cy={720} rx={130} ry={80}  fill="#5b21b6" opacity={0.15} />
      <ellipse cx={40}  cy={580} rx={65}  ry={50}  fill="#0c4a6e" opacity={0.15} />
      <ellipse cx={350} cy={640} rx={75}  ry={55}  fill="#4c1d95" opacity={0.12} />
    </svg>
  );
}

/* ─────────────────────────────────────────
   CURTAIN
───────────────────────────────────────── */
const CURTAIN_LEFT  = 60;   // x start
const CURTAIN_RIGHT = 330;  // x end
const CURTAIN_TOP   = 148;  // y start (sits under balloon arch)
const CURTAIN_W     = (CURTAIN_RIGHT - CURTAIN_LEFT) / 2; // 135 per panel
const CURTAIN_H     = 844 - CURTAIN_TOP;

/* Fabric fold gradient – alternating dark/light vertical bands */
const foldGradient = `repeating-linear-gradient(
  to right,
  rgba(76,29,149,0.95)  0px,
  rgba(55,20,115,1)     9px,
  rgba(90,45,170,0.9)  18px,
  rgba(55,20,115,1)    27px,
  rgba(76,29,149,0.95) 36px
)`;

function CurtainPanel({ side, open }: { side: "left" | "right"; open: boolean }) {
  const isLeft = side === "left";
  const x = isLeft ? CURTAIN_LEFT : CURTAIN_LEFT + CURTAIN_W;

  return (
    <motion.div
      style={{
        position: "absolute",
        left: x,
        top: CURTAIN_TOP,
        width: CURTAIN_W,
        height: CURTAIN_H,
        transformOrigin: isLeft ? "right center" : "left center",
        zIndex: 5,
        overflow: "hidden",
      }}
      animate={open
        ? { x: isLeft ? -CURTAIN_W - 10 : CURTAIN_W + 10, opacity: 0.5, scaleX: 0.7 }
        : { x: 0, opacity: 1, scaleX: 1 }}
      transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}>

      {/* Fabric base */}
      <div style={{ width: "100%", height: "100%", background: foldGradient, position: "relative" }}>

        {/* Gold shimmer stripe */}
        <div style={{
          position: "absolute", inset: 0,
          background: isLeft
            ? "linear-gradient(to right, rgba(251,191,36,0.06) 0%, transparent 60%)"
            : "linear-gradient(to left,  rgba(251,191,36,0.06) 0%, transparent 60%)",
        }} />

        {/* Top gather / ruffle */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 22,
          background: "linear-gradient(to bottom, rgba(120,60,220,1), rgba(76,29,149,0.6))",
        }} />

        {/* Animated subtle sway ripple */}
        <motion.div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to right, transparent 40%, rgba(150,100,255,0.06) 55%, transparent 70%)",
        }}
          animate={{ x: isLeft ? [0, 6, 0, -4, 0] : [0, -6, 0, 4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />

        {/* Bottom puddle gradient */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
          background: "linear-gradient(to bottom, transparent, rgba(40,10,100,0.9))",
        }} />
      </div>

      {/* Inner edge seam */}
      <div style={{
        position: "absolute",
        [isLeft ? "right" : "left"]: 0,
        top: 0, bottom: 0, width: 3,
        background: "rgba(251,191,36,0.3)",
        boxShadow: isLeft ? "-2px 0 8px rgba(251,191,36,0.15)" : "2px 0 8px rgba(251,191,36,0.15)",
      }} />
    </motion.div>
  );
}

/* The warm light that glows behind curtain when opening */
function RevealGlow({ show }: { show: boolean }) {
  return (
    <motion.div style={{
      position: "absolute",
      left: CURTAIN_LEFT, top: CURTAIN_TOP,
      width: CURTAIN_W * 2, height: CURTAIN_H,
      zIndex: 4, pointerEvents: "none",
      background: "radial-gradient(ellipse at center 30%, #fffbe0 0%, #ffd080 35%, #ff80c0 65%, transparent 100%)",
    }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration: 0.6, delay: 0.3 }} />
  );
}

/* ─────────────────────────────────────────
   CAKE
───────────────────────────────────────── */
function CandleFlame({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <motion.ellipse cx={cx} cy={cy} rx={3.5} ry={6} fill="#FFD700"
        animate={{ scaleX: [1, 0.7, 1.1, 0.85, 1], scaleY: [1, 1.1, 0.9, 1.05, 1] }}
        transition={{ duration: 0.75, repeat: Infinity }}
        style={{ transformOrigin: `${cx}px ${cy}px` }} />
      <motion.ellipse cx={cx} cy={cy + 1.5} rx={2} ry={3.5} fill="#FF8C00"
        animate={{ scaleX: [1, 0.8, 1.1, 0.9, 1] }}
        transition={{ duration: 0.75, repeat: Infinity }}
        style={{ transformOrigin: `${cx}px ${cy + 1.5}px` }} />
      <motion.ellipse cx={cx} cy={cy + 2.5} rx={1} ry={2} fill="white" opacity={0.5}
        animate={{ opacity: [0.5, 0.85, 0.45, 0.75, 0.5] }}
        transition={{ duration: 0.6, repeat: Infinity }} />
    </>
  );
}

function ThreeTierCake() {
  const candles = [114, 136, 158];
  return (
    <svg viewBox="0 0 280 280" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <defs>
        <radialGradient id="ct1" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#4c1d95" />
        </radialGradient>
        <radialGradient id="ct2" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#1d4ed8" /><stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
        <radialGradient id="ct3" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#be185d" /><stop offset="100%" stopColor="#831843" />
        </radialGradient>
        <filter id="cglow"><feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <ellipse cx={140} cy={258} rx={92} ry={10} fill="#2d1b69" />
      {/* Bottom */}
      <rect x={56}  y={198} width={168} height={58} rx={8} fill="url(#ct1)" />
      <ellipse cx={140} cy={198} rx={84} ry={9} fill="#7c3aed" />
      <ellipse cx={140} cy={256} rx={84} ry={9} fill="#3b1578" />
      {[68,92,116,140,164,188,212].map((x,i)=>(
        <g key={i}><circle cx={x} cy={228} r={7} fill={["#FF6B9D","#A855F7","#60A5FA","#34D399","#FCD34D","#FB923C","#E879F9"][i]} />
        <circle cx={x} cy={228} r={3.5} fill="white" opacity={0.3}/></g>
      ))}
      {/* Middle */}
      <rect x={80}  y={146} width={120} height={54} rx={7} fill="url(#ct2)" />
      <ellipse cx={140} cy={146} rx={60} ry={8} fill="#1d4ed8" />
      <ellipse cx={140} cy={200} rx={60} ry={8} fill="#142ea8" />
      {[88,108,128,148,168,188].map((x,i)=>(
        <g key={i}><circle cx={x} cy={173} r={6} fill={["#FCD34D","#FF6B9D","#60A5FA","#34D399","#A855F7","#FCD34D"][i]} />
        <circle cx={x} cy={173} r={3} fill="white" opacity={0.3}/></g>
      ))}
      {/* Top */}
      <rect x={104} y={102} width={72}  height={46} rx={7} fill="url(#ct3)" />
      <ellipse cx={140} cy={102} rx={36} ry={6.5} fill="#be185d" />
      <ellipse cx={140} cy={148} rx={36} ry={6.5} fill="#9d1254" />
      {[115,135,155].map((x,i)=>(
        <g key={i}><circle cx={x} cy={125} r={5} fill={["#FCD34D","#60A5FA","#34D399"][i]} />
        <circle cx={x} cy={125} r={2.5} fill="white" opacity={0.3}/></g>
      ))}
      {/* Candles */}
      {candles.map((cx,i)=>(
        <g key={i}>
          <rect x={cx-3} y={78} width={6} height={25} rx={2.5} fill={["#FF6B9D","#A855F7","#60A5FA"][i]} />
          <CandleFlame cx={cx} cy={71} />
        </g>
      ))}
      <ellipse cx={140} cy={82} rx={55} ry={22} fill="#FFD700" opacity={0.1} filter="url(#cglow)" />
      <motion.g filter="url(#cglow)"
        animate={{ scale:[1,1.2,1], rotate:[0,15,0,-15,0] }}
        transition={{ duration:2.2, repeat:Infinity }}
        style={{ transformOrigin:"140px 88px" }}>
        <polygon points="140,81 142.8,88.5 150,88.5 144.2,92.8 146.5,100 140,95.5 133.5,100 135.8,92.8 130,88.5 137.2,88.5"
          fill="#FFD700" />
      </motion.g>
    </svg>
  );
}

function ConfettiPiece({ x, color, delay }: { x: number; color: string; delay: number }) {
  const s = 5 + (delay * 7) % 6;
  return (
    <motion.div style={{
      position: "absolute", left: `${x}%`, top: -12, zIndex: 30, pointerEvents: "none",
      width: s, height: s, borderRadius: delay % 1 > 0.5 ? "50%" : 2, backgroundColor: color,
    }}
      animate={{ y: [0, 900], rotate: [0, 540 + delay * 200], opacity: [1, 1, 0.4, 0] }}
      transition={{ duration: 1.8 + delay * 0.5, delay: delay * 0.6, ease: "linear" }} />
  );
}

const CFCOLORS = ["#f472b6","#c084fc","#fbbf24","#38bdf8","#34d399","#fb923c","#e879f9"];

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export function BirthdayDoor() {
  const [open, setOpen]           = useState(false);
  const [showCake, setShowCake]   = useState(false);
  const [confetti, setConfetti]   = useState(false);

  const cfPieces = Array.from({ length: 55 }, (_, i) => ({
    id: i, x: (i * 19.3) % 100,
    color: CFCOLORS[i % CFCOLORS.length],
    delay: (i * 0.07),
  }));

  function handleCurtainTap() {
    if (open) return;
    setOpen(true);
    setTimeout(() => { setShowCake(true); setConfetti(true); }, 900);
    setTimeout(() => setConfetti(false), 4500);
  }

  function handleReplay() {
    setShowCake(false);
    setConfetti(false);
    setTimeout(() => setOpen(false), 100);
  }

  return (
    <div style={{
      width: 390, height: 844, position: "relative", overflow: "hidden",
      background: "linear-gradient(175deg, #04001a 0%, #0d0034 35%, #060018 100%)",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      userSelect: "none",
    }}>
      {/* Cosmic background */}
      <StarField />
      <Nebulae />

      {/* Confetti burst */}
      <AnimatePresence>
        {confetti && cfPieces.map(p => <ConfettiPiece key={p.id} {...p} />)}
      </AnimatePresence>

      {/* ══════════════ SCENE 1: CURTAIN ══════════════ */}
      <AnimatePresence>
        {!showCake && (
          <motion.div key="curtain-scene"
            style={{ position: "absolute", inset: 0, zIndex: 10 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}>

            {/* Header */}
            <motion.div style={{ position: "absolute", top: 44, left: 0, right: 0, textAlign: "center", zIndex: 20 }}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}>
              <p style={{ color: "#7c5cbf", fontSize: 10, letterSpacing: 4, textTransform: "uppercase", marginBottom: 4, fontFamily: "sans-serif" }}>
                YOU'RE INVITED TO
              </p>
              <h1 style={{
                fontSize: 26, fontWeight: "bold", lineHeight: 1.2, margin: "0 0 2px",
                background: "linear-gradient(120deg,#f472b6 0%,#c084fc 50%,#60a5fa 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {name}'s Birthday
              </h1>
              <motion.p style={{ color: "#6b4ea0", fontSize: 11, fontFamily: "sans-serif" }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity }}>
                ✨ A special surprise awaits ✨
              </motion.p>
            </motion.div>

            {/* Warm glow reveal behind curtain */}
            <RevealGlow show={open} />

            {/* Curtain panels */}
            <CurtainPanel side="left"  open={open} />
            <CurtainPanel side="right" open={open} />

            {/* Tap zone — overlaid on curtain center */}
            <motion.button
              onClick={handleCurtainTap}
              style={{
                position: "absolute",
                left: CURTAIN_LEFT, top: CURTAIN_TOP,
                width: CURTAIN_W * 2, height: CURTAIN_H,
                background: "transparent", border: "none",
                cursor: open ? "default" : "pointer",
                zIndex: 6,
              }}>
              {/* Tap hint */}
              <AnimatePresence>
                {!open && (
                  <motion.div
                    style={{
                      position: "absolute", bottom: 200, left: 0, right: 0,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2.2, repeat: Infinity }}
                    exit={{ opacity: 0 }}>
                    <motion.div
                      style={{
                        width: 44, height: 44, borderRadius: "50%",
                        border: "1.5px solid rgba(192,132,252,0.5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(124,60,200,0.18)",
                        backdropFilter: "blur(4px)",
                      }}
                      animate={{ scale: [1, 1.12, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity }}>
                      <span style={{ fontSize: 20 }}>👆</span>
                    </motion.div>
                    <p style={{ color: "rgba(192,132,252,0.75)", fontSize: 11, letterSpacing: 2, fontFamily: "sans-serif", margin: 0 }}>
                      TAP TO REVEAL
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Balloon garland — on top of curtain */}
            {GARLAND.map((b, i) => <GarlandBalloon key={i} {...b} />)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════ SCENE 2: CAKE ══════════════ */}
      <AnimatePresence>
        {showCake && (
          <motion.div key="cake-scene"
            style={{ position: "absolute", inset: 0, zIndex: 12, display: "flex", flexDirection: "column", alignItems: "center" }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}>

            <motion.div style={{ marginTop: 56, textAlign: "center", paddingInline: 28 }}
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}>
              <p style={{ color: "#7c5cbf", fontSize: 10, letterSpacing: 4, textTransform: "uppercase", marginBottom: 4, fontFamily: "sans-serif" }}>
                HAPPY BIRTHDAY
              </p>
              <h1 style={{
                fontSize: 32, fontWeight: "bold", lineHeight: 1.15,
                background: "linear-gradient(120deg,#f472b6 0%,#c084fc 45%,#60a5fa 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {name} 🎂
              </h1>
              <p style={{ color: "#7c6aaa", fontSize: 12, fontFamily: "sans-serif" }}>
                Turning {age} never looked so magical!
              </p>
            </motion.div>

            <motion.div style={{ width: 268, height: 268, marginTop: 20 }}
              initial={{ scale: 0.1, rotate: -18 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}>
              <ThreeTierCake />
            </motion.div>

            <motion.div style={{ textAlign: "center", marginTop: 18, paddingInline: 36 }}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85 }}>
              <motion.h2 style={{
                fontSize: 28, fontWeight: "bold", marginBottom: 10,
                background: "linear-gradient(120deg,#f472b6,#c084fc,#60a5fa,#34d399)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
                🌟 Make a Wish 🌟
              </motion.h2>
              <p style={{ color: "#9370cc", fontSize: 13, lineHeight: 1.75, fontFamily: "sans-serif" }}>
                Close your eyes, take a deep breath,<br />
                and wish for everything you deserve 💫
              </p>
            </motion.div>

            {[12, 30, 52, 70, 88].map((x, i) => (
              <motion.div key={i}
                style={{ position: "absolute", left: `${x}%`, bottom: 90 + i * 22, zIndex: 3, pointerEvents: "none" }}
                animate={{ y: [0, -18, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.45 }}>
                <span style={{ fontSize: 14 }}>✨</span>
              </motion.div>
            ))}

            <motion.p
              style={{ position: "absolute", bottom: 80, color: "#7c6aaa", fontSize: 12, letterSpacing: 1.5, fontFamily: "sans-serif" }}
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 3, repeat: Infinity }}>
              ✨ wishing you the world ✨
            </motion.p>

            <motion.button
              onClick={handleReplay}
              style={{
                position: "absolute", bottom: 32,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(180,130,255,0.3)",
                borderRadius: 24, padding: "8px 22px", color: "#9370cc",
                fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
                fontFamily: "sans-serif", cursor: "pointer",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              whileHover={{ background: "rgba(180,130,255,0.15)" }}>
              ↩ Replay
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
