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
/* ── Beautiful CSS-3D cake tier ── */
function CakeTier3D({ r, h, top: yTop, panels=20, light, dark, capA, capB, pearl, drip=true }:{
  r:number; h:number; top:number; panels?:number;
  light:string; dark:string; capA:string; capB:string;
  pearl?:string; drip?:boolean;
}) {
  const pw = 2 * r * Math.sin(Math.PI / panels);
  return (
    <div style={{ position:"absolute", width:r*2, height:h,
                  left:"50%", top:yTop, marginLeft:-r,
                  transformStyle:"preserve-3d" }}>
      {Array.from({length:panels},(_,i)=>{
        const cos = Math.cos((i/panels)*Math.PI*2);
        const lit = Math.max(0.28, Math.min(1.12, 0.64+0.42*cos));
        return (
          <div key={i} style={{
            position:"absolute", width:pw, height:h,
            left:"50%", marginLeft:-pw/2, top:0,
            background:`linear-gradient(180deg,${light} 0%,${dark} 100%)`,
            filter:`brightness(${lit.toFixed(2)})`,
            transform:`rotateY(${(i/panels)*360}deg) translateZ(${r}px)`,
            backfaceVisibility:"hidden", overflow:"hidden",
          }}>
            {/* Frosting drip blobs */}
            {drip && [18, 62].map((lp, d) => (
              <div key={d} style={{
                position:"absolute",
                left:`${lp}%`, top:-3,
                width:7+d*4, height:18+d*5,
                borderRadius:"0 0 55% 55%",
                background:"rgba(255,251,246,0.93)",
                transform:"translateX(-50%)",
              }}/>
            ))}
            {/* Pearl dot */}
            {pearl && (
              <div style={{
                position:"absolute", left:"50%", top:h*0.52,
                width:10, height:10, borderRadius:"50%",
                background:`radial-gradient(circle at 35% 32%,#fff 18%,${pearl} 75%)`,
                marginLeft:-5, marginTop:-5,
                boxShadow:`0 0 4px ${pearl}80`,
              }}/>
            )}
            {/* Thin gold rim at base of panel */}
            <div style={{
              position:"absolute", left:0, bottom:0,
              width:"100%", height:5,
              background:"linear-gradient(90deg,#9B7210,#D4AF37,#F0D060,#D4AF37,#9B7210)",
              opacity:0.7,
            }}/>
          </div>
        );
      })}
      {/* Frosting cap — glossy radial gradient */}
      <div style={{
        position:"absolute", width:r*2, height:r*2, borderRadius:"50%",
        background:`radial-gradient(circle at 38% 32%, #FFFEF8 0%, ${capA} 52%, ${capB} 100%)`,
        left:0, top:-(r*2),
        transformOrigin:"bottom center",
        transform:"rotateX(-90deg)",
        boxShadow:"inset 0 2px 10px rgba(255,255,255,0.3), inset 0 0 18px rgba(180,130,60,0.12)",
      }}/>
    </div>
  );
}

/* Thin gold separator ring between tiers */
function TierRing({ r, top: yTop }:{ r:number; top:number }) {
  const N = 20, h = 8, pw = 2 * r * Math.sin(Math.PI / N);
  return (
    <div style={{ position:"absolute", width:r*2, height:h,
                  left:"50%", top:yTop, marginLeft:-r,
                  transformStyle:"preserve-3d" }}>
      {Array.from({length:N},(_,i)=>{
        const lit = Math.max(0.5, Math.min(1.4, 0.8+0.5*Math.cos((i/N)*Math.PI*2)));
        return (
          <div key={i} style={{
            position:"absolute", width:pw, height:h,
            left:"50%", marginLeft:-pw/2, top:0,
            background:"linear-gradient(180deg,#F4D060,#B89020)",
            filter:`brightness(${lit.toFixed(2)})`,
            transform:`rotateY(${(i/N)*360}deg) translateZ(${r}px)`,
            backfaceVisibility:"hidden",
          }}/>
        );
      })}
    </div>
  );
}

function BirthdayCake3D({ blown }: { blown:boolean }) {
  const CANDLES = [
    { x:-22, top:"#F9A8D4", bot:"#BE185D", dur:0.37 },
    { x:  0, top:"#FDE68A", bot:"#B45309", dur:0.43 },
    { x: 22, top:"#C4B5FD", bot:"#6D28D9", dur:0.40 },
  ];
  const cpw = 2*5*Math.sin(Math.PI/12);

  return (
    <div style={{
      width:268, height:268, position:"relative",
      transformStyle:"preserve-3d",
      transform:"rotateX(-26deg)",
    }}>
      {/* Bottom tier — deep plum/burgundy */}
      <CakeTier3D r={100} h={66} top={194} panels={24}
        light="#B01830" dark="#5C0A18"
        capA="#FFF5E8" capB="#E8CCA8"
        pearl="#D4AF37" drip/>

      {/* Gold ring */}
      <TierRing r={72} top={188}/>

      {/* Middle tier — rose gold */}
      <CakeTier3D r={68} h={54} top={130} panels={20}
        light="#C47A5A" dark="#7A3E28"
        capA="#FFF0E0" capB="#D4A880"
        pearl="#FFF5EE" drip/>

      {/* Gold ring */}
      <TierRing r={48} top={126}/>

      {/* Top tier — ivory cream */}
      <CakeTier3D r={46} h={48} top={78} panels={16}
        light="#FFFCF5" dark="#E8D0A8"
        capA="#FFFFFF" capB="#F5E8CC"
        pearl="#D4AF37" drip={false}/>

      {/* Candles */}
      {CANDLES.map((cd,i)=>(
        <div key={i} style={{
          position:"absolute",
          width:10, height:32,
          left:"50%", top:44,
          marginLeft:cd.x-5,
          transformStyle:"preserve-3d",
          transform:"translateZ(32px)",
        }}>
          {Array.from({length:12},(_,j)=>{
            const lit = Math.max(0.4, 0.7+0.3*Math.cos((j/12)*Math.PI*2));
            return (
              <div key={j} style={{
                position:"absolute", width:cpw, height:32,
                left:"50%", marginLeft:-cpw/2, top:0,
                background:`linear-gradient(180deg,${cd.top},${cd.bot})`,
                filter:`brightness(${lit.toFixed(2)})`,
                transform:`rotateY(${(j/12)*360}deg) translateZ(5px)`,
                backfaceVisibility:"hidden",
              }}/>
            );
          })}
          {/* Wax top */}
          <div style={{
            position:"absolute", width:12, height:12, borderRadius:"50%",
            background:`radial-gradient(circle at 38% 35%,#fff 15%,${cd.top} 70%)`,
            left:-1, top:-6, transformOrigin:"center bottom",
            transform:"translateZ(5px) rotateX(-90deg)",
          }}/>
          {/* Wick */}
          <div style={{
            position:"absolute", width:2, height:7, borderRadius:1,
            background:"#3B2000", left:4, top:-13, transform:"translateZ(5px)",
          }}/>
          {/* Flame */}
          {!blown ? (
            <motion.div style={{
              position:"absolute", width:14, height:22, left:-2, top:-33,
              borderRadius:"50% 50% 35% 35% / 65% 65% 35% 35%",
              background:"linear-gradient(180deg,#FFFFE0 0%,#FFAA00 45%,#FF5500 100%)",
              filter:"blur(0.6px)",
              boxShadow:"0 0 14px 7px rgba(255,150,0,0.65), 0 0 5px 2px rgba(255,255,100,0.5)",
              transform:"translateZ(5px)",
            }}
              animate={{ scaleX:[1,0.5,1,0.68,1], scaleY:[1,1.22,0.86,1.18,1], rotate:[-3,3,-1,4,-3] }}
              transition={{ duration:cd.dur, repeat:Infinity, ease:"easeInOut" }}/>
          ) : (
            <motion.div style={{
              position:"absolute", width:3, height:16, left:3.5, top:-26,
              borderRadius:3, background:"rgba(220,220,220,0.45)",
              transform:"translateZ(5px)",
            }}
              animate={{ opacity:[0.7,0], y:[0,-14,-20], scaleX:[1,2.5,0] }}
              transition={{ duration:1.4, repeat:Infinity, delay:i*0.22 }}/>
          )}
        </div>
      ))}
    </div>
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
const HB_CHARS = ["H","a","p","p","y"," ","B","i","r","t","h","d","a","y"];
const HB_ROTS  = [-8,-4,-6,-3,-5,  0, -7,-2,-5,-4,-6,-3,-5,-7];
const HB_STR_X1 = 3;
const HB_STR_X2 = 387;
const HB_SAG    = 36;
// Spread letters edge-to-edge: x=16..374
const HB_XS = HB_CHARS.map((_,i) => 16 + i * ((374-16)/(HB_CHARS.length-1)));
function hbStrY(x: number) {
  const t = (x - HB_STR_X1) / (HB_STR_X2 - HB_STR_X1);
  return 20 + HB_SAG * 4 * t * (1 - t);
}

function HappyBirthdayBanner() {
  return (
    <motion.div style={{ position:"absolute", top:40, left:0, right:0, zIndex:25, pointerEvents:"none" }}
      initial={{ opacity:0, y:-24 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25, duration:0.7 }}>
      <svg width={390} height={130} viewBox="0 0 390 130">
        <defs>
          <filter id="lttrGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.8" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Sagging string — full edge-to-edge */}
        <motion.path
          d={`M ${HB_STR_X1} 20 Q 195 ${20+HB_SAG} ${HB_STR_X2} 20`}
          fill="none" stroke="#D4AF37" strokeWidth={1.8} opacity={0.95}
          animate={{ d:[
            `M ${HB_STR_X1} 20 Q 195 ${20+HB_SAG+7} ${HB_STR_X2} 20`,
            `M ${HB_STR_X1} 20 Q 195 ${20+HB_SAG-7} ${HB_STR_X2} 20`,
            `M ${HB_STR_X1} 20 Q 195 ${20+HB_SAG+7} ${HB_STR_X2} 20`,
          ]}}
          transition={{ duration:4.5, repeat:Infinity, ease:"easeInOut" }}/>
        <circle cx={HB_STR_X1} cy={20} r={5} fill="#B8940A" opacity={0.95}/>
        <circle cx={HB_STR_X2} cy={20} r={5} fill="#B8940A" opacity={0.95}/>

        {/* Individual hanging letters */}
        {HB_CHARS.map((ch, i) => {
          if (ch === " ") return null;
          const cx     = HB_XS[i];
          const sy     = hbStrY(cx);
          const THREAD = 3;
          const rot    = HB_ROTS[i];
          const pivot  = sy + THREAD;
          const floatY = pivot + 36;
          return (
            <g key={i}>
              {/* No thread line — letters hang directly from string */}
              <g transform={`rotate(${rot},${cx},${pivot})`}>
                <motion.g
                  animate={{ y:[0,-2.5,0] }}
                  transition={{ duration:2.6+i*0.22, repeat:Infinity, ease:"easeInOut", delay:i*0.14 }}>
                  <text x={cx+1} y={floatY+1} textAnchor="middle"
                    fontFamily="'Brush Script MT','Segoe Script','Comic Sans MS',cursive"
                    fontStyle="italic" fontWeight="bold" fontSize={40}
                    fill="#5C3500" opacity={0.45}>{ch}</text>
                  <text x={cx} y={floatY} textAnchor="middle"
                    fontFamily="'Brush Script MT','Segoe Script','Comic Sans MS',cursive"
                    fontStyle="italic" fontWeight="bold" fontSize={40}
                    fill="#D4AF37" filter="url(#lttrGlow)">{ch}</text>
                  <text x={cx} y={floatY} textAnchor="middle"
                    fontFamily="'Brush Script MT','Segoe Script','Comic Sans MS',cursive"
                    fontStyle="italic" fontWeight="bold" fontSize={40}
                    fill="#FFF4B0" opacity={0.28}>{ch}</text>
                </motion.g>
              </g>
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
    <div style={{ position:"absolute", left:0, top:0, width:390, height:844, zIndex:14, pointerEvents:"none" }}>
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
            // Deterministic per-balloon spread: 0–1.9 s delay, ±14 px x-drift
            const seed = bi*7 + li*13;
            const flyDelay = (seed % 23) / 23 * 1.9;
            const flyDrift = ((seed*3 + bi*5) % 29) - 14;
            const flyDur   = 1.7 + (seed % 9) * 0.13;
            return (
              <g key={`${bi}-${li}`}>
                {/* String fades when ballon leaves */}
                <motion.line x1={bx} y1={by+r} x2={bunch.ax} y2={AY}
                  stroke="#C9A840" strokeWidth={0.9}
                  animate={{ opacity: flyUp ? 0 : 0.5 }}
                  transition={{ delay: flyUp ? flyDelay : 0, duration:0.25 }}/>
                {/* Each balloon flies independently */}
                <motion.g
                  animate={flyUp
                    ? { y:-1220, x:flyDrift }
                    : { y:[0, -(3+li*0.5), 0] }}
                  transition={flyUp
                    ? { delay:flyDelay, duration:flyDur, ease:[0.22,0,0.55,1] }
                    : { duration:2.2+bi*0.28, repeat:Infinity, ease:"easeInOut", delay:bi*0.18+li*0.1 }}>
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
    </div>
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
   FOIL NUMBER BALLOONS helper
══════════════════════════════════════════ */
function NumberBalloons({ n }: { n:number }) {
  const digits = String(n).split("");
  const DW=72, DH=96, GAP=8;
  const totalW = digits.length * (DW + GAP) - GAP;
  return (
    <svg width={totalW} height={DH+30} viewBox={`0 0 ${totalW} ${DH+30}`}>
      <defs>
        <radialGradient id="bnBody" cx="35%" cy="28%" r="68%">
          <stop offset="0%"   stopColor="#F2C4CE"/>
          <stop offset="42%"  stopColor="#C07880"/>
          <stop offset="100%" stopColor="#7A3042"/>
        </radialGradient>
        <radialGradient id="bnHigh" cx="38%" cy="22%" r="36%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.62)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </radialGradient>
      </defs>
      {digits.map((ch, i) => {
        const ox = i * (DW + GAP);
        const cx = ox + DW / 2;
        return (
          <g key={i}>
            <rect x={ox} y={2} width={DW} height={DH - 8} rx={DW/2} ry={DH/2}
              fill="url(#bnBody)"/>
            <ellipse cx={cx - 8} cy={24} rx={15} ry={10} fill="url(#bnHigh)"/>
            <text x={cx} y={DH * 0.62} textAnchor="middle"
              fontFamily="'Arial Black','Arial Bold',Gadget,sans-serif" fontWeight="900"
              fontSize={52} fill="rgba(65,12,22,0.68)">{ch}</text>
            <ellipse cx={cx} cy={DH - 6} rx={4} ry={5} fill="#A05060"/>
            <line x1={cx} y1={DH - 1} x2={cx} y2={DH + 28}
              stroke="#B07080" strokeWidth={1.5}/>
          </g>
        );
      })}
    </svg>
  );
}

/* ══════════════════════════════════════════
   BIRTHDAY CAKE SVG helper
══════════════════════════════════════════ */
function BirthdayCakeSVG() {
  return (
    <svg width={142} height={130} viewBox="0 0 142 130">
      <defs>
        <linearGradient id="ckBot" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#C9849A"/>
          <stop offset="100%" stopColor="#8A3A50"/>
        </linearGradient>
        <linearGradient id="ckTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#D4909E"/>
          <stop offset="100%" stopColor="#A05060"/>
        </linearGradient>
      </defs>

      {/* Bottom tier */}
      <rect x={8} y={74} width={126} height={48} rx={8} fill="url(#ckBot)"/>
      {/* Bottom frosting drips */}
      <path d="M8,74 C18,62 28,74 38,66 C48,58 58,74 68,66 C78,58 88,74 98,66 C108,58 118,74 134,66"
        fill="none" stroke="#F5DDE6" strokeWidth={5} strokeLinecap="round"/>
      {/* Dot decorations */}
      {[28,52,71,91,114].map((x,i) => (
        <circle key={i} cx={x} cy={94} r={3.5} fill="#F0D0DA" opacity={0.75}/>
      ))}

      {/* Top tier */}
      <rect x={26} y={42} width={90} height={38} rx={6} fill="url(#ckTop)"/>
      {/* Top frosting drips */}
      <path d="M26,42 C36,32 46,42 56,34 C66,26 76,42 86,34 C96,26 106,42 116,34"
        fill="none" stroke="#F8E8EE" strokeWidth={4.5} strokeLinecap="round"/>

      {/* Candles */}
      {[38,54,71,88,104].map((cx, i) => (
        <g key={i}>
          <rect x={cx-3.5} y={22} width={7} height={22} rx={3.5} fill="#D4AF37"/>
          <ellipse cx={cx} cy={19} rx={3.5} ry={5.5} fill="#FFF4B0"/>
          <ellipse cx={cx} cy={20.5} rx={2} ry={3} fill="#FFD700"/>
        </g>
      ))}
    </svg>
  );
}

/* ══════════════════════════════════════════
   SCENE 5 — Collage: photo + balloons + cake
══════════════════════════════════════════ */
function Scene5({ onReplay }: { onReplay:()=>void }) {
  const [showReplay, setShowReplay] = useState(false);

  useEffect(()=>{
    const t = setTimeout(()=>setShowReplay(true), 2200);
    return ()=>clearTimeout(t);
  },[]);

  const dots = [
    {x:38, y:88,  r:8,  c:"#B76E79"}, {x:316,y:72,  r:6,  c:"#D4AF37"},
    {x:342,y:152, r:9,  c:"#B76E79"}, {x:48, y:198, r:7,  c:"#D4AF37"},
    {x:300,y:222, r:5,  c:"#F8F0E3"}, {x:348,y:318, r:8,  c:"#C9A840"},
    {x:34, y:348, r:6,  c:"#F8F0E3"}, {x:330,y:456, r:7,  c:"#B76E79"},
    {x:50, y:540, r:9,  c:"#D4AF37"}, {x:318,y:598, r:5,  c:"#F8F0E3"},
    {x:66, y:682, r:8,  c:"#C9A840"}, {x:324,y:726, r:6,  c:"#B76E79"},
    {x:158,y:68,  r:5,  c:"#D4AF37"}, {x:230,y:92,  r:7,  c:"#B76E79"},
    {x:80, y:116, r:5,  c:"#C9A840"}, {x:278,y:132, r:4,  c:"#F8F0E3"},
    {x:196,y:114, r:6,  c:"#D4AF37"}, {x:262,y:780, r:7,  c:"#B76E79"},
  ];

  return (
    <motion.div key="scene5col"
      style={{ position:"absolute", inset:0, zIndex:12,
        background:"linear-gradient(160deg,#0e0502 0%,#1c0a06 55%,#130604 100%)" }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.7 }}>

      {/* Scattered confetti dots */}
      <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%",
        pointerEvents:"none" }} viewBox="0 0 390 844" preserveAspectRatio="xMidYMid meet">
        {dots.map((d,i) => (
          <motion.circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c}
            initial={{ scale:0, opacity:0 }}
            animate={{ scale:1, opacity:0.72 }}
            transition={{ delay:0.05 + i*0.055, duration:0.32 }}/>
        ))}
      </svg>

      {/* Foil number balloons — upper left */}
      <motion.div style={{ position:"absolute", top:48, left:8, zIndex:8 }}
        initial={{ opacity:0, x:-28, y:-18 }}
        animate={{ opacity:1, x:0, y:0 }}
        transition={{ delay:0.22, duration:0.72, ease:[0.34,1.56,0.64,1] }}>
        <NumberBalloons n={age} />
      </motion.div>

      {/* Photo — large, center, slightly desaturated */}
      <motion.div style={{
          position:"absolute", left:62, top:138,
          width:238, height:306,
          borderRadius:"50% 50% 50% 50% / 55% 55% 45% 45%",
          overflow:"hidden", zIndex:10,
          boxShadow:"0 14px 52px rgba(0,0,0,0.72), 0 0 0 2.5px rgba(212,175,55,0.20)",
        }}
        initial={{ opacity:0, scale:0.84, y:22 }}
        animate={{ opacity:1, scale:1, y:0 }}
        transition={{ delay:0.38, duration:0.78, ease:[0.34,1.56,0.64,1] }}>
        <img src={photo3Src} alt=""
          style={{ width:"100%", height:"100%", objectFit:"cover",
            objectPosition:"center 15%",
            filter:"saturate(0.52) contrast(1.08) brightness(1.06)",
            display:"block" }}/>
      </motion.div>

      {/* Birthday cake — lower right, overlapping photo */}
      <motion.div style={{ position:"absolute", right:6, bottom:154, zIndex:11 }}
        initial={{ opacity:0, scale:0.68, x:22 }}
        animate={{ opacity:1, scale:1, x:0 }}
        transition={{ delay:0.65, duration:0.68, ease:[0.34,1.56,0.64,1] }}>
        <BirthdayCakeSVG />
      </motion.div>

      {/* Name + wish */}
      <motion.div style={{
          position:"absolute", bottom:72, left:0, right:0,
          textAlign:"center", padding:"0 28px",
        }}
        initial={{ opacity:0, y:16 }}
        animate={{ opacity:1, y:0 }}
        transition={{ delay:1.05, duration:0.72 }}>
        <p style={{
          fontFamily:"'Palatino Linotype','Book Antiqua',Palatino,serif",
          fontStyle:"italic", fontSize:23, margin:"0 0 5px",
          background:"linear-gradient(120deg,#C9846A,#D4AF37,#FFF4B0,#D4AF37)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>Happy Birthday, {name}!</p>
        <p style={{
          fontFamily:"Georgia,serif", fontStyle:"italic",
          fontSize:12, color:"rgba(212,175,55,0.62)", margin:0, letterSpacing:0.5,
        }}>Wishing you all the love &amp; happiness ✨</p>
      </motion.div>

      {/* Replay */}
      <AnimatePresence>
        {showReplay && (
          <motion.button key="replay5" onClick={onReplay}
            style={{
              position:"absolute", bottom:18, left:"50%", transform:"translateX(-50%)",
              background:"rgba(212,175,55,0.07)", border:"1px solid rgba(212,175,55,0.3)",
              borderRadius:24, padding:"8px 28px", color:"#C9A840",
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
  const [cakeZoom,   setCakeZoom]   = useState(false);
  const [cakeExplode,setCakeExplode]= useState(false);

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
    setTimeout(() => setCountdown(1), 1600);
    setTimeout(() => { setCakePhase("blown"); setBlown(true); setConfetti(true); setFlyUp(true); }, 2400);
    setTimeout(() => setConfetti(false), 5200);
    setTimeout(() => setCakeZoom(true), 6000);
    setTimeout(() => setCakeExplode(true), 8300);
    setTimeout(() => setScene(4), 8900);
  }
  function handleReplay() {
    setScene(1); setConfetti(false); setBlown(false); setFlyUp(false);
    setCakePhase("cta"); setCountdown(3);
    setCakeZoom(false); setCakeExplode(false);
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

            {/* Cake — 3-D Y-axis spin + slow zoom-in, explodes before hitting screen */}
            <div style={{
                position:"absolute",
                left: C_LEFT + C_W/2 - 134,
                top:  C_TOP  + C_H/2 - 134 - 80,
                width:268, height:268,
                perspective: 700,
              }}>
              <motion.div
                style={{ width:268, height:268, transformStyle:"preserve-3d" }}
                initial={{ scale:0.1, rotateY:-20, opacity:1 }}
                animate={cakeZoom
                  ? { scale:3.8, rotateY:1080, opacity:1 }
                  : { scale:1,   rotateY:0,    opacity:1 }}
                transition={cakeZoom
                  ? {
                      scale:   { duration:2.3, ease:[0.12,0,0.88,1] },
                      rotateY: { duration:2.3, ease:"linear" },
                    }
                  : { delay:0.3, duration:0.7, ease:[0.34,1.56,0.64,1] }}>
                <BirthdayCake3D blown={blown} />
              </motion.div>
            </div>

            {/* CTA */}
            <AnimatePresence>
              {cakePhase === "cta" && (
                <motion.button key="cta" onClick={handleBlow}
                  style={{
                    position:"absolute",
                    top: 518,
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

            {/* Explosion burst */}
            <AnimatePresence>
              {cakeExplode && (
                <motion.div key="explosion" style={{ position:"absolute", inset:0, zIndex:22, pointerEvents:"none" }}>
                  <motion.div style={{ position:"absolute", inset:0, background:"rgba(255,248,220,0.9)" }}
                    initial={{ opacity:1 }} animate={{ opacity:0 }} transition={{ duration:0.45 }}/>
                  {Array.from({length:28},(_,i)=>{
                    const angle = (i/28)*Math.PI*2;
                    const dist  = 160 + (i%5)*52;
                    const tx = Math.cos(angle)*dist;
                    const ty = Math.sin(angle)*dist;
                    const sz = 14 + (i%6)*3;
                    return (
                      <motion.div key={i}
                        style={{ position:"absolute", width:sz, height:sz,
                          borderRadius:"50%", background:P[i%P.length].c,
                          left:"50%", top:"45%", marginLeft:-sz/2, marginTop:-sz/2, zIndex:23 }}
                        initial={{ x:0, y:0, scale:1.5, opacity:1 }}
                        animate={{ x:tx, y:ty, scale:0, opacity:0 }}
                        transition={{ duration:0.72, ease:[0.15,0,0.45,1], delay:i*0.012 }}/>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Replay only — auto-advances to Scene 4 */}
            <AnimatePresence>
              {cakePhase === "blown" && !cakeZoom && (
                <motion.div key="replay-btn"
                  style={{ position:"absolute", bottom:28, left:0, right:0, textAlign:"center" }}
                  initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.5 }}
                  exit={{ opacity:0 }}>
                  <motion.button onClick={handleReplay}
                    style={{ background:"transparent", border:"none",
                      color:"rgba(201,168,64,0.5)", fontSize:11,
                      letterSpacing:2, textTransform:"uppercase",
                      fontFamily:"sans-serif", cursor:"pointer" }}
                    whileHover={{ color:"rgba(201,168,64,0.85)" }}>
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
