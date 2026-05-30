import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import photo1Src from "@/assets/photo1.jpg";
import photo2Src from "@/assets/photo2.jpg";
import photo3Src from "@/assets/photo3.jpg";

const name = "Priya";
const age = 25;

/* ══════════════════════════════════════════
   GEOMETRY — full-screen curtain
══════════════════════════════════════════ */
const C_LEFT = 0, C_TOP = 0, C_W = 390, C_H = 844;

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
type B = { x: number; y: number; r: number; p: BColor; d: number; tx: number; ty: number };
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
  // ── LEFT EDGE ──
  { x: 28, y:  28, ci: 0  }, { x: 28, y:  83, ci: 1  }, { x: 28, y: 138, ci: 2  },
  { x: 28, y: 193, ci: 3  }, { x: 28, y: 248, ci: 4  }, { x: 28, y: 303, ci: 5  },
  { x: 28, y: 358, ci: 6  }, { x: 28, y: 413, ci: 7  }, { x: 28, y: 468, ci: 8  },
  { x: 28, y: 523, ci: 9  }, { x: 28, y: 578, ci: 10 }, { x: 28, y: 633, ci: 11 },
  { x: 28, y: 688, ci: 0  }, { x: 28, y: 743, ci: 1  }, { x: 28, y: 798, ci: 2  },
  // ── RIGHT EDGE ──
  { x:362, y:  28, ci: 3  }, { x:362, y:  83, ci: 4  }, { x:362, y: 138, ci: 5  },
  { x:362, y: 193, ci: 6  }, { x:362, y: 248, ci: 7  }, { x:362, y: 303, ci: 8  },
  { x:362, y: 358, ci: 9  }, { x:362, y: 413, ci: 10 }, { x:362, y: 468, ci: 11 },
  { x:362, y: 523, ci: 0  }, { x:362, y: 578, ci: 1  }, { x:362, y: 633, ci: 2  },
  { x:362, y: 688, ci: 3  }, { x:362, y: 743, ci: 4  }, { x:362, y: 798, ci: 5  },
  // ── TOP EDGE ──
  { x: 83, y:  28, ci: 6  }, { x:138, y:  28, ci: 7  }, { x:195, y:  28, ci: 8  },
  { x:252, y:  28, ci: 9  }, { x:307, y:  28, ci: 10 },
];

ANCHORS.forEach(({ x: ox, y: oy, ci }) => {
  CLUSTERS[ci].forEach(({ dx, dy, r, pi }) => {
    const bx = ox + dx, by = oy + dy;
    const ddx = bx - 195, ddy = by - 470;
    const blen = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
    const bdist = 220 + (Math.abs(Math.round(ddx * 7 + ddy * 13)) % 180);
    GARLAND.push({
      x: bx, y: by, r,
      p: P[(_pi++ + pi) % P.length],
      d: nextD(),
      tx: bx + (ddx / blen) * bdist,
      ty: by + (ddy / blen) * bdist - 60,
    });
  });
});

const CONFETTI_DOTS = [
  [0.3,0.25],[0.55,0.35],[0.45,0.55],[0.65,0.6],[0.3,0.65],[0.6,0.2],[0.42,0.42],[0.7,0.45],
];
function GBalloon({ x, y, r, p, d, tx, ty, popped }: B & { popped: boolean }) {
  const id = `g${Math.round(x*10)}${Math.round(y*10)}`;
  return (
    <motion.div
      style={{ position:"absolute", left:x-r, top:y-r, width:r*2, height:r*2, zIndex:15, pointerEvents:"none" }}
      animate={popped
        ? { x: tx-x, y: ty-y, scale:[1,1.35,0], opacity:[1,1,0] }
        : { y:[0,-4-d*1.2,0,-2-d*0.6,0] }}
      transition={popped
        ? { duration:0.75+d*0.35, ease:"easeOut", delay:d*0.12 }
        : { duration:2.6+d, repeat:Infinity, ease:"easeInOut", delay:d }}>
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
   CURTAIN — golden full-screen split
══════════════════════════════════════════ */
const FOLD_FABRIC = `repeating-linear-gradient(
  to right,
  #1A0005  0px,
  #5C0015  6px,
  #900020 12px,
  #B8002C 17px,
  #CC0032 20px,
  #B8002C 23px,
  #900020 28px,
  #5C0015 34px,
  #1A0005 40px
)`;

function Curtain({ open }: { open: boolean }) {
  const panelW = 195;
  return (
    <div style={{
      position:"absolute", left:0, top:0, width:390, height:844,
      overflow:"hidden", zIndex:5,
    }}>
      {/* LEFT PANEL */}
      <motion.div style={{
        position:"absolute", left:0, top:0, width:panelW, height:"100%",
        background:FOLD_FABRIC, zIndex:2,
        boxShadow:"inset -12px 0 36px rgba(0,0,0,0.55)",
      }}
        animate={open ? { x:-(panelW+4), opacity:0.6 } : { x:0, opacity:1 }}
        transition={{ duration:1.1, ease:[0.4,0,0.2,1] }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0.05) 50%,transparent 75%)", pointerEvents:"none" }} />
        <motion.div style={{
          position:"absolute", inset:0,
          background:"linear-gradient(to right,transparent 20%,rgba(255,255,255,0.18) 48%,rgba(255,255,255,0.08) 58%,transparent 75%)",
        }}
          animate={{ x:[0,6,0,-4,0], y:[0,8,0,-5,0] }}
          transition={{ duration:5.5, repeat:Infinity, ease:"easeInOut" }} />
        <svg style={{ position:"absolute", bottom:0, left:0, width:"100%", height:28 }} preserveAspectRatio="none">
          <motion.path fill="rgba(0,0,0,0.3)"
            animate={{ d:[
              `M 0 28 Q ${panelW*0.2} 14 ${panelW*0.4} 22 Q ${panelW*0.65} 28 ${panelW*0.85} 12 Q ${panelW} 4 ${panelW} 16 L ${panelW} 28 Z`,
              `M 0 28 Q ${panelW*0.2} 18 ${panelW*0.4} 26 Q ${panelW*0.65} 20 ${panelW*0.85} 8  Q ${panelW} 2 ${panelW} 18 L ${panelW} 28 Z`,
              `M 0 28 Q ${panelW*0.2} 14 ${panelW*0.4} 22 Q ${panelW*0.65} 28 ${panelW*0.85} 12 Q ${panelW} 4 ${panelW} 16 L ${panelW} 28 Z`,
            ]}}
            transition={{ duration:4.8, repeat:Infinity, ease:"easeInOut" }} />
        </svg>
        <div style={{ position:"absolute", right:0, top:0, bottom:0, width:3, background:"linear-gradient(to bottom,rgba(255,230,100,0.98),rgba(255,200,50,0.5))" }} />
      </motion.div>

      {/* RIGHT PANEL */}
      <motion.div style={{
        position:"absolute", right:0, top:0, width:panelW, height:"100%",
        background:FOLD_FABRIC, zIndex:2,
        boxShadow:"inset 12px 0 36px rgba(0,0,0,0.55)",
      }}
        animate={open ? { x:(panelW+4), opacity:0.6 } : { x:0, opacity:1 }}
        transition={{ duration:1.1, ease:[0.4,0,0.2,1] }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(225deg,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0.05) 50%,transparent 75%)", pointerEvents:"none" }} />
        <motion.div style={{
          position:"absolute", inset:0,
          background:"linear-gradient(to right,transparent 20%,rgba(255,255,255,0.18) 48%,rgba(255,255,255,0.08) 58%,transparent 75%)",
        }}
          animate={{ x:[0,-6,0,4,0], y:[0,8,0,-5,0] }}
          transition={{ duration:5.5, repeat:Infinity, ease:"easeInOut", delay:0.4 }} />
        <svg style={{ position:"absolute", bottom:0, left:0, width:"100%", height:28 }} preserveAspectRatio="none">
          <motion.path fill="rgba(0,0,0,0.3)"
            animate={{ d:[
              `M 0 28 Q ${panelW*0.15} 8  ${panelW*0.35} 20 Q ${panelW*0.55} 28 ${panelW*0.75} 14 Q ${panelW*0.9} 4 ${panelW} 22 L ${panelW} 28 Z`,
              `M 0 28 Q ${panelW*0.15} 14 ${panelW*0.35} 24 Q ${panelW*0.55} 18 ${panelW*0.75} 6  Q ${panelW*0.9} 0 ${panelW} 18 L ${panelW} 28 Z`,
              `M 0 28 Q ${panelW*0.15} 8  ${panelW*0.35} 20 Q ${panelW*0.55} 28 ${panelW*0.75} 14 Q ${panelW*0.9} 4 ${panelW} 22 L ${panelW} 28 Z`,
            ]}}
            transition={{ duration:4.8, repeat:Infinity, ease:"easeInOut", delay:0.6 }} />
        </svg>
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3, background:"linear-gradient(to bottom,rgba(255,230,100,0.98),rgba(255,200,50,0.5))" }} />
      </motion.div>
    </div>
  );
}


/* ══════════════════════════════════════════
   TWINKLE BACKGROUND (Scene 2)
══════════════════════════════════════════ */
const TW_DOTS = Array.from({length:45},(_,i)=>({
  x:(i*173.1+31)%370+10, y:(i*97.7+55)%760+72,
  r:0.8+(i%5)*0.6,
  dur:1.8+(i%8)*0.35,
  delay:(i*0.27)%4,
  color:["#FFD700","#F5E0A0","#FFFDE8","#E8C84A","#D4AF37"][i%5],
}));
const TW_SPARKLES = Array.from({length:18},(_,i)=>({
  x:(i*211.3+67)%350+20, y:(i*131.7+80)%680+80,
  s:3+(i%4)*2, dur:3.5+(i%6)*0.5, delay:(i*0.45)%5,
  ry:30+(i%4)*25, rx:(i%3-1)*18,
  col:["#FFD700","#FFF8C8","#F0D060"][i%3],
}));
const TW_ORBS = Array.from({length:6},(_,i)=>({
  x:[80,195,310,120,260,155][i], y:[150,280,200,520,420,650][i],
  r:18+(i%3)*12, dur:6+(i%4)*1.5, delay:i*0.8,
}));

function TwinkleBackground() {
  return (
    <>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",zIndex:1,pointerEvents:"none"}}>
        {/* Glowing orbs */}
        {TW_ORBS.map((o,i)=>(
          <motion.circle key={`orb${i}`} cx={o.x} cy={o.y} r={o.r}
            fill="none" stroke="#D4AF37" strokeWidth={0.8}
            animate={{r:[o.r, o.r*1.35, o.r], opacity:[0.06,0.22,0.06]}}
            transition={{duration:o.dur, repeat:Infinity, delay:o.delay, ease:"easeInOut"}}/>
        ))}
        {/* Twinkling dots */}
        {TW_DOTS.map((s,i)=>(
          <motion.circle key={i} cx={s.x} cy={s.y} r={s.r}
            fill={s.color}
            animate={{opacity:[0.04,0.95,0.1,0.8,0.04], r:[s.r,s.r*1.6,s.r,s.r*1.3,s.r]}}
            transition={{duration:s.dur, repeat:Infinity, delay:s.delay, ease:"easeInOut"}}/>
        ))}
        {/* 4-point sparkle stars */}
        {[...Array(10)].map((_,i)=>{
          const x=(i*211+89)%340+25, y=(i*137+110)%660+90, s=4+(i%4)*1.5;
          const col=["#FFD700","#F5E0A0","#FFF8E8"][i%3];
          return (
            <motion.g key={`sp${i}`}
              animate={{rotate:[0,45,0,-45,0], scale:[0.5,1,0.6,1,0.5], opacity:[0.2,0.9,0.25,0.8,0.2]}}
              transition={{duration:2.2+(i%5)*0.5, repeat:Infinity, delay:(i*0.55)%4}}
              style={{transformOrigin:`${x}px ${y}px`}}>
              <line x1={x-s} y1={y} x2={x+s} y2={y} stroke={col} strokeWidth={1.4} strokeLinecap="round"/>
              <line x1={x} y1={y-s} x2={x} y2={y+s} stroke={col} strokeWidth={1.4} strokeLinecap="round"/>
              <line x1={x-s*0.65} y1={y-s*0.65} x2={x+s*0.65} y2={y+s*0.65} stroke={col} strokeWidth={0.7} strokeLinecap="round" opacity={0.55}/>
              <line x1={x+s*0.65} y1={y-s*0.65} x2={x-s*0.65} y2={y+s*0.65} stroke={col} strokeWidth={0.7} strokeLinecap="round" opacity={0.55}/>
            </motion.g>
          );
        })}
      </svg>
      {/* Floating rising particles */}
      {TW_SPARKLES.map((p,i)=>(
        <motion.div key={i} style={{position:"absolute", left:p.x, top:p.y, zIndex:2, pointerEvents:"none"}}
          animate={{y:[0,-p.ry,0], x:[0,p.rx,0,-p.rx*0.5,0], opacity:[0,0.85,0.35,0.7,0], scale:[0.4,1,0.6,1,0.4]}}
          transition={{duration:p.dur, repeat:Infinity, delay:p.delay, ease:"easeInOut"}}>
          <svg width={p.s*2} height={p.s*2} viewBox={`0 0 ${p.s*2} ${p.s*2}`}>
            <line x1={p.s} y1={0} x2={p.s} y2={p.s*2} stroke={p.col} strokeWidth={1.3} strokeLinecap="round"/>
            <line x1={0} y1={p.s} x2={p.s*2} y2={p.s} stroke={p.col} strokeWidth={1.3} strokeLinecap="round"/>
          </svg>
        </motion.div>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════
   CAKE
══════════════════════════════════════════ */
function CandleFlame({ cx, cy, blown }: { cx:number; cy:number; blown:boolean }) {
  return (
    <motion.g animate={{ opacity: blown ? 0 : 1 }} transition={{ duration:0.25 }}>
      <motion.ellipse cx={cx} cy={cy} rx={3.5} ry={6} fill="#FFD700"
        animate={blown ? {} : { scaleX:[1,0.7,1.1,0.85,1], scaleY:[1,1.1,0.9,1.05,1] }}
        transition={{ duration:0.75, repeat:Infinity }} style={{ transformOrigin:`${cx}px ${cy}px` }} />
      <motion.ellipse cx={cx} cy={cy+1.5} rx={2} ry={3.5} fill="#FF8C00"
        animate={blown ? {} : { scaleX:[1,0.8,1.1,0.9,1] }} transition={{ duration:0.75, repeat:Infinity }}
        style={{ transformOrigin:`${cx}px ${cy+1.5}px` }} />
      <motion.ellipse cx={cx} cy={cy+2.5} rx={1} ry={2} fill="white" opacity={0.5}
        animate={blown ? {} : { opacity:[0.5,0.9,0.45,0.75,0.5] }} transition={{ duration:0.6, repeat:Infinity }} />
    </motion.g>
  );
}
function Cake({ blown = false }: { blown?: boolean }) {
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
          <CandleFlame cx={cx} cy={71} blown={blown}/>
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
   HAPPY BIRTHDAY BANNER — individual hanging letters
══════════════════════════════════════════ */
const HB_DEF = [
  {ch:"H",w:26},{ch:"a",w:20},{ch:"p",w:18},{ch:"p",w:18},{ch:"y",w:20},
  {ch:" ",w:18},
  {ch:"B",w:24},{ch:"i",w:11},{ch:"r",w:17},{ch:"t",w:14},{ch:"h",w:20},{ch:"d",w:20},{ch:"a",w:20},{ch:"y",w:20},
];
const HB_ROTS = [-8,-4,-6,-3,-5, 0, -7,-3,-5,-4,-6,-3,-5,-7];
const HB_GAP  = 6;
function calcHbXs() {
  const totalW = HB_DEF.reduce((s,b)=>s+b.w,0) + HB_GAP*(HB_DEF.length-1);
  let x = (390-totalW)/2;
  return HB_DEF.map(item=>{ const cx=x+item.w/2; x+=item.w+HB_GAP; return cx; });
}
const HB_XS = calcHbXs();
const HB_STR_X1 = HB_XS[0]-18;
const HB_STR_X2 = HB_XS[HB_XS.length-1]+18;
const HB_SAG    = 38;
function hbStrY(x: number) {
  const t=(x-HB_STR_X1)/(HB_STR_X2-HB_STR_X1);
  return 22 + HB_SAG*4*t*(1-t);
}

function HappyBirthdayBanner() {
  return (
    <motion.div style={{ position:"absolute", top:44, left:0, right:0, zIndex:25, pointerEvents:"none" }}
      initial={{ opacity:0, y:-24 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25, duration:0.7 }}>
      <svg width={390} height={118} viewBox="0 0 390 118">
        <defs>
          <linearGradient id="bannerG" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="390" y2="0">
            <stop offset="0%"   stopColor="#9A6E00"/>
            <stop offset="20%"  stopColor="#D4AF37"/>
            <stop offset="50%"  stopColor="#FFF4B0"/>
            <stop offset="80%"  stopColor="#D4AF37"/>
            <stop offset="100%" stopColor="#9A6E00"/>
          </linearGradient>
          <filter id="bannerGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.6" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Sagging string */}
        <motion.path
          d={`M ${HB_STR_X1} 22 Q 195 ${22+HB_SAG} ${HB_STR_X2} 22`}
          fill="none" stroke="#D4AF37" strokeWidth={1.6} opacity={0.95}
          animate={{ d:[
            `M ${HB_STR_X1} 22 Q 195 ${22+HB_SAG+6} ${HB_STR_X2} 22`,
            `M ${HB_STR_X1} 22 Q 195 ${22+HB_SAG-6} ${HB_STR_X2} 22`,
            `M ${HB_STR_X1} 22 Q 195 ${22+HB_SAG+6} ${HB_STR_X2} 22`,
          ]}}
          transition={{ duration:4.5, repeat:Infinity, ease:"easeInOut" }}/>
        <circle cx={HB_STR_X1} cy={22} r={4} fill="#B8940A" opacity={0.9}/>
        <circle cx={HB_STR_X2} cy={22} r={4} fill="#B8940A" opacity={0.9}/>

        {/* Individual hanging letters */}
        {HB_DEF.map((item, i) => {
          if (item.ch === " ") return null;
          const cx   = HB_XS[i];
          const sy   = hbStrY(cx);
          const THREAD = 15;
          const baseline = sy + THREAD + 40;
          const rot  = HB_ROTS[i];
          return (
            <g key={i} transform={`rotate(${rot},${cx},${sy+THREAD})`}>
              <line x1={cx} y1={sy} x2={cx} y2={sy+THREAD}
                stroke="#C9A840" strokeWidth={1.1} opacity={0.8}/>
              <motion.text
                x={cx} y={baseline}
                textAnchor="middle"
                fontFamily="'Brush Script MT','Segoe Script','Comic Sans MS',cursive"
                fontStyle="italic" fontWeight="bold"
                fontSize={40}
                fill="url(#bannerG)"
                filter="url(#bannerGlow)"
                animate={{ y:[baseline, baseline-2, baseline] }}
                transition={{ duration:2.8+i*0.2, repeat:Infinity, ease:"easeInOut", delay:i*0.15 }}>
                {item.ch}
              </motion.text>
            </g>
          );
        })}
      </svg>
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   BOTTOM BALLOON BUNCHES (Scene 2)
══════════════════════════════════════════ */
const BUNCHES_DEF = [
  { ax:20,  balls:[{dx:4,dy:-50,r:20,pi:0},{dx:-18,dy:-76,r:24,pi:2},{dx:16,dy:-68,r:18,pi:1},{dx:-6,dy:-100,r:22,pi:3},{dx:14,dy:-96,r:14,pi:4}] },
  { ax:62,  balls:[{dx:-14,dy:-53,r:22,pi:4},{dx:10,dy:-86,r:26,pi:0},{dx:-4,dy:-114,r:20,pi:2},{dx:20,dy:-66,r:16,pi:1},{dx:-18,dy:-136,r:15,pi:3},{dx:6,dy:-118,r:12,pi:0}] },
  { ax:106, balls:[{dx:6,dy:-58,r:24,pi:1},{dx:-22,dy:-88,r:28,pi:3},{dx:18,dy:-78,r:20,pi:0},{dx:-10,dy:-118,r:22,pi:2},{dx:24,dy:-106,r:14,pi:4}] },
  { ax:148, balls:[{dx:-10,dy:-50,r:20,pi:2},{dx:14,dy:-82,r:24,pi:0},{dx:-24,dy:-74,r:18,pi:4},{dx:4,dy:-114,r:22,pi:1},{dx:22,dy:-102,r:14,pi:3},{dx:-6,dy:-134,r:13,pi:2}] },
  { ax:195, balls:[{dx:-22,dy:-54,r:24,pi:3},{dx:16,dy:-92,r:30,pi:1},{dx:-8,dy:-126,r:22,pi:0},{dx:28,dy:-76,r:18,pi:2},{dx:0,dy:-154,r:18,pi:4},{dx:-24,dy:-110,r:14,pi:0},{dx:18,dy:-138,r:12,pi:2}] },
  { ax:242, balls:[{dx:10,dy:-50,r:20,pi:4},{dx:-14,dy:-82,r:24,pi:2},{dx:24,dy:-74,r:18,pi:1},{dx:-4,dy:-114,r:22,pi:3},{dx:-22,dy:-102,r:14,pi:0},{dx:8,dy:-134,r:13,pi:1}] },
  { ax:284, balls:[{dx:-6,dy:-58,r:24,pi:0},{dx:22,dy:-88,r:28,pi:2},{dx:-20,dy:-78,r:20,pi:1},{dx:8,dy:-118,r:22,pi:4},{dx:-26,dy:-106,r:14,pi:3}] },
  { ax:328, balls:[{dx:14,dy:-53,r:22,pi:1},{dx:-10,dy:-86,r:26,pi:3},{dx:4,dy:-114,r:20,pi:0},{dx:-20,dy:-66,r:16,pi:2},{dx:18,dy:-136,r:15,pi:4},{dx:-4,dy:-118,r:12,pi:1}] },
  { ax:370, balls:[{dx:-4,dy:-50,r:20,pi:2},{dx:18,dy:-76,r:24,pi:0},{dx:-16,dy:-68,r:18,pi:4},{dx:6,dy:-100,r:22,pi:1},{dx:-14,dy:-96,r:14,pi:3}] },
];

function BunchBalloons({ flyUp }: { flyUp: boolean }) {
  const AY = 900;
  return (
    <motion.div style={{ position:"absolute", left:0, top:0, width:390, height:844, zIndex:14, pointerEvents:"none" }}
      animate={flyUp ? { y:-1050 } : { y:0 }}
      transition={flyUp ? { duration:2.6, ease:[0.25,0,0.65,1] } : {}}>
      <svg width={390} height={AY+60} viewBox={`0 0 390 ${AY+60}`}
        style={{ position:"absolute", top:0, left:0 }}>
        <defs>
          {P.map((p,i)=>(
            <radialGradient key={i} id={`bpg${i}`} cx="34%" cy="28%" r="62%">
              <stop offset="0%"   stopColor={p.s}/>
              <stop offset="52%"  stopColor={p.c}/>
              <stop offset="100%" stopColor={p.c} stopOpacity={0.75}/>
            </radialGradient>
          ))}
        </defs>
        {BUNCHES_DEF.map((bunch,bi)=>
          bunch.balls.map((ball,li)=>{
            const bx=bunch.ax+ball.dx, by=AY+ball.dy, r=ball.r;
            const ci=ball.pi%P.length;
            return (
              <g key={`${bi}-${li}`}>
                <line x1={bx} y1={by+r} x2={bunch.ax} y2={AY}
                  stroke="#C9A840" strokeWidth={0.9} opacity={0.5}/>
                <motion.g
                  animate={{ y:[0,-3-li*0.5,0] }}
                  transition={{ duration:2.2+bi*0.28, repeat:Infinity, ease:"easeInOut", delay:bi*0.18+li*0.1 }}>
                  <circle cx={bx} cy={by} r={r} fill={`url(#bpg${ci})`}/>
                  {(ci===1||ci===4) && [[-0.2,-0.1],[0.2,0.15],[-0.05,0.25]].map(([ddx,ddy],k)=>(
                    <circle key={k} cx={bx+ddx*r*2} cy={by+ddy*r*2} r={r*0.09}
                      fill={P[(ci+k+1)%P.length].c} opacity={0.8}/>
                  ))}
                  <ellipse cx={bx-r*0.4} cy={by-r*0.62} rx={r*0.2} ry={r*0.13}
                    fill="white" opacity={0.5}
                    transform={`rotate(-30,${bx-r*0.4},${by-r*0.62})`}/>
                </motion.g>
              </g>
            );
          })
        )}
      </svg>
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   SCENE 3 — "We are not done yet"
══════════════════════════════════════════ */
function Scene3({ onNext }: { onNext:()=>void }) {
  return (
    <motion.div key="scene3" style={{ position:"absolute", inset:0, zIndex:12 }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.6 }}>
      <TwinkleBackground />
      <HappyBirthdayBanner />

      {/* Center message */}
      <motion.div style={{
        position:"absolute", left:0, right:0, top:0, bottom:0,
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        gap:0,
      }}>
        {/* Decorative line */}
        <motion.div style={{ width:80, height:1, background:"linear-gradient(90deg,transparent,#D4AF37,transparent)", marginBottom:28 }}
          initial={{ scaleX:0 }} animate={{ scaleX:1 }} transition={{ delay:0.5, duration:0.7 }}/>

        <motion.p style={{
          fontFamily:"'Brush Script MT','Segoe Script','Comic Sans MS',cursive",
          fontStyle:"italic", fontSize:38, lineHeight:1.3, textAlign:"center",
          margin:0, padding:"0 32px",
          background:"linear-gradient(120deg,#C9846A 0%,#D4AF37 45%,#FFF4B0 65%,#D4AF37 85%,#C9846A 100%)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}
          initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4, duration:0.7 }}>
          We are not<br/>done yet…
        </motion.p>

        {/* Decorative line */}
        <motion.div style={{ width:80, height:1, background:"linear-gradient(90deg,transparent,#D4AF37,transparent)", marginTop:28 }}
          initial={{ scaleX:0 }} animate={{ scaleX:1 }} transition={{ delay:0.6, duration:0.7 }}/>

        <motion.p style={{
          fontFamily:"Georgia,'Times New Roman',serif", fontStyle:"italic",
          fontSize:14, color:"rgba(212,175,55,0.65)", letterSpacing:2,
          marginTop:20, textAlign:"center",
        }}
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.9 }}>
          One more surprise awaits ✨
        </motion.p>

        {/* CTA */}
        <motion.button onClick={onNext} style={{
          marginTop:36,
          background:"linear-gradient(135deg,rgba(212,175,55,0.12),rgba(212,175,55,0.22))",
          border:"1.5px solid rgba(212,175,55,0.6)",
          borderRadius:40, padding:"15px 44px",
          color:"#F0D060", fontSize:14, letterSpacing:2.5,
          textTransform:"uppercase", fontFamily:"'Georgia',serif", cursor:"pointer",
          whiteSpace:"nowrap",
        }}
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:1.1 }}
          whileHover={{ scale:1.05, background:"linear-gradient(135deg,rgba(212,175,55,0.22),rgba(212,175,55,0.35))" }}
          whileTap={{ scale:0.97 }}>
          Click here ✨
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   PHOTO CUTOUT + CAP — Scene 4 sub-component
══════════════════════════════════════════ */
function PhotoCutout({ capVisible, imageSrc }: { capVisible:boolean, imageSrc:string }) {
  const HCX=195, HCY=370, ORX=96, ORY=118;
  const CAPBASE = HCY - ORY;
  return (
    <svg width={390} height={780} viewBox="0 0 390 780"
      style={{ position:"absolute", top:80, left:0, pointerEvents:"none" }}>
      <defs>
        <clipPath id="photoClip">
          <ellipse cx={HCX} cy={HCY} rx={ORX} ry={ORY}/>
        </clipPath>
        <linearGradient id="capG" x1="0%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%"   stopColor="#FFF4B0"/>
          <stop offset="35%"  stopColor="#D4AF37"/>
          <stop offset="70%"  stopColor="#9A6E00"/>
          <stop offset="100%" stopColor="#5C3D00"/>
        </linearGradient>
        <filter id="silGlow">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Real photo in oval clip */}
      <image
        href={imageSrc}
        x={HCX-ORX} y={HCY-ORY}
        width={ORX*2} height={ORY*2}
        preserveAspectRatio="xMidYMin slice"
        clipPath="url(#photoClip)"/>

      {/* Golden sketch outline */}
      <motion.ellipse cx={HCX} cy={HCY} rx={ORX+11} ry={ORY+11}
        fill="none" stroke="#D4AF37" strokeWidth={2.4} strokeLinecap="round"
        strokeDasharray="7 5"
        initial={{ pathLength:0 }} animate={{ pathLength:1 }}
        transition={{ duration:2.4, ease:"easeInOut" }}/>

      {/* Soft glow ring */}
      <motion.ellipse cx={HCX} cy={HCY} rx={ORX+11} ry={ORY+11}
        fill="none" stroke="#FFF4B0" strokeWidth={0.8} opacity={0.4}
        initial={{ pathLength:0 }} animate={{ pathLength:1 }}
        transition={{ duration:2.4, ease:"easeInOut" }}/>

      {/* Birthday cap */}
      {capVisible && (
        <motion.g
          initial={{ y:-200, opacity:0, rotate:-12 }}
          animate={{ y:0, opacity:1, rotate:0 }}
          transition={{ duration:0.75, ease:[0.34,1.56,0.64,1] }}>
          <path d={`M ${HCX+8} ${CAPBASE-62} L ${HCX-44} ${CAPBASE+10} L ${HCX+50} ${CAPBASE+10} Z`}
            fill="url(#capG)" filter="url(#silGlow)"/>
          {[0,1,2].map(n=>(
            <line key={n}
              x1={HCX-40+n*22} y1={CAPBASE+10}
              x2={HCX-22+n*22} y2={CAPBASE-38}
              stroke="rgba(255,255,255,0.2)" strokeWidth={5}/>
          ))}
          <ellipse cx={HCX+4} cy={CAPBASE+10} rx={48} ry={9}
            fill="#C9920A" opacity={0.95}/>
          <circle cx={HCX+8} cy={CAPBASE-68} r={11} fill="#FFF4B0"/>
          <circle cx={HCX+5} cy={CAPBASE-72} r={4} fill="white" opacity={0.7}/>
          <line x1={HCX+8} y1={CAPBASE-57} x2={HCX+28} y2={CAPBASE-24}
            stroke="#D4AF37" strokeWidth={1.5}/>
          <circle cx={HCX+30} cy={CAPBASE-20} r={5} fill="#D4AF37"/>
        </motion.g>
      )}
    </svg>
  );
}

/* ══════════════════════════════════════════
   SCENE 4 — Flowers (SVG helpers)
══════════════════════════════════════════ */
function FlowerTopRight() {
  return (
    <motion.svg width={188} height={220} viewBox="0 0 188 220"
      style={{ position:"absolute", top:128, right:-6, zIndex:6, pointerEvents:"none" }}
      animate={{ rotate:[-1,1.5,-1] }} transition={{ duration:6, repeat:Infinity, ease:"easeInOut" }}>
      <defs>
        <radialGradient id="fpA" cx="38%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#C04878"/><stop offset="100%" stopColor="#6A0A2C"/>
        </radialGradient>
        <radialGradient id="fpB" cx="38%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#D06090"/><stop offset="100%" stopColor="#8B1040"/>
        </radialGradient>
        <radialGradient id="fctr" cx="42%" cy="36%" r="60%">
          <stop offset="0%" stopColor="#FFF4B0"/><stop offset="60%" stopColor="#D4AF37"/><stop offset="100%" stopColor="#8B6400"/>
        </radialGradient>
        <filter id="fGlow"><feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* Stems + leaves */}
      <path d="M 94 108 C 78 140 64 168 52 210" stroke="#2A4E30" strokeWidth={3} fill="none" opacity={0.8}/>
      <path d="M 94 108 C 108 135 118 158 124 188" stroke="#2A4E30" strokeWidth={2.5} fill="none" opacity={0.7}/>
      <ellipse cx={70} cy={158} rx={27} ry={11} fill="#1E3A26" opacity={0.75} transform="rotate(-42,70,158)"/>
      <ellipse cx={117} cy={170} rx={22} ry={9}  fill="#2A4E30" opacity={0.65} transform="rotate(28,117,170)"/>
      {/* Main flower — 8 petals */}
      <g transform="translate(92,90)">
        {[0,45,90,135,180,225,270,315].map((a,i)=>(
          <motion.ellipse key={i} cx={0} cy={-34} rx={13} ry={29}
            fill={i%2===0?"url(#fpA)":"url(#fpB)"} opacity={0.88}
            transform={`rotate(${a})`}
            animate={{ ry:[29,31,29], opacity:[0.88,1,0.88] }}
            transition={{ duration:3.5+i*0.22, repeat:Infinity, ease:"easeInOut", delay:i*0.12 }}/>
        ))}
        <circle r={13} fill="url(#fctr)" filter="url(#fGlow)"/>
        <circle r={5}  fill="#FFF4B0" opacity={0.8}/>
      </g>
      {/* Small flower top-left */}
      <g transform="translate(34,48)">
        {[0,60,120,180,240,300].map((a,i)=>(
          <motion.ellipse key={i} cx={0} cy={-20} rx={9} ry={17}
            fill="url(#fpB)" opacity={0.82} transform={`rotate(${a})`}
            animate={{ ry:[17,19,17] }}
            transition={{ duration:4+i*0.28, repeat:Infinity, ease:"easeInOut", delay:0.3+i*0.1 }}/>
        ))}
        <circle r={9} fill="url(#fctr)" opacity={0.9}/>
      </g>
      {/* Bud 1 */}
      <g transform="translate(158,33) rotate(-18)">
        <ellipse cx={0} cy={0} rx={10} ry={18} fill="#8B1040" opacity={0.9}/>
        <ellipse cx={-2} cy={-2} rx={7} ry={13} fill="#C04878" opacity={0.75}/>
        <ellipse cx={0} cy={-11} rx={4} ry={6}  fill="#D4608A" opacity={0.8}/>
      </g>
      {/* Bud 2 */}
      <g transform="translate(148,135) rotate(14)">
        <ellipse cx={0} cy={0} rx={8} ry={13} fill="#6A0A2C" opacity={0.88}/>
        <ellipse cx={1} cy={-2} rx={5} ry={9}  fill="#A02050" opacity={0.7}/>
      </g>
    </motion.svg>
  );
}

function FlowerBottomLeft() {
  return (
    <motion.svg width={178} height={178} viewBox="0 0 178 178"
      style={{ position:"absolute", bottom:-8, left:-8, zIndex:6, pointerEvents:"none" }}
      animate={{ rotate:[1,-1.5,1] }} transition={{ duration:6.5, repeat:Infinity, ease:"easeInOut" }}>
      <defs>
        <radialGradient id="fpBL" cx="38%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#A82460"/><stop offset="100%" stopColor="#5C0828"/>
        </radialGradient>
        <radialGradient id="fcBL" cx="42%" cy="36%" r="60%">
          <stop offset="0%" stopColor="#FFF4B0"/><stop offset="100%" stopColor="#D4AF37"/>
        </radialGradient>
      </defs>
      <path d="M 75 95 C 68 118 62 142 56 172" stroke="#2A4E30" strokeWidth={2.5} fill="none" opacity={0.75}/>
      <path d="M 92 108 C 98 128 104 148 108 170" stroke="#2A4E30" strokeWidth={2} fill="none" opacity={0.65}/>
      <ellipse cx={60} cy={140} rx={23} ry={9} fill="#1E3A26" opacity={0.7} transform="rotate(-50,60,140)"/>
      {/* Medium flower — 7 petals */}
      <g transform="translate(78,82)">
        {[0,51.4,102.9,154.3,205.7,257.1,308.6].map((a,i)=>(
          <motion.ellipse key={i} cx={0} cy={-24} rx={10} ry={21}
            fill="url(#fpBL)" opacity={0.85} transform={`rotate(${a})`}
            animate={{ ry:[21,23,21] }}
            transition={{ duration:3.8+i*0.24, repeat:Infinity, ease:"easeInOut", delay:i*0.14 }}/>
        ))}
        <circle r={10} fill="url(#fcBL)"/>
      </g>
      {/* Small flower */}
      <g transform="translate(30,52)">
        {[0,72,144,216,288].map((a,i)=>(
          <ellipse key={i} cx={0} cy={-16} rx={8} ry={14}
            fill="#8B1040" opacity={0.8} transform={`rotate(${a})`}/>
        ))}
        <circle r={7} fill="#D4AF37" opacity={0.9}/>
      </g>
      {/* Bud */}
      <g transform="translate(120,60) rotate(18)">
        <ellipse cx={0} cy={0} rx={8} ry={14} fill="#5C0828" opacity={0.9}/>
        <ellipse cx={0} cy={-4} rx={5} ry={9}  fill="#A82460" opacity={0.75}/>
      </g>
    </motion.svg>
  );
}

function PolaroidFrame({ idx, top, left, rotate, floatDelay, imageSrc }:
  { idx:number, top:number, left:number, rotate:number, floatDelay:number, imageSrc:string }) {
  const IW=130, IH=138, BRD=11, BOT=32;
  return (
    <motion.div style={{ position:"absolute", top, left, zIndex:10+idx, rotate }}
      initial={{ opacity:0, scale:0.82, y:36 }}
      animate={{ opacity:1, scale:1, y:0 }}
      transition={{ delay:0.18+idx*0.28, duration:0.65, ease:[0.34,1.56,0.64,1] }}>
      <motion.div
        animate={{ y:[0,-7,0] }}
        transition={{ duration:3.2+idx*0.65, repeat:Infinity, ease:"easeInOut", delay:floatDelay }}>
        {/* Polaroid frame */}
        <div style={{
          width:IW+BRD*2, height:IH+BRD+BOT,
          background:"#f2ede4",
          borderRadius:3,
          boxShadow:"0 10px 28px rgba(0,0,0,0.65), 0 3px 8px rgba(0,0,0,0.4)",
          padding:BRD, paddingBottom:BOT,
          boxSizing:"border-box" as const,
        }}>
          {/* Photo area */}
          <div style={{ width:IW, height:IH, borderRadius:2,
            position:"relative", overflow:"hidden", background:"#1a0d08" }}>
            <img src={imageSrc} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   SCENE 4 — Polaroid Photo Collage
══════════════════════════════════════════ */
function Scene4({ onNext }: { onNext:()=>void }) {
  const sparkles = [{x:318,y:218},{x:256,y:374},{x:342,y:446},{x:202,y:568},{x:278,y:300}];
  return (
    <motion.div key="scene4col" style={{ position:"absolute", inset:0, zIndex:12, overflow:"hidden" }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.7 }}>
      <TwinkleBackground />
      <FlowerTopRight />
      <FlowerBottomLeft />
      <HappyBirthdayBanner />

      {/* Sparkles */}
      {sparkles.map((s,i)=>(
        <motion.div key={i} style={{ position:"absolute", left:s.x, top:s.y,
          fontSize:11, color:"#D4AF37", zIndex:7, pointerEvents:"none" }}
          animate={{ opacity:[0.3,1,0.3], scale:[0.8,1.3,0.8], rotate:[0,30,0] }}
          transition={{ duration:1.8+i*0.45, repeat:Infinity, delay:i*0.38 }}>✦</motion.div>
      ))}

      {/* 3 Floating polaroids */}
      <PolaroidFrame idx={0} top={155} left={6}  rotate={-7} floatDelay={0}   imageSrc={photo1Src}/>
      <PolaroidFrame idx={1} top={328} left={34} rotate={-2} floatDelay={0.6} imageSrc={photo2Src}/>
      <PolaroidFrame idx={2} top={505} left={6}  rotate={-5} floatDelay={1.1} imageSrc={photo3Src}/>

      {/* "happy birthday" cursive text — right side */}
      <motion.div style={{ position:"absolute", right:10, top:428, width:172, textAlign:"right" }}>
        <motion.p
          style={{
            fontFamily:"'Brush Script MT','Segoe Script','Dancing Script',cursive",
            fontStyle:"italic", fontSize:48, lineHeight:0.88,
            margin:0, marginBottom:14,
            background:"linear-gradient(135deg,#7A5200 0%,#D4AF37 35%,#FFF4B0 55%,#D4AF37 78%,#7A5200 100%)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            filter:"drop-shadow(0 0 10px rgba(212,175,55,0.35))",
          }}
          initial={{ opacity:0, x:28 }} animate={{ opacity:1, x:0 }}
          transition={{ delay:0.5, duration:0.8 }}>
          happy<br/>birthday
        </motion.p>
        <motion.p
          style={{
            fontFamily:"Georgia,'Times New Roman',serif", fontStyle:"italic",
            fontSize:11, lineHeight:1.6, color:"rgba(212,175,55,0.68)",
            margin:0,
          }}
          initial={{ opacity:0 }} animate={{ opacity:1 }}
          transition={{ delay:1.05, duration:0.7 }}>
          Cheers to another year of fun, laughter, and unforgettable memories!
        </motion.p>
      </motion.div>

      {/* Continue */}
      <motion.button onClick={onNext} style={{
        position:"absolute", bottom:26, left:"50%", transform:"translateX(-50%)",
        background:"linear-gradient(135deg,rgba(212,175,55,0.14),rgba(212,175,55,0.26))",
        border:"1.5px solid rgba(212,175,55,0.58)", borderRadius:36, padding:"13px 40px",
        color:"#F0D060", fontSize:13, letterSpacing:2, textTransform:"uppercase",
        fontFamily:"'Georgia',serif", cursor:"pointer", whiteSpace:"nowrap",
      }}
        initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:1.4 }}
        whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}>
        Continue ✨
      </motion.button>
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   SCENE 5 — Photo cutout + cap + confetti
══════════════════════════════════════════ */
function Scene5({ onReplay }: { onReplay:()=>void }) {
  const [capVisible,  setCapVisible]  = useState(false);
  const [cfShow,      setCfShow]      = useState(false);
  const [showReplay,  setShowReplay]  = useState(false);
  const [pencilDone,  setPencilDone]  = useState(false);

  useEffect(()=>{
    const t1 = setTimeout(()=>setPencilDone(true),  2600);
    const t2 = setTimeout(()=>setCapVisible(true),   3200);
    const t3 = setTimeout(()=>setCfShow(true),       4400);
    const t4 = setTimeout(()=>setCfShow(false),      8000);
    const t5 = setTimeout(()=>setShowReplay(true),   5000);
    return ()=>[t1,t2,t3,t4,t5].forEach(clearTimeout);
  },[]);

  const cf4 = Array.from({length:65},(_,i)=>({
    id:i, x:(i*16.3)%100, color:P[i%P.length].c, delay:i*0.05,
  }));

  return (
    <motion.div key="scene5" style={{ position:"absolute", inset:0, zIndex:12 }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.6 }}>
      <TwinkleBackground />
      <HappyBirthdayBanner />

      <AnimatePresence>
        {cfShow && cf4.map(p=><Confetto key={p.id} x={p.x} color={p.color} delay={p.delay}/>)}
      </AnimatePresence>

      {/* Photo + cap */}
      <PhotoCutout capVisible={capVisible} imageSrc={photo3Src}/>

      {/* Pencil emoji drawing animation */}
      {!pencilDone && (
        <motion.div style={{ position:"absolute", fontSize:26, zIndex:30, pointerEvents:"none",
          top:195, left:335 }}
          animate={{
            x:[-140,-200,-140,-80,-140],
            y:[ -10, 68, 148,  68,  -10],
          }}
          transition={{ duration:2.4, ease:"linear", times:[0,0.25,0.5,0.75,1] }}>
          ✏️
        </motion.div>
      )}

      {/* "Your surprise" label that appears after cap */}
      {capVisible && (
        <motion.div style={{
          position:"absolute", bottom:130, left:0, right:0,
          textAlign:"center",
          fontFamily:"'Brush Script MT','Segoe Script',cursive",
          fontStyle:"italic", fontSize:22,
          background:"linear-gradient(120deg,#C9846A,#D4AF37,#FFF4B0,#D4AF37)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}
          initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}>
          Wishing you all the happiness ✨
        </motion.div>
      )}

      {/* Replay */}
      <AnimatePresence>
        {showReplay && (
          <motion.button key="replay4"
            onClick={onReplay}
            style={{
              position:"absolute", bottom:52,
              left:"50%", transform:"translateX(-50%)",
              background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.3)",
              borderRadius:24, padding:"8px 26px", color:"#C9A840",
              fontSize:11, letterSpacing:2, textTransform:"uppercase",
              fontFamily:"sans-serif", cursor:"pointer", whiteSpace:"nowrap",
            }}
            initial={{ opacity:0 }} animate={{ opacity:1 }}
            whileHover={{ background:"rgba(212,175,55,0.18)" }}>
            ↩ Replay from start
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
export function BirthdayDoor() {
  const [scene,      setScene]      = useState<1|2|3|4|5>(1);
  const [open,       setOpen]       = useState(false);
  const [confetti,   setConfetti]   = useState(false);
  const [cakePhase,  setCakePhase]  = useState<"cta"|"counting"|"blown">("cta");
  const [countdown,  setCountdown]  = useState(3);
  const [blown,      setBlown]      = useState(false);
  const [flyUp,      setFlyUp]      = useState(false);

  const cfPieces = Array.from({ length:55 }, (_,i) => ({
    id:i, x:(i*18.7)%100, color:P[i%P.length].c, delay:i*0.065,
  }));

  function handleTap() {
    if (open) return;
    setOpen(true);
    setTimeout(() => { setScene(2); setCakePhase("cta"); }, 1000);
  }
  function handleBlow() {
    setCakePhase("counting");
    setCountdown(3);
    setTimeout(() => setCountdown(2), 800);
    setTimeout(() => { setCountdown(1); setFlyUp(true); }, 1600);
    setTimeout(() => { setCakePhase("blown"); setBlown(true); setConfetti(true); }, 2400);
    setTimeout(() => setConfetti(false), 5200);
  }
  function handleReplay() {
    setScene(1); setConfetti(false); setBlown(false); setFlyUp(false);
    setCakePhase("cta"); setCountdown(3);
    setTimeout(() => setOpen(false), 80);
  }

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
        {scene === 1 && (
          <motion.div key="scene1"
            style={{ position:"absolute", inset:0, zIndex:10 }}
            exit={{ opacity:0 }} transition={{ duration:0.4, delay:0.8 }}>
            <Curtain open={open} />
            <motion.button onClick={handleTap} style={{
              position:"absolute", left:0, top:0, width:390, height:844,
              background:"transparent", border:"none",
              cursor:open?"default":"pointer", zIndex:7,
            }}/>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Balloon garland — scene 1 only */}
      {scene === 1 && GARLAND.map((b,i) => <GBalloon key={i} {...b} popped={blown} />)}

      {/* ══ SCENE 2 : CAKE ══ */}
      <AnimatePresence>
        {scene === 2 && (
          <motion.div key="scene2"
            style={{ position:"absolute", inset:0, zIndex:12, display:"flex", flexDirection:"column", alignItems:"center" }}
            initial={{ opacity:0, scale:0.9 }}
            animate={{ opacity:1, scale:1 }}
            transition={{ duration:0.55, ease:[0.34,1.56,0.64,1] }}>

            <TwinkleBackground />
            <HappyBirthdayBanner />
            <BunchBalloons flyUp={flyUp} />

            {/* Cake */}
            <motion.div style={{
                position:"absolute",
                left: C_LEFT + C_W/2 - 134,
                top:  C_TOP  + C_H/2 - 134 - 80,
                width:268, height:268,
              }}
              initial={{ scale:0.1, rotate:-18 }} animate={{ scale:1, rotate:0 }}
              transition={{ delay:0.3, duration:0.7, ease:[0.34,1.56,0.64,1] }}>
              <Cake blown={blown} />
            </motion.div>

            {/* CTA */}
            <AnimatePresence>
              {cakePhase === "cta" && (
                <motion.button key="cta" onClick={handleBlow}
                  style={{
                    position:"absolute",
                    top: C_TOP + C_H/2 - 134 - 80 + 268 + 32,
                    left:"50%", transform:"translateX(-50%)",
                    background:"rgba(212,175,55,0.1)",
                    border:"1.5px solid rgba(212,175,55,0.55)",
                    borderRadius:32, padding:"13px 32px",
                    color:"#F0D060", fontSize:14, letterSpacing:2,
                    textTransform:"uppercase", fontFamily:"sans-serif",
                    cursor:"pointer", whiteSpace:"nowrap",
                  }}
                  initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
                  exit={{ opacity:0, y:-10 }} transition={{ delay:0.7 }}
                  whileHover={{ background:"rgba(212,175,55,0.22)", scale:1.04 }}>
                  🕯️ Blow the Candles
                </motion.button>
              )}
            </AnimatePresence>

            {/* Countdown */}
            <AnimatePresence mode="wait">
              {cakePhase === "counting" && (
                <motion.div key={`cd-${countdown}`}
                  style={{
                    position:"absolute",
                    top: C_TOP + C_H/2 - 134 - 80 + 268 + 16,
                    left:0, right:0, textAlign:"center",
                    fontSize:100, fontWeight:"bold", lineHeight:1,
                    fontFamily:"Georgia,serif",
                    background:"linear-gradient(120deg,#C9846A 0%,#D4AF37 50%,#F0D060 100%)",
                    WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                  }}
                  initial={{ scale:1.9, opacity:0 }}
                  animate={{ scale:1, opacity:1 }}
                  exit={{ scale:0.2, opacity:0 }}
                  transition={{ duration:0.32, ease:[0.34,1.56,0.64,1] }}>
                  {countdown}
                </motion.div>
              )}
            </AnimatePresence>

            {/* After blown — Continue + Replay */}
            <AnimatePresence>
              {cakePhase === "blown" && (
                <motion.div key="blown-actions" style={{
                  position:"absolute", bottom:30,
                  left:0, right:0, display:"flex", flexDirection:"column",
                  alignItems:"center", gap:12,
                }}
                  initial={{ opacity:0 }} animate={{ opacity:1 }}
                  transition={{ delay:1.2 }}>

                  <motion.button onClick={() => setScene(3)}
                    style={{
                      background:"linear-gradient(135deg,rgba(212,175,55,0.18),rgba(212,175,55,0.3))",
                      border:"1.5px solid rgba(212,175,55,0.65)",
                      borderRadius:36, padding:"14px 40px",
                      color:"#F0D060", fontSize:14, letterSpacing:2,
                      textTransform:"uppercase", fontFamily:"sans-serif",
                      cursor:"pointer", whiteSpace:"nowrap",
                    }}
                    whileHover={{ scale:1.05 }} whileTap={{ scale:0.97 }}>
                    Continue ✨
                  </motion.button>

                  <motion.button onClick={handleReplay}
                    style={{
                      background:"transparent", border:"none",
                      color:"rgba(201,168,64,0.55)", fontSize:11,
                      letterSpacing:2, textTransform:"uppercase",
                      fontFamily:"sans-serif", cursor:"pointer",
                    }}
                    whileHover={{ color:"rgba(201,168,64,0.9)" }}>
                    ↩ Replay
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ SCENE 3 : TEASER ══ */}
      <AnimatePresence>
        {scene === 3 && <Scene3 onNext={() => setScene(4)} />}
      </AnimatePresence>

      {/* ══ SCENE 4 : POLAROID COLLAGE ══ */}
      <AnimatePresence>
        {scene === 4 && <Scene4 onNext={() => setScene(5)} />}
      </AnimatePresence>

      {/* ══ SCENE 5 : PHOTO CUTOUT ══ */}
      <AnimatePresence>
        {scene === 5 && <Scene5 onReplay={handleReplay} />}
      </AnimatePresence>
    </div>
  );
}
