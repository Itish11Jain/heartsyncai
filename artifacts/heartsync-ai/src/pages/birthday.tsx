import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { trackEvent } from "@/lib/trackEvent";
import ViralReplyCTA from "@/components/ViralReplyCTA";

const UnlockModal = lazy(() => import("@/components/UnlockModal"));
const WatermarkPaywallModal = lazy(() => import("@/components/WatermarkPaywallModal"));

/* ─── URL helpers ─────────────────────────────────────────────────────────── */
function getParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}
function decodeMsg(b64: string): string {
  try { return decodeURIComponent(escape(atob(b64))); } catch { return ""; }
}
function parsePhotoUrls(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map(s => { try { return decodeURIComponent(s); } catch { return s; } }).filter(Boolean);
}

/* ─── Balloon palette — Rose Gold · Gold · Off-White (matches mockup) ──────── */
const P = [
  { c:"#C9846A", s:"#F5D0C0" },
  { c:"#D4AF37", s:"#F5E57A" },
  { c:"#FFF5EE", s:"#FFFFFF" },
  { c:"#E8A07A", s:"#F8D5C0" },
  { c:"#C4913A", s:"#ECD080" },
  { c:"#F2DFC8", s:"#FFFBF5" },
];

/* ─── Rich twinkle background (matches mockup) ───────────────────────────── */
const TW_DOTS = Array.from({length:45},(_,i)=>({
  x:(i*173.1+31)%370+10, y:(i*97.7+55)%760+72,
  r:0.8+(i%5)*0.6, dur:1.8+(i%8)*0.35, delay:(i*0.27)%4,
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
    <div style={{ position:"absolute", inset:0, zIndex:1, pointerEvents:"none",
      background:"linear-gradient(175deg,#1c0a06 0%,#0e0502 100%)" }}>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",zIndex:1,pointerEvents:"none"}}>
        {TW_ORBS.map((o,i)=>(
          <motion.circle key={`orb${i}`} cx={o.x} cy={o.y} r={o.r}
            fill="none" stroke="#D4AF37" strokeWidth={0.8}
            animate={{scale:[1,1.35,1], opacity:[0.06,0.22,0.06]}}
            transition={{duration:o.dur, repeat:Infinity, delay:o.delay, ease:"easeInOut"}}
            style={{transformOrigin:`${o.x}px ${o.y}px`}}/>
        ))}
        {TW_DOTS.map((s,i)=>(
          <motion.circle key={i} cx={s.x} cy={s.y} r={s.r}
            fill={s.color}
            animate={{opacity:[0.04,0.95,0.1,0.8,0.04], scale:[1,1.6,1,1.3,1]}}
            transition={{duration:s.dur, repeat:Infinity, delay:s.delay, ease:"easeInOut"}}
            style={{transformOrigin:`${s.x}px ${s.y}px`}}/>
        ))}
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
        <ellipse cx={55}  cy={200} rx={85} ry={65}  fill="#6B2A1A" opacity={0.22}/>
        <ellipse cx={335} cy={180} rx={75} ry={58}  fill="#5C3A10" opacity={0.20}/>
        <ellipse cx={195} cy={750} rx={125} ry={75} fill="#7A3820" opacity={0.18}/>
      </svg>
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
    </div>
  );
}

/* ─── Scene 1: Gift + Balloons ──────────────────────────────────────────── */
const BALLOON_LEFT_DEFS = [
  { x:-72, y:108, r:28, pi:0, rdur:4.2, rdel:0 },
  { x:-44, y:72,  r:22, pi:2, rdur:3.8, rdel:0.6 },
  { x:-96, y:158, r:18, pi:1, rdur:5.1, rdel:1.1 },
  { x:-58, y:188, r:24, pi:3, rdur:4.7, rdel:0.3 },
  { x:-28, y:138, r:16, pi:4, rdur:3.5, rdel:1.4 },
];
const BALLOON_RIGHT_DEFS = [
  { x: 72, y:108, r:28, pi:1, rdur:4.4, rdel:0.2 },
  { x: 44, y:72,  r:22, pi:3, rdur:3.6, rdel:0.8 },
  { x: 96, y:158, r:18, pi:2, rdur:5.3, rdel:0.9 },
  { x: 58, y:188, r:24, pi:0, rdur:4.9, rdel:0.4 },
  { x: 28, y:138, r:16, pi:4, rdur:3.7, rdel:1.6 },
];

function BouquetBalloonSVG({ defs, side }: { defs: typeof BALLOON_LEFT_DEFS, side: "left"|"right" }) {
  const anchorX = side === "left" ? 195 : 195;
  const anchorY = 680;
  return (
    <svg width={390} height={280} viewBox="0 0 390 280"
      style={{ position:"absolute", bottom:120, left:0, zIndex:8, pointerEvents:"none" }}>
      <defs>
        {P.map((p, i) => (
          <radialGradient key={i} id={`bg_${side}_${i}`} cx="34%" cy="28%" r="62%">
            <stop offset="0%"   stopColor={p.s}/>
            <stop offset="52%"  stopColor={p.c}/>
            <stop offset="100%" stopColor={p.c} stopOpacity={0.7}/>
          </radialGradient>
        ))}
      </defs>
      {defs.map((b, i) => {
        const bx = anchorX + b.x - (side === "left" ? 90 : -90);
        const by = 220 + b.y - 220;
        return (
          <g key={i}>
            <motion.line x1={bx} y1={by + b.r + 6} x2={anchorX + (side==="left"?-90:90)} y2={220}
              stroke="#C9A840" strokeWidth={0.8} opacity={0.45}
              animate={{ d: undefined }}/>
            <motion.g
              animate={{ y:[0, -(3+i*0.7), 0] }}
              transition={{ duration: b.rdur, repeat:Infinity, ease:"easeInOut", delay:b.rdel }}>
              <circle cx={bx} cy={by} r={b.r} fill={`url(#bg_${side}_${b.pi % P.length})`}/>
              <ellipse cx={bx - b.r*0.4} cy={by - b.r*0.62} rx={b.r*0.2} ry={b.r*0.13}
                fill="white" opacity={0.5}
                transform={`rotate(-30,${bx - b.r*0.4},${by - b.r*0.62})`}/>
            </motion.g>
          </g>
        );
      })}
    </svg>
  );
}

function GiftBoxSVG({ onOpen }: { onOpen: () => void }) {
  const [opened, setOpened] = useState(false);
  const [shaking, setShaking] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShaking(false), 3200);
    return () => clearTimeout(t);
  }, []);
  function handleTap() {
    setOpened(true);
    setTimeout(onOpen, 600);
  }
  return (
    <motion.div onClick={handleTap} style={{ cursor:"pointer", position:"relative", width:180, height:160 }}
      animate={shaking ? { rotate:[-2,2,-2,2,-1,1,-2,2,0] } : {}}
      transition={{ duration:0.55, repeat:shaking ? Infinity : 0, repeatDelay:1.4 }}>
      <svg width={180} height={160} viewBox="0 0 180 160">
        <defs>
          <linearGradient id="boxBot" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C04878"/><stop offset="100%" stopColor="#7A1035"/>
          </linearGradient>
          <linearGradient id="boxLid" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E060A0"/><stop offset="100%" stopColor="#9B1848"/>
          </linearGradient>
          <linearGradient id="boxRib" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFF4B0"/><stop offset="50%" stopColor="#D4AF37"/><stop offset="100%" stopColor="#FFF4B0"/>
          </linearGradient>
        </defs>
        {/* Box body */}
        <rect x={20} y={80} width={140} height={72} rx={5} fill="url(#boxBot)"/>
        <rect x={84} y={80} width={12} height={72} fill="url(#boxRib)" opacity={0.85}/>
        <rect x={20} y={106} width={140} height={8} fill="url(#boxRib)" opacity={0.7}/>
        {/* Lid */}
        <motion.g animate={opened ? { y:-60, opacity:0 } : { y:0, opacity:1 }}
          transition={{ duration:0.5, ease:[0.34,1.56,0.64,1] }}>
          <rect x={12} y={58} width={156} height={28} rx={5} fill="url(#boxLid)"/>
          <rect x={78} y={58} width={24} height={28} fill="url(#boxRib)" opacity={0.85}/>
          {/* Bow */}
          <path d="M78 58 C60 42 52 30 78 44 C82 46 90 44 90 44" fill="url(#boxRib)" opacity={0.9}/>
          <path d="M102 58 C120 42 128 30 102 44 C98 46 90 44 90 44" fill="url(#boxRib)" opacity={0.9}/>
          <circle cx={90} cy={48} r={8} fill="#D4AF37"/>
          <circle cx={88} cy={46} r={3} fill="#FFF4B0" opacity={0.7}/>
        </motion.g>
        {/* Shine */}
        <rect x={26} y={84} width={4} height={60} rx={2} fill="white" opacity={0.12}/>
      </svg>
      {!opened && (
        <motion.p style={{
          position:"absolute", bottom:-28, left:0, right:0,
          textAlign:"center", fontSize:11, color:"rgba(212,175,55,0.7)",
          letterSpacing:2, textTransform:"uppercase", margin:0,
          fontFamily:"Georgia,serif",
        }}
          animate={{ opacity:[0.5,1,0.5] }}
          transition={{ duration:1.8, repeat:Infinity }}>
          tap to open ✨
        </motion.p>
      )}
    </motion.div>
  );
}

function Scene1({ name, onNext }: { name:string, onNext:()=>void }) {
  return (
    <motion.div key="s1" style={{ position:"absolute", inset:0, zIndex:12 }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      transition={{ duration:0.6 }}>
      <TwinkleBackground/>
      <BouquetBalloonSVG defs={BALLOON_LEFT_DEFS}  side="left"/>
      <BouquetBalloonSVG defs={BALLOON_RIGHT_DEFS} side="right"/>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", gap:0, zIndex:10 }}>
        <motion.p style={{ fontFamily:"Georgia,serif", fontStyle:"italic",
          fontSize:13, color:"rgba(212,175,55,0.6)", letterSpacing:2.5,
          marginBottom:8, textTransform:"uppercase" }}
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }}>
          Hey {name || "there"} 👋
        </motion.p>
        <motion.h1 style={{
          fontFamily:"'Great Vibes','Dancing Script',cursive",
          fontSize:62, margin:"0 0 8px",
          background:"linear-gradient(120deg,#C9846A,#D4AF37,#FFF4B0,#D4AF37,#C9846A)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}
          initial={{ opacity:0, scale:0.88 }} animate={{ opacity:1, scale:1 }}
          transition={{ delay:0.15, duration:0.7, type:"spring", bounce:0.35 }}>
          Happy Birthday
        </motion.h1>
        <motion.p style={{ fontFamily:"Georgia,serif", fontStyle:"italic",
          fontSize:14, color:"rgba(212,175,55,0.55)", letterSpacing:1.5,
          marginBottom:40 }}
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }}>
          Someone made this just for you ✨
        </motion.p>
        <GiftBoxSVG onOpen={onNext}/>
      </div>
    </motion.div>
  );
}

/* ─── Scene 2: Birthday Cake (matches mockup — SVG flame + 3-tier cake) ───── */
function CandleFlame({ cx, cy, blown }: { cx:number; cy:number; blown:boolean }) {
  return (
    <motion.g animate={{ opacity: blown ? 0 : 1 }} transition={{ duration:0.25 }}>
      <motion.ellipse cx={cx} cy={cy} rx={3.5} ry={6} fill="#FFD700"
        animate={blown ? {} : { scaleX:[1,0.7,1.1,0.85,1], scaleY:[1,1.1,0.9,1.05,1] }}
        transition={{ duration:0.75, repeat:Infinity }} style={{ transformOrigin:`${cx}px ${cy}px` }}/>
      <motion.ellipse cx={cx} cy={cy+1.5} rx={2} ry={3.5} fill="#FF8C00"
        animate={blown ? {} : { scaleX:[1,0.8,1.1,0.9,1] }} transition={{ duration:0.75, repeat:Infinity }}
        style={{ transformOrigin:`${cx}px ${cy+1.5}px` }}/>
      <motion.ellipse cx={cx} cy={cy+2.5} rx={1} ry={2} fill="white" opacity={0.5}
        animate={blown ? {} : { opacity:[0.5,0.9,0.45,0.75,0.5] }} transition={{ duration:0.6, repeat:Infinity }}/>
    </motion.g>
  );
}

function Cake({ blown }: { blown:boolean }) {
  const dotC = ["#D4AF37","#C9846A","#FFF5EE","#E8A07A","#C4913A","#F2DFC8"];
  return (
    <svg viewBox="0 0 280 280" style={{ width:"100%", height:"100%", overflow:"visible" }}>
      <defs>
        <radialGradient id="ct1" cx="50%" cy="30%" r="65%"><stop offset="0%" stopColor="#D4956A"/><stop offset="100%" stopColor="#8C4A30"/></radialGradient>
        <radialGradient id="ct2" cx="50%" cy="30%" r="65%"><stop offset="0%" stopColor="#D4AF37"/><stop offset="100%" stopColor="#8C6A10"/></radialGradient>
        <radialGradient id="ct3" cx="50%" cy="30%" r="65%"><stop offset="0%" stopColor="#FFF5EE"/><stop offset="100%" stopColor="#E8D0B8"/></radialGradient>
        <filter id="cglo"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <linearGradient id="cnd1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6B2C14"/>
          <stop offset="28%" stopColor="#E8A07A"/>
          <stop offset="52%" stopColor="#C9846A"/>
          <stop offset="100%" stopColor="#6B2C14"/>
        </linearGradient>
        <linearGradient id="cnd2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6B4800"/>
          <stop offset="28%" stopColor="#F5D060"/>
          <stop offset="52%" stopColor="#D4AF37"/>
          <stop offset="100%" stopColor="#6B4800"/>
        </linearGradient>
        <linearGradient id="cnd3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#AE9880"/>
          <stop offset="28%" stopColor="#FFFFFF"/>
          <stop offset="52%" stopColor="#FFF5EE"/>
          <stop offset="100%" stopColor="#AE9880"/>
        </linearGradient>
        <radialGradient id="cap1" cx="35%" cy="35%" r="65%"><stop offset="0%" stopColor="#F2C0A0"/><stop offset="100%" stopColor="#8C4A30"/></radialGradient>
        <radialGradient id="cap2" cx="35%" cy="35%" r="65%"><stop offset="0%" stopColor="#FAE090"/><stop offset="100%" stopColor="#8C6A10"/></radialGradient>
        <radialGradient id="cap3" cx="35%" cy="35%" r="65%"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#C8B0A0"/></radialGradient>
      </defs>
      <ellipse cx={140} cy={258} rx={92} ry={10} fill="#C4A070" opacity={0.6}/>
      <rect x={56} y={198} width={168} height={58} rx={8} fill="url(#ct1)"/>
      <ellipse cx={140} cy={198} rx={84} ry={9} fill="#D4956A"/>
      <ellipse cx={140} cy={256} rx={84} ry={9} fill="#7A3C22"/>
      {[68,88,108,128,148,168,188,208].map((x,i)=>(
        <motion.path key={i} d={`M ${x} 198 Q ${x} 206 ${x} 211`} stroke="rgba(255,248,240,0.45)" strokeWidth={5} strokeLinecap="round" fill="none"
          animate={{ d:[`M ${x} 198 Q ${x} 204 ${x} 209`,`M ${x} 198 Q ${x} 209 ${x} 214`,`M ${x} 198 Q ${x} 204 ${x} 209`] }}
          transition={{ duration:3, repeat:Infinity, delay:i*0.2 }}/>
      ))}
      {[68,92,116,140,164,188,212].map((x,i)=>(
        <g key={i}><circle cx={x} cy={228} r={7} fill={dotC[i%dotC.length]}/><circle cx={x} cy={228} r={3.5} fill="white" opacity={0.35}/></g>
      ))}
      <rect x={80} y={146} width={120} height={54} rx={7} fill="url(#ct2)"/>
      <ellipse cx={140} cy={146} rx={60} ry={8} fill="#D4AF37"/>
      <ellipse cx={140} cy={200} rx={60} ry={8} fill="#7A5F10"/>
      {[88,108,128,148,168,188].map((x,i)=>(
        <g key={i}><circle cx={x} cy={173} r={6} fill={dotC[(i+2)%dotC.length]}/><circle cx={x} cy={173} r={3} fill="white" opacity={0.35}/></g>
      ))}
      <rect x={104} y={102} width={72} height={46} rx={7} fill="url(#ct3)"/>
      <ellipse cx={140} cy={102} rx={36} ry={6.5} fill="#FFF5EE"/>
      <ellipse cx={140} cy={148} rx={36} ry={6.5} fill="#D4B898"/>
      {[115,135,155].map((x,i)=>(
        <g key={i}><circle cx={x} cy={125} r={5} fill={dotC[(i+1)%dotC.length]}/><circle cx={x} cy={125} r={2.5} fill="white" opacity={0.4}/></g>
      ))}
      {[114,136,158].map((cx,i)=>(
        <g key={i}>
          <rect x={cx-5} y={78} width={10} height={25} rx={3} fill={`url(#cnd${i+1})`}/>
          <ellipse cx={cx} cy={103} rx={5} ry={2} fill={["#6B2C14","#6B4800","#AE9880"][i]} opacity={0.7}/>
          <ellipse cx={cx} cy={78} rx={5} ry={2} fill={`url(#cap${i+1})`}/>
          <line x1={cx} y1={78} x2={cx} y2={73} stroke="#3B1A00" strokeWidth={1.5} strokeLinecap="round"/>
          <CandleFlame cx={cx} cy={71} blown={blown}/>
          {blown && [0,1,2,3].map(j=>(
            <motion.ellipse key={j} cx={cx+(j%2===0?-4:4)} cy={72}
              rx={5+j*2.5} ry={6+j*2}
              fill={j<2?"rgba(220,215,210,0.72)":"rgba(200,195,190,0.45)"}
              initial={{ opacity:0, y:0, scaleX:0.35, x:0 }}
              animate={{ opacity:[0,0.72,0.55,0.2,0], y:[0,-(22+j*16)], scaleX:[0.35,1.4,1.8,2.2,0.8], x:[0,(j%2===0?-8:8),(j%2===0?-14:14),(j%2===0?-10:10)] }}
              transition={{ duration:1.6+j*0.32, delay:j*0.2+i*0.06, repeat:Infinity, repeatDelay:0.15, ease:"easeOut" }}/>
          ))}
        </g>
      ))}
    </svg>
  );
}

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

function BunchBalloons({ flyUp }: { flyUp:boolean }) {
  const AY = 900;
  return (
    <div style={{ position:"absolute", left:0, top:0, width:390, height:844, zIndex:14, pointerEvents:"none" }}>
      <svg width={390} height={AY+60} viewBox={`0 0 390 ${AY+60}`}
        style={{ position:"absolute", top:0, left:0 }}>
        <defs>
          {P.map((p,i) => (
            <radialGradient key={i} id={`bpg${i}`} cx="34%" cy="28%" r="62%">
              <stop offset="0%"   stopColor={p.s}/>
              <stop offset="52%"  stopColor={p.c}/>
              <stop offset="100%" stopColor={p.c} stopOpacity={0.75}/>
            </radialGradient>
          ))}
        </defs>
        {BUNCHES_DEF.map((bunch,bi) =>
          bunch.balls.map((ball,li) => {
            const bx=bunch.ax+ball.dx, by=AY+ball.dy, r=ball.r;
            const ci=ball.pi%P.length;
            const seed = bi*7 + li*13;
            const flyDelay = (seed % 23) / 23 * 1.9;
            const flyDrift = ((seed*3 + bi*5) % 29) - 14;
            const flyDur   = 1.7 + (seed % 9) * 0.13;
            return (
              <g key={`${bi}-${li}`}>
                <motion.line x1={bx} y1={by+r} x2={bunch.ax} y2={AY}
                  stroke="#C9A840" strokeWidth={0.9}
                  animate={{ opacity: flyUp ? 0 : 0.5 }}
                  transition={{ delay: flyUp ? flyDelay : 0, duration:0.25 }}/>
                <motion.g
                  animate={flyUp
                    ? { y:-1220, x:flyDrift }
                    : { y:[0, -(3+li*0.5), 0] }}
                  transition={flyUp
                    ? { delay:flyDelay, duration:flyDur, ease:[0.22,0,0.55,1] }
                    : { duration:2.2+bi*0.28, repeat:Infinity, ease:"easeInOut", delay:bi*0.18+li*0.1 }}>
                  <circle cx={bx} cy={by} r={r} fill={`url(#bpg${ci})`}/>
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

function Scene2({ onNext }: { onNext:()=>void }) {
  const [cakePhase, setCakePhase] = useState<"cta"|"counting"|"blown">("cta");
  const [countdown, setCountdown] = useState(3);
  const [blown, setBlown] = useState(false);
  const [flyUp, setFlyUp] = useState(false);

  function handleBlow() {
    setCakePhase("counting");
    setCountdown(3);
    setTimeout(() => setCountdown(2), 800);
    setTimeout(() => setCountdown(1), 1600);
    setTimeout(() => { setCakePhase("blown"); setBlown(true); setFlyUp(true); }, 2400);
    setTimeout(() => onNext(), 6200);
  }

  return (
    <motion.div key="s2" style={{ position:"absolute", inset:0, zIndex:12, display:"flex", flexDirection:"column", alignItems:"center" }}
      initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
      transition={{ duration:0.55, ease:[0.34,1.56,0.64,1] }}>
      <TwinkleBackground/>
      <BunchBalloons flyUp={flyUp}/>

      {/* "Make a Wish" headline */}
      <motion.h1 style={{
        position:"absolute", top:52, left:0, right:0, textAlign:"center",
        fontFamily:"'Great Vibes','Dancing Script',cursive",
        fontSize:44, lineHeight:1, margin:0, pointerEvents:"none",
        background:"linear-gradient(120deg,#C9846A,#D4AF37,#FFF4B0,#D4AF37,#C9846A)",
        WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
      }}
        initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:0.2, duration:0.6 }}>
        Make a Wish ✨
      </motion.h1>

      {/* Cake — entrance pop then continuous float */}
      <motion.div style={{ position:"absolute", left:"50%", marginLeft:-140, top:188, width:280, height:280 }}
        initial={{ scale:0.1, opacity:0 }} animate={{ scale:1, opacity:1 }}
        transition={{ delay:0.3, duration:0.7, ease:[0.34,1.56,0.64,1] }}>
        <motion.div style={{ width:"100%", height:"100%" }}
          animate={{ y:[0,-9,0,6,0] }}
          transition={{ duration:3.6, repeat:Infinity, ease:"easeInOut", delay:1.2 }}>
          <Cake blown={blown}/>
        </motion.div>
      </motion.div>

      {/* CTA button */}
      <AnimatePresence>
        {cakePhase === "cta" && (
          <motion.div key="cta-wrap"
            style={{ position:"absolute", top:510, left:0, right:0, display:"flex", justifyContent:"center" }}
            initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-10 }} transition={{ delay:0.7 }}>
            <motion.button onClick={handleBlow}
              style={{ background:"rgba(212,175,55,0.1)", border:"1.5px solid rgba(212,175,55,0.55)",
                borderRadius:32, padding:"13px 32px", color:"#F0D060", fontSize:14, letterSpacing:2,
                textTransform:"uppercase", fontFamily:"Georgia,serif", cursor:"pointer", whiteSpace:"nowrap" }}
              whileHover={{ background:"rgba(212,175,55,0.22)", scale:1.04 }}
              whileTap={{ scale:0.97 }}>
              🕯️ Blow the Candles
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countdown 3 → 2 → 1 */}
      <AnimatePresence mode="wait">
        {cakePhase === "counting" && (
          <motion.div key={`cd-${countdown}`}
            style={{ position:"absolute", top:488, left:0, right:0, textAlign:"center",
              fontSize:100, fontWeight:"bold", lineHeight:1, fontFamily:"Georgia,serif",
              background:"linear-gradient(120deg,#C9846A 0%,#D4AF37 50%,#F0D060 100%)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
              pointerEvents:"none" }}
            initial={{ scale:1.9, opacity:0 }} animate={{ scale:1, opacity:1 }}
            exit={{ scale:0.2, opacity:0 }}
            transition={{ duration:0.32, ease:[0.34,1.56,0.64,1] }}>
            {countdown}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue button after blown */}
      <AnimatePresence>
        {cakePhase === "blown" && (
          <motion.button key="continue-btn" onClick={onNext}
            initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            transition={{ delay:0.5 }}
            style={{ position:"absolute", top:526, left:"50%", marginLeft:-80, width:160,
              background:"linear-gradient(135deg,rgba(212,175,55,0.14),rgba(212,175,55,0.28))",
              border:"1.5px solid rgba(212,175,55,0.6)", borderRadius:40, padding:"15px 0",
              color:"#F0D060", fontSize:14, letterSpacing:2.5,
              textTransform:"uppercase", fontFamily:"Georgia,serif", cursor:"pointer" }}
            whileHover={{ scale:1.05 }} whileTap={{ scale:0.97 }}>
            Continue ✨
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Happy Birthday Banner (matches mockup — top:40, SAG=36, 3-layer letters) */
const HB_CHARS = ["H","a","p","p","y"," ","B","i","r","t","h","d","a","y"];
const HB_ROTS  = [-8,-4,-6,-3,-5,  0, -7,-2,-5,-4,-6,-3,-5,-7];
const HB_STR_X1 = 3, HB_STR_X2 = 387;
const HB_SAG    = 36;
const HB_XS = HB_CHARS.map((_,i) => 16 + i * ((374-16)/(HB_CHARS.length-1)));
function hbStrY(x: number) {
  const t = (x - HB_STR_X1) / (HB_STR_X2 - HB_STR_X1);
  return 20 + HB_SAG * 4 * t * (1 - t);
}

function HappyBirthdayBanner() {
  return (
    <motion.div style={{ position:"absolute", top:40, left:0, right:0, zIndex:8, pointerEvents:"none" }}
      initial={{ opacity:0, y:-24 }} animate={{ opacity:1, y:0 }}
      transition={{ delay:0.25, duration:0.7 }}>
      <svg width={390} height={130} viewBox="0 0 390 130">
        <defs>
          <filter id="lttrGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.8" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
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
        {HB_CHARS.map((ch, i) => {
          if (ch === " ") return null;
          const cx     = HB_XS[i];
          const sy     = hbStrY(cx);
          const rot    = HB_ROTS[i];
          const pivot  = sy;
          const floatY = pivot + 33;
          return (
            <g key={i}>
              <g transform={`rotate(${rot},${cx},${pivot})`}>
                <motion.g
                  animate={{ y:[0,-2.5,0] }}
                  transition={{ duration:2.6+i*0.22, repeat:Infinity, ease:"easeInOut", delay:i*0.14 }}>
                  <text x={cx+1} y={floatY+1} textAnchor="middle"
                    fontFamily="'Great Vibes','Dancing Script',cursive"
                    fontWeight="400" fontSize={42}
                    fill="#5C3500" opacity={0.45}>{ch}</text>
                  <text x={cx} y={floatY} textAnchor="middle"
                    fontFamily="'Great Vibes','Dancing Script',cursive"
                    fontWeight="400" fontSize={42}
                    fill="#D4AF37" filter="url(#lttrGlow)">{ch}</text>
                  <text x={cx} y={floatY} textAnchor="middle"
                    fontFamily="'Great Vibes','Dancing Script',cursive"
                    fontWeight="400" fontSize={42}
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

/* ─── Scene 3: Teaser ────────────────────────────────────────────────────── */
function Scene3({ onNext }: { onNext:()=>void }) {
  return (
    <motion.div key="s3" style={{ position:"absolute", inset:0, zIndex:12 }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      transition={{ duration:0.6 }}>
      <TwinkleBackground/>
      <HappyBirthdayBanner/>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", gap:0 }}>
        <motion.div style={{ width:80, height:1,
          background:"linear-gradient(90deg,transparent,#D4AF37,transparent)", marginBottom:28 }}
          initial={{ scaleX:0 }} animate={{ scaleX:1 }} transition={{ delay:0.5, duration:0.7 }}/>
        <motion.p style={{
          fontFamily:"'Brush Script MT','Segoe Script','Comic Sans MS',cursive",
          fontStyle:"italic", fontSize:30, lineHeight:1.3, textAlign:"center",
          margin:0, padding:"0 32px",
          background:"linear-gradient(120deg,#C9846A 0%,#D4AF37 45%,#FFF4B0 65%,#D4AF37 85%,#C9846A 100%)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}
          initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4, duration:0.7 }}>
          We are not<br/>done yet…
        </motion.p>
        <motion.div style={{ width:80, height:1,
          background:"linear-gradient(90deg,transparent,#D4AF37,transparent)", marginTop:28 }}
          initial={{ scaleX:0 }} animate={{ scaleX:1 }} transition={{ delay:0.6, duration:0.7 }}/>
        <motion.p style={{ fontFamily:"Georgia,serif", fontStyle:"italic",
          fontSize:14, color:"rgba(212,175,55,0.65)", letterSpacing:2,
          marginTop:20, textAlign:"center" }}
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.9 }}>
          One more surprise awaits ✨
        </motion.p>
        <motion.button onClick={onNext} style={{
          marginTop:36,
          background:"linear-gradient(135deg,rgba(212,175,55,0.12),rgba(212,175,55,0.22))",
          border:"1.5px solid rgba(212,175,55,0.6)",
          borderRadius:40, padding:"15px 44px",
          color:"#F0D060", fontSize:14, letterSpacing:2.5,
          textTransform:"uppercase", fontFamily:"Georgia,serif", cursor:"pointer",
          whiteSpace:"nowrap",
        }}
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:1.1 }}
          whileHover={{ scale:1.05 }} whileTap={{ scale:0.97 }}>
          Click here ✨
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Scene 4: Polaroid collage ───────────────────────────────────────────── */
function FlowerTopRight() {
  return (
    <motion.svg width={188} height={220} viewBox="0 0 188 220"
      style={{ position:"absolute", top:128, right:-6, zIndex:6, pointerEvents:"none" }}
      animate={{ rotate:[-1,1.5,-1] }} transition={{ duration:6, repeat:Infinity, ease:"easeInOut" }}>
      <defs>
        <radialGradient id="fpA2" cx="38%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#C04878"/><stop offset="100%" stopColor="#6A0A2C"/>
        </radialGradient>
        <radialGradient id="fpB2" cx="38%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#D06090"/><stop offset="100%" stopColor="#8B1040"/>
        </radialGradient>
        <radialGradient id="fctr2" cx="42%" cy="36%" r="60%">
          <stop offset="0%" stopColor="#FFF4B0"/><stop offset="60%" stopColor="#D4AF37"/><stop offset="100%" stopColor="#8B6400"/>
        </radialGradient>
      </defs>
      <path d="M 94 108 C 78 140 64 168 52 210" stroke="#2A4E30" strokeWidth={3} fill="none" opacity={0.8}/>
      <path d="M 94 108 C 108 135 118 158 124 188" stroke="#2A4E30" strokeWidth={2.5} fill="none" opacity={0.7}/>
      <ellipse cx={70} cy={158} rx={27} ry={11} fill="#1E3A26" opacity={0.75} transform="rotate(-42,70,158)"/>
      <g transform="translate(92,90)">
        {[0,45,90,135,180,225,270,315].map((a,i) => (
          <motion.ellipse key={i} cx={0} cy={-34} rx={13} ry={29}
            fill={i%2===0?"url(#fpA2)":"url(#fpB2)"} opacity={0.88}
            transform={`rotate(${a})`}
            animate={{ ry:[29,31,29] }}
            transition={{ duration:3.5+i*0.22, repeat:Infinity, ease:"easeInOut", delay:i*0.12 }}/>
        ))}
        <circle r={13} fill="url(#fctr2)"/>
        <circle r={5}  fill="#FFF4B0" opacity={0.8}/>
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
        <radialGradient id="fpBL2" cx="38%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#A82460"/><stop offset="100%" stopColor="#5C0828"/>
        </radialGradient>
        <radialGradient id="fcBL2" cx="42%" cy="36%" r="60%">
          <stop offset="0%" stopColor="#FFF4B0"/><stop offset="100%" stopColor="#D4AF37"/>
        </radialGradient>
      </defs>
      <path d="M 75 95 C 68 118 62 142 56 172" stroke="#2A4E30" strokeWidth={2.5} fill="none" opacity={0.75}/>
      <g transform="translate(78,82)">
        {[0,51.4,102.9,154.3,205.7,257.1,308.6].map((a,i) => (
          <motion.ellipse key={i} cx={0} cy={-24} rx={10} ry={21}
            fill="url(#fpBL2)" opacity={0.85} transform={`rotate(${a})`}
            animate={{ ry:[21,23,21] }}
            transition={{ duration:3.8+i*0.24, repeat:Infinity, ease:"easeInOut", delay:i*0.14 }}/>
        ))}
        <circle r={10} fill="url(#fcBL2)"/>
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
        <div style={{
          width:IW+BRD*2, height:IH+BRD+BOT,
          background:"#f2ede4",
          borderRadius:3,
          boxShadow:"0 10px 28px rgba(0,0,0,0.65), 0 3px 8px rgba(0,0,0,0.4)",
          padding:BRD, paddingBottom:BOT,
          boxSizing:"border-box",
        }}>
          <div style={{ width:IW, height:IH, borderRadius:2, overflow:"hidden", background:"#1a0d08" }}>
            <img src={imageSrc} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Scene4({ onNext, photoUrls }: { onNext:()=>void, photoUrls:string[] }) {
  const sparkles = [{x:318,y:218},{x:256,y:374},{x:342,y:446},{x:202,y:568},{x:278,y:300}];
  const hasPhotos = photoUrls.length >= 1;
  const p0 = photoUrls[0] ?? "";
  const p1 = photoUrls[1] ?? photoUrls[0] ?? "";
  const p2 = photoUrls[2] ?? photoUrls[0] ?? "";
  return (
    <motion.div key="s4" style={{ position:"absolute", inset:0, zIndex:12, overflow:"hidden" }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      transition={{ duration:0.7 }}>
      <TwinkleBackground/>
      <FlowerTopRight/>
      <FlowerBottomLeft/>
      {sparkles.map((s,i) => (
        <motion.div key={i} style={{ position:"absolute", left:s.x, top:s.y,
          fontSize:11, color:"#D4AF37", zIndex:7, pointerEvents:"none" }}
          animate={{ opacity:[0.3,1,0.3], scale:[0.8,1.3,0.8], rotate:[0,30,0] }}
          transition={{ duration:1.8+i*0.45, repeat:Infinity, delay:i*0.38 }}>✦</motion.div>
      ))}
      <motion.h1 style={{
          position:"absolute", top:48, left:0, right:0, textAlign:"center",
          fontFamily:"'Great Vibes', cursive",
          fontSize:56, lineHeight:1, margin:0,
          background:"linear-gradient(120deg,#C9846A,#D4AF37,#FFF4B0,#D4AF37,#C9846A)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          pointerEvents:"none",
        }}
        initial={{ opacity:0, y:-14 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:0.15, duration:0.6 }}>
        Happy Birthday
      </motion.h1>

      {photoUrls.length === 0 && (
        /* ── 0 photos: full-width celebratory quote ── */
        <motion.div style={{ position:"absolute", left:0, right:0, top:160, bottom:120,
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20 }}
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }}>
          <div style={{ fontSize:52 }}>🎉</div>
          <p style={{ fontFamily:"Georgia,serif", fontStyle:"italic",
            fontSize:16, lineHeight:1.8, color:"#D4AF37", textAlign:"center",
            padding:"0 44px", margin:0, textShadow:"0 0 18px rgba(212,175,55,0.3)" }}>
            Cheers to another year of joy, laughter &amp; unforgettable memories!
          </p>
          <motion.div animate={{ opacity:[0.4,0.9,0.4] }} transition={{ duration:2.4, repeat:Infinity }}
            style={{ fontSize:18, letterSpacing:8, color:"rgba(212,175,55,0.55)" }}>✦ ✦ ✦</motion.div>
        </motion.div>
      )}

      {photoUrls.length === 1 && (
        /* ── 1 photo: single large centered polaroid + caption below ── */
        <>
          <PolaroidFrame idx={0} top={190} left={119} rotate={0} floatDelay={0} imageSrc={p0}/>
          <motion.div style={{ position:"absolute", left:0, right:0, bottom:118, textAlign:"center",
            padding:"0 36px" }}
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
            transition={{ delay:0.7, duration:0.6 }}>
            <p style={{ fontFamily:"Georgia,serif", fontStyle:"italic",
              fontSize:14, lineHeight:1.75, color:"#D4AF37",
              margin:0, textShadow:"0 0 18px rgba(212,175,55,0.3)" }}>
              Cheers to another year of joy, laughter &amp; unforgettable memories!
            </p>
          </motion.div>
        </>
      )}

      {photoUrls.length === 2 && (
        /* ── 2 photos: two staggered polaroids + right-side caption ── */
        <>
          <PolaroidFrame idx={0} top={175} left={12}  rotate={-5} floatDelay={0}   imageSrc={p0}/>
          <PolaroidFrame idx={1} top={375} left={22}  rotate={3}  floatDelay={0.5} imageSrc={p1}/>
          <motion.div style={{ position:"absolute", right:18, top:310, width:148, textAlign:"right" }}
            initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
            transition={{ delay:0.9, duration:0.7 }}>
            <p style={{ fontFamily:"Georgia,serif", fontStyle:"italic",
              fontSize:14, lineHeight:1.75, color:"#D4AF37",
              margin:0, textShadow:"0 0 18px rgba(212,175,55,0.3)" }}>
              Cheers to another year of joy, laughter &amp; unforgettable memories!
            </p>
          </motion.div>
        </>
      )}

      {photoUrls.length >= 3 && (
        /* ── 3+ photos: original three-polaroid layout ── */
        <>
          <PolaroidFrame idx={0} top={168} left={6}  rotate={-7} floatDelay={0}   imageSrc={p0}/>
          <PolaroidFrame idx={1} top={341} left={34} rotate={-2} floatDelay={0.6} imageSrc={p1}/>
          <PolaroidFrame idx={2} top={514} left={6}  rotate={-5} floatDelay={1.1} imageSrc={p2}/>
          <motion.div style={{ position:"absolute", right:36, top:492, width:148, textAlign:"right" }}
            initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
            transition={{ delay:0.9, duration:0.7 }}>
            <p style={{ fontFamily:"Georgia,serif", fontStyle:"italic",
              fontSize:14, lineHeight:1.7, color:"#D4AF37",
              margin:0, textShadow:"0 0 18px rgba(212,175,55,0.35)" }}>
              Cheers to another year of fun, laughter &amp; unforgettable memories!
            </p>
          </motion.div>
        </>
      )}

      <motion.button onClick={onNext} style={{
        position:"absolute", bottom:26, left:"50%", marginLeft:-80, width:160,
        background:"linear-gradient(135deg,rgba(212,175,55,0.14),rgba(212,175,55,0.26))",
        border:"1.5px solid rgba(212,175,55,0.58)", borderRadius:36, padding:"13px 0",
        color:"#F0D060", fontSize:13, letterSpacing:2, textTransform:"uppercase",
        fontFamily:"Georgia,serif", cursor:"pointer",
      }}
        initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:1.4 }}
        whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}>
        Continue ✨
      </motion.button>
    </motion.div>
  );
}

/* ─── Scene 5: Confetti + voice note + emoji orbs + photo sticker ─────────── */
const CC = ["#FF6BB5","#FF9B45","#60E8C0","#60C8F0","#D4AF37","#C9846A","#F0D060","#C060F0","#FF4E8A","#FFF4B0"];
const S5_CL = [
  {x:130,y:200,c:CC[0],s:14,t:0,r:40,d:0.55},{x:210,y:150,c:CC[4],s:12,t:1,r:-55,d:0.60},
  {x:80, y:290,c:CC[2],s:8, t:2,r:70, d:0.57},{x:270,y:120,c:CC[1],s:16,t:0,r:-30,d:0.63},
  {x:160,y:370,c:CC[5],s:13,t:1,r:45, d:0.51},{x:55, y:250,c:CC[6],s:10,t:3,r:-65,d:0.67},
  {x:235,y:300,c:CC[3],s:15,t:0,r:85, d:0.55},{x:115,y:430,c:CC[8],s:9, t:2,r:-75,d:0.69},
  {x:300,y:190,c:CC[9],s:14,t:1,r:52, d:0.61},{x:185,y:470,c:CC[7],s:11,t:3,r:-28,d:0.63},
];
const S5_CR = S5_CL.map(p => ({...p, x: 390 - p.x}));

function Confetto({ x, y, c, s, t, r }: { x:number,y:number,c:string,s:number,t:number,r:number }) {
  const style: React.CSSProperties = {
    position:"absolute", left:x, top:y,
    background:c, rotate:`${r}deg`,
    ...(t===0 ? { width:s, height:s, borderRadius:"50%" }
      : t===1 ? { width:s, height:s, borderRadius:s*0.2 }
      : t===2 ? { width:s*2.4, height:s*0.4, borderRadius:s*0.2 }
      : { width:s*1.6, height:s*0.6, borderRadius:"50%" }),
  };
  return (
    <motion.div style={{ position:"absolute", left:0, top:0 }}
      animate={{ y:[0,-18,6,-12,0], rotate:[r, r+20, r-10, r+15, r],
        opacity:[0.9,1,0.85,0.95,0.9] }}
      transition={{ duration:2.8 + (x%5)*0.4, repeat:Infinity, ease:"easeInOut", delay:(x%7)*0.18 }}>
      <div style={style}/>
    </motion.div>
  );
}

const WAVE_H = [14,28,20,38,16,44,22,36,18,32,30,46,14,38,24,42,16,28,26,40,18,34,22,30,14,44];

function VoiceNote({ voiceUrl, onDone }: { voiceUrl: string, onDone:()=>void }) {
  const [playing, setPlaying] = useState(false);
  const [secs, setSecs]       = useState(0);
  const [duration, setDuration] = useState(30);
  const [done, setDone]       = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const audio = new Audio(voiceUrl);
    audioRef.current = audio;
    audio.onloadedmetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) setDuration(Math.ceil(audio.duration));
    };
    audio.ontimeupdate = () => setSecs(Math.floor(audio.currentTime));
    audio.onended = () => { setPlaying(false); setDone(true); onDoneRef.current(); };
    return () => { audio.pause(); audio.src = ""; audioRef.current = null; };
  }, [voiceUrl]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio || done) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  const pct = done ? 100 : (secs / duration) * 100;
  const fmt = (n: number) => `0:${String(Math.floor(n)).padStart(2,"0")}`;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12,
      background:"rgba(255,255,255,0.07)", backdropFilter:"blur(12px)",
      border:"1px solid rgba(212,175,55,0.28)", borderRadius:50,
      padding:"10px 16px 10px 10px" }}>
      <motion.button
        onClick={toggle}
        whileTap={{ scale:0.88 }}
        style={{ width:46, height:46, borderRadius:"50%", flexShrink:0,
          background:"linear-gradient(135deg,#C4913A,#D4AF37,#F0D060)",
          border:"none", cursor:"pointer", display:"flex",
          alignItems:"center", justifyContent:"center",
          fontSize:20, color:"#1c0a06",
          boxShadow:"0 2px 10px rgba(212,175,55,0.4)" }}>
        {playing ? "⏸" : "▶"}
      </motion.button>
      <div style={{ flex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:2, height:40 }}>
          {WAVE_H.map((h,i) => {
            const filled = pct >= (i / WAVE_H.length) * 100;
            return (
              <motion.div key={i} style={{ flex:1, borderRadius:3,
                background: filled ? "linear-gradient(180deg,#F0D060,#C4913A)" : "rgba(255,255,255,0.18)" }}
                animate={{ height: playing ? [h*0.4, h, h*0.55, h*0.85, h*0.4] : h*0.45 }}
                transition={{ duration:0.45+(i%5)*0.12, repeat:playing?Infinity:0,
                  delay:i*0.022, ease:"easeInOut", repeatType:"mirror" }}/>
            );
          })}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
          <span style={{ fontSize:9, color:"rgba(212,175,55,0.75)", fontFamily:"monospace" }}>{fmt(secs)}</span>
          <span style={{ fontSize:9, color:"rgba(255,255,255,0.28)", fontFamily:"monospace" }}>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}

const EMOJI_ORBS = [
  { emoji:"💗", msg:"You're loved more than words can say! 🌸" },
  { emoji:"⭐", msg:"You shine brighter than all the stars! ✨" },
  { emoji:"🥂", msg:"Here's to you & all your dreams coming true! 🎉" },
];

function EmojiOrbs() {
  const [active, setActive] = useState<number|null>(null);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
      <div style={{ display:"flex", justifyContent:"center", gap:24 }}>
        {EMOJI_ORBS.map((o,i) => (
          <motion.div key={i}
            animate={{ y:[0,-(5+i*2),0,(3+i),0] }}
            transition={{ duration:2.4+i*0.55, repeat:Infinity, ease:"easeInOut", delay:i*0.7 }}>
            <motion.button
              onClick={() => setActive(active===i ? null : i)}
              whileTap={{ scale:0.86 }}
              animate={active===i ? {
                boxShadow:"0 0 20px rgba(212,175,55,0.6)",
                background:"rgba(212,175,55,0.16)",
              } : {
                boxShadow:"0 2px 8px rgba(0,0,0,0.3)",
                background:"rgba(255,255,255,0.07)",
              }}
              style={{ width:56, height:56, borderRadius:"50%",
                border:"1px solid rgba(212,175,55,0.3)",
                backdropFilter:"blur(10px)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:27, cursor:"pointer" }}>
              {o.emoji}
            </motion.button>
          </motion.div>
        ))}
      </div>
      <div style={{ minHeight:44, display:"flex", alignItems:"center", justifyContent:"center", width:"100%" }}>
        <AnimatePresence mode="wait">
          {active !== null && (
            <motion.p key={active}
              initial={{ opacity:0, y:6, scale:0.94 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:-4, scale:0.94 }}
              transition={{ duration:0.24 }}
              style={{ margin:0, fontSize:12.5, lineHeight:1.55, textAlign:"center",
                fontFamily:"Georgia,serif", fontStyle:"italic",
                color:"rgba(255,241,220,0.92)",
                background:"rgba(28,10,6,0.72)",
                border:"1px solid rgba(212,175,55,0.28)",
                borderRadius:12, padding:"8px 16px",
                backdropFilter:"blur(8px)" }}>
              {EMOJI_ORBS[active].msg}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Scene5({ onNext, personalPicUrl, voiceUrl }: {
  onNext: () => void,
  personalPicUrl: string,
  voiceUrl: string,
}) {
  const hasAudio = voiceUrl.length > 0;
  /* voiceDone starts true when there's no audio — arrow appears after 2s via timer */
  const [voiceDone, setVoiceDone] = useState(!hasAudio);

  /* When no audio, auto-reveal Continue arrow after 2s */
  useEffect(() => {
    if (hasAudio) return;
    const t = setTimeout(() => setVoiceDone(true), 2000);
    return () => clearTimeout(t);
  }, [hasAudio]);

  return (
    <motion.div key="s5" style={{ position:"absolute", inset:0, zIndex:12, overflow:"hidden" }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      transition={{ duration:0.7 }}>
      <TwinkleBackground/>
      {/* Confetti */}
      {[...S5_CL, ...S5_CR].map((p, i) => <Confetto key={i} {...p}/>)}

      {/* Photo sticker */}
      {personalPicUrl && (
        <motion.div
          style={{ position:"absolute", bottom:0, right:0, width:130, height:200,
            zIndex:6, pointerEvents:"none", overflow:"hidden" }}
          initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }}
          transition={{ delay:0.5, duration:0.7 }}>
          <img src={personalPicUrl} alt=""
            style={{ width:"100%", height:"100%", objectFit:"cover",
              filter:"drop-shadow(0 8px 24px rgba(0,0,0,0.8))" }}/>
          <div style={{ position:"absolute", inset:0,
            background:"linear-gradient(to right, rgba(14,5,2,0.4) 0%, transparent 40%)" }}/>
        </motion.div>
      )}

      {/* Main content */}
      <div style={{ position:"absolute", top:0, left:0, right: personalPicUrl ? 120 : 0, bottom:0,
        display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", gap:0, padding:"0 24px" }}>
        <motion.p style={{
          fontFamily:"Georgia,serif", fontStyle:"italic",
          fontSize:22, lineHeight:1.45, textAlign:"center",
          margin:"0 0 20px",
          background:"linear-gradient(120deg,#C9846A,#D4AF37,#FFF4B0,#D4AF37,#C9846A)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.3, duration:0.7 }}>
          Sending you all<br/>the love &amp; happiness! 💖
        </motion.p>

        {/* Voice note — only when audio URL is present */}
        {hasAudio && (
          <motion.div style={{ width:"100%", marginBottom:20 }}
            initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
            transition={{ delay:0.6 }}>
            <VoiceNote voiceUrl={voiceUrl} onDone={() => setVoiceDone(true)}/>
          </motion.div>
        )}

        <motion.div style={{ width:"100%", marginTop: hasAudio ? 0 : 8 }}
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: hasAudio ? 0.9 : 0.5 }}>
          <EmojiOrbs/>
        </motion.div>
      </div>

      {/* Arrow to next scene — appears immediately when no audio, or after voice note ends */}
      <AnimatePresence>
        {voiceDone && (
          <motion.button onClick={onNext}
            initial={{ opacity:0, scale:0.6 }} animate={{ opacity:1, scale:1 }}
            exit={{ opacity:0, scale:0.6 }}
            transition={{ type:"spring", bounce:0.45 }}
            style={{ position:"absolute", bottom:32, right:24,
              width:52, height:52, borderRadius:"50%",
              background:"linear-gradient(135deg,#C4913A,#D4AF37)",
              border:"none", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:22, color:"#1c0a06",
              boxShadow:"0 4px 18px rgba(212,175,55,0.55)" }}
            whileHover={{ scale:1.1 }} whileTap={{ scale:0.93 }}>
            →
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Scene 6: Final message card ────────────────────────────────────────── */
function Scene6({
  name, finalMessage, isSender, isRecipient, isUnlocked,
  occasion, cardId,
  onOpenPaywall, senderCopied, senderIgCopied,
  onShareWhatsApp, onCopyLink, onCopyForInstagram, onReplay,
}: {
  name: string;
  finalMessage: string;
  isSender: boolean;
  isRecipient: boolean;
  isUnlocked: boolean;
  occasion: string;
  cardId: string;
  onOpenPaywall: () => void;
  senderCopied: boolean;
  senderIgCopied: boolean;
  onShareWhatsApp: () => void;
  onCopyLink: () => void;
  onCopyForInstagram: () => void;
  onReplay: () => void;
}) {
  return (
    <motion.div key="s6" style={{ position:"absolute", inset:0, zIndex:12, overflowY:"auto" }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      transition={{ duration:0.7 }}>
      <TwinkleBackground/>
      <HappyBirthdayBanner/>

      <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"flex-start", minHeight:"100%",
        paddingTop:110, paddingBottom:40, paddingLeft:24, paddingRight:24 }}>

        {/* Message card */}
        <motion.div
          initial={{ opacity:0, y:32, scale:0.94 }}
          animate={{ opacity:1, y:0, scale:1 }}
          transition={{ delay:0.3, type:"spring", bounce:0.28 }}
          style={{ width:"100%", maxWidth:320,
            background:"linear-gradient(145deg,rgba(28,10,6,0.96),rgba(18,6,3,0.94))",
            border:"1.5px solid rgba(212,175,55,0.48)",
            borderRadius:22, padding:"30px 26px 26px",
            boxShadow:"0 0 40px rgba(212,175,55,0.18), 0 0 80px rgba(180,60,20,0.22), inset 0 0 35px rgba(212,175,55,0.04)",
            position:"relative", overflow:"visible",
          }}>
          <div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:1,
            borderRadius:1, background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.7),transparent)" }}/>
          <div style={{ position:"absolute", bottom:0, left:"10%", right:"10%", height:1,
            borderRadius:1, background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.5),transparent)" }}/>

          <motion.p initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
            style={{ fontSize:11, color:"rgba(212,175,55,0.7)", letterSpacing:"0.14em",
              textTransform:"uppercase", marginBottom:8, textAlign:"center" }}>
            🎂 Birthday wishes for
          </motion.p>
          <motion.h1 initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.55 }}
            style={{ fontFamily:"'Great Vibes','Dancing Script',cursive",
              fontSize:44, fontWeight:400, color:"#D4AF37",
              marginBottom:18, letterSpacing:"0.02em", textAlign:"center",
              textShadow:"0 0 20px rgba(212,175,55,0.4)" }}>
            {name}
          </motion.h1>
          <motion.p initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.72 }}
            style={{ fontFamily:"Georgia,serif", fontStyle:"italic",
              fontSize:15, color:"rgba(255,241,220,0.96)", lineHeight:1.72,
              margin:0, textAlign:"center" }}>
            {finalMessage}
          </motion.p>
          <motion.div
            animate={{ opacity:[0.35,0.75,0.35] }}
            transition={{ duration:2.8, repeat:Infinity }}
            style={{ marginTop:24, fontSize:15, color:"rgba(212,175,55,0.5)",
              letterSpacing:"0.35em", textAlign:"center" }}>
            ✦ ✦ ✦
          </motion.div>
        </motion.div>

        {/* Sender panel */}
        {isSender && (
          <motion.div style={{ width:"100%", maxWidth:320, marginTop:20 }}
            initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}>
            {isUnlocked ? (
              <>
                <p style={{ fontSize:12, color:"rgba(212,175,55,0.5)", textAlign:"center",
                  marginBottom:12, letterSpacing:"0.06em" }}>
                  ✦ Share this card
                </p>
                <div style={{ display:"flex", gap:10, marginBottom:8 }}>
                  <button onClick={onShareWhatsApp} style={{
                    flex:1, padding:"12px 8px", borderRadius:12,
                    background:"rgba(37,211,102,0.1)", border:"1.5px solid rgba(37,211,102,0.28)",
                    color:"rgba(37,211,102,0.9)", fontWeight:700, fontSize:13, cursor:"pointer",
                  }}>💬 WhatsApp</button>
                  <button onClick={onCopyForInstagram} style={{
                    flex:1, padding:"12px 8px", borderRadius:12,
                    background:"rgba(200,100,200,0.1)", border:"1.5px solid rgba(200,100,200,0.28)",
                    color:"rgba(220,140,255,0.9)", fontWeight:700, fontSize:13, cursor:"pointer",
                  }}>{senderIgCopied ? "✅ Copied!" : "📸 Instagram"}</button>
                </div>
                <button onClick={onCopyLink} style={{
                  width:"100%", padding:"11px", borderRadius:12,
                  background:"rgba(212,175,55,0.07)", border:"1.5px solid rgba(212,175,55,0.18)",
                  color:"rgba(212,175,55,0.7)", fontWeight:700, fontSize:13, cursor:"pointer",
                }}>{senderCopied ? "✅ Link Copied!" : "🔗 Copy Link"}</button>
                <div style={{ textAlign:"center", marginTop:14 }}>
                  <Link href="/send">
                    <span style={{ fontSize:11, color:"rgba(255,255,255,0.18)", cursor:"pointer" }}>
                      Make another card →
                    </span>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <motion.button onClick={onOpenPaywall}
                  whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                  style={{ width:"100%", padding:"16px", borderRadius:16,
                    background:"linear-gradient(135deg,#C4913A,#D4AF37,#F0D060)",
                    border:"none", cursor:"pointer",
                    color:"#1c0a06", fontWeight:800, fontSize:16, letterSpacing:0.5,
                    boxShadow:"0 4px 24px rgba(212,175,55,0.45)" }}>
                  🔓 Unlock & Share · ₹49
                </motion.button>
                <p style={{ fontSize:11, color:"rgba(255,255,255,0.22)", textAlign:"center",
                  marginTop:10, lineHeight:1.5 }}>
                  One-time payment · Share on WhatsApp & Instagram
                </p>
              </>
            )}
          </motion.div>
        )}

        {/* Recipient panel */}
        {isRecipient && (
          <motion.div style={{ width:"100%", maxWidth:320, marginTop:20 }}
            initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.6 }}>
            <ViralReplyCTA template="birthday"/>
          </motion.div>
        )}

        {/* Replay */}
        <motion.button onClick={onReplay}
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1 }}
          style={{ marginTop:20, background:"none", border:"none",
            color:"rgba(212,175,55,0.35)", fontSize:11, letterSpacing:2,
            textTransform:"uppercase", cursor:"pointer", fontFamily:"Georgia,serif" }}
          whileHover={{ color:"rgba(212,175,55,0.6)" }}>
          ↺ Replay card
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function BirthdayCard() {
  useEffect(() => {
    const w = window as unknown as { __clearHsSplash?: () => void };
    if (w.__clearHsSplash) w.__clearHsSplash();
  }, []);

  const params = getParams();
  const name        = params.get("to")   || "Friend";
  const occasion    = params.get("occasion") || "birthday";
  const msgRaw      = params.get("msg");
  const finalMessage = msgRaw
    ? decodeMsg(msgRaw) || "Wishing you the most magical birthday! May every moment be filled with joy and love. 🎂✨"
    : "Wishing you the most magical birthday! May every moment be filled with joy and love. 🎂✨";
  const isSender    = params.get("sender") === "1";
  const isRecipient = !isSender;
  const cardId      = params.get("id") ?? "";
  const photosRaw   = params.get("photos");
  const photoUrls   = parsePhotoUrls(photosRaw);
  const personalPicUrl = params.get("personalpicture")
    ? decodeURIComponent(params.get("personalpicture")!)
    : photoUrls[0] ?? "";
  const voiceUrl = params.get("voicenote")
    ? decodeURIComponent(params.get("voicenote")!)
    : "";

  /* scenes: 1 = gift, 2 = cake, 3 = teaser, 4 = polaroids, 5 = confetti+voice, 6 = message */
  const [scene, setScene] = useState<1|2|3|4|5|6>(1);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showDesktopPaywall, setShowDesktopPaywall] = useState(false);
  const [senderCopied, setSenderCopied] = useState(false);
  const [senderIgCopied, setSenderIgCopied] = useState(false);
  const autoOpenFiredRef = useRef(false);

  /* Build the recipient URL */
  const senderShareUrl = (() => {
    const p = new URLSearchParams(window.location.search);
    p.delete("sender");
    if (cardId) p.set("id", cardId);
    const base = window.location.origin + (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    return `${base}/birthday.html?${p.toString()}`;
  })();

  /* Auto-open paywall 3s after landing on scene 6 (once per session) */
  useEffect(() => {
    if (scene !== 6 || !isSender || isUnlocked || autoOpenFiredRef.current) return;
    autoOpenFiredRef.current = true;
    const t = setTimeout(() => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) setShowUnlockModal(true);
      else setShowDesktopPaywall(true);
    }, 3000);
    return () => clearTimeout(t);
  }, [scene, isSender, isUnlocked]);

  function handleOpenPaywall() {
    const isMobile = window.innerWidth < 768;
    if (isMobile) setShowUnlockModal(true);
    else setShowDesktopPaywall(true);
  }

  function shareSenderWhatsApp() {
    const text = encodeURIComponent(`🎂 I made you a birthday surprise — open it! ${senderShareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    trackEvent({ event: "card_shared_whatsapp", occasion, template: "birthday" });
  }

  function copySenderLink() {
    navigator.clipboard.writeText(senderShareUrl).then(() => {
      setSenderCopied(true);
      setTimeout(() => setSenderCopied(false), 2500);
    }).catch(() => {});
  }

  function copySenderLinkForInstagram() {
    navigator.clipboard.writeText(senderShareUrl).then(() => {
      setSenderIgCopied(true);
      setTimeout(() => setSenderIgCopied(false), 2500);
    }).catch(() => {});
  }

  return (
    <div style={{
      position:"fixed", inset:0, overflow:"hidden",
      background:"linear-gradient(175deg,#0e0502 0%,#1c0a06 40%,#0e0402 100%)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"Georgia,'Times New Roman',serif",
      userSelect:"none",
    }}>
      {/* Centered card container */}
      <div style={{
        position:"relative",
        width:"min(390px, 100vw)",
        height:"min(844px, 100dvh)",
        overflow:"hidden",
      }}>
        <AnimatePresence mode="wait">
          {scene === 1 && (
            <Scene1 key="s1" name={name} onNext={() => setScene(2)}/>
          )}
          {scene === 2 && (
            <Scene2 key="s2" onNext={() => setScene(3)}/>
          )}
          {scene === 3 && (
            <Scene3 key="s3" onNext={() => setScene(4)}/>
          )}
          {scene === 4 && (
            <Scene4 key="s4" photoUrls={photoUrls} onNext={() => setScene(5)}/>
          )}
          {scene === 5 && (
            <Scene5 key="s5" personalPicUrl={personalPicUrl} voiceUrl={voiceUrl} onNext={() => setScene(6)}/>
          )}
          {scene === 6 && (
            <Scene6 key="s6"
              name={name}
              finalMessage={finalMessage}
              isSender={isSender}
              isRecipient={isRecipient}
              isUnlocked={isUnlocked}
              occasion={occasion}
              cardId={cardId}
              onOpenPaywall={handleOpenPaywall}
              senderCopied={senderCopied}
              senderIgCopied={senderIgCopied}
              onShareWhatsApp={shareSenderWhatsApp}
              onCopyLink={copySenderLink}
              onCopyForInstagram={copySenderLinkForInstagram}
              onReplay={() => { autoOpenFiredRef.current = false; setScene(1); }}
            />
          )}
        </AnimatePresence>

        {/* Payment modals */}
        <AnimatePresence>
          {showUnlockModal && (
            <Suspense fallback={null}>
              <UnlockModal
                cardId={cardId}
                recipientName={name}
                occasion={occasion}
                senderShareUrl={senderShareUrl}
                onClose={() => setShowUnlockModal(false)}
                onSuccess={() => { setIsUnlocked(true); setShowUnlockModal(false); }}
              />
            </Suspense>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showDesktopPaywall && (
            <Suspense fallback={null}>
              <WatermarkPaywallModal
                mode="photo"
                cardId={cardId}
                onClose={() => setShowDesktopPaywall(false)}
                onSuccess={() => { setShowDesktopPaywall(false); setIsUnlocked(true); }}
              />
            </Suspense>
          )}
        </AnimatePresence>
      </div>

      {/* Back link */}
      <Link href="/send?ref=card">
        <motion.div
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:2 }}
          style={{ position:"fixed", top:14, left:14, fontSize:11,
            color:"rgba(255,255,255,0.14)", cursor:"pointer", zIndex:60,
            padding:"4px 10px", borderRadius:999, background:"rgba(255,255,255,0.04)" }}>
          ← make your own
        </motion.div>
      </Link>
    </div>
  );
}
