import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const name = "Priya";
const age = 25;

/* ══════════════════════════════════════════
   ARCH GEOMETRY — full screen
   Curtain spans entire 390×844 screen
══════════════════════════════════════════ */
const C_LEFT = 72;          // curtain left edge
const C_TOP  = 0;           // start at very top
const C_W    = 246;         // curtain width
const C_H    = 844;         // full screen height
const ARCH_R = C_W / 2;    // = 123  (arch radius = half-width)
const CX     = C_LEFT + ARCH_R; // = 195  arch centre-x
const CY     = ARCH_R;         // = 123  arch centre-y (arch peak near top)

/* ══════════════════════════════════════════
   PALETTE — Rose Gold · Off-White · Gold
══════════════════════════════════════════ */
type BColor = { c: string; s: string; confetti?: true };
const P: BColor[] = [
  { c: "#C9846A", s: "#F5D0C0" },
  { c: "#D4AF37", s: "#F5E57A", confetti: true },
  { c: "#FFF5EE", s: "#FFFFFF" },
  { c: "#E8A07A", s: "#F8D5C0" },
  { c: "#C4913A", s: "#ECD080", confetti: true },
  { c: "#F2DFC8", s: "#FFFBF5" },
];

/* ══════════════════════════════════════════
   GARLAND — dense cluster-packing around arch
══════════════════════════════════════════ */
type B = { x: number; y: number; r: number; p: BColor; d: number };
const GARLAND: B[] = [];
let _pi = 0, _di = 0;
function nextD() { return (_di++ * 0.11) % 1.6; }

type Cluster = { dx: number; dy: number; r: number; pi: number }[];
const CLUSTERS: Cluster[] = [
  // #0 Fan-up
  [{ dx:0,dy:-22,r:27,pi:0 },{ dx:-25,dy:13,r:21,pi:1 },{ dx:25,dy:13,r:21,pi:2 },{ dx:0,dy:12,r:14,pi:3 }],
  // #1 Triangle
  [{ dx:0,dy:0,r:29,pi:0 },{ dx:-25,dy:-32,r:21,pi:1 },{ dx:23,dy:-30,r:21,pi:2 },{ dx:0,dy:30,r:16,pi:4 }],
  // #2 Diamond-5
  [{ dx:0,dy:0,r:25,pi:2 },{ dx:-27,dy:-21,r:19,pi:0 },{ dx:27,dy:-21,r:19,pi:3 },{ dx:-15,dy:25,r:17,pi:1 },{ dx:15,dy:25,r:17,pi:4 }],
  // #3 Column
  [{ dx:0,dy:-27,r:25,pi:3 },{ dx:0,dy:2,r:23,pi:0 },{ dx:0,dy:30,r:21,pi:1 },{ dx:21,dy:1,r:15,pi:2 }],
  // #4 Mushroom
  [{ dx:0,dy:-25,r:29,pi:1 },{ dx:-21,dy:13,r:21,pi:0 },{ dx:21,dy:13,r:21,pi:2 },{ dx:0,dy:34,r:17,pi:3 },{ dx:-11,dy:17,r:13,pi:4 }],
  // #5 Side-pair
  [{ dx:-23,dy:0,r:27,pi:4 },{ dx:23,dy:0,r:25,pi:0 },{ dx:0,dy:-27,r:19,pi:1 },{ dx:0,dy:27,r:15,pi:2 }],
  // #6 Big-ring
  [{ dx:0,dy:0,r:31,pi:2 },{ dx:-29,dy:-19,r:17,pi:0 },{ dx:29,dy:-19,r:17,pi:3 },{ dx:-21,dy:25,r:15,pi:1 },{ dx:21,dy:25,r:15,pi:4 }],
  // #7 Staircase
  [{ dx:-19,dy:-23,r:23,pi:3 },{ dx:7,dy:-4,r:23,pi:1 },{ dx:-11,dy:21,r:19,pi:0 },{ dx:23,dy:19,r:17,pi:2 }],
  // #8 Wide
  [{ dx:-29,dy:5,r:23,pi:0 },{ dx:0,dy:-21,r:27,pi:2 },{ dx:29,dy:5,r:23,pi:1 },{ dx:-13,dy:23,r:15,pi:3 },{ dx:13,dy:23,r:15,pi:4 }],
  // #9 Tiered-arch
  [{ dx:-21,dy:11,r:25,pi:1 },{ dx:21,dy:11,r:25,pi:3 },{ dx:0,dy:-23,r:29,pi:0 },{ dx:0,dy:29,r:17,pi:2 }],
  // #10 Asymmetric
  [{ dx:-9,dy:0,r:29,pi:4 },{ dx:23,dy:-15,r:21,pi:1 },{ dx:25,dy:19,r:19,pi:0 },{ dx:-25,dy:-19,r:17,pi:2 },{ dx:-21,dy:21,r:15,pi:3 }],
  // #11 Tight-cluster
  [{ dx:0,dy:0,r:27,pi:0 },{ dx:-25,dy:-11,r:21,pi:2 },{ dx:25,dy:-11,r:21,pi:1 },{ dx:-19,dy:21,r:19,pi:3 },{ dx:19,dy:21,r:19,pi:4 }],
];

// Garland anchor points — recalculated for full-screen arch
// Left side: x≈30, y from 840 up to CY(123), spacing ≈70px
// Top arch: follows curve outside the arch, clamped to y≥0
// Right side: x≈360, mirror of left
const ANCHORS: { x: number; y: number; ci: number }[] = [
  // ── LEFT SIDE ──
  { x:30,  y:840, ci:0  },
  { x:28,  y:768, ci:1  },
  { x:28,  y:696, ci:2  },
  { x:28,  y:624, ci:3  },
  { x:28,  y:552, ci:4  },
  { x:28,  y:480, ci:5  },
  { x:28,  y:408, ci:6  },
  { x:28,  y:336, ci:7  },
  { x:28,  y:264, ci:8  },
  { x:28,  y:192, ci:9  },
  { x:30,  y:124, ci:10 }, // merge into arch

  // ── TOP ARCH (garland outer radius = CY+163 ≈ 163 from arch centre,
  //    clamped so y stays ≥ –20 = partially visible above screen) ──
  // Left shoulder of arch
  { x:44,  y:62,  ci:11 },
  // Upper-left
  { x:80,  y:12,  ci:0  },
  // Top-left (slightly above screen — clamped)
  { x:135, y:4,   ci:1  },
  // Top centre
  { x:195, y:4,   ci:2  },
  // Top-right
  { x:255, y:4,   ci:3  },
  // Upper-right
  { x:310, y:12,  ci:4  },
  // Right shoulder
  { x:346, y:62,  ci:5  },

  // ── RIGHT SIDE ──
  { x:362, y:124, ci:6  },
  { x:362, y:192, ci:7  },
  { x:362, y:264, ci:8  },
  { x:362, y:336, ci:9  },
  { x:362, y:408, ci:10 },
  { x:362, y:480, ci:11 },
  { x:362, y:552, ci:0  },
  { x:362, y:624, ci:1  },
  { x:362, y:696, ci:2  },
  { x:362, y:768, ci:3  },
  { x:362, y:840, ci:4  },
];

ANCHORS.forEach(({ x: ox, y: oy, ci }) => {
  CLUSTERS[ci].forEach(({ dx, dy, r, pi }) => {
    GARLAND.push({ x: ox + dx, y: oy + dy, r, p: P[(_pi++ + pi) % P.length], d: nextD() });
  });
});

const CONFETTI_DOTS = [
  [0.3,0.25],[0.55,0.35],[0.45,0.55],[0.65,0.6],[0.3,0.65],[0.6,0.2],[0.42,0.42],[0.7,0.45],
];

function GBalloon({ x, y, r, p, d }: B) {
  const id = `g${Math.round(x * 10)}${Math.round(y * 10)}`;
  return (
    <motion.div
      style={{ position:"absolute", left:x-r, top:y-r, width:r*2, height:r*2, zIndex:8, pointerEvents:"none" }}
      animate={{ y:[0, -4-d*1.1, 0, -2-d*0.5, 0] }}
      transition={{ duration:2.6+d, repeat:Infinity, ease:"easeInOut", delay:d }}>
      <svg width={r*2} height={r*2} viewBox={`0 0 ${r*2} ${r*2}`}>
        <defs>
          <radialGradient id={`${id}g`} cx="34%" cy="28%" r="62%">
            <stop offset="0%"   stopColor={p.s} />
            <stop offset="52%"  stopColor={p.c} />
            <stop offset="100%" stopColor={p.c} stopOpacity={0.75} />
          </radialGradient>
        </defs>
        {p.confetti ? (
          <>
            <circle cx={r} cy={r} r={r} fill={`url(#${id}g)`} opacity={0.92} />
            {CONFETTI_DOTS.map(([dx,dy],i) => (
              <circle key={i} cx={dx*r*2} cy={dy*r*2} r={r*0.09} fill={P[i%P.length].c} opacity={0.85} />
            ))}
          </>
        ) : (
          <circle cx={r} cy={r} r={r} fill={`url(#${id}g)`} />
        )}
        <ellipse cx={r*0.6} cy={r*0.38} rx={r*0.2} ry={r*0.13}
          fill="white" opacity={0.5} transform={`rotate(-30,${r*0.6},${r*0.38})`} />
      </svg>
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   BACKGROUND — warm dark
══════════════════════════════════════════ */
const STARS = Array.from({ length: 90 }, (_, i) => ({
  x: (i*143.7)%390, y: (i*89.3)%844,
  r: 0.4+(i%4)*0.4, delay:(i*0.19)%4, dur:2+(i%6)*0.4,
}));
function StarField() {
  return (
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", zIndex:1, pointerEvents:"none" }}>
      {STARS.map((s,i)=>(
        <motion.circle key={i} cx={s.x} cy={s.y} r={s.r}
          fill={i%4===0?"#F5E0A0":"white"}
          animate={{ opacity:[0.1,0.8,0.1] }}
          transition={{ duration:s.dur, repeat:Infinity, delay:s.delay }} />
      ))}
    </svg>
  );
}
function Nebulae() {
  return (
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", zIndex:1, pointerEvents:"none" }}>
      <ellipse cx={30}  cy={300} rx={70} ry={120} fill="#6B2A1A" opacity={0.22} />
      <ellipse cx={360} cy={280} rx={65} ry={110} fill="#5C3A10" opacity={0.20} />
      <ellipse cx={195} cy={750} rx={130} ry={75} fill="#7A3820" opacity={0.18} />
    </svg>
  );
}

/* ══════════════════════════════════════════
   REALISTIC FLOWING CURTAIN
   Off-white with deep fold shadows + motion
══════════════════════════════════════════ */
// Dramatic fold gradient: bright crest → shadow → bright crest
const FABRIC = `repeating-linear-gradient(
  to right,
  #FFF9F3       0px,
  #F5E8D5       6px,
  #EDD5B8      13px,
  #E2C49E      20px,
  #D8B88A      26px,
  #E5CCA8      32px,
  #F2E0C5      38px,
  #FFF9F3      44px
)`;

function FlowingCurtainPanel({ side, open }: { side: "left"|"right"; open: boolean }) {
  const isLeft = side === "left";
  const w = C_W / 2; // 123

  return (
    <motion.div
      style={{
        position: "absolute",
        left: isLeft ? 0 : w,
        top: 0, width: w, height: C_H,
        zIndex: 2, overflow: "hidden",
      }}
      animate={open ? { x: isLeft ? -(w+6) : (w+6), opacity:0.55 } : { x:0, opacity:1 }}
      transition={{ duration: 1.15, ease: [0.4,0,0.2,1] }}>

      {/* Fabric folds */}
      <div style={{ position:"absolute", inset:0, background:FABRIC }} />

      {/* Depth: one side darker (inner crease) */}
      <div style={{
        position:"absolute", inset:0,
        background: isLeft
          ? "linear-gradient(to right, rgba(160,110,60,0.08) 0%, transparent 30%, rgba(160,110,60,0.06) 70%, transparent 100%)"
          : "linear-gradient(to left,  rgba(160,110,60,0.08) 0%, transparent 30%, rgba(160,110,60,0.06) 70%, transparent 100%)",
      }} />

      {/* Top gather — fabric pulled taut upward */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:32,
        background:"linear-gradient(to bottom, rgba(212,175,55,0.22), rgba(212,175,55,0.02))",
        borderBottom:"1px solid rgba(212,175,55,0.15)",
      }} />

      {/* Animated flowing wave — simulates breeze ripple */}
      <motion.div style={{
        position:"absolute", inset:0,
        background:`repeating-linear-gradient(
          to right,
          transparent              0px,
          rgba(255,255,255,0.10)  8px,
          rgba(255,255,255,0.18) 14px,
          rgba(255,255,255,0.10) 20px,
          transparent             28px
        )`,
      }}
        animate={{ y: [0, 18, 0, -14, 0], x: isLeft ? [0,3,0,-2,0] : [0,-3,0,2,0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />

      {/* Bottom puddle — fabric pools at base */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0, height:55,
        background:"linear-gradient(to bottom, transparent, rgba(180,130,80,0.22))",
      }} />

      {/* Wavy hem at bottom */}
      <svg style={{ position:"absolute", bottom:0, left:0, width:"100%", height:24 }} preserveAspectRatio="none">
        <motion.path
          fill="rgba(200,160,100,0.25)"
          animate={{
            d:[
              `M 0 24 Q ${w*0.15} 10 ${w*0.3} 18 Q ${w*0.45} 24 ${w*0.6} 12 Q ${w*0.75} 2 ${w} 16 L ${w} 24 Z`,
              `M 0 24 Q ${w*0.15} 14 ${w*0.3} 22 Q ${w*0.45} 18 ${w*0.6} 8  Q ${w*0.75} 0 ${w} 18 L ${w} 24 Z`,
              `M 0 24 Q ${w*0.15} 10 ${w*0.3} 18 Q ${w*0.45} 24 ${w*0.6} 12 Q ${w*0.75} 2 ${w} 16 L ${w} 24 Z`,
            ],
          }}
          transition={{ duration:4.5, repeat:Infinity, ease:"easeInOut" }} />
      </svg>

      {/* Centre seam gold line */}
      <div style={{
        position:"absolute",
        [isLeft ? "right" : "left"]: 0,
        top:0, bottom:0, width:2,
        background:"linear-gradient(to bottom, rgba(212,175,55,0.9) 0%, rgba(212,175,55,0.5) 50%, rgba(212,175,55,0.2) 100%)",
      }} />
    </motion.div>
  );
}

function Curtain({ open }: { open: boolean }) {
  return (
    <div style={{
      position:"absolute", left:C_LEFT, top:C_TOP, width:C_W, height:C_H,
      borderRadius:`${ARCH_R}px ${ARCH_R}px 0 0`,
      overflow:"hidden", zIndex:5,
    }}>
      {/* Back-light on open */}
      <motion.div style={{
        position:"absolute", inset:0, zIndex:0,
        background:"radial-gradient(ellipse at 50% 20%, #FFF8E0 0%, #FFD070 35%, #FFB060 65%, transparent 100%)",
      }}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration:0.65, delay:0.25 }} />

      <FlowingCurtainPanel side="left"  open={open} />
      <FlowingCurtainPanel side="right" open={open} />
    </div>
  );
}

/* Arch glow frame */
function ArchFrame() {
  const pad=6, fw=C_W+pad*2, fh=C_H+pad*2, fr=ARCH_R+pad;
  return (
    <svg style={{ position:"absolute", left:C_LEFT-pad, top:C_TOP-pad, width:fw, height:fh, zIndex:6, pointerEvents:"none" }}>
      <defs>
        <linearGradient id="af" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#D4AF37" />
          <stop offset="40%"  stopColor="#F0D060" />
          <stop offset="70%"  stopColor="#C9846A" />
          <stop offset="100%" stopColor="#D4AF37" />
        </linearGradient>
        <filter id="afg"><feGaussianBlur stdDeviation="4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path d={`M ${pad} ${fh} L ${pad} ${fr} A ${fr} ${fr} 0 0 1 ${fw-pad} ${fr} L ${fw-pad} ${fh} Z`}
        fill="none" stroke="url(#af)" strokeWidth={14} opacity={0.45} filter="url(#afg)" />
      <path d={`M ${pad} ${fh} L ${pad} ${fr} A ${fr} ${fr} 0 0 1 ${fw-pad} ${fr} L ${fw-pad} ${fh} Z`}
        fill="none" stroke="url(#af)" strokeWidth={2.5} opacity={0.95} />
    </svg>
  );
}

/* ══════════════════════════════════════════
   CAKE
══════════════════════════════════════════ */
function CandleFlame({ cx, cy }: { cx:number; cy:number }) {
  return (
    <>
      <motion.ellipse cx={cx} cy={cy} rx={3.5} ry={6} fill="#FFD700"
        animate={{ scaleX:[1,0.7,1.1,0.85,1], scaleY:[1,1.1,0.9,1.05,1] }}
        transition={{ duration:0.75, repeat:Infinity }} style={{ transformOrigin:`${cx}px ${cy}px` }} />
      <motion.ellipse cx={cx} cy={cy+1.5} rx={2} ry={3.5} fill="#FF8C00"
        animate={{ scaleX:[1,0.8,1.1,0.9,1] }} transition={{ duration:0.75, repeat:Infinity }}
        style={{ transformOrigin:`${cx}px ${cy+1.5}px` }} />
      <motion.ellipse cx={cx} cy={cy+2.5} rx={1} ry={2} fill="white" opacity={0.5}
        animate={{ opacity:[0.5,0.9,0.45,0.75,0.5] }} transition={{ duration:0.6, repeat:Infinity }} />
    </>
  );
}
function Cake() {
  const dotC = ["#D4AF37","#C9846A","#FFF5EE","#E8A07A","#C4913A","#F2DFC8"];
  return (
    <svg viewBox="0 0 280 280" style={{ width:"100%", height:"100%", overflow:"visible" }}>
      <defs>
        <radialGradient id="ct1" cx="50%" cy="30%" r="65%"><stop offset="0%" stopColor="#D4956A"/><stop offset="100%" stopColor="#8C4A30"/></radialGradient>
        <radialGradient id="ct2" cx="50%" cy="30%" r="65%"><stop offset="0%" stopColor="#D4AF37"/><stop offset="100%" stopColor="#8C6A10"/></radialGradient>
        <radialGradient id="ct3" cx="50%" cy="30%" r="65%"><stop offset="0%" stopColor="#FFF5EE"/><stop offset="100%" stopColor="#E8D0B8"/></radialGradient>
        <filter id="cglo"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse cx={140} cy={258} rx={92} ry={10} fill="#C4A070" opacity={0.6}/>
      {/* Bottom — rose gold */}
      <rect x={56} y={198} width={168} height={58} rx={8} fill="url(#ct1)"/>
      <ellipse cx={140} cy={198} rx={84} ry={9} fill="#D4956A"/><ellipse cx={140} cy={256} rx={84} ry={9} fill="#7A3C22"/>
      {[68,88,108,128,148,168,188,208].map((x,i)=>(
        <motion.path key={i} d={`M ${x} 198 Q ${x} 207 ${x} 212`} stroke="rgba(255,248,240,0.45)" strokeWidth={5} strokeLinecap="round" fill="none"
          animate={{ d:[`M ${x} 198 Q ${x} 205 ${x} 210`,`M ${x} 198 Q ${x} 210 ${x} 215`,`M ${x} 198 Q ${x} 205 ${x} 210`] }}
          transition={{ duration:3, repeat:Infinity, delay:i*0.2 }}/>
      ))}
      {[68,92,116,140,164,188,212].map((x,i)=>(
        <g key={i}><circle cx={x} cy={228} r={7} fill={dotC[i%dotC.length]}/><circle cx={x} cy={228} r={3.5} fill="white" opacity={0.35}/></g>
      ))}
      {/* Middle — gold */}
      <rect x={80} y={146} width={120} height={54} rx={7} fill="url(#ct2)"/>
      <ellipse cx={140} cy={146} rx={60} ry={8} fill="#D4AF37"/><ellipse cx={140} cy={200} rx={60} ry={8} fill="#7A5F10"/>
      {[88,108,128,148,168,188].map((x,i)=>(
        <g key={i}><circle cx={x} cy={173} r={6} fill={dotC[(i+2)%dotC.length]}/><circle cx={x} cy={173} r={3} fill="white" opacity={0.35}/></g>
      ))}
      {/* Top — cream */}
      <rect x={104} y={102} width={72} height={46} rx={7} fill="url(#ct3)"/>
      <ellipse cx={140} cy={102} rx={36} ry={6.5} fill="#FFF5EE"/><ellipse cx={140} cy={148} rx={36} ry={6.5} fill="#D4B898"/>
      {[115,135,155].map((x,i)=>(
        <g key={i}><circle cx={x} cy={125} r={5} fill={dotC[(i+1)%dotC.length]}/><circle cx={x} cy={125} r={2.5} fill="white" opacity={0.4}/></g>
      ))}
      {[114,136,158].map((cx,i)=>(
        <g key={i}>
          <rect x={cx-3} y={78} width={6} height={25} rx={2.5} fill={["#C9846A","#D4AF37","#FFF5EE"][i]}/>
          <CandleFlame cx={cx} cy={71}/>
        </g>
      ))}
      <ellipse cx={140} cy={82} rx={55} ry={22} fill="#FFD700" opacity={0.12} filter="url(#cglo)"/>
      <motion.g filter="url(#cglo)"
        animate={{ scale:[1,1.2,1], rotate:[0,15,0,-15,0] }}
        transition={{ duration:2.2, repeat:Infinity }} style={{ transformOrigin:"140px 88px" }}>
        <polygon points="140,81 142.8,88.5 150,88.5 144.2,92.8 146.5,100 140,95.5 133.5,100 135.8,92.8 130,88.5 137.2,88.5" fill="#D4AF37"/>
      </motion.g>
    </svg>
  );
}

function Confetto({ x, color, delay }: { x:number; color:string; delay:number }) {
  const s = 5 + (delay*11)%6;
  return (
    <motion.div style={{
      position:"absolute", left:`${x}%`, top:-12, zIndex:30, pointerEvents:"none",
      width:s, height:s, borderRadius:delay%1>0.55?"50%":2, backgroundColor:color,
    }}
      animate={{ y:[0,900], rotate:[0,540+delay*180], opacity:[1,1,0.4,0] }}
      transition={{ duration:1.9+delay*0.4, delay:delay*0.5, ease:"linear" }}/>
  );
}

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
export function BirthdayDoor() {
  const [open, setOpen]         = useState(false);
  const [showCake, setShowCake] = useState(false);
  const [confetti, setConfetti] = useState(false);

  const cfPieces = Array.from({ length:55 }, (_,i) => ({
    id:i, x:(i*18.7)%100, color:P[i%P.length].c, delay:i*0.065,
  }));

  function handleTap() {
    if (open) return;
    setOpen(true);
    setTimeout(()=>{ setShowCake(true); setConfetti(true); }, 1000);
    setTimeout(()=>setConfetti(false), 4600);
  }
  function handleReplay() {
    setShowCake(false); setConfetti(false);
    setTimeout(()=>setOpen(false), 80);
  }

  const gradText = {
    background:"linear-gradient(120deg,#C9846A 0%,#D4AF37 50%,#F0D060 100%)",
    WebkitBackgroundClip:"text" as const, WebkitTextFillColor:"transparent" as const,
  };

  return (
    <div style={{
      width:390, height:844, position:"relative", overflow:"hidden",
      background:"linear-gradient(175deg,#0e0502 0%,#1c0a06 40%,#0e0402 100%)",
      fontFamily:"'Georgia','Times New Roman',serif", userSelect:"none",
    }}>
      <StarField />
      <Nebulae />

      <AnimatePresence>
        {confetti && cfPieces.map(p=><Confetto key={p.id} x={p.x} color={p.color} delay={p.delay}/>)}
      </AnimatePresence>

      {/* ══ SCENE 1 : CURTAIN (full screen) ══ */}
      <AnimatePresence>
        {!showCake && (
          <motion.div key="scene1"
            style={{ position:"absolute", inset:0, zIndex:10 }}
            exit={{ opacity:0 }} transition={{ duration:0.4, delay:0.8 }}>

            <Curtain open={open} />
            <ArchFrame />

            {/* Tap zone */}
            <motion.button onClick={handleTap} style={{
              position:"absolute", left:C_LEFT, top:C_TOP, width:C_W, height:C_H,
              background:"transparent", border:"none",
              cursor:open?"default":"pointer", zIndex:7,
              borderRadius:`${ARCH_R}px ${ARCH_R}px 0 0`,
            }}>
              <AnimatePresence>
                {!open && (
                  <motion.div
                    style={{ position:"absolute", bottom:220, left:0, right:0, display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}
                    animate={{ opacity:[0.4,1,0.4] }} transition={{ duration:2.2, repeat:Infinity }}
                    exit={{ opacity:0 }}>
                    <motion.div style={{
                      width:50, height:50, borderRadius:"50%",
                      border:"1.5px solid rgba(212,175,55,0.6)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      background:"rgba(212,175,55,0.12)", backdropFilter:"blur(4px)",
                    }}
                      animate={{ scale:[1,1.12,1] }} transition={{ duration:1.8, repeat:Infinity }}>
                      <span style={{ fontSize:22 }}>👆</span>
                    </motion.div>
                    <p style={{ color:"rgba(212,175,55,0.9)", fontSize:11, letterSpacing:2.5, fontFamily:"sans-serif", margin:0 }}>
                      TAP TO REVEAL
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Balloon garland */}
            {GARLAND.map((b,i) => <GBalloon key={i} {...b} />)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ SCENE 2 : CAKE ══ */}
      <AnimatePresence>
        {showCake && (
          <motion.div key="scene2"
            style={{ position:"absolute", inset:0, zIndex:12, display:"flex", flexDirection:"column", alignItems:"center" }}
            initial={{ opacity:0, scale:0.9 }}
            animate={{ opacity:1, scale:1 }}
            transition={{ duration:0.55, ease:[0.34,1.56,0.64,1] }}>

            <motion.div style={{ marginTop:56, textAlign:"center", paddingInline:28 }}
              initial={{ opacity:0, y:-18 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}>
              <p style={{ color:"#8C6A4A", fontSize:10, letterSpacing:4, textTransform:"uppercase", marginBottom:4, fontFamily:"sans-serif" }}>HAPPY BIRTHDAY</p>
              <h1 style={{ fontSize:32, fontWeight:"bold", lineHeight:1.15, ...gradText }}>{name} 🎂</h1>
              <p style={{ color:"#A07850", fontSize:12, fontFamily:"sans-serif" }}>Turning {age} never looked so magical!</p>
            </motion.div>

            <motion.div style={{ width:268, height:268, marginTop:20 }}
              initial={{ scale:0.1, rotate:-18 }} animate={{ scale:1, rotate:0 }}
              transition={{ delay:0.3, duration:0.7, ease:[0.34,1.56,0.64,1] }}>
              <Cake />
            </motion.div>

            <motion.div style={{ textAlign:"center", marginTop:18, paddingInline:36 }}
              initial={{ opacity:0, y:22 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.85 }}>
              <motion.h2 style={{ fontSize:28, fontWeight:"bold", marginBottom:10, ...gradText }}
                animate={{ scale:[1,1.05,1] }} transition={{ duration:2.5, repeat:Infinity }}>
                🌟 Make a Wish 🌟
              </motion.h2>
              <p style={{ color:"#A07850", fontSize:13, lineHeight:1.75, fontFamily:"sans-serif" }}>
                Close your eyes, take a deep breath,<br/>and wish for everything you deserve 💫
              </p>
            </motion.div>

            {[12,30,52,70,88].map((x,i)=>(
              <motion.div key={i}
                style={{ position:"absolute", left:`${x}%`, bottom:90+i*20, zIndex:3, pointerEvents:"none" }}
                animate={{ y:[0,-18,0], opacity:[0.4,1,0.4] }}
                transition={{ duration:2.8, repeat:Infinity, delay:i*0.45 }}>
                <span style={{ fontSize:14 }}>✨</span>
              </motion.div>
            ))}

            <motion.p style={{ position:"absolute", bottom:80, color:"#8C6A4A", fontSize:12, letterSpacing:1.5, fontFamily:"sans-serif" }}
              animate={{ opacity:[0.35,1,0.35] }} transition={{ duration:3, repeat:Infinity }}>
              ✨ wishing you the world ✨
            </motion.p>

            <motion.button onClick={handleReplay} style={{
              position:"absolute", bottom:32,
              background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.35)",
              borderRadius:24, padding:"8px 22px", color:"#C9A840",
              fontSize:11, letterSpacing:2, textTransform:"uppercase", fontFamily:"sans-serif", cursor:"pointer",
            }}
              initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.5 }}
              whileHover={{ background:"rgba(212,175,55,0.18)" }}>
              ↩ Replay
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
