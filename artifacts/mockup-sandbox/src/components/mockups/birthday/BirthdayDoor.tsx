import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const name = "Priya";
const age = 25;

const BALLOONS = [
  { x: 6,  y: 48, size: 54, color: "#FFB3C6", shine: "#FFE4EC", delay: 0,    swing: 8  },
  { x: 16, y: 24, size: 46, color: "#C9B8FF", shine: "#EDE8FF", delay: 0.15, swing: -6 },
  { x: 2,  y: 68, size: 40, color: "#B8F0E6", shine: "#E0FAF5", delay: 0.3,  swing: 5  },
  { x: 74, y: 46, size: 52, color: "#FFD6A5", shine: "#FFF0DC", delay: 0.1,  swing: -8 },
  { x: 82, y: 22, size: 44, color: "#FFC8DD", shine: "#FFE8F0", delay: 0.25, swing: 6  },
  { x: 76, y: 68, size: 38, color: "#A0D4FF", shine: "#D6EEFF", delay: 0.35, swing: -5 },
  { x: 42, y: 4,  size: 48, color: "#FDFFB6", shine: "#FFFDE0", delay: 0.2,  swing: 7  },
  { x: 27, y: 10, size: 36, color: "#FFB3C6", shine: "#FFE4EC", delay: 0.4,  swing: -7 },
  { x: 60, y: 8,  size: 42, color: "#C9B8FF", shine: "#EDE8FF", delay: 0.05, swing: 5  },
];

function Balloon({ x, y, size, color, shine, delay, swing }: typeof BALLOONS[0]) {
  const id = `b${x}${y}`;
  return (
    <motion.div
      style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: size, height: size * 1.25, zIndex: 5, pointerEvents: "none" }}
      animate={{ rotate: [0, swing, 0, -swing * 0.6, 0] }}
      transition={{ duration: 3 + delay * 2, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <svg width={size} height={size * 1.25} viewBox={`0 0 ${size} ${size * 1.25}`}>
        <defs>
          <radialGradient id={`${id}bg`} cx="36%" cy="30%" r="58%">
            <stop offset="0%" stopColor={shine} />
            <stop offset="55%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.75" />
          </radialGradient>
          <radialGradient id={`${id}sh`} cx="28%" cy="22%" r="28%">
            <stop offset="0%" stopColor="white" stopOpacity="0.75" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={size / 2} cy={size * 0.46} rx={size * 0.43} ry={size * 0.46} fill={`url(#${id}bg)`} />
        <ellipse cx={size * 0.36} cy={size * 0.28} rx={size * 0.13} ry={size * 0.1} fill={`url(#${id}sh)`} />
        <path d={`M ${size * 0.46} ${size * 0.92} Q ${size * 0.5} ${size * 1.0} ${size * 0.54} ${size * 0.92}`}
          fill="none" stroke={color} strokeWidth={1.5} />
        <line x1={size * 0.5} y1={size * 1.0} x2={size * 0.5} y2={size * 1.22}
          stroke={color} strokeWidth={1.2} strokeDasharray="2,3" opacity={0.5} />
      </svg>
    </motion.div>
  );
}

function Sparkle({ x, y, size, delay, color }: { x: number; y: number; size: number; delay: number; color: string }) {
  return (
    <motion.div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, zIndex: 4, pointerEvents: "none" }}
      animate={{ opacity: [0, 1, 0], scale: [0.4, 1.3, 0.4], rotate: [0, 90, 180] }}
      transition={{ duration: 2.2 + delay, repeat: Infinity, delay, ease: "easeInOut" }}>
      <svg width={size} height={size} viewBox="0 0 12 12">
        <polygon points="6,0 7,5 12,6 7,7 6,12 5,7 0,6 5,5" fill={color} />
      </svg>
    </motion.div>
  );
}

const SPARKLES = [
  { x: 12, y: 35, size: 8, delay: 0,    color: "#FFB3C6" },
  { x: 88, y: 30, size: 7, delay: 0.6,  color: "#C9B8FF" },
  { x: 50, y: 18, size: 9, delay: 1.2,  color: "#FFD6A5" },
  { x: 22, y: 80, size: 6, delay: 0.3,  color: "#B8F0E6" },
  { x: 75, y: 78, size: 7, delay: 0.9,  color: "#FFC8DD" },
  { x: 35, y: 55, size: 5, delay: 1.5,  color: "#FDFFB6" },
  { x: 65, y: 52, size: 6, delay: 0.45, color: "#A0D4FF" },
  { x: 8,  y: 20, size: 7, delay: 1.8,  color: "#FFB3C6" },
  { x: 90, y: 60, size: 5, delay: 0.75, color: "#C9B8FF" },
];

function CandleFlame({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <motion.ellipse cx={cx} cy={cy} rx={3.5} ry={6}
        fill="#FFD700"
        animate={{ scaleX: [1, 0.7, 1.1, 0.85, 1], scaleY: [1, 1.1, 0.9, 1.05, 1] }}
        transition={{ duration: 0.75, repeat: Infinity }}
        style={{ transformOrigin: `${cx}px ${cy}px` }} />
      <motion.ellipse cx={cx} cy={cy + 1.5} rx={2} ry={3.5}
        fill="#FF8C00"
        animate={{ scaleX: [1, 0.8, 1.1, 0.9, 1] }}
        transition={{ duration: 0.75, repeat: Infinity }}
        style={{ transformOrigin: `${cx}px ${cy + 1.5}px` }} />
      <motion.ellipse cx={cx} cy={cy + 2.5} rx={1} ry={2}
        fill="white" opacity={0.55}
        animate={{ opacity: [0.55, 0.85, 0.45, 0.75, 0.55] }}
        transition={{ duration: 0.6, repeat: Infinity }}
        style={{ transformOrigin: `${cx}px ${cy + 2.5}px` }} />
    </>
  );
}

function ThreeTierCake() {
  const topCandles = [118, 138, 158];
  return (
    <svg viewBox="0 0 280 280" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <defs>
        <radialGradient id="c-tier1" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#FFF0DC" /><stop offset="100%" stopColor="#FFD6A5" />
        </radialGradient>
        <radialGradient id="c-tier2" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#EDE8FF" /><stop offset="100%" stopColor="#C9B8FF" />
        </radialGradient>
        <radialGradient id="c-tier3" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#FFE4EC" /><stop offset="100%" stopColor="#FFB3C6" />
        </radialGradient>
        <radialGradient id="c-plate" cx="50%" cy="20%" r="70%">
          <stop offset="0%" stopColor="#fffcf7" /><stop offset="100%" stopColor="#f5e6d3" />
        </radialGradient>
        <filter id="c-glow"><feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="c-soft"><feGaussianBlur stdDeviation="1.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      {/* Plate */}
      <ellipse cx={140} cy={258} rx={92} ry={10} fill="url(#c-plate)" />
      <ellipse cx={140} cy={258} rx={92} ry={10} fill="none" stroke="#e8d5b0" strokeWidth={1} />

      {/* === BOTTOM TIER === */}
      <rect x={56} y={198} width={168} height={58} rx={8} fill="url(#c-tier1)" />
      <ellipse cx={140} cy={198} rx={84} ry={9} fill="#FFD6A5" />
      <ellipse cx={140} cy={256} rx={84} ry={9} fill="#f0c888" />
      {/* bottom drips */}
      {[68,88,108,128,148,168,188,208].map((x, i) => (
        <motion.path key={i} d={`M ${x} 198 Q ${x} ${210 + (i % 2) * 4} ${x} ${216 + (i % 2) * 4}`}
          stroke="white" strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.55}
          animate={{ d: [`M ${x} 198 Q ${x} ${208 + (i % 2) * 4} ${x} ${212 + (i % 2) * 4}`, `M ${x} 198 Q ${x} ${212 + (i % 2) * 4} ${x} ${218 + (i % 2) * 4}`, `M ${x} 198 Q ${x} ${208 + (i % 2) * 4} ${x} ${212 + (i % 2) * 4}`] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }} />
      ))}
      {/* dots row */}
      {[68,92,116,140,164,188,212].map((x, i) => (
        <circle key={i} cx={x} cy={228} r={7}
          fill={["#FFB3C6","#C9B8FF","#B8F0E6","#FFD6A5","#FFC8DD","#FDFFB6","#A0D4FF"][i]} />
      ))}
      {/* sheen */}
      <rect x={56} y={198} width={168} height={58} rx={8}
        fill="linear-gradient(135deg,rgba(255,255,255,0.3) 0%,transparent 60%)" opacity={0.35} />

      {/* === MIDDLE TIER === */}
      <rect x={80} y={146} width={120} height={54} rx={7} fill="url(#c-tier2)" />
      <ellipse cx={140} cy={146} rx={60} ry={8} fill="#C9B8FF" />
      <ellipse cx={140} cy={200} rx={60} ry={8} fill="#b0a0e8" />
      {[88,110,132,152,172].map((x, i) => (
        <motion.path key={i} d={`M ${x} 146 Q ${x} ${156} ${x} ${162}`}
          stroke="white" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.5}
          animate={{ d: [`M ${x} 146 Q ${x} 154 ${x} 160`, `M ${x} 146 Q ${x} 158 ${x} 164`, `M ${x} 146 Q ${x} 154 ${x} 160`] }}
          transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.25 }} />
      ))}
      {[88,108,128,148,168,188].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={173} r={6} fill={["#FFB3C6","#FFD6A5","#B8F0E6","#FFC8DD","#FDFFB6","#FFB3C6"][i]} />
          <circle cx={x} cy={173} r={3.5} fill="white" opacity={0.5} />
        </g>
      ))}

      {/* === TOP TIER === */}
      <rect x={104} y={102} width={72} height={46} rx={7} fill="url(#c-tier3)" />
      <ellipse cx={140} cy={102} rx={36} ry={6.5} fill="#FFB3C6" />
      <ellipse cx={140} cy={148} rx={36} ry={6.5} fill="#f09ab3" />
      {[112,132,152,168].map((x, i) => (
        <motion.path key={i} d={`M ${x} 102 Q ${x} 110 ${x} 115`}
          stroke="white" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.5}
          animate={{ d: [`M ${x} 102 Q ${x} 108 ${x} 113`, `M ${x} 102 Q ${x} 112 ${x} 117`, `M ${x} 102 Q ${x} 108 ${x} 113`] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }} />
      ))}
      {[115,135,155].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={125} r={5} fill={["#C9B8FF","#FFD6A5","#B8F0E6"][i]} />
          <circle cx={x} cy={125} r={3} fill="white" opacity={0.55} />
        </g>
      ))}

      {/* === CANDLES on top tier === */}
      {topCandles.map((cx, i) => (
        <g key={i}>
          <rect x={cx - 3} y={78} width={6} height={25} rx={2.5}
            fill={["#FFB3C6","#C9B8FF","#FFD6A5"][i]} />
          <rect x={cx - 1} y={78} width={2} height={25} rx={1} fill="white" opacity={0.35} />
          <CandleFlame cx={cx} cy={71} />
        </g>
      ))}

      {/* Glow around top */}
      <ellipse cx={140} cy={80} rx={50} ry={20} fill="#FFD700" opacity={0.08} filter="url(#c-glow)" />

      {/* Star topper */}
      <motion.g filter="url(#c-glow)"
        animate={{ scale: [1, 1.18, 1], rotate: [0, 12, 0, -12, 0] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        style={{ transformOrigin: "140px 88px" }}>
        <polygon points="140,82 142.5,88.5 149,88.5 143.5,92.5 145.5,99 140,95 134.5,99 136.5,92.5 131,88.5 137.5,88.5"
          fill="#FFD700" />
      </motion.g>
    </svg>
  );
}

function ConfettiPiece({ x, color, delay, shape }: { x: number; color: string; delay: number; shape: "rect" | "circle" }) {
  const size = 6 + Math.random() * 6;
  return (
    <motion.div
      style={{
        position: "absolute", left: `${x}%`, top: -14, zIndex: 25, pointerEvents: "none",
        width: size, height: size,
        borderRadius: shape === "circle" ? "50%" : 2,
        backgroundColor: color,
      }}
      animate={{ y: [0, 920], rotate: [0, 360 * (2 + Math.random() * 2)], opacity: [1, 1, 0.6, 0] }}
      transition={{ duration: 2.2 + delay * 0.5, delay, ease: "linear" }}
    />
  );
}

const CONFETTI_COLORS = ["#FFB3C6","#C9B8FF","#FFD6A5","#B8F0E6","#FDFFB6","#A0D4FF","#FFC8DD"];

export function BirthdayDoor() {
  const [phase, setPhase] = useState<"door" | "unlocking" | "opening" | "cake">("door");
  const [lockShake, setLockShake] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const confettiPieces = Array.from({ length: 48 }, (_, i) => ({
    id: i, x: Math.random() * 100,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 1.0,
    shape: (i % 3 === 0 ? "circle" : "rect") as "circle" | "rect",
  }));

  function handleLockTap() {
    if (phase !== "door") return;
    setLockShake(true);
    setTimeout(() => setLockShake(false), 500);
    setTimeout(() => setPhase("unlocking"), 150);
    setTimeout(() => setPhase("opening"), 850);
    setTimeout(() => { setPhase("cake"); setShowConfetti(true); }, 1700);
    setTimeout(() => setShowConfetti(false), 3800);
  }

  return (
    <div style={{
      width: 390, height: 844, position: "relative", overflow: "hidden",
      background: "linear-gradient(155deg, #fff5fb 0%, #f4eeff 45%, #e8f8f5 100%)",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      userSelect: "none",
    }}>

      {/* Ambient sparkles */}
      {SPARKLES.map((s, i) => <Sparkle key={i} {...s} />)}

      {/* Balloons */}
      {BALLOONS.map((b, i) => <Balloon key={i} {...b} />)}

      {/* Confetti burst */}
      <AnimatePresence>
        {showConfetti && confettiPieces.map(p => <ConfettiPiece key={p.id} {...p} />)}
      </AnimatePresence>

      {/* ──────────── SCENE 1 : DOOR ──────────── */}
      <AnimatePresence>
        {phase !== "cake" && (
          <motion.div key="door-scene"
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center" }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.35 }}>

            {/* Welcome header */}
            <motion.div style={{ marginTop: 60, textAlign: "center", zIndex: 12, paddingInline: 28 }}
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}>
              <p style={{ color: "#c4a0d4", fontSize: 11, letterSpacing: 3.5, textTransform: "uppercase", marginBottom: 6, fontFamily: "sans-serif" }}>
                YOU'RE INVITED TO
              </p>
              <h1 style={{
                fontSize: 28, fontWeight: "bold", lineHeight: 1.2, marginBottom: 4,
                background: "linear-gradient(120deg, #e07bb5 0%, #9b6ddf 50%, #5bb8d4 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {name}'s Birthday
              </h1>
              <p style={{ color: "#c4a0d4", fontSize: 12, letterSpacing: 1.5, fontFamily: "sans-serif" }}>✨ Celebration ✨</p>
            </motion.div>

            {/* Arch door */}
            <motion.div style={{ position: "relative", marginTop: 32, zIndex: 10 }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}>

              {/* Arch SVG frame */}
              <svg width={240} height={350} viewBox="0 0 240 350"
                style={{ position: "absolute", left: -20, top: -20, zIndex: 15, pointerEvents: "none" }}>
                <defs>
                  <linearGradient id="arch-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f5c8e8" />
                    <stop offset="35%" stopColor="#d4b0f5" />
                    <stop offset="70%" stopColor="#a8d8f5" />
                    <stop offset="100%" stopColor="#b8f0e0" />
                  </linearGradient>
                  <filter id="arch-glow">
                    <feGaussianBlur stdDeviation="4" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                {/* Outer glow frame */}
                <path d="M 20 340 L 20 120 Q 20 20 120 20 Q 220 20 220 120 L 220 340 Z"
                  fill="none" stroke="url(#arch-grad)" strokeWidth={18} filter="url(#arch-glow)" opacity={0.7} />
                {/* Sharp frame line */}
                <path d="M 20 340 L 20 120 Q 20 20 120 20 Q 220 20 220 120 L 220 340 Z"
                  fill="none" stroke="url(#arch-grad)" strokeWidth={6} />
                {/* Jewel dots on arch */}
                {[0, 0.17, 0.33, 0.5, 0.67, 0.83, 1].map((t, i) => {
                  const angle = Math.PI + t * Math.PI;
                  const cx = 120 + 100 * Math.cos(angle);
                  const cy = 120 + 100 * Math.sin(angle);
                  const colors = ["#FFB3C6","#C9B8FF","#FFD6A5","#B8F0E6","#FFC8DD","#FDFFB6","#A0D4FF"];
                  return <circle key={i} cx={cx} cy={cy} r={7} fill={colors[i]} filter="url(#arch-glow)" />;
                })}
                {/* Little stars on frame */}
                {[40, 90, 185, 205].map((y, i) => (
                  <motion.circle key={i} cx={i < 2 ? 22 : 218} cy={y} r={4}
                    fill={["#FDFFB6","#FFB3C6","#C9B8FF","#B8F0E6"][i]}
                    animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.3, 0.8] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4 }}
                    style={{ transformOrigin: `${i < 2 ? 22 : 218}px ${y}px` }} />
                ))}
              </svg>

              {/* Door body with perspective */}
              <div style={{ width: 200, height: 310, position: "relative", borderRadius: "100px 100px 0 0", overflow: "hidden" }}>

                {/* Golden glow behind door (revealed on open) */}
                <motion.div style={{
                  position: "absolute", inset: 0, zIndex: 1,
                  background: "radial-gradient(ellipse at center, #fff8e0 0%, #ffe4a0 40%, #ffccd0 100%)",
                }}
                  animate={{ opacity: phase === "opening" ? 1 : 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }} />

                {/* Left panel */}
                <motion.div style={{
                  position: "absolute", left: 0, top: 0, width: "50%", height: "100%",
                  transformOrigin: "left center", zIndex: 3,
                  background: "linear-gradient(145deg, #fce8f8 0%, #ead5f5 40%, #d5e8f8 100%)",
                  borderRight: "1px solid rgba(200,170,230,0.3)",
                }}
                  animate={phase === "opening" ? { rotateY: -88 } : { rotateY: 0 }}
                  transition={{ duration: 0.85, ease: [0.2, 0.8, 0.3, 1] }}>
                  <div style={{ padding: "12px 10px" }}>
                    <div style={{ height: 100, border: "1.5px solid rgba(200,170,220,0.35)", borderRadius: 10, margin: "0 0 10px", background: "rgba(255,255,255,0.25)" }}>
                      <div style={{ margin: 10, height: 76, background: "rgba(255,255,255,0.2)", borderRadius: 7 }} />
                    </div>
                    <div style={{ height: 140, border: "1.5px solid rgba(200,170,220,0.35)", borderRadius: 10, background: "rgba(255,255,255,0.25)" }}>
                      <div style={{ margin: 10, height: 116, background: "rgba(255,255,255,0.2)", borderRadius: 7 }} />
                    </div>
                  </div>
                  {/* Sheen */}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(125deg,rgba(255,255,255,0.45) 0%,transparent 55%)", pointerEvents: "none" }} />
                </motion.div>

                {/* Right panel */}
                <motion.div style={{
                  position: "absolute", right: 0, top: 0, width: "50%", height: "100%",
                  transformOrigin: "right center", zIndex: 3,
                  background: "linear-gradient(145deg, #fce8f8 0%, #ead5f5 40%, #d5e8f8 100%)",
                  borderLeft: "1px solid rgba(200,170,230,0.3)",
                }}
                  animate={phase === "opening" ? { rotateY: 88 } : { rotateY: 0 }}
                  transition={{ duration: 0.85, ease: [0.2, 0.8, 0.3, 1] }}>
                  <div style={{ padding: "12px 10px" }}>
                    <div style={{ height: 100, border: "1.5px solid rgba(200,170,220,0.35)", borderRadius: 10, margin: "0 0 10px", background: "rgba(255,255,255,0.25)" }}>
                      <div style={{ margin: 10, height: 76, background: "rgba(255,255,255,0.2)", borderRadius: 7 }} />
                    </div>
                    <div style={{ height: 140, border: "1.5px solid rgba(200,170,220,0.35)", borderRadius: 10, background: "rgba(255,255,255,0.25)" }}>
                      <div style={{ margin: 10, height: 116, background: "rgba(255,255,255,0.2)", borderRadius: 7 }} />
                    </div>
                  </div>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(125deg,rgba(255,255,255,0.45) 0%,transparent 55%)", pointerEvents: "none" }} />
                </motion.div>
              </div>

              {/* Lock */}
              <motion.button
                onClick={handleLockTap}
                style={{
                  position: "absolute", left: "50%", top: "52%",
                  transform: "translateX(-50%)",
                  zIndex: 20, background: "none", border: "none", padding: 0, cursor: "pointer",
                  filter: phase === "unlocking"
                    ? "drop-shadow(0 0 16px #FFD700) drop-shadow(0 0 32px #FFB300)"
                    : "drop-shadow(0 3px 8px rgba(160,120,200,0.5))",
                }}
                animate={lockShake ? { x: [0, -8, 8, -5, 5, -2, 2, 0] } : { x: 0 }}
                transition={{ duration: 0.45 }}
              >
                <motion.svg width={52} height={60} viewBox="0 0 52 60"
                  animate={phase === "unlocking"
                    ? { scale: [1, 1.25, 0.9, 1.2, 0], y: [0, -5, 2, -3, -24], opacity: [1, 1, 1, 1, 0] }
                    : {}}
                  transition={{ duration: 0.75 }}>
                  <defs>
                    <linearGradient id="lock-g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ede0ff" />
                      <stop offset="100%" stopColor="#c4a8f8" />
                    </linearGradient>
                  </defs>
                  {/* Shackle */}
                  <path d="M 15 28 L 15 18 Q 15 5 26 5 Q 37 5 37 18 L 37 28"
                    fill="none" stroke="#b39ddb" strokeWidth={5.5} strokeLinecap="round" />
                  {/* Body */}
                  <rect x={8} y={26} width={36} height={28} rx={7} fill="url(#lock-g)" />
                  <rect x={8} y={26} width={36} height={28} rx={7} fill="none" stroke="#d8c0f8" strokeWidth={1.5} />
                  {/* Keyhole */}
                  <circle cx={26} cy={37} r={5.5} fill="white" opacity={0.65} />
                  <rect x={24} y={39} width={4} height={8} rx={2} fill="white" opacity={0.65} />
                  {/* Shine */}
                  <ellipse cx={16} cy={32} rx={5} ry={3} fill="white" opacity={0.28} transform="rotate(-25,16,32)" />
                </motion.svg>
              </motion.button>
            </motion.div>

            {/* Tap hint */}
            <AnimatePresence>
              {phase === "door" && (
                <motion.p
                  style={{ marginTop: 32, color: "#c4a0d4", fontSize: 12, letterSpacing: 1.5, fontFamily: "sans-serif", textAlign: "center" }}
                  animate={{ opacity: [0.45, 1, 0.45] }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                  exit={{ opacity: 0 }}>
                  ✨ tap the lock to enter ✨
                </motion.p>
              )}
            </AnimatePresence>

            {/* Floor rose petals */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 70, pointerEvents: "none", zIndex: 3 }}>
              <svg viewBox="0 0 390 70" width="100%" height="100%">
                {[0,1,2,3,4,5,6,7,8,9,10].map(i => {
                  const colors = ["#FFB3C6","#C9B8FF","#FFD6A5","#B8F0E6","#FFC8DD"];
                  return (
                    <ellipse key={i} cx={18 + i * 36} cy={50 + (i % 2) * 12} rx={10} ry={16}
                      fill={colors[i % 5]} opacity={0.4}
                      transform={`rotate(${i * 35}, ${18 + i * 36}, ${50 + (i % 2) * 12})`} />
                  );
                })}
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── SCENE 2 : CAKE ──────────── */}
      <AnimatePresence>
        {phase === "cake" && (
          <motion.div key="cake-scene"
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center" }}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}>

            {/* Header */}
            <motion.div style={{ marginTop: 58, textAlign: "center", paddingInline: 28 }}
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}>
              <p style={{ color: "#c4a0d4", fontSize: 11, letterSpacing: 3.5, textTransform: "uppercase", marginBottom: 5, fontFamily: "sans-serif" }}>
                HAPPY BIRTHDAY
              </p>
              <h1 style={{
                fontSize: 32, fontWeight: "bold", lineHeight: 1.15, marginBottom: 3,
                background: "linear-gradient(120deg, #e07bb5 0%, #9b6ddf 50%, #5bb8d4 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {name} 🎂
              </h1>
              <p style={{ color: "#b8a0cc", fontSize: 12, fontFamily: "sans-serif" }}>
                Turning {age} never looked so magical!
              </p>
            </motion.div>

            {/* Cake */}
            <motion.div style={{ width: 268, height: 268, marginTop: 18 }}
              initial={{ scale: 0.1, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}>
              <ThreeTierCake />
            </motion.div>

            {/* Make a Wish */}
            <motion.div style={{ textAlign: "center", marginTop: 16, paddingInline: 36 }}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}>
              <motion.h2 style={{
                fontSize: 30, fontWeight: "bold", marginBottom: 10,
                background: "linear-gradient(120deg, #FFB3C6, #C9B8FF, #FFD6A5, #B8F0E6)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
                🌟 Make a Wish 🌟
              </motion.h2>
              <p style={{ color: "#b388cc", fontSize: 13, lineHeight: 1.7, fontFamily: "sans-serif" }}>
                Close your eyes, take a deep breath,<br />
                and wish for everything you deserve 💫
              </p>
            </motion.div>

            {/* Floating stars */}
            {[15,35,55,75,88].map((x, i) => (
              <motion.div key={i}
                style={{ position: "absolute", left: `${x}%`, bottom: 80 + i * 20, zIndex: 3, pointerEvents: "none" }}
                animate={{ y: [0, -18, 0], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}>
                <span style={{ fontSize: 16 }}>✨</span>
              </motion.div>
            ))}

            <motion.p
              style={{ position: "absolute", bottom: 48, color: "#c4a0d4", fontSize: 12, letterSpacing: 1.5, fontFamily: "sans-serif" }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.8, repeat: Infinity }}>
              ✨ wishing you the world ✨
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
