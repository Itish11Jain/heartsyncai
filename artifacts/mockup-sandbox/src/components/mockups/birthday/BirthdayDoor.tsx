import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const name = "Priya";
const age = 25;

/* ══════════════════════════════════════════
   ARCH GEOMETRY
   Curtain from y=190 → y=844 (fills to bottom)
══════════════════════════════════════════ */
const CX = 195, CY = 318, ARCH_R = 128;
const C_LEFT = 67, C_TOP = 190, C_W = 256, C_H = 654; // 190+654=844
const ARCH_BORDER_R = C_W / 2; // 128

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
   GARLAND
══════════════════════════════════════════ */
type B = { x: number; y: number; r: number; p: BColor; d: number };
const GARLAND: B[] = [];
let _pi = 0, _di = 0;
function nextD() { return (_di++ * 0.11) % 1.6; }

type Cluster = { dx: number; dy: number; r: number; pi: number }[];
const CLUSTERS: Cluster[] = [
  [{ dx:0,dy:-22,r:26,pi:0 },{ dx:-24,dy:12,r:20,pi:1 },{ dx:24,dy:12,r:20,pi:2 },{ dx:0,dy:10,r:14,pi:3 }],
  [{ dx:0,dy:0,r:28,pi:0 },{ dx:-24,dy:-30,r:20,pi:1 },{ dx:22,dy:-28,r:20,pi:2 },{ dx:0,dy:28,r:16,pi:4 }],
  [{ dx:0,dy:0,r:24,pi:2 },{ dx:-26,dy:-20,r:18,pi:0 },{ dx:26,dy:-20,r:18,pi:3 },{ dx:-14,dy:24,r:16,pi:1 },{ dx:14,dy:24,r:16,pi:4 }],
  [{ dx:0,dy:-26,r:24,pi:3 },{ dx:0,dy:2,r:22,pi:0 },{ dx:0,dy:28,r:20,pi:1 },{ dx:20,dy:0,r:14,pi:2 }],
  [{ dx:0,dy:-24,r:28,pi:1 },{ dx:-20,dy:12,r:20,pi:0 },{ dx:20,dy:12,r:20,pi:2 },{ dx:0,dy:32,r:16,pi:3 },{ dx:-10,dy:16,r:12,pi:4 }],
  [{ dx:-22,dy:0,r:26,pi:4 },{ dx:22,dy:0,r:24,pi:0 },{ dx:0,dy:-26,r:18,pi:1 },{ dx:0,dy:26,r:14,pi:2 }],
  [{ dx:0,dy:0,r:30,pi:2 },{ dx:-28,dy:-18,r:16,pi:0 },{ dx:28,dy:-18,r:16,pi:3 },{ dx:-20,dy:24,r:14,pi:1 },{ dx:20,dy:24,r:14,pi:4 }],
  [{ dx:-18,dy:-22,r:22,pi:3 },{ dx:6,dy:-4,r:22,pi:1 },{ dx:-10,dy:20,r:18,pi:0 },{ dx:22,dy:18,r:16,pi:2 }],
  [{ dx:-28,dy:4,r:22,pi:0 },{ dx:0,dy:-20,r:26,pi:2 },{ dx:28,dy:4,r:22,pi:1 },{ dx:-12,dy:22,r:14,pi:3 },{ dx:12,dy:22,r:14,pi:4 }],
  [{ dx:-20,dy:10,r:24,pi:1 },{ dx:20,dy:10,r:24,pi:3 },{ dx:0,dy:-22,r:28,pi:0 },{ dx:0,dy:28,r:16,pi:2 }],
  [{ dx:-8,dy:0,r:28,pi:4 },{ dx:22,dy:-14,r:20,pi:1 },{ dx:24,dy:18,r:18,pi:0 },{ dx:-24,dy:-18,r:16,pi:2 },{ dx:-20,dy:20,r:14,pi:3 }],
  [{ dx:0,dy:0,r:26,pi:0 },{ dx:-24,dy:-10,r:20,pi:2 },{ dx:24,dy:-10,r:20,pi:1 },{ dx:-18,dy:20,r:18,pi:3 },{ dx:18,dy:20,r:18,pi:4 }],
];

const ANCHORS: { x: number; y: number; ci: number }[] = [
  { x: 30, y: 790, ci: 0  }, { x: 28, y: 738, ci: 1  }, { x: 26, y: 684, ci: 2  },
  { x: 26, y: 632, ci: 3  }, { x: 28, y: 578, ci: 4  }, { x: 28, y: 524, ci: 5  },
  { x: 30, y: 470, ci: 6  }, { x: 30, y: 416, ci: 7  }, { x: 32, y: 362, ci: 8  },
  { x: 36, y: 304, ci: 9  }, { x: 47, y: 258, ci: 10 }, { x: 72, y: 215, ci: 11 },
  { x:110, y: 182, ci: 0  }, { x:155, y: 160, ci: 1  }, { x:195, y: 150, ci: 2  },
  { x:237, y: 160, ci: 3  }, { x:280, y: 182, ci: 4  }, { x:318, y: 215, ci: 5  },
  { x:343, y: 258, ci: 6  }, { x:354, y: 304, ci: 7  },
  { x:360, y: 362, ci: 8  }, { x:360, y: 416, ci: 9  }, { x:362, y: 470, ci: 10 },
  { x:362, y: 524, ci: 11 }, { x:360, y: 578, ci: 0  }, { x:360, y: 632, ci: 1  },
  { x:362, y: 684, ci: 2  }, { x:362, y: 738, ci: 3  }, { x:360, y: 790, ci: 4  },
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
  const id = `g${Math.round(x*10)}${Math.round(y*10)}`;
  return (
    <motion.div
      style={{ position:"absolute", left:x-r, top:y-r, width:r*2, height:r*2, zIndex:8, pointerEvents:"none" }}
      animate={{ y:[0,-4-d*1.2,0,-2-d*0.6,0] }}
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
            {CONFETTI_DOTS.map(([dx,dy],i)=>(
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
   BACKGROUND
══════════════════════════════════════════ */
const STARS = Array.from({ length:100 }, (_,i) => ({
  x:(i*143.7)%390, y:(i*89.3)%844,
  r:0.5+(i%4)*0.45, delay:(i*0.19)%4, dur:2+(i%6)*0.4,
}));
function StarField() {
  return (
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", zIndex:1, pointerEvents:"none" }}>
      {STARS.map((s,i)=>(
        <motion.circle key={i} cx={s.x} cy={s.y} r={s.r}
          fill={i%4===0?"#F5E0A0":"white"}
          animate={{ opacity:[0.1,0.85,0.1] }}
          transition={{ duration:s.dur, repeat:Infinity, delay:s.delay }} />
      ))}
    </svg>
  );
}
function Nebulae() {
  return (
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", zIndex:1, pointerEvents:"none" }}>
      <ellipse cx={55}  cy={200} rx={85} ry={65}  fill="#6B2A1A" opacity={0.22} />
      <ellipse cx={335} cy={180} rx={75} ry={58}  fill="#5C3A10" opacity={0.20} />
      <ellipse cx={195} cy={750} rx={125} ry={75} fill="#7A3820" opacity={0.18} />
    </svg>
  );
}

/* ══════════════════════════════════════════
   CURTAIN — off-white flowing, gold folds
══════════════════════════════════════════ */
// Red velvet: deep pile shadow → mid crimson → crushed-pile highlight → mid → shadow
const FOLD_FABRIC = `repeating-linear-gradient(
  to right,
  #2A0008       0px,
  #780018       7px,
  #C0002E      14px,
  #E8003A      19px,
  #C0002E      24px,
  #780018      31px,
  #2A0008      40px
)`;

function Curtain({ open }: { open: boolean }) {
  const panelW = C_W / 2; // 128
  return (
    <div style={{
      position:"absolute", left:C_LEFT, top:C_TOP, width:C_W, height:C_H,
      borderRadius:`${ARCH_BORDER_R}px ${ARCH_BORDER_R}px 0 0`,
      overflow:"hidden", zIndex:5,
    }}>
      {/* LEFT PANEL */}
      <motion.div style={{
        position:"absolute", left:0, top:0, width:panelW, height:"100%",
        background:FOLD_FABRIC, zIndex:2,
        boxShadow:"inset -8px 0 28px rgba(0,0,0,0.55)",
      }}
        animate={open ? { x:-(panelW+4), opacity:0.55 } : { x:0, opacity:1 }}
        transition={{ duration:1.1, ease:[0.4,0,0.2,1] }}>
        {/* Gold shimmer */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,rgba(212,175,55,0.15) 0%,rgba(212,175,55,0.03) 50%,transparent 75%)", pointerEvents:"none" }} />
        {/* Animated flowing shimmer */}
        <motion.div style={{
          position:"absolute", inset:0,
          background:"linear-gradient(to right,transparent 20%,rgba(255,255,255,0.13) 48%,rgba(255,255,255,0.06) 58%,transparent 75%)",
        }}
          animate={{ x:[0,6,0,-4,0], y:[0,8,0,-5,0] }}
          transition={{ duration:5.5, repeat:Infinity, ease:"easeInOut" }} />
        {/* Wavy hem */}
        <svg style={{ position:"absolute", bottom:0, left:0, width:"100%", height:28 }} preserveAspectRatio="none">
          <motion.path fill="rgba(0,0,0,0.35)"
            animate={{ d:[
              `M 0 28 Q ${panelW*0.2} 14 ${panelW*0.4} 22 Q ${panelW*0.65} 28 ${panelW*0.85} 12 Q ${panelW} 4 ${panelW} 16 L ${panelW} 28 Z`,
              `M 0 28 Q ${panelW*0.2} 18 ${panelW*0.4} 26 Q ${panelW*0.65} 20 ${panelW*0.85} 8  Q ${panelW} 2 ${panelW} 18 L ${panelW} 28 Z`,
              `M 0 28 Q ${panelW*0.2} 14 ${panelW*0.4} 22 Q ${panelW*0.65} 28 ${panelW*0.85} 12 Q ${panelW} 4 ${panelW} 16 L ${panelW} 28 Z`,
            ]}}
            transition={{ duration:4.8, repeat:Infinity, ease:"easeInOut" }} />
        </svg>
        {/* Gold seam */}
        <div style={{ position:"absolute", right:0, top:0, bottom:0, width:2, background:"linear-gradient(to bottom,rgba(212,175,55,0.9),rgba(212,175,55,0.3))" }} />
      </motion.div>

      {/* RIGHT PANEL */}
      <motion.div style={{
        position:"absolute", right:0, top:0, width:panelW, height:"100%",
        background:FOLD_FABRIC, zIndex:2,
        boxShadow:"inset 8px 0 28px rgba(0,0,0,0.55)",
      }}
        animate={open ? { x:(panelW+4), opacity:0.55 } : { x:0, opacity:1 }}
        transition={{ duration:1.1, ease:[0.4,0,0.2,1] }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(225deg,rgba(212,175,55,0.15) 0%,rgba(212,175,55,0.03) 50%,transparent 75%)", pointerEvents:"none" }} />
        <motion.div style={{
          position:"absolute", inset:0,
          background:"linear-gradient(to right,transparent 20%,rgba(255,255,255,0.13) 48%,rgba(255,255,255,0.06) 58%,transparent 75%)",
        }}
          animate={{ x:[0,-6,0,4,0], y:[0,8,0,-5,0] }}
          transition={{ duration:5.5, repeat:Infinity, ease:"easeInOut", delay:0.4 }} />
        <svg style={{ position:"absolute", bottom:0, left:0, width:"100%", height:28 }} preserveAspectRatio="none">
          <motion.path fill="rgba(0,0,0,0.35)"
            animate={{ d:[
              `M 0 28 Q ${panelW*0.15} 8  ${panelW*0.35} 20 Q ${panelW*0.55} 28 ${panelW*0.75} 14 Q ${panelW*0.9} 4 ${panelW} 22 L ${panelW} 28 Z`,
              `M 0 28 Q ${panelW*0.15} 14 ${panelW*0.35} 24 Q ${panelW*0.55} 18 ${panelW*0.75} 6  Q ${panelW*0.9} 0 ${panelW} 18 L ${panelW} 28 Z`,
              `M 0 28 Q ${panelW*0.15} 8  ${panelW*0.35} 20 Q ${panelW*0.55} 28 ${panelW*0.75} 14 Q ${panelW*0.9} 4 ${panelW} 22 L ${panelW} 28 Z`,
            ]}}
            transition={{ duration:4.8, repeat:Infinity, ease:"easeInOut", delay:0.6 }} />
        </svg>
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:2, background:"linear-gradient(to bottom,rgba(212,175,55,0.9),rgba(212,175,55,0.3))" }} />
      </motion.div>
    </div>
  );
}

function ArchFrame() {
  const pad=6, fw=C_W+pad*2, fh=C_H+pad*2, fr=ARCH_BORDER_R+pad;
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
      <rect x={56} y={198} width={168} height={58} rx={8} fill="url(#ct1)"/>
      <ellipse cx={140} cy={198} rx={84} ry={9} fill="#D4956A"/><ellipse cx={140} cy={256} rx={84} ry={9} fill="#7A3C22"/>
      {[68,88,108,128,148,168,188,208].map((x,i)=>(
        <motion.path key={i} d={`M ${x} 198 Q ${x} 206 ${x} 211`} stroke="rgba(255,248,240,0.45)" strokeWidth={5} strokeLinecap="round" fill="none"
          animate={{ d:[`M ${x} 198 Q ${x} 204 ${x} 209`,`M ${x} 198 Q ${x} 209 ${x} 214`,`M ${x} 198 Q ${x} 204 ${x} 209`] }}
          transition={{ duration:3, repeat:Infinity, delay:i*0.2 }}/>
      ))}
      {[68,92,116,140,164,188,212].map((x,i)=>(
        <g key={i}><circle cx={x} cy={228} r={7} fill={dotC[i%dotC.length]}/><circle cx={x} cy={228} r={3.5} fill="white" opacity={0.35}/></g>
      ))}
      <rect x={80} y={146} width={120} height={54} rx={7} fill="url(#ct2)"/>
      <ellipse cx={140} cy={146} rx={60} ry={8} fill="#D4AF37"/><ellipse cx={140} cy={200} rx={60} ry={8} fill="#7A5F10"/>
      {[88,108,128,148,168,188].map((x,i)=>(
        <g key={i}><circle cx={x} cy={173} r={6} fill={dotC[(i+2)%dotC.length]}/><circle cx={x} cy={173} r={3} fill="white" opacity={0.35}/></g>
      ))}
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
  const s = 5+(delay*11)%6;
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

      {/* ══ SCENE 1 : CURTAIN ══ */}
      <AnimatePresence>
        {!showCake && (
          <motion.div key="scene1"
            style={{ position:"absolute", inset:0, zIndex:10 }}
            exit={{ opacity:0 }} transition={{ duration:0.4, delay:0.8 }}>

            {/* Header text */}
            <motion.div style={{ position:"absolute", top:36, left:0, right:0, textAlign:"center", zIndex:20 }}
              initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}>
              <p style={{ color:"#8C6A4A", fontSize:10, letterSpacing:4, textTransform:"uppercase", marginBottom:3, fontFamily:"sans-serif" }}>
                YOU'RE INVITED TO
              </p>
              <h1 style={{ fontSize:26, fontWeight:"bold", lineHeight:1.15, margin:"0 0 2px", ...gradText }}>
                {name}'s Birthday
              </h1>
              <motion.p style={{ color:"#8C6A4A", fontSize:11, fontFamily:"sans-serif" }}
                animate={{ opacity:[0.5,1,0.5] }} transition={{ duration:2.5, repeat:Infinity }}>
                ✨ A special surprise awaits ✨
              </motion.p>
            </motion.div>

            <Curtain open={open} />

            {/* Tap zone */}
            <motion.button onClick={handleTap} style={{
              position:"absolute", left:C_LEFT, top:C_TOP, width:C_W, height:C_H,
              background:"transparent", border:"none",
              cursor:open?"default":"pointer", zIndex:7,
              borderRadius:`${ARCH_BORDER_R}px ${ARCH_BORDER_R}px 0 0`,
            }}>
            </motion.button>

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

            <motion.div style={{ marginTop:54, textAlign:"center", paddingInline:28 }}
              initial={{ opacity:0, y:-18 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}>
              <p style={{ color:"#8C6A4A", fontSize:10, letterSpacing:4, textTransform:"uppercase", marginBottom:4, fontFamily:"sans-serif" }}>HAPPY BIRTHDAY</p>
              <h1 style={{ fontSize:32, fontWeight:"bold", lineHeight:1.15, ...gradText }}>{name} 🎂</h1>
              <p style={{ color:"#A07850", fontSize:12, fontFamily:"sans-serif" }}>Turning {age} never looked so magical!</p>
            </motion.div>

            <motion.div style={{
                position:"absolute",
                left: C_LEFT + C_W/2 - 134,
                top:  C_TOP  + C_H/2 - 134,
                width:268, height:268,
              }}
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
