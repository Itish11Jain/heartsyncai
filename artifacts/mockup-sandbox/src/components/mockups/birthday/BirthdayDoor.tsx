import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const name = "Priya";
const age = 25;

/* ══════════════════════════════════════════
   ARCH GEOMETRY
   Curtain arch center at (195, 318)
   Inner arch radius: 128px
   Balloon garland follows the outside
══════════════════════════════════════════ */
const CX = 195, CY = 318, ARCH_R = 128;
// Curtain rendered from (67, 190) → (323, 790)
const C_LEFT = 67, C_TOP = 190, C_W = 256, C_H = 600;

/* ══════════════════════════════════════════
   COLOR PALETTE (cosmic but vivid)
══════════════════════════════════════════ */
type BColor = { c: string; s: string; confetti?: true };
const P: BColor[] = [
  { c: "#c084fc", s: "#ede9fe" },          // violet
  { c: "#f472b6", s: "#fce7f3" },          // pink
  { c: "#fbbf24", s: "#fef9c3", confetti: true }, // gold confetti
  { c: "#e0d7ff", s: "#ffffff" },          // lavender/pearl
  { c: "#e879f9", s: "#fae8ff" },          // magenta
  { c: "#fb923c", s: "#ffedd5", confetti: true }, // peach confetti
];

/* ══════════════════════════════════════════
   GARLAND — dense, touching, patterned
   Built mathematically along the arch path
══════════════════════════════════════════ */
type B = { x: number; y: number; r: number; p: BColor; d: number };
const GARLAND: B[] = [];

let _pi = 0, _di = 0;
function nextP(offset = 0): BColor { return P[(_pi++ + offset) % P.length]; }
function nextD(): number { return (_di++ * 0.11) % 1.6; }

/* ── Cluster templates — each is a unique arrangement ── */
// Each cluster receives a local origin (ox, oy) and a rotation angle
// Returns absolute balloon positions relative to origin

type Cluster = { dx: number; dy: number; r: number; pi: number }[];

const CLUSTERS: Cluster[] = [
  // #0 Fan-up: 1 big top, 2 med sides, 1 small below-right
  [
    { dx:  0, dy: -22, r: 26, pi: 0 },
    { dx:-24, dy:  12, r: 20, pi: 1 },
    { dx: 24, dy:  12, r: 20, pi: 2 },
    { dx:  0, dy:  10, r: 14, pi: 3 },
  ],
  // #1 Triangle: big center, 2 above, 1 below
  [
    { dx:  0, dy:  0,  r: 28, pi: 0 },
    { dx:-24, dy: -30, r: 20, pi: 1 },
    { dx: 22, dy: -28, r: 20, pi: 2 },
    { dx:  0, dy:  28, r: 16, pi: 4 },
  ],
  // #2 Diamond: 4 around center
  [
    { dx:  0, dy:  0,  r: 24, pi: 2 },
    { dx:-26, dy: -20, r: 18, pi: 0 },
    { dx: 26, dy: -20, r: 18, pi: 3 },
    { dx:-14, dy:  24, r: 16, pi: 1 },
    { dx: 14, dy:  24, r: 16, pi: 4 },
  ],
  // #3 Column: 3 stacked, 1 accent
  [
    { dx:  0, dy: -26, r: 24, pi: 3 },
    { dx:  0, dy:   2, r: 22, pi: 0 },
    { dx:  0, dy:  28, r: 20, pi: 1 },
    { dx: 20, dy:   0, r: 14, pi: 2 },
  ],
  // #4 Mushroom: 1 top large + cluster below
  [
    { dx:  0, dy: -24, r: 28, pi: 1 },
    { dx:-20, dy:  12, r: 20, pi: 0 },
    { dx: 20, dy:  12, r: 20, pi: 2 },
    { dx:  0, dy:  32, r: 16, pi: 3 },
    { dx:-10, dy:  16, r: 12, pi: 4 },
  ],
  // #5 Side-pair + accent
  [
    { dx:-22, dy:  0,  r: 26, pi: 4 },
    { dx: 22, dy:  0,  r: 24, pi: 0 },
    { dx:  0, dy: -26, r: 18, pi: 1 },
    { dx:  0, dy:  26, r: 14, pi: 2 },
  ],
  // #6 Big single + ring of 4
  [
    { dx:  0, dy:  0,  r: 30, pi: 2 },
    { dx:-28, dy: -18, r: 16, pi: 0 },
    { dx: 28, dy: -18, r: 16, pi: 3 },
    { dx:-20, dy:  24, r: 14, pi: 1 },
    { dx: 20, dy:  24, r: 14, pi: 4 },
  ],
  // #7 Staircase
  [
    { dx:-18, dy: -22, r: 22, pi: 3 },
    { dx:  6, dy:  -4, r: 22, pi: 1 },
    { dx:-10, dy:  20, r: 18, pi: 0 },
    { dx: 22, dy:  18, r: 16, pi: 2 },
  ],
  // #8 Wide spread
  [
    { dx:-28, dy:  4,  r: 22, pi: 0 },
    { dx:  0, dy: -20, r: 26, pi: 2 },
    { dx: 28, dy:  4,  r: 22, pi: 1 },
    { dx:-12, dy:  22, r: 14, pi: 3 },
    { dx: 12, dy:  22, r: 14, pi: 4 },
  ],
  // #9 Tiered arch
  [
    { dx:-20, dy:  10, r: 24, pi: 1 },
    { dx: 20, dy:  10, r: 24, pi: 3 },
    { dx:  0, dy: -22, r: 28, pi: 0 },
    { dx:  0, dy:  28, r: 16, pi: 2 },
  ],
  // #10 Asymmetric bouquet
  [
    { dx: -8, dy:  0,  r: 28, pi: 4 },
    { dx: 22, dy: -14, r: 20, pi: 1 },
    { dx: 24, dy:  18, r: 18, pi: 0 },
    { dx:-24, dy: -18, r: 16, pi: 2 },
    { dx:-20, dy:  20, r: 14, pi: 3 },
  ],
  // #11 Tight cluster of 5
  [
    { dx:  0, dy:  0,  r: 26, pi: 0 },
    { dx:-24, dy: -10, r: 20, pi: 2 },
    { dx: 24, dy: -10, r: 20, pi: 1 },
    { dx:-18, dy:  20, r: 18, pi: 3 },
    { dx: 18, dy:  20, r: 18, pi: 4 },
  ],
];

/* Cluster anchor points along the garland path */
// t=0→1 parameterizes: bottom-left → up left side → arch top → down right side → bottom-right
const ANCHORS: { x: number; y: number; ci: number }[] = [
  // ── LEFT SIDE (x≈30, y: 790→320) ──
  { x: 30, y: 790, ci: 0  },
  { x: 28, y: 738, ci: 1  },
  { x: 26, y: 684, ci: 2  },
  { x: 26, y: 632, ci: 3  },
  { x: 28, y: 578, ci: 4  },
  { x: 28, y: 524, ci: 5  },
  { x: 30, y: 470, ci: 6  },
  { x: 30, y: 416, ci: 7  },
  { x: 32, y: 362, ci: 8  },

  // ── ARCH CURVE (following outside of semicircle) ──
  // Garland center at radius 160 from (CX=195, CY=318)
  // Angles 180°→360° (left→top→right) in screen coords where 270° = top
  //   point = (195 + 160*cos(θ°), 318 + 160*sin(θ°))
  // 185°: (195+160*cos185°, 318+160*sin185°) ≈ (195-159.3, 318-13.9) = (36, 304)
  { x:  36, y: 304, ci: 9  }, // ~185°
  // 202°: cos=-0.927, sin=-0.375 → (195-148,318-60)=(47,258)
  { x:  47, y: 258, ci: 10 }, // ~202°
  // 220°: cos=-0.766, sin=-0.643 → (195-123,318-103)=(72,215)
  { x:  72, y: 215, ci: 11 }, // ~220°
  // 238°: cos=-0.530, sin=-0.848 → (195-85,318-136)=(110,182)
  { x: 110, y: 182, ci: 0  }, // ~238°
  // 256°: cos=-0.139, sin=-0.990 → (195-22,318-158)=(173,160)
  { x: 155, y: 160, ci: 1  }, // ~256°
  // 270°: cos=0, sin=-1 → (195, 158)
  { x: 195, y: 150, ci: 2  }, // top
  // 284°: mirror
  { x: 237, y: 160, ci: 3  }, // ~284°
  // 302°: mirror
  { x: 280, y: 182, ci: 4  }, // ~302°
  // 320°: mirror
  { x: 318, y: 215, ci: 5  }, // ~320°
  // 338°: mirror
  { x: 343, y: 258, ci: 6  }, // ~338°
  // 355°: mirror
  { x: 354, y: 304, ci: 7  }, // ~355°

  // ── RIGHT SIDE (x≈360, y: 320→790) ──
  { x: 360, y: 362, ci: 8  },
  { x: 360, y: 416, ci: 9  },
  { x: 362, y: 470, ci: 10 },
  { x: 362, y: 524, ci: 11 },
  { x: 360, y: 578, ci: 0  },
  { x: 360, y: 632, ci: 1  },
  { x: 362, y: 684, ci: 2  },
  { x: 362, y: 738, ci: 3  },
  { x: 360, y: 790, ci: 4  },
];

// Build the garland balloons from anchors + cluster templates
ANCHORS.forEach(({ x: ox, y: oy, ci }) => {
  const cluster = CLUSTERS[ci];
  cluster.forEach(({ dx, dy, r, pi }) => {
    GARLAND.push({
      x: ox + dx,
      y: oy + dy,
      r,
      p: P[((_pi++) + pi) % P.length],
      d: nextD(),
    });
  });
});

/* ══════════════════════════════════════════
   BALLOON RENDERER
══════════════════════════════════════════ */
const CONFETTI_DOTS = [
  [0.3, 0.25], [0.55, 0.35], [0.45, 0.55], [0.65, 0.6],
  [0.3, 0.65], [0.6, 0.2],  [0.42, 0.42], [0.7, 0.45],
];

function GBalloon({ x, y, r, p, d }: B) {
  const id = `g${Math.round(x * 10)}${Math.round(y * 10)}`;
  return (
    <motion.div
      style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, zIndex: 8, pointerEvents: "none" }}
      animate={{ y: [0, -4 - d * 1.2, 0, -2 - d * 0.6, 0] }}
      transition={{ duration: 2.6 + d, repeat: Infinity, ease: "easeInOut", delay: d }}>
      <svg width={r * 2} height={r * 2} viewBox={`0 0 ${r * 2} ${r * 2}`}>
        <defs>
          <radialGradient id={`${id}g`} cx="34%" cy="28%" r="62%">
            <stop offset="0%" stopColor={p.s} />
            <stop offset="52%" stopColor={p.c} />
            <stop offset="100%" stopColor={p.c} stopOpacity={0.75} />
          </radialGradient>
        </defs>
        {p.confetti ? (
          <>
            <circle cx={r} cy={r} r={r} fill={`url(#${id}g)`} opacity={0.92} />
            {CONFETTI_DOTS.map(([dx, dy], i) => (
              <circle key={i} cx={dx * r * 2} cy={dy * r * 2} r={r * 0.09}
                fill={P[i % P.length].c} opacity={0.85} />
            ))}
          </>
        ) : (
          <circle cx={r} cy={r} r={r} fill={`url(#${id}g)`} />
        )}
        <ellipse cx={r * 0.6} cy={r * 0.38} rx={r * 0.2} ry={r * 0.13}
          fill="white" opacity={0.5} transform={`rotate(-30,${r * 0.6},${r * 0.38})`} />
      </svg>
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   STARS / NEBULAE
══════════════════════════════════════════ */
const STARS = Array.from({ length: 100 }, (_, i) => ({
  x: (i * 143.7) % 390, y: (i * 89.3) % 844,
  r: 0.5 + (i % 4) * 0.45, delay: (i * 0.19) % 4, dur: 2 + (i % 6) * 0.4,
}));

function StarField() {
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none" }}>
      {STARS.map((s, i) => (
        <motion.circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white"
          animate={{ opacity: [0.1, 0.85, 0.1] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay }} />
      ))}
    </svg>
  );
}

function Nebulae() {
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none" }}>
      <ellipse cx={55}  cy={200} rx={85} ry={65}  fill="#4c1d95" opacity={0.18} />
      <ellipse cx={335} cy={180} rx={75} ry={58}  fill="#1e3a5f" opacity={0.16} />
      <ellipse cx={195} cy={720} rx={125} ry={75} fill="#5b21b6" opacity={0.14} />
    </svg>
  );
}

/* ══════════════════════════════════════════
   ARCH CURTAIN — lighter, shimmery
══════════════════════════════════════════ */
// Arch shape: rect bottom + semicircle top
// Implemented via CSS border-radius on wrapper + overflow:hidden
// When opened, panels slide out horizontally — clipped by arch shape

// Light shimmery fabric: pearl/champagne/lavender with gold shimmer
const FOLD_LEFT = `repeating-linear-gradient(
  to right,
  rgba(220,200,255,0.92)  0px,
  rgba(190,165,240,0.95)  7px,
  rgba(235,215,255,0.88) 14px,
  rgba(195,170,245,0.93) 21px,
  rgba(220,200,255,0.92) 28px
)`;

const FOLD_RIGHT = `repeating-linear-gradient(
  to right,
  rgba(220,200,255,0.92)  0px,
  rgba(195,170,245,0.93)  7px,
  rgba(235,215,255,0.88) 14px,
  rgba(190,165,240,0.95) 21px,
  rgba(220,200,255,0.92) 28px
)`;

// Arch radius at top = C_W/2 = 128
const ARCH_BORDER_R = C_W / 2; // 128

function Curtain({ open }: { open: boolean }) {
  const panelW = C_W / 2; // 128

  return (
    <div style={{
      position: "absolute",
      left: C_LEFT, top: C_TOP,
      width: C_W, height: C_H,
      borderRadius: `${ARCH_BORDER_R}px ${ARCH_BORDER_R}px 0 0`,
      overflow: "hidden",
      zIndex: 5,
    }}>
      {/* Warm back-light (reveals on open) */}
      <motion.div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "radial-gradient(ellipse at 50% 25%, #fff8e0 0%, #ffd080 40%, #ffb0d0 75%, transparent 100%)",
      }}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.6, delay: 0.2 }} />

      {/* LEFT PANEL */}
      <motion.div
        style={{
          position: "absolute", left: 0, top: 0,
          width: panelW, height: "100%",
          background: FOLD_LEFT,
          zIndex: 2,
          boxShadow: "inset -4px 0 18px rgba(180,140,255,0.25)",
        }}
        animate={open ? { x: -panelW - 4, opacity: 0.6 } : { x: 0, opacity: 1 }}
        transition={{ duration: 1.05, ease: [0.4, 0, 0.2, 1] }}>
        {/* Gold shimmer overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.04) 40%, transparent 70%)",
          pointerEvents: "none",
        }} />
        {/* Top gather */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 18,
          background: "linear-gradient(to bottom, rgba(180,150,255,0.6), transparent)" }} />
        {/* Animated sway */}
        <motion.div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to right, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)",
        }}
          animate={{ x: [0, 5, 0, -3, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }} />
        {/* Centre seam gold line */}
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 2,
          background: "linear-gradient(to bottom, rgba(251,191,36,0.8), rgba(251,191,36,0.3))" }} />
      </motion.div>

      {/* RIGHT PANEL */}
      <motion.div
        style={{
          position: "absolute", right: 0, top: 0,
          width: panelW, height: "100%",
          background: FOLD_RIGHT,
          zIndex: 2,
          boxShadow: "inset 4px 0 18px rgba(180,140,255,0.25)",
        }}
        animate={open ? { x: panelW + 4, opacity: 0.6 } : { x: 0, opacity: 1 }}
        transition={{ duration: 1.05, ease: [0.4, 0, 0.2, 1] }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(225deg, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.04) 40%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 18,
          background: "linear-gradient(to bottom, rgba(180,150,255,0.6), transparent)" }} />
        <motion.div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to right, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)",
        }}
          animate={{ x: [0, -5, 0, 3, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }} />
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2,
          background: "linear-gradient(to bottom, rgba(251,191,36,0.8), rgba(251,191,36,0.3))" }} />
      </motion.div>
    </div>
  );
}

/* Arch outline glow frame (rendered behind balloons, above curtain) */
function ArchFrame() {
  const pad = 6;
  const fw = C_W + pad * 2, fh = C_H + pad * 2;
  const fr = ARCH_BORDER_R + pad;
  return (
    <svg style={{ position: "absolute", left: C_LEFT - pad, top: C_TOP - pad, width: fw, height: fh, zIndex: 6, pointerEvents: "none" }}>
      <defs>
        <linearGradient id="af" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="33%" stopColor="#c084fc" />
          <stop offset="66%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <filter id="afg"><feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Outer glow */}
      <path d={`M ${pad} ${fh} L ${pad} ${fr} A ${fr} ${fr} 0 0 1 ${fw - pad} ${fr} L ${fw - pad} ${fh} Z`}
        fill="none" stroke="url(#af)" strokeWidth={14} opacity={0.4} filter="url(#afg)" />
      {/* Sharp inner line */}
      <path d={`M ${pad} ${fh} L ${pad} ${fr} A ${fr} ${fr} 0 0 1 ${fw - pad} ${fr} L ${fw - pad} ${fh} Z`}
        fill="none" stroke="url(#af)" strokeWidth={2.5} opacity={0.9} />
    </svg>
  );
}

/* ══════════════════════════════════════════
   CAKE (cosmic)
══════════════════════════════════════════ */
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
        animate={{ opacity: [0.5, 0.9, 0.45, 0.75, 0.5] }}
        transition={{ duration: 0.6, repeat: Infinity }} />
    </>
  );
}

function Cake() {
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
        <filter id="cglo"><feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <ellipse cx={140} cy={258} rx={92} ry={10} fill="#2d1b69" />
      <rect x={56}  y={198} width={168} height={58} rx={8} fill="url(#ct1)" />
      <ellipse cx={140} cy={198} rx={84} ry={9} fill="#7c3aed" />
      <ellipse cx={140} cy={256} rx={84} ry={9} fill="#3b1578" />
      {[68,92,116,140,164,188,212].map((x,i)=>(
        <g key={i}><circle cx={x} cy={228} r={7} fill={P[i%P.length].c} /><circle cx={x} cy={228} r={3.5} fill="white" opacity={0.3}/></g>
      ))}
      <rect x={80}  y={146} width={120} height={54} rx={7} fill="url(#ct2)" />
      <ellipse cx={140} cy={146} rx={60} ry={8} fill="#1d4ed8" />
      <ellipse cx={140} cy={200} rx={60} ry={8} fill="#142ea8" />
      {[88,108,128,148,168,188].map((x,i)=>(
        <g key={i}><circle cx={x} cy={173} r={6} fill={P[(i+2)%P.length].c} /><circle cx={x} cy={173} r={3} fill="white" opacity={0.3}/></g>
      ))}
      <rect x={104} y={102} width={72}  height={46} rx={7} fill="url(#ct3)" />
      <ellipse cx={140} cy={102} rx={36} ry={6.5} fill="#be185d" />
      <ellipse cx={140} cy={148} rx={36} ry={6.5} fill="#9d1254" />
      {[115,135,155].map((x,i)=>(
        <g key={i}><circle cx={x} cy={125} r={5} fill={P[(i+1)%P.length].c} /><circle cx={x} cy={125} r={2.5} fill="white" opacity={0.3}/></g>
      ))}
      {candles.map((cx,i)=>(
        <g key={i}>
          <rect x={cx-3} y={78} width={6} height={25} rx={2.5} fill={P[i%3].c} />
          <CandleFlame cx={cx} cy={71} />
        </g>
      ))}
      <ellipse cx={140} cy={82} rx={55} ry={22} fill="#FFD700" opacity={0.1} filter="url(#cglo)" />
      <motion.g filter="url(#cglo)"
        animate={{ scale:[1,1.2,1], rotate:[0,15,0,-15,0] }}
        transition={{ duration:2.2, repeat:Infinity }}
        style={{ transformOrigin:"140px 88px" }}>
        <polygon points="140,81 142.8,88.5 150,88.5 144.2,92.8 146.5,100 140,95.5 133.5,100 135.8,92.8 130,88.5 137.2,88.5" fill="#FFD700" />
      </motion.g>
    </svg>
  );
}

function Confetto({ x, color, delay }: { x: number; color: string; delay: number }) {
  const s = 5 + (delay * 11) % 6;
  return (
    <motion.div style={{
      position: "absolute", left: `${x}%`, top: -12, zIndex: 30, pointerEvents: "none",
      width: s, height: s, borderRadius: delay % 1 > 0.55 ? "50%" : 2, backgroundColor: color,
    }}
      animate={{ y: [0, 900], rotate: [0, 540 + delay * 180], opacity: [1, 1, 0.4, 0] }}
      transition={{ duration: 1.9 + delay * 0.4, delay: delay * 0.5, ease: "linear" }} />
  );
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export function BirthdayDoor() {
  const [open, setOpen]         = useState(false);
  const [showCake, setShowCake] = useState(false);
  const [confetti, setConfetti] = useState(false);

  const cfPieces = Array.from({ length: 55 }, (_, i) => ({
    id: i, x: (i * 18.7) % 100, color: P[i % P.length].c, delay: i * 0.065,
  }));

  function handleTap() {
    if (open) return;
    setOpen(true);
    setTimeout(() => { setShowCake(true); setConfetti(true); }, 950);
    setTimeout(() => setConfetti(false), 4500);
  }

  function handleReplay() {
    setShowCake(false); setConfetti(false);
    setTimeout(() => setOpen(false), 80);
  }

  return (
    <div style={{
      width: 390, height: 844, position: "relative", overflow: "hidden",
      background: "linear-gradient(175deg, #04001a 0%, #0d0034 35%, #060018 100%)",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      userSelect: "none",
    }}>
      <StarField />
      <Nebulae />

      <AnimatePresence>
        {confetti && cfPieces.map(p => <Confetto key={p.id} x={p.x} color={p.color} delay={p.delay} />)}
      </AnimatePresence>

      {/* ══ SCENE 1 : CURTAIN ══ */}
      <AnimatePresence>
        {!showCake && (
          <motion.div key="scene1"
            style={{ position: "absolute", inset: 0, zIndex: 10 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.75 }}>

            {/* Header */}
            <motion.div style={{ position: "absolute", top: 38, left: 0, right: 0, textAlign: "center", zIndex: 20 }}
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <p style={{ color: "#7c5cbf", fontSize: 10, letterSpacing: 4, textTransform: "uppercase", marginBottom: 3, fontFamily: "sans-serif" }}>
                YOU'RE INVITED TO
              </p>
              <h1 style={{
                fontSize: 26, fontWeight: "bold", lineHeight: 1.15, margin: "0 0 2px",
                background: "linear-gradient(120deg,#f472b6,#c084fc,#60a5fa)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {name}'s Birthday
              </h1>
              <motion.p style={{ color: "#6b4ea0", fontSize: 11, fontFamily: "sans-serif" }}
                animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.5, repeat: Infinity }}>
                ✨ A special surprise awaits ✨
              </motion.p>
            </motion.div>

            {/* Arch curtain */}
            <Curtain open={open} />

            {/* Arch frame glow (below balloons) */}
            <ArchFrame />

            {/* Tap zone over curtain */}
            <motion.button onClick={handleTap} style={{
              position: "absolute",
              left: C_LEFT, top: C_TOP,
              width: C_W, height: C_H,
              background: "transparent", border: "none",
              cursor: open ? "default" : "pointer",
              zIndex: 7, borderRadius: `${ARCH_BORDER_R}px ${ARCH_BORDER_R}px 0 0`,
            }}>
              <AnimatePresence>
                {!open && (
                  <motion.div
                    style={{ position: "absolute", bottom: 180, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
                    animate={{ opacity: [0.45, 1, 0.45] }}
                    transition={{ duration: 2.2, repeat: Infinity }}
                    exit={{ opacity: 0 }}>
                    <motion.div style={{
                      width: 46, height: 46, borderRadius: "50%",
                      border: "1.5px solid rgba(220,180,255,0.55)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(180,140,255,0.15)", backdropFilter: "blur(4px)",
                    }}
                      animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.8, repeat: Infinity }}>
                      <span style={{ fontSize: 20 }}>👆</span>
                    </motion.div>
                    <p style={{ color: "rgba(210,170,255,0.85)", fontSize: 11, letterSpacing: 2.5, fontFamily: "sans-serif", margin: 0 }}>
                      TAP TO REVEAL
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Balloon garland — topmost layer */}
            {GARLAND.map((b, i) => <GBalloon key={i} {...b} />)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ SCENE 2 : CAKE ══ */}
      <AnimatePresence>
        {showCake && (
          <motion.div key="scene2"
            style={{ position: "absolute", inset: 0, zIndex: 12, display: "flex", flexDirection: "column", alignItems: "center" }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}>

            <motion.div style={{ marginTop: 54, textAlign: "center", paddingInline: 28 }}
              initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <p style={{ color: "#7c5cbf", fontSize: 10, letterSpacing: 4, textTransform: "uppercase", marginBottom: 4, fontFamily: "sans-serif" }}>HAPPY BIRTHDAY</p>
              <h1 style={{
                fontSize: 32, fontWeight: "bold", lineHeight: 1.15,
                background: "linear-gradient(120deg,#f472b6,#c084fc,#60a5fa)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>{name} 🎂</h1>
              <p style={{ color: "#7c6aaa", fontSize: 12, fontFamily: "sans-serif" }}>Turning {age} never looked so magical!</p>
            </motion.div>

            <motion.div style={{ width: 268, height: 268, marginTop: 20 }}
              initial={{ scale: 0.1, rotate: -18 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}>
              <Cake />
            </motion.div>

            <motion.div style={{ textAlign: "center", marginTop: 18, paddingInline: 36 }}
              initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}>
              <motion.h2 style={{
                fontSize: 28, fontWeight: "bold", marginBottom: 10,
                background: "linear-gradient(120deg,#f472b6,#c084fc,#60a5fa,#34d399)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}
                animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
                🌟 Make a Wish 🌟
              </motion.h2>
              <p style={{ color: "#9370cc", fontSize: 13, lineHeight: 1.75, fontFamily: "sans-serif" }}>
                Close your eyes, take a deep breath,<br />and wish for everything you deserve 💫
              </p>
            </motion.div>

            {[12, 30, 52, 70, 88].map((x, i) => (
              <motion.div key={i}
                style={{ position: "absolute", left: `${x}%`, bottom: 90 + i * 20, zIndex: 3, pointerEvents: "none" }}
                animate={{ y: [0, -18, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.45 }}>
                <span style={{ fontSize: 14 }}>✨</span>
              </motion.div>
            ))}

            <motion.p style={{ position: "absolute", bottom: 80, color: "#7c6aaa", fontSize: 12, letterSpacing: 1.5, fontFamily: "sans-serif" }}
              animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 3, repeat: Infinity }}>
              ✨ wishing you the world ✨
            </motion.p>

            <motion.button onClick={handleReplay} style={{
              position: "absolute", bottom: 32,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(180,130,255,0.3)",
              borderRadius: 24, padding: "8px 22px", color: "#9370cc",
              fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontFamily: "sans-serif", cursor: "pointer",
            }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
              whileHover={{ background: "rgba(180,130,255,0.15)" }}>
              ↩ Replay
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
