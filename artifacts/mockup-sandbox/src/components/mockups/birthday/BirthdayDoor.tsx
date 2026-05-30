import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const name = "Priya";
const age = 25;

/* ── Balloon string path follows the arch boundary ── */
const ARCH_CX = 100; // centre of arch in door-local coords (door is 200w)
const ARCH_CY = 110; // centre of arch radius

/* Generate positions along the arch + sides */
function archPoint(t: number): { x: number; y: number } {
  // t = 0 → left base, t = 0.5 → top, t = 1 → right base
  if (t <= 0.5) {
    // left side going up
    const tt = t / 0.5; // 0→1
    const angle = Math.PI + tt * Math.PI; // π → 2π (left → top)
    return {
      x: ARCH_CX + 100 * Math.cos(angle),
      y: ARCH_CY + 100 * Math.sin(angle),
    };
  } else {
    const tt = (t - 0.5) / 0.5; // 0→1
    const angle = 2 * Math.PI + tt * Math.PI; // 0 → π  (top → right)
    // right side going down
    return {
      x: ARCH_CX + 100 * Math.cos(angle),
      y: ARCH_CY + 100 * Math.sin(angle),
    };
  }
}

const BALLOON_COUNT = 16;
const BALLOON_COLORS = [
  { fill: "#FF6B9D", shine: "#FFB3D1" },
  { fill: "#A855F7", shine: "#D8B4FE" },
  { fill: "#60A5FA", shine: "#BAD7FF" },
  { fill: "#34D399", shine: "#A7F3D0" },
  { fill: "#FCD34D", shine: "#FEF08A" },
  { fill: "#FB923C", shine: "#FED7AA" },
  { fill: "#E879F9", shine: "#F5D0FE" },
  { fill: "#38BDF8", shine: "#BAE6FD" },
];

const ARCH_BALLOONS = Array.from({ length: BALLOON_COUNT }, (_, i) => {
  const t = i / (BALLOON_COUNT - 1);
  const pt = archPoint(t);
  const c = BALLOON_COLORS[i % BALLOON_COLORS.length];
  return {
    ...pt,
    ...c,
    size: 22 + (i % 3) * 4,
    delay: i * 0.12,
    floatDir: i % 2 === 0 ? 1 : -1,
  };
});

/* Stars for background */
const STARS = Array.from({ length: 120 }, (_, i) => ({
  x: Math.random() * 390,
  y: Math.random() * 844,
  r: 0.5 + Math.random() * 2,
  delay: Math.random() * 4,
  dur: 2 + Math.random() * 3,
}));

function StarField() {
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none" }}>
      {STARS.map((s, i) => (
        <motion.circle key={i} cx={s.x} cy={s.y} r={s.r}
          fill="white"
          animate={{ opacity: [0.15, 1, 0.15], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
          style={{ transformOrigin: `${s.x}px ${s.y}px` }} />
      ))}
    </svg>
  );
}

/* Shooting stars */
function ShootingStars() {
  const shots = [
    { x: 20, y: 60, delay: 3 },
    { x: 200, y: 30, delay: 7 },
    { x: 300, y: 100, delay: 11 },
  ];
  return (
    <>
      {shots.map((s, i) => (
        <motion.div key={i}
          style={{ position: "absolute", left: s.x, top: s.y, width: 80, height: 2, zIndex: 2,
            background: "linear-gradient(90deg, white, transparent)",
            borderRadius: 2, pointerEvents: "none" }}
          animate={{ x: [0, 160], opacity: [0, 1, 0], rotate: 15 }}
          transition={{ duration: 0.8, repeat: Infinity, repeatDelay: s.delay + 4, delay: s.delay }} />
      ))}
    </>
  );
}

/* Nebula glow blobs */
function Nebulae() {
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none" }}>
      <ellipse cx={60} cy={160} rx={90} ry={70} fill="#4c1d95" opacity={0.18} />
      <ellipse cx={330} cy={200} rx={80} ry={60} fill="#1e3a5f" opacity={0.2} />
      <ellipse cx={195} cy={700} rx={120} ry={80} fill="#5b21b6" opacity={0.15} />
      <ellipse cx={50} cy={600} rx={70} ry={50} fill="#0c4a6e" opacity={0.15} />
      <ellipse cx={340} cy={650} rx={80} ry={55} fill="#4c1d95" opacity={0.12} />
    </svg>
  );
}

/* Arch balloon — positioned relative to the door container */
function ArchBalloon({ x, y, fill, shine, size, delay, floatDir }: typeof ARCH_BALLOONS[0]) {
  const id = `ab${Math.round(x)}${Math.round(y)}`;
  return (
    <motion.div
      style={{ position: "absolute", left: x - size / 2, top: y - size * 0.55, width: size, height: size * 1.2, zIndex: 16, pointerEvents: "none" }}
      animate={{ y: [0, -5 * floatDir, 0, -2 * floatDir, 0] }}
      transition={{ duration: 2.8 + delay * 0.3, repeat: Infinity, ease: "easeInOut", delay }}>
      <svg width={size} height={size * 1.2} viewBox={`0 0 ${size} ${size * 1.2}`}>
        <defs>
          <radialGradient id={`${id}fill`} cx="34%" cy="28%" r="58%">
            <stop offset="0%" stopColor={shine} />
            <stop offset="60%" stopColor={fill} />
            <stop offset="100%" stopColor={fill} stopOpacity={0.7} />
          </radialGradient>
        </defs>
        <ellipse cx={size / 2} cy={size * 0.45} rx={size * 0.42} ry={size * 0.45} fill={`url(#${id}fill)`} />
        <ellipse cx={size * 0.35} cy={size * 0.27} rx={size * 0.1} ry={size * 0.07} fill="white" opacity={0.55} />
        <path d={`M ${size * 0.44} ${size * 0.9} Q ${size * 0.5} ${size} ${size * 0.56} ${size * 0.9}`}
          fill="none" stroke={fill} strokeWidth={1.2} />
        <line x1={size * 0.5} y1={size} x2={size * 0.5} y2={size * 1.18}
          stroke={fill} strokeWidth={1} strokeDasharray="2,2" opacity={0.5} />
      </svg>
    </motion.div>
  );
}

/* String connecting balloons */
function BalloonString() {
  const pts = ARCH_BALLOONS.map(b => `${b.x},${b.y}`).join(" ");
  return (
    <svg style={{ position: "absolute", inset: 0, width: 200, height: 310, zIndex: 14, pointerEvents: "none" }}>
      <polyline points={pts} fill="none" stroke="rgba(200,180,255,0.35)" strokeWidth={1.2} strokeDasharray="3,4" />
    </svg>
  );
}

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
        fill="white" opacity={0.5}
        animate={{ opacity: [0.5, 0.85, 0.45, 0.75, 0.5] }}
        transition={{ duration: 0.6, repeat: Infinity }}
        style={{ transformOrigin: `${cx}px ${cy + 2.5}px` }} />
    </>
  );
}

function ThreeTierCake() {
  const topCandles = [114, 136, 158];
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
        <radialGradient id="cplate" cx="50%" cy="20%" r="70%">
          <stop offset="0%" stopColor="#2d1b69" /><stop offset="100%" stopColor="#1a0f3d" />
        </radialGradient>
        <filter id="cglow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      {/* Plate */}
      <ellipse cx={140} cy={258} rx={92} ry={10} fill="url(#cplate)" />
      <ellipse cx={140} cy={258} rx={92} ry={10} fill="none" stroke="#4c1d95" strokeWidth={1} />

      {/* Bottom tier */}
      <rect x={56} y={198} width={168} height={58} rx={8} fill="url(#ct1)" />
      <ellipse cx={140} cy={198} rx={84} ry={9} fill="#7c3aed" />
      <ellipse cx={140} cy={256} rx={84} ry={9} fill="#3b1578" />
      {[68,88,108,128,148,168,188,208].map((x, i) => (
        <motion.path key={i} d={`M ${x} 198 Q ${x} ${210} ${x} ${215}`}
          stroke="white" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.3}
          animate={{ d: [`M ${x} 198 Q ${x} 208 ${x} 213`,`M ${x} 198 Q ${x} 213 ${x} 218`,`M ${x} 198 Q ${x} 208 ${x} 213`] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }} />
      ))}
      {[68,92,116,140,164,188,212].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={228} r={7}
            fill={["#FF6B9D","#A855F7","#60A5FA","#34D399","#FCD34D","#FB923C","#E879F9"][i]} />
          <circle cx={x} cy={228} r={3.5} fill="white" opacity={0.3} />
        </g>
      ))}

      {/* Middle tier */}
      <rect x={80} y={146} width={120} height={54} rx={7} fill="url(#ct2)" />
      <ellipse cx={140} cy={146} rx={60} ry={8} fill="#1d4ed8" />
      <ellipse cx={140} cy={200} rx={60} ry={8} fill="#142ea8" />
      {[88,110,132,152,172].map((x, i) => (
        <motion.path key={i} d={`M ${x} 146 Q ${x} 154 ${x} 160`}
          stroke="white" strokeWidth={4.5} strokeLinecap="round" fill="none" opacity={0.25}
          animate={{ d: [`M ${x} 146 Q ${x} 152 ${x} 158`,`M ${x} 146 Q ${x} 157 ${x} 163`,`M ${x} 146 Q ${x} 152 ${x} 158`] }}
          transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.25 }} />
      ))}
      {[88,108,128,148,168,188].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={173} r={6} fill={["#FCD34D","#FF6B9D","#60A5FA","#34D399","#A855F7","#FCD34D"][i]} />
          <circle cx={x} cy={173} r={3} fill="white" opacity={0.3} />
        </g>
      ))}

      {/* Top tier */}
      <rect x={104} y={102} width={72} height={46} rx={7} fill="url(#ct3)" />
      <ellipse cx={140} cy={102} rx={36} ry={6.5} fill="#be185d" />
      <ellipse cx={140} cy={148} rx={36} ry={6.5} fill="#9d1254" />
      {[112,132,152,168].map((x, i) => (
        <motion.path key={i} d={`M ${x} 102 Q ${x} 108 ${x} 114`}
          stroke="white" strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.25}
          animate={{ d: [`M ${x} 102 Q ${x} 107 ${x} 112`,`M ${x} 102 Q ${x} 111 ${x} 116`,`M ${x} 102 Q ${x} 107 ${x} 112`] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }} />
      ))}
      {[115,135,155].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={125} r={5} fill={["#FCD34D","#60A5FA","#34D399"][i]} />
          <circle cx={x} cy={125} r={2.5} fill="white" opacity={0.3} />
        </g>
      ))}

      {/* Candles */}
      {topCandles.map((cx, i) => (
        <g key={i}>
          <rect x={cx - 3} y={78} width={6} height={25} rx={2.5}
            fill={["#FF6B9D","#A855F7","#60A5FA"][i]} />
          <rect x={cx - 1} y={78} width={2} height={25} rx={1} fill="white" opacity={0.2} />
          <CandleFlame cx={cx} cy={71} />
        </g>
      ))}

      {/* Glow */}
      <ellipse cx={140} cy={80} rx={55} ry={22} fill="#FFD700" opacity={0.12} filter="url(#cglow)" />

      {/* Star topper */}
      <motion.g filter="url(#cglow)"
        animate={{ scale: [1, 1.2, 1], rotate: [0, 15, 0, -15, 0] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        style={{ transformOrigin: "140px 88px" }}>
        <polygon points="140,81 142.8,88.5 150,88.5 144.2,92.8 146.5,100 140,95.5 133.5,100 135.8,92.8 130,88.5 137.2,88.5"
          fill="#FFD700" />
      </motion.g>
    </svg>
  );
}

function ConfettiPiece({ x, color, delay }: { x: number; color: string; delay: number }) {
  const size = 5 + Math.random() * 6;
  return (
    <motion.div style={{
      position: "absolute", left: `${x}%`, top: -12, zIndex: 25, pointerEvents: "none",
      width: size, height: size, borderRadius: Math.random() > 0.5 ? "50%" : 2,
      backgroundColor: color,
    }}
      animate={{ y: [0, 900], rotate: [0, 720 + Math.random() * 360], opacity: [1, 1, 0.5, 0] }}
      transition={{ duration: 2.0 + delay * 0.4, delay, ease: "linear" }} />
  );
}

const CONFETTI_COLORS = ["#FF6B9D","#A855F7","#60A5FA","#34D399","#FCD34D","#FB923C","#E879F9","#38BDF8"];

export function BirthdayDoor() {
  const [phase, setPhase] = useState<"door" | "unlocking" | "opening" | "cake">("door");
  const [lockShake, setLockShake] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i, x: Math.random() * 100,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 0.9,
  }));

  function handleLockTap() {
    if (phase !== "door") return;
    setLockShake(true);
    setTimeout(() => setLockShake(false), 500);
    setTimeout(() => setPhase("unlocking"), 150);
    setTimeout(() => setPhase("opening"), 850);
    setTimeout(() => { setPhase("cake"); setShowConfetti(true); }, 1700);
    setTimeout(() => setShowConfetti(false), 4000);
  }

  return (
    <div style={{
      width: 390, height: 844, position: "relative", overflow: "hidden",
      background: "linear-gradient(175deg, #04001a 0%, #0d0034 30%, #0a0028 60%, #060018 100%)",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      userSelect: "none",
    }}>
      {/* Cosmic background */}
      <StarField />
      <ShootingStars />
      <Nebulae />

      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && confettiPieces.map(p => <ConfettiPiece key={p.id} {...p} />)}
      </AnimatePresence>

      {/* ────────── SCENE 1: DOOR ────────── */}
      <AnimatePresence>
        {phase !== "cake" && (
          <motion.div key="door-scene"
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", zIndex: 10 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.35 }}>

            {/* Header */}
            <motion.div style={{ marginTop: 56, textAlign: "center", zIndex: 12, paddingInline: 28 }}
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}>
              <p style={{ color: "#9370cc", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", marginBottom: 5, fontFamily: "sans-serif" }}>
                YOU'RE INVITED TO
              </p>
              <h1 style={{
                fontSize: 28, fontWeight: "bold", lineHeight: 1.2, marginBottom: 3,
                background: "linear-gradient(120deg, #f472b6 0%, #c084fc 45%, #60a5fa 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {name}'s Birthday
              </h1>
              <motion.p style={{ color: "#7c6aaa", fontSize: 12, fontFamily: "sans-serif" }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity }}>
                ✨ Celebration ✨
              </motion.p>
            </motion.div>

            {/* Door + balloon ring */}
            <motion.div style={{ position: "relative", marginTop: 28, zIndex: 10 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}>

              {/* Arch SVG frame */}
              <svg width={240} height={350} viewBox="0 0 240 350"
                style={{ position: "absolute", left: -20, top: -20, zIndex: 15, pointerEvents: "none" }}>
                <defs>
                  <linearGradient id="arch-g" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f472b6" />
                    <stop offset="33%" stopColor="#c084fc" />
                    <stop offset="66%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                  <filter id="arch-glow">
                    <feGaussianBlur stdDeviation="5" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <path d="M 20 340 L 20 120 Q 20 20 120 20 Q 220 20 220 120 L 220 340 Z"
                  fill="none" stroke="url(#arch-g)" strokeWidth={20} filter="url(#arch-glow)" opacity={0.5} />
                <path d="M 20 340 L 20 120 Q 20 20 120 20 Q 220 20 220 120 L 220 340 Z"
                  fill="none" stroke="url(#arch-g)" strokeWidth={3.5} />
              </svg>

              {/* Balloon string */}
              <BalloonString />

              {/* Arch balloons */}
              {ARCH_BALLOONS.map((b, i) => <ArchBalloon key={i} {...b} />)}

              {/* Door body */}
              <div style={{ width: 200, height: 310, position: "relative", borderRadius: "100px 100px 0 0", overflow: "hidden" }}>

                {/* Warm reveal light */}
                <motion.div style={{
                  position: "absolute", inset: 0, zIndex: 1,
                  background: "radial-gradient(ellipse, #ffe8a0 0%, #ffb060 40%, #ff80a0 80%, transparent 100%)",
                }}
                  animate={{ opacity: phase === "opening" ? 1 : 0 }}
                  transition={{ duration: 0.5, delay: 0.25 }} />

                {/* Left door */}
                <motion.div style={{
                  position: "absolute", left: 0, top: 0, width: "50%", height: "100%",
                  transformOrigin: "left center", zIndex: 3,
                  background: "linear-gradient(145deg, #1e1040 0%, #16093a 50%, #0d0628 100%)",
                  borderRight: "1px solid rgba(150,100,255,0.25)",
                }}
                  animate={phase === "opening" ? { rotateY: -88 } : { rotateY: 0 }}
                  transition={{ duration: 0.9, ease: [0.2, 0.8, 0.3, 1] }}>
                  <div style={{ padding: "12px 10px" }}>
                    {[100, 140].map((h, i) => (
                      <div key={i} style={{
                        height: h, marginBottom: 10,
                        border: "1px solid rgba(150,100,255,0.2)", borderRadius: 8,
                        background: "rgba(150,100,255,0.07)",
                        boxShadow: "inset 0 0 12px rgba(180,120,255,0.05)",
                      }} />
                    ))}
                  </div>
                  {/* Star details on door */}
                  {[{x:40,y:60},{x:65,y:140},{x:30,y:200}].map((p,i)=>(
                    <motion.div key={i} style={{ position:"absolute", left:p.x, top:p.y, color:"rgba(180,140,255,0.4)", fontSize:10 }}
                      animate={{ opacity:[0.2,0.6,0.2] }}
                      transition={{ duration:2, repeat:Infinity, delay:i*0.7 }}>★</motion.div>
                  ))}
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(130deg,rgba(180,140,255,0.08) 0%,transparent 55%)" }} />
                </motion.div>

                {/* Right door */}
                <motion.div style={{
                  position: "absolute", right: 0, top: 0, width: "50%", height: "100%",
                  transformOrigin: "right center", zIndex: 3,
                  background: "linear-gradient(145deg, #1e1040 0%, #16093a 50%, #0d0628 100%)",
                  borderLeft: "1px solid rgba(150,100,255,0.25)",
                }}
                  animate={phase === "opening" ? { rotateY: 88 } : { rotateY: 0 }}
                  transition={{ duration: 0.9, ease: [0.2, 0.8, 0.3, 1] }}>
                  <div style={{ padding: "12px 10px" }}>
                    {[100, 140].map((h, i) => (
                      <div key={i} style={{
                        height: h, marginBottom: 10,
                        border: "1px solid rgba(150,100,255,0.2)", borderRadius: 8,
                        background: "rgba(150,100,255,0.07)",
                      }} />
                    ))}
                  </div>
                  {[{x:20,y:80},{x:45,y:170},{x:25,y:240}].map((p,i)=>(
                    <motion.div key={i} style={{ position:"absolute", left:p.x, top:p.y, color:"rgba(180,140,255,0.4)", fontSize:10 }}
                      animate={{ opacity:[0.2,0.6,0.2] }}
                      transition={{ duration:2, repeat:Infinity, delay:i*0.6 }}>★</motion.div>
                  ))}
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(130deg,rgba(180,140,255,0.08) 0%,transparent 55%)" }} />
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
                    ? "drop-shadow(0 0 20px #FFD700) drop-shadow(0 0 40px #FFB300)"
                    : "drop-shadow(0 0 12px rgba(192,132,252,0.8))",
                }}
                animate={lockShake ? { x: [0, -8, 8, -5, 5, -2, 2, 0] } : { x: 0 }}
                transition={{ duration: 0.45 }}>
                <motion.svg width={52} height={60} viewBox="0 0 52 60"
                  animate={phase === "unlocking"
                    ? { scale: [1, 1.3, 0.85, 1.2, 0], y: [0, -6, 2, -3, -28], opacity: [1, 1, 1, 1, 0] }
                    : {}}
                  transition={{ duration: 0.75 }}>
                  <defs>
                    <linearGradient id="lock-cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c084fc" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                  <path d="M 15 28 L 15 18 Q 15 5 26 5 Q 37 5 37 18 L 37 28"
                    fill="none" stroke="#9333ea" strokeWidth={5.5} strokeLinecap="round" />
                  <rect x={8} y={26} width={36} height={28} rx={7} fill="url(#lock-cg)" />
                  <rect x={8} y={26} width={36} height={28} rx={7} fill="none" stroke="#d8b4fe" strokeWidth={1.5} />
                  <circle cx={26} cy={37} r={5.5} fill="white" opacity={0.5} />
                  <rect x={24} y={39} width={4} height={8} rx={2} fill="white" opacity={0.5} />
                  <ellipse cx={15} cy={32} rx={5} ry={3} fill="white" opacity={0.2} transform="rotate(-25,15,32)" />
                </motion.svg>
              </motion.button>
            </motion.div>

            {/* Tap hint */}
            <AnimatePresence>
              {phase === "door" && (
                <motion.p
                  style={{ marginTop: 30, color: "#7c6aaa", fontSize: 12, letterSpacing: 1.5, fontFamily: "sans-serif", textAlign: "center" }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                  exit={{ opacity: 0 }}>
                  ✨ tap the lock to enter ✨
                </motion.p>
              )}
            </AnimatePresence>

            {/* Bottom cosmic glow */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, pointerEvents: "none", zIndex: 3 }}>
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(to top, rgba(76,29,149,0.3), transparent)" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────────── SCENE 2: CAKE ────────── */}
      <AnimatePresence>
        {phase === "cake" && (
          <motion.div key="cake-scene"
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", zIndex: 10 }}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}>

            {/* Header */}
            <motion.div style={{ marginTop: 56, textAlign: "center", paddingInline: 28 }}
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}>
              <p style={{ color: "#9370cc", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", marginBottom: 5, fontFamily: "sans-serif" }}>
                HAPPY BIRTHDAY
              </p>
              <h1 style={{
                fontSize: 32, fontWeight: "bold", lineHeight: 1.15, marginBottom: 3,
                background: "linear-gradient(120deg, #f472b6 0%, #c084fc 45%, #60a5fa 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {name} 🎂
              </h1>
              <p style={{ color: "#7c6aaa", fontSize: 12, fontFamily: "sans-serif" }}>
                Turning {age} never looked so magical!
              </p>
            </motion.div>

            {/* Cake */}
            <motion.div style={{ width: 268, height: 268, marginTop: 20 }}
              initial={{ scale: 0.1, rotate: -18 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}>
              <ThreeTierCake />
            </motion.div>

            {/* Make a Wish */}
            <motion.div style={{ textAlign: "center", marginTop: 18, paddingInline: 36 }}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85 }}>
              <motion.h2 style={{
                fontSize: 28, fontWeight: "bold", marginBottom: 10,
                background: "linear-gradient(120deg, #f472b6, #c084fc, #60a5fa, #34d399)",
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

            {/* Floating stars */}
            {[12, 30, 52, 70, 88].map((x, i) => (
              <motion.div key={i}
                style={{ position: "absolute", left: `${x}%`, bottom: 80 + i * 25, zIndex: 3, pointerEvents: "none" }}
                animate={{ y: [0, -20, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.45 }}>
                <span style={{ fontSize: 14 }}>✨</span>
              </motion.div>
            ))}

            <motion.p
              style={{ position: "absolute", bottom: 44, color: "#7c6aaa", fontSize: 12, letterSpacing: 1.5, fontFamily: "sans-serif" }}
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 3, repeat: Infinity }}>
              ✨ wishing you the world ✨
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
