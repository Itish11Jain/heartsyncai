import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { trackEvent } from "@/lib/trackEvent";
import { music, resumeAudio, isAudioSuspended } from "@/lib/audio";
import ViralReplyCTA from "@/components/ViralReplyCTA";
import { scaleCount } from "@/lib/deviceCapability";

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
  // High-end devices render the full decorative field unchanged; low-end /
  // reduced-motion get fewer twinkles so the opening scene paints faster.
  const dots = TW_DOTS.slice(0, scaleCount(TW_DOTS.length, 0.45, 0.2));
  const sparkles = TW_SPARKLES.slice(0, scaleCount(TW_SPARKLES.length, 0.45, 0.2));
  const crossCount = scaleCount(10, 0.4, 0.2);
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
        {dots.map((s,i)=>(
          <motion.circle key={i} cx={s.x} cy={s.y} r={s.r}
            fill={s.color}
            animate={{opacity:[0.04,0.95,0.1,0.8,0.04], scale:[1,1.6,1,1.3,1]}}
            transition={{duration:s.dur, repeat:Infinity, delay:s.delay, ease:"easeInOut"}}
            style={{transformOrigin:`${s.x}px ${s.y}px`}}/>
        ))}
        {[...Array(crossCount)].map((_,i)=>{
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
      {sparkles.map((p,i)=>(
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

/* ─── Scene 1 data ─────────────────────────────────────────────────────── */
const S1G = [
  { id:"sg0", hi:"#D89880", mid:"#C9846A", lo:"#B87060" },
  { id:"sg1", hi:"#E4BE55", mid:"#D4AF37", lo:"#C09A25" },
  { id:"sg2", hi:"#EDB890", mid:"#E8A07A", lo:"#D08060" },
  { id:"sg3", hi:"#D09A42", mid:"#C4913A", lo:"#B07A28" },
  { id:"sg4", hi:"#D89878", mid:"#C88868", lo:"#B87060" },
  { id:"sg5", hi:"#D8A888", mid:"#C89878", lo:"#B88060" },
];
const BOUQUET = [
  { cx:152, cy:490, r:40, gi:0, dur:2.4, delay:0.0, amp:6 },
  { cx:234, cy:462, r:37, gi:1, dur:2.9, delay:0.4, amp:7 },
  { cx:190, cy:370, r:44, gi:2, dur:2.2, delay:0.2, amp:8 },
  { cx:136, cy:402, r:35, gi:3, dur:2.7, delay:0.7, amp:5 },
  { cx:252, cy:398, r:37, gi:4, dur:2.5, delay:0.9, amp:6 },
];
const GBX=195, GBY=740, GBW=94, GBH=70, GBD=26;
const S1_CONF = [
  {x:52,y:108,s:9,c:"#D4AF37",r:15},{x:318,y:82,s:7,c:"#D4AF37",r:-22},
  {x:78,y:218,s:8,c:"#C9846A",r:30},{x:334,y:192,s:10,c:"#D4AF37",r:-15},
  {x:42,y:348,s:7,c:"#F0D060",r:35},{x:356,y:318,s:8,c:"#C9846A",r:-28},
  {x:118,y:146,s:6,c:"#D4AF37",r:42},{x:282,y:138,s:9,c:"#F0D060",r:-32},
  {x:172,y:92,s:7,c:"#C9846A",r:20},{x:248,y:234,s:6,c:"#D4AF37",r:-12},
  {x:64,y:488,s:8,c:"#F0D060",r:38},{x:344,y:464,s:7,c:"#D4AF37",r:-18},
  {x:196,y:52,s:10,c:"#C9846A",r:14},{x:298,y:572,s:6,c:"#D4AF37",r:48},
  {x:94,y:598,s:8,c:"#F0D060",r:-38},{x:162,y:640,s:7,c:"#D4AF37",r:25},
  {x:316,y:620,s:6,c:"#C9846A",r:-25},{x:36,y:182,s:5,c:"#D4AF37",r:60},
  {x:358,y:412,s:6,c:"#F0D060",r:-48},{x:220,y:304,s:5,c:"#D4AF37",r:33},
];
const SIDE_GIFTS = [
  { cx:110, cy:752, w:50, h:42, d:13, front:"#4A1520", side:"#300D14", top:"#6A2030", ribbon:"#EFC840", delay:0.35, amp:4 },
  { cx:280, cy:746, w:56, h:46, d:15, front:"#3A1A58", side:"#250E3C", top:"#52288A", ribbon:"#E87060", delay:0.9,  amp:5 },
  { cx:58,  cy:762, w:40, h:34, d:11, front:"#0A3A28", side:"#052416", top:"#125A3E", ribbon:"#D4AF37", delay:1.5,  amp:3 },
  { cx:330, cy:755, w:46, h:38, d:12, front:"#3A2808", side:"#261B04", top:"#5A3E0E", ribbon:"#C9846A", delay:0.65, amp:4.5 },
] as const;
const S1_TWINKLES = [
  ["12%","8%",  14,"#D4AF37",0.3,2.0], ["85%","6%",  11,"#F0D060",0.8,2.4],
  ["5%", "28%", 10,"#C9846A",1.1,1.8], ["91%","32%", 13,"#FFF4B0",0.5,2.2],
  ["18%","42%", 9, "#D4AF37",1.6,2.6], ["78%","48%", 12,"#E8A060",0.2,1.9],
  ["6%", "60%", 11,"#F0D060",1.9,2.1], ["88%","62%", 10,"#D4AF37",0.7,2.3],
  ["25%","72%", 13,"#C9846A",1.3,1.7], ["70%","70%", 9, "#FFF4B0",1.0,2.5],
  ["50%","6%",  10,"#D4AF37",2.0,2.0], ["40%","78%", 12,"#F0D060",0.4,2.2],
  ["14%","86%", 8, "#C9846A",1.7,1.8], ["82%","84%", 11,"#D4AF37",0.9,2.4],
] as const;
const BURST_COLORS = ["#D4AF37","#C9846A","#F0D060","#FFF4B0","#E8803A"];
const BURST_PTS = Array.from({length:22}, (_,i)=>{
  const angle = (i/22)*Math.PI*2 - Math.PI/2;
  const dist  = 75 + (i%5)*20;
  return { tx: Math.round(Math.cos(angle)*dist), ty: Math.round(Math.sin(angle)*dist),
    c: BURST_COLORS[i%BURST_COLORS.length], r:4+(i%4)*2 };
});

function SmallGiftBox({ cx,cy,w,h,d,front,side,top,ribbon,delay,amp }:
  { cx:number;cy:number;w:number;h:number;d:number;front:string;side:string;top:string;ribbon:string;delay:number;amp:number }) {
  const lx=cx-w/2, ty=cy-h;
  return (
    <motion.g animate={{ y:[0,-amp,0,amp*0.5,0] }} transition={{ duration:2.8+delay*0.4, repeat:Infinity, ease:"easeInOut", delay }}>
      <motion.g initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.7, delay:delay+0.2, ease:[0.34,1.56,0.64,1] }}>
        <path d={`M${lx+w} ${ty} L${lx+w+d} ${ty-d} L${lx+w+d} ${cy-d} L${lx+w} ${cy} Z`} fill={side}/>
        <path d={`M${lx} ${ty} L${lx+d} ${ty-d} L${lx+w+d} ${ty-d} L${lx+w} ${ty} Z`} fill={top}/>
        <rect x={lx} y={ty} width={w} height={h} fill={front} rx={2}/>
        <rect x={cx-3} y={ty} width={6} height={h} fill={ribbon} rx={1} opacity={0.9}/>
        <rect x={lx} y={ty+h*0.44} width={w} height={h*0.12} fill={ribbon} rx={1} opacity={0.9}/>
        <ellipse cx={cx-6} cy={ty-3} rx={5} ry={3.5} fill={ribbon} opacity={0.85} transform={`rotate(-20,${cx-6},${ty-3})`}/>
        <ellipse cx={cx+6} cy={ty-3} rx={5} ry={3.5} fill={ribbon} opacity={0.85} transform={`rotate(20,${cx+6},${ty-3})`}/>
        <circle cx={cx} cy={ty-1} r={3} fill={ribbon}/>
      </motion.g>
    </motion.g>
  );
}

function GiftBoxSVG() {
  const x=GBX, y=GBY, w=GBW, h=GBH, d=GBD;
  const lx=x-w/2, ty=y-h;
  return (
    <motion.g animate={{ y:[0,-7,0,5,0] }} transition={{ duration:3.4, repeat:Infinity, ease:"easeInOut", delay:1.1 }}>
      <motion.g initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.8, delay:0.3, ease:[0.34,1.56,0.64,1] }}>
        <path d={`M${lx+w} ${ty} L${lx+w+d} ${ty-d} L${lx+w+d} ${y-d} L${lx+w} ${y} Z`} fill="#3A0F14"/>
        <path d={`M${lx} ${ty} L${lx+d} ${ty-d} L${lx+w+d} ${ty-d} L${lx+w} ${ty} Z`} fill="#4A1520"/>
        <rect x={lx} y={ty} width={w} height={h} fill="#5C1A22" rx={2}/>
        <rect x={lx} y={ty} width={w*0.38} height={h} fill="rgba(255,255,255,0.04)" rx={2}/>
        <path d={`M${lx+w} ${ty+h*0.44} L${lx+w+d} ${ty+h*0.44-d} L${lx+w+d} ${ty+h*0.56-d} L${lx+w} ${ty+h*0.56} Z`} fill="#C4913A" opacity={0.9}/>
        <path d={`M${x-5} ${ty} L${x-5+d} ${ty-d} L${x+5+d} ${ty-d} L${x+5} ${ty} Z`} fill="#D4AF37" opacity={0.92}/>
        <rect x={x-5} y={ty} width={10} height={h} fill="#D4AF37" rx={1.5} opacity={0.92}/>
        <rect x={lx} y={ty+h*0.44} width={w} height={h*0.12} fill="#D4AF37" rx={1.5} opacity={0.92}/>
        <rect x={x-2} y={ty+3} width={3} height={h-6} fill="rgba(255,248,140,0.45)" rx={1}/>
      </motion.g>
    </motion.g>
  );
}

function BouquetBalloonSVG({ cx, cy, r, gi, dur, delay, amp }:
  { cx:number; cy:number; r:number; gi:number; dur:number; delay:number; amp:number }) {
  const gid = S1G[gi].id;
  const strPath = `M${cx} ${cy+r+4} Q${cx+(cx-GBX)*0.12} ${(cy+r+(GBY-GBH))/2} ${GBX} ${GBY-GBH}`;
  return (
    <motion.g animate={{ y:[0,-amp,0,amp*0.5,0], rotate:[-1.5,1.5,-0.5,1,-1.5] }}
      style={{ originX:`${cx}px`, originY:`${cy}px` }}
      transition={{ duration:dur, repeat:Infinity, ease:"easeInOut", delay }}>
      <path d={strPath} fill="none" stroke="#D4AF37" strokeWidth={1.3} opacity={0.5}/>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${gid})`}/>
      <ellipse cx={cx-r*0.4} cy={cy-r*0.62} rx={r*0.2} ry={r*0.13}
        fill="white" opacity={0.5} transform={`rotate(-30,${cx-r*0.4},${cy-r*0.62})`}/>
      <ellipse cx={cx} cy={cy+r+4} rx={5} ry={4} fill={`url(#${gid})`} opacity={0.85}/>
    </motion.g>
  );
}

function FloatingBalloonSVG({ onTap }: { onTap:()=>void }) {
  const cx=195, r=50;
  /* Push balloon down slightly on short-canvas iOS Safari so it clears the name text */
  const _vpW = typeof window !== "undefined" ? window.innerWidth  : 390;
  const _vpH = typeof window !== "undefined" ? window.innerHeight : 844;
  const _sh  = Math.ceil(_vpH / (_vpW / 390));
  const cy   = _sh < 820 ? 255 + Math.round((820 - _sh) * 0.3) : 255;
  const gid = S1G[5].id;
  const [popped, setPopped] = useState(false);
  const handleTap = () => {
    if (popped) return;
    setPopped(true);
    setTimeout(onTap, 680);
  };
  return (
    <g>
      {!popped && (
        <path d={`M${cx} ${cy+r+5} Q${cx+14} 560 ${GBX} ${GBY-GBH}`}
          fill="none" stroke="#D4AF37" strokeWidth={1.3} opacity={0.42}/>
      )}
      {!popped && (
        <motion.circle cx={cx} cy={cy} r={r+8}
          fill="none" stroke="rgba(212,175,55,0.45)" strokeWidth={2.5}
          animate={{ scale:[1,(r+22)/(r+8)], opacity:[0.6,0] }}
          transition={{ duration:1.9, repeat:Infinity, ease:"easeOut" }}
          style={{ transformOrigin:`${cx}px ${cy}px` }}/>
      )}
      {popped && BURST_PTS.map((p,i)=>(
        <motion.circle key={i} cx={cx} cy={cy} r={p.r} fill={p.c}
          initial={{ x:0, y:0, opacity:1, scale:1 }}
          animate={{ x:p.tx, y:p.ty, opacity:0, scale:0.4 }}
          transition={{ duration:0.7, delay:i*0.014, ease:[0.16,1,0.3,1] }}/>
      ))}
      {popped && (
        <motion.circle cx={cx} cy={cy} r={r} fill="none" stroke="#D4AF37" strokeWidth={3}
          initial={{ scale:1, opacity:0.9 }} animate={{ scale:3.2, opacity:0 }}
          transition={{ duration:0.55, ease:"easeOut" }}
          style={{ transformOrigin:`${cx}px ${cy}px` }}/>
      )}
      {popped && (
        <motion.circle cx={cx} cy={cy} r={r} fill="none" stroke="#F0D060" strokeWidth={1.5}
          initial={{ scale:1, opacity:0.7 }} animate={{ scale:4.5, opacity:0 }}
          transition={{ duration:0.75, ease:"easeOut", delay:0.06 }}
          style={{ transformOrigin:`${cx}px ${cy}px` }}/>
      )}
      {popped && (
        <motion.circle cx={cx} cy={cy} r={r+18} fill="white"
          initial={{ opacity:0.85 }} animate={{ opacity:0 }}
          transition={{ duration:0.28 }}/>
      )}
      <motion.g
        animate={popped ? { opacity:0 } : { y:[0,-13,0,9,0], rotate:[-2,2,-1,2.5,-2] }}
        transition={popped
          ? { duration:0.18, ease:"easeIn" }
          : { duration:3.8, repeat:Infinity, ease:"easeInOut" }}
        onClick={handleTap} style={{ cursor:"pointer" }}>
        <circle cx={cx} cy={cy} r={r} fill={`url(#${gid})`}/>
        <ellipse cx={cx-r*0.4} cy={cy-r*0.62} rx={r*0.2} ry={r*0.13}
          fill="white" opacity={0.5} transform={`rotate(-30,${cx-r*0.4},${cy-r*0.62})`}/>
        <ellipse cx={cx} cy={cy+r+5} rx={6} ry={5} fill={`url(#${gid})`} opacity={0.85}/>
        <text x={cx} y={cy+5} textAnchor="middle"
          fontFamily="Georgia,serif" fontStyle="italic" fontSize={13}
          fill="rgba(255,255,255,0.75)">tap ✦</text>
      </motion.g>
    </g>
  );
}

function Scene1({ name, onNext }: { name:string, onNext:()=>void }) {
  return (
    <motion.div key="s1" style={{ position:"absolute", inset:0, zIndex:10 }}
      exit={{ opacity:0 }} transition={{ duration:0.6 }}>
      <TwinkleBackground/>
      {S1_TWINKLES.map(([l,t,sz,col,dl,dur],i) => (
        <motion.span key={`s1tw${i}`} style={{
          position:"absolute", left:l, top:t, zIndex:6, pointerEvents:"none",
          fontSize:sz, color:col, lineHeight:1,
        }}
          animate={{ opacity:[0,1,0.4,0.9,0], scale:[0,1.2,0.8,1.1,0], rotate:[0,30,-20,15,0] }}
          transition={{ delay:dl, duration:dur, repeat:Infinity, repeatDelay:0.4+(i%4)*0.3 }}>
          {i%3===0?"✦":i%3===1?"✧":"·"}
        </motion.span>
      ))}
      <div style={{ position:"absolute", left:0, right:0, top:50, textAlign:"center", zIndex:5, pointerEvents:"none" }}>
        <motion.p style={{
          fontFamily:"'Great Vibes', cursive",
          fontWeight:400, fontSize:46, lineHeight:1.2, margin:0,
          display:"inline-block", letterSpacing:1,
          background:"linear-gradient(120deg,#C9846A,#D4AF37,#FFF4B0,#D4AF37,#C9846A)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}
          initial={{ clipPath:"inset(0 102% 0 0)" }}
          animate={{ clipPath:"inset(0 0% 0 0)" }}
          transition={{ duration:1.4, ease:"linear", delay:0.4 }}>
          Happy Birthday
        </motion.p>
        <motion.p style={{
          fontFamily:"'Playfair Display',Georgia,serif", fontStyle:"italic",
          fontSize:22, fontWeight:700, margin:"8px 0 0", letterSpacing:6, textTransform:"uppercase",
          color:"rgba(212,175,55,0.95)", display:"block",
        }}
          initial={{ opacity:0 }} animate={{ opacity:1 }}
          transition={{ delay:0.4, duration:0.9 }}>
          {name}
        </motion.p>
      </div>
      {(["✦","✨","✦","✨","✦","✨"] as const).map((s,i)=>{
        const positions = [
          { left:"8%",  top:"2%" }, { left:"82%", top:"3%" },
          { left:"4%",  top:"14%"}, { left:"88%", top:"16%"},
          { left:"22%", top:"20%"}, { left:"68%", top:"20%"},
        ];
        return (
          <motion.span key={i} style={{
            position:"absolute", zIndex:6, pointerEvents:"none",
            fontSize:[13,11,10,12,9,11][i],
            color:["#D4AF37","#F0D060","#C9846A","#FFF4B0","#D4AF37","#E8A060"][i],
            ...positions[i],
          }}
            initial={{ opacity:0, scale:0 }}
            animate={{ opacity:[0,1,0.5,1,0], scale:[0,1.3,0.9,1.2,0], rotate:[0,25,-15,20,0] }}
            transition={{ delay:3.0+i*0.22, duration:2.2, repeat:Infinity, repeatDelay:0.6+i*0.3 }}>
            {s}
          </motion.span>
        );
      })}
      <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", zIndex:4 }}
        viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
        <defs>
          {S1G.map(g => (
            <radialGradient key={g.id} id={g.id} cx="34%" cy="28%" r="65%">
              <stop offset="0%"  stopColor={g.hi}/>
              <stop offset="46%" stopColor={g.mid}/>
              <stop offset="100%" stopColor={g.lo}/>
            </radialGradient>
          ))}
        </defs>
        {S1_CONF.map((p,i) => (
          <motion.rect key={i} x={p.x-p.s/2} y={p.y-p.s/2} width={p.s} height={p.s}
            fill={p.c} rx={i%4===0 ? p.s/2 : 1}
            initial={{ opacity:0 }}
            animate={{ opacity:[0,0.88,0.42,0.76,0], rotate:[p.r, p.r+80, p.r+180], y:[0,-6,4,-5,0] }}
            transition={{ duration:3+i*0.16, repeat:Infinity, delay:i*0.18, ease:"easeInOut" }}/>
        ))}
        {SIDE_GIFTS.map((g,i) => <SmallGiftBox key={i} {...g}/>)}
        <GiftBoxSVG />
        {BOUQUET.map((b,i) => (
          <BouquetBalloonSVG key={i} {...b}/>
        ))}
        <FloatingBalloonSVG onTap={onNext}/>
      </svg>
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

function BunchBalloons({ flyUp, archHeight = 260 }: { flyUp:boolean, archHeight?:number }) {
  const AY = 960;
  return (
    <div style={{ position:"absolute", inset:0, width:"100%", zIndex:14, pointerEvents:"none", overflow:"visible" }}>
      <svg width={390} height={archHeight}
        viewBox={`0 ${700 + (260 - archHeight)} 390 ${archHeight}`}
        preserveAspectRatio="none"
        style={{ position:"absolute", bottom:0, left:0, overflow:"visible" }}
        overflow="visible">
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
                  animate={{ opacity: 0 }}
                  transition={{ duration:0 }}/>
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
  /* ── Adaptive layout for iOS Safari where canvas is shorter than 844 ──
     Cake bottom = y:468 (top:188 + height:280).
     Arch height shrinks so there is always room for the CTA between cake and arch.
     Countdown reuses the same vertical band as the CTA (they never show together). */
  const _vpW2 = typeof window !== "undefined" ? window.innerWidth  : 390;
  const _vpH2 = typeof window !== "undefined" ? window.innerHeight : 844;
  const _sh2  = Math.ceil(_vpH2 / (_vpW2 / 390));
  const _avail    = Math.max(0, _sh2 - 468);             // space below cake
  const _archH    = Math.min(260, Math.max(160, _avail - 80)); // 80=margins+btn
  const _ctaTop   = Math.min(510, Math.max(483, _sh2 - _archH - 65)); // 65=gap+btn
  const _countTop = Math.min(488, _ctaTop - 22);          // countdown: 22px above CTA
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
      <BunchBalloons flyUp={flyUp} archHeight={_archH}/>

      {/* "Make a Wish" headline */}
      <motion.h1 style={{
        position:"absolute", top:52, left:0, right:0, textAlign:"center", zIndex:20,
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
      <motion.div style={{ position:"absolute", left:"50%", marginLeft:-140, top:188, width:280, height:280, zIndex:20 }}
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
            style={{ position:"absolute", top:_ctaTop, left:0, right:0, display:"flex", justifyContent:"center", zIndex:20 }}
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
            style={{ position:"absolute", top:_countTop, left:0, right:0, textAlign:"center", zIndex:20,
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
  /* On iOS Safari the canvas is shorter than 844 — clamp flower below photo3 (bottom ~695) */
  const _vpW = typeof window !== "undefined" ? window.innerWidth  : 390;
  const _vpH = typeof window !== "undefined" ? window.innerHeight : 844;
  const _sh  = Math.ceil(_vpH / (_vpW / 390));
  const _flowerTop = Math.max(_sh - 170, 700);
  return (
    <motion.svg width={178} height={178} viewBox="0 0 178 178"
      style={{ position:"absolute", top:_flowerTop, left:-8, zIndex:15, pointerEvents:"none" }}
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

function PolaroidFrame({ idx, top, left, rotate, floatDelay, imageSrc, iw=130, ih=138 }:
  { idx:number, top:number, left:number, rotate:number, floatDelay:number, imageSrc:string, iw?:number, ih?:number }) {
  const IW=iw, IH=ih, BRD=11, BOT=32;
  /* Block the entrance animation until the photo is confirmed loaded/cached.
     This prevents the "black frame → photo pops in" lag. */
  const [imgReady, setImgReady] = useState(false);
  useEffect(() => {
    if (!imageSrc) { setImgReady(true); return; }
    const img = new Image();
    const markReady = () => setImgReady(true);
    img.onload  = markReady;
    img.onerror = markReady;
    img.src = imageSrc;
    if (img.complete) { markReady(); return; }
    const fallback = setTimeout(markReady, 4000);
    return () => clearTimeout(fallback);
  }, [imageSrc]);
  return (
    <motion.div style={{ position:"absolute", top, left, zIndex:10+idx, rotate }}
      initial={{ opacity:0, scale:0.82, y:36 }}
      animate={imgReady ? { opacity:1, scale:1, y:0 } : { opacity:0, scale:0.82, y:36 }}
      transition={{ delay: imgReady ? 0.18+idx*0.28 : 0, duration:0.65, ease:[0.34,1.56,0.64,1] }}>
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
            <img src={imageSrc} alt="" loading="eager" decoding="async" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
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
  /* ── Adaptive vertical layout for short iOS canvases (3-photo layout only) ──
     vScale compresses vertical spacing so photo3 always clears the CONTINUE button.
     Formula: p3_bottom(=168+346*v+181) + 86(footer) ≤ scaledH  →  v=(sh-435)/346
     Android (scaledH≥781) always evaluates to vScale=1 (original positions). */
  const _vpW4 = typeof window !== "undefined" ? window.innerWidth  : 390;
  const _vpH4 = typeof window !== "undefined" ? window.innerHeight : 844;
  const _sh4  = Math.ceil(_vpH4 / (_vpW4 / 390));
  const _vScale = Math.min(1, (_sh4 - 435) / 346);
  const _p2y = Math.round(168 + 173 * _vScale); // was 341
  const _p3y = Math.round(168 + 346 * _vScale); // was 514
  const _qy  = Math.round(168 + 324 * _vScale); // was 492
  /* ── 1-photo layout: a single larger polaroid, horizontally centred and
     vertically centred in the clear band BETWEEN the top-right flower and the
     caption, so it never overlaps either while filling the previously-empty
     middle. Boundaries are derived from the real occupied regions, and the
     frame is allowed to shrink on short canvases so the no-overlap guarantee
     always holds (correctness wins over "bigger" on rare short screens). */
  const _oneCapH    = 60;                           // caption block (~2 lines, italic 14px) + breathing room
  const _oneTopSafe = 350;                          // top-right flower occupies y≈128..348 → clear it
  const _oneBotSafe = (_sh4 - 118) - _oneCapH;      // stay above the caption (also clears the bottom-left flower)
  const _oneAvail   = _oneBotSafe - _oneTopSafe;
  const _oneFrameH  = Math.max(150, Math.min(214, _oneAvail));
  const _oneIh      = _oneFrameH - 43;              // BRD(11) + BOT(32)
  const _oneIw      = Math.round(_oneIh * 0.94);    // keep the existing photo aspect
  const _oneFrameW  = _oneIw + 22;                  // BRD(11) * 2
  const _oneLeft    = Math.round((390 - _oneFrameW) / 2);
  const _oneTop     = Math.round(_oneTopSafe + Math.max(0, (_oneAvail - _oneFrameH) / 2));
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
          position:"absolute", top:48, left:0, right:0, textAlign:"center", zIndex:5,
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
        <motion.div style={{ position:"absolute", left:0, right:0, top:160, bottom:120, zIndex:5,
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
          <PolaroidFrame idx={0} top={_oneTop} left={_oneLeft} rotate={0} floatDelay={0} imageSrc={p0} iw={_oneIw} ih={_oneIh}/>
          <motion.div style={{ position:"absolute", left:0, right:0, bottom:118, textAlign:"center",
            padding:"0 36px", zIndex:5 }}
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
          <motion.div style={{ position:"absolute", right:18, top:310, width:148, textAlign:"right", zIndex:5 }}
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
          <PolaroidFrame idx={1} top={_p2y} left={34} rotate={-2} floatDelay={0.6} imageSrc={p1}/>
          <PolaroidFrame idx={2} top={_p3y} left={6}  rotate={-5} floatDelay={1.1} imageSrc={p2}/>
          <motion.div style={{ position:"absolute", right:36, top:_qy, width:148, textAlign:"right", zIndex:5 }}
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
        position:"absolute", bottom:26, left:"50%", transform:"translateX(-50%)", zIndex:5,
        background:"linear-gradient(135deg,rgba(212,175,55,0.14),rgba(212,175,55,0.26))",
        border:"1.5px solid rgba(212,175,55,0.58)", borderRadius:36, padding:"13px 40px",
        color:"#F0D060", fontSize:13, letterSpacing:2, textTransform:"uppercase",
        fontFamily:"Georgia,serif", cursor:"pointer", whiteSpace:"nowrap",
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
  {x:130,y:200,c:CC[0],s:14,t:0,r:40, d:0.55},{x:210,y:150,c:CC[4],s:12,t:1,r:-55,d:0.60},
  {x:80, y:290,c:CC[2],s:8, t:2,r:70, d:0.57},{x:270,y:120,c:CC[1],s:16,t:0,r:-30,d:0.63},
  {x:160,y:370,c:CC[5],s:13,t:1,r:45, d:0.51},{x:55, y:250,c:CC[6],s:10,t:3,r:-65,d:0.67},
  {x:235,y:300,c:CC[3],s:15,t:0,r:85, d:0.55},{x:115,y:430,c:CC[8],s:9, t:2,r:-75,d:0.69},
  {x:300,y:190,c:CC[9],s:14,t:1,r:52, d:0.61},{x:185,y:470,c:CC[7],s:11,t:3,r:-28,d:0.63},
  {x:75, y:195,c:CC[4],s:12,t:0,r:90, d:0.52},{x:255,y:255,c:CC[0],s:16,t:1,r:-80,d:0.65},
  {x:145,y:335,c:CC[2],s:8, t:2,r:62, d:0.58},{x:330,y:145,c:CC[1],s:13,t:3,r:-42,d:0.71},
  {x:195,y:415,c:CC[6],s:15,t:0,r:38, d:0.60},{x:96, y:355,c:CC[3],s:11,t:1,r:-58,d:0.56},
  {x:175,y:510,c:CC[5],s:10,t:3,r:25, d:0.74},{x:310,y:330,c:CC[8],s:14,t:0,r:-35,d:0.53},
];
const S5_CR = S5_CL.map(p=>({...p, x:-p.x}));

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

function Scene5({ onNext, personalPicUrl, fallbackPicUrl, voiceUrl }: {
  onNext: () => void,
  personalPicUrl: string,
  fallbackPicUrl: string,
  voiceUrl: string,
}) {
  /* Show the sticker cutout as soon as it is available — never show the full
     photo first.  Strategy:
       1. Check the browser image cache synchronously in the useState initialiser
          (the sticker was preloaded before Scene 5 mounts, so it is usually
          already complete).  If cached, initialise cutoutSrc immediately → no
          flash at all.
       2. If not cached yet, show nothing (null) while the polling effect waits
          for the server to finish background removal.
       3. Only fall back to the full photo after all 20 poll attempts fail. */
  const [cutoutSrc, setCutoutSrc] = useState<string | null>(() => {
    if (!personalPicUrl) return null;
    // bg removal was skipped / failed — sticker IS the full photo
    if (personalPicUrl === fallbackPicUrl) return personalPicUrl;
    // Check the browser image cache synchronously
    const probe = new Image();
    probe.src = personalPicUrl;
    return probe.complete && probe.naturalWidth > 0 ? personalPicUrl : null;
  });
  const [useFallback, setUseFallback] = useState(false);
  useEffect(() => {
    if (!personalPicUrl || personalPicUrl === fallbackPicUrl) return;
    // Already resolved from cache — no polling needed
    if (cutoutSrc === personalPicUrl) return;
    let cancelled = false;
    let attempts = 0;
    const tryLoad = () => {
      if (cancelled) return;
      const candidate = attempts === 0 ? personalPicUrl : `${personalPicUrl}?r=${attempts}`;
      const img = new Image();
      img.onload = () => { if (!cancelled) setCutoutSrc(candidate); };
      img.onerror = () => {
        attempts += 1;
        if (!cancelled && attempts <= 20) setTimeout(tryLoad, 1500);
        else if (!cancelled) setUseFallback(true); // give up after ~30 s
      };
      img.src = candidate;
    };
    tryLoad();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalPicUrl, fallbackPicUrl]);
  // While the sticker is still loading show nothing; only use the full photo
  // as a last resort after polling gives up.
  const displaySrc = cutoutSrc ?? (useFallback ? (fallbackPicUrl || personalPicUrl) : null);

  const hasAudio = voiceUrl.length > 0;

  return (
    <motion.div key="s5" style={{ position:"absolute", inset:0, zIndex:12, overflow:"hidden" }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      transition={{ duration:0.7 }}>
      <TwinkleBackground/>

      {/* Cannon confetti from top-left and top-right corners */}
      {[...S5_CL.map((p,i)=>({...p,side:0,i})), ...S5_CR.map((p,i)=>({...p,side:1,i}))].map(p => {
        const ox = p.side===0 ? 0 : 390;
        const w  = p.t===2 ? p.s*0.45 : p.t===3 ? p.s*1.5 : p.s;
        const h  = p.t===2 ? p.s*2.8  : p.t===3 ? p.s*0.6  : p.s;
        const br:React.CSSProperties["borderRadius"] = p.t===0 ? "50%" : p.t===2 ? p.s*0.2 : p.t===3 ? "50%" : p.s*0.22;
        return (
          <motion.div key={`c${p.side}${p.i}`}
            style={{ position:"absolute", left:ox, top:0,
              width:w, height:h, borderRadius:br,
              background:p.c, pointerEvents:"none", zIndex:28,
              boxShadow:`0 0 4px ${p.c}88` }}
            initial={{ x:0, y:0, opacity:0, rotate:0, scale:0.4 }}
            animate={{ x:p.x, y:p.y, opacity:[0,1,1,0.7,0], rotate:p.r, scale:[0.4,1,1,0.9,0.7] }}
            transition={{ duration:2.4, delay:p.d, ease:[0.2,1,0.4,1] }}/>
        );
      })}

      {/* Wish text */}
      <motion.p style={{
        position:"absolute", top:95, left:0, right:0,
        fontFamily:"Georgia,serif", fontStyle:"italic",
        fontSize:16, lineHeight:1.6, textAlign:"center",
        padding:"0 32px", margin:0, zIndex:10,
        background:"linear-gradient(120deg,#C9846A,#D4AF37,#FFF4B0,#D4AF37,#C9846A)",
        WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
      }}
        initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:0.3, duration:0.7 }}>
        The world is so lucky to have you in it.{"\n"}Wishing you all the happiness you deserve.{"\n"}May all your wishes come true!
      </motion.p>

      {/* Emoji orbs */}
      <motion.div style={{ position:"absolute", top:210, left:0, right:0, zIndex:10 }}
        initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }}>
        <EmojiOrbs/>
      </motion.div>

      {/* Voice note + arrow always-on, side by side */}
      <motion.div style={{
        position:"absolute", top:340, left:0, right:0, zIndex:10,
        display:"flex", alignItems:"center", justifyContent:"center", gap:14, padding:"0 24px",
      }}
        initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:0.65 }}>
        {hasAudio && (
          <div style={{ flex:1 }}>
            <VoiceNote voiceUrl={voiceUrl} onDone={() => {}}/>
          </div>
        )}
        <motion.button onClick={onNext}
          style={{ flexShrink:0, width:52, height:52, borderRadius:"50%",
            background:"linear-gradient(135deg,#C4913A,#D4AF37)",
            border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:22, color:"#1c0a06",
            boxShadow:"0 4px 18px rgba(212,175,55,0.55)" }}
          animate={{ scale:[1,1.06,1] }}
          transition={{ duration:1.8, repeat:Infinity, ease:"easeInOut" }}
          whileHover={{ scale:1.1 }} whileTap={{ scale:0.93 }}>
          →
        </motion.button>
      </motion.div>

      {/* Photo sticker — transparent PNG cutout OR polaroid fallback */}
      {displaySrc && !useFallback && (
        <motion.div style={{
          position:"absolute", top:"50%", bottom:0,
          left:0, right:0, zIndex:10,
          display:"flex", alignItems:"flex-end", justifyContent:"center",
          overflow:"hidden", pointerEvents:"none",
        }}
          initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.42, duration:0.85, ease:[0.34,1.56,0.64,1] }}>
          <img src={displaySrc} alt=""
            style={{
              height:"100%", width:"auto", maxWidth:"100%", display:"block",
              filter:"drop-shadow(0 0 6px white) drop-shadow(0 0 4px rgba(255,255,255,0.8)) drop-shadow(0 5px 22px rgba(0,0,0,0.65))",
            }}/>
        </motion.div>
      )}
      {/* Fallback: full photo in a floating polaroid with birthday emoji decorations */}
      {displaySrc && useFallback && (
        <motion.div style={{
          position:"absolute", bottom:60, left:0, right:0, zIndex:10,
          display:"flex", justifyContent:"center", pointerEvents:"none",
        }}
          initial={{ opacity:0, scale:0.82, y:36 }}
          animate={{ opacity:1, scale:1, y:0 }}
          transition={{ delay:0.42, duration:0.75, ease:[0.34,1.56,0.64,1] }}>
          {/* Float loop */}
          <motion.div
            animate={{ y:[0,-8,0] }}
            transition={{ duration:3.4, repeat:Infinity, ease:"easeInOut" }}>
            {/* Polaroid wrapper */}
            <div style={{ position:"relative", rotate:"3deg" }}>
              <div style={{
                width:190, padding:"10px 10px 34px 10px",
                background:"#f2ede4",
                borderRadius:4,
                boxShadow:"0 12px 32px rgba(0,0,0,0.70), 0 3px 10px rgba(0,0,0,0.4)",
              }}>
                <div style={{ width:170, height:170, overflow:"hidden", borderRadius:2, background:"#1a0d08" }}>
                  <img src={displaySrc} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                </div>
              </div>
              {/* 🎉 birthday cap — top-left */}
              <span style={{
                position:"absolute", top:-18, left:-12,
                fontSize:34, lineHeight:1, userSelect:"none",
                filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.45))",
                transform:"rotate(-20deg)", display:"block",
              }}>🎉</span>
              {/* 🎂 cake — bottom-right */}
              <span style={{
                position:"absolute", bottom:-16, right:-10,
                fontSize:30, lineHeight:1, userSelect:"none",
                filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.45))",
                transform:"rotate(15deg)", display:"block",
              }}>🎂</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─── Scene 6: Final message card ────────────────────────────────────────── */
function Scene6({
  name, finalMessage, isSender, isRecipient, isUnlocked,
  occasion, cardId, showPaywallCta,
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
  showPaywallCta: boolean;
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

      <div style={{ position:"relative", zIndex:5, display:"flex", flexDirection:"column", alignItems:"center",
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
            borderRadius:22, padding:"28px 24px 24px",
            boxShadow:"0 0 40px rgba(212,175,55,0.18), 0 0 80px rgba(180,60,20,0.22), inset 0 0 35px rgba(212,175,55,0.04)",
            position:"relative", overflow:"visible",
          }}>
          {/* Corner emoji accents */}
          <span style={{ position:"absolute", top:10, left:13, fontSize:16, opacity:0.82 }}>🌸</span>
          <span style={{ position:"absolute", top:10, right:13, fontSize:16, opacity:0.82 }}>✨</span>
          <span style={{ position:"absolute", bottom:10, left:13, fontSize:16, opacity:0.82 }}>💛</span>
          <span style={{ position:"absolute", bottom:10, right:13, fontSize:16, opacity:0.82 }}>🎂</span>
          {/* Top ornament */}
          <div style={{ width:44, height:1, margin:"0 auto 16px",
            background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.8),transparent)" }}/>

          <motion.h1 initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
            style={{ fontFamily:"'Great Vibes','Dancing Script',cursive",
              fontSize:30, fontWeight:400, color:"#D4AF37",
              margin:"0 0 12px", textAlign:"center",
              textShadow:"0 0 18px rgba(212,175,55,0.4)" }}>
            Hey {name}! 💛
          </motion.h1>
          <div style={{ width:60, height:1, margin:"0 auto 16px",
            background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.5),transparent)" }}/>
          <motion.p initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.55 }}
            style={{ fontFamily:"Georgia,serif", fontStyle:"italic",
              fontSize:15, color:"rgba(255,241,220,0.96)", lineHeight:1.72,
              margin:0, textAlign:"center" }}>
            {finalMessage}
          </motion.p>
          {/* Bottom ornament */}
          <div style={{ width:44, height:1, margin:"16px auto 0",
            background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.5),transparent)" }}/>
        </motion.div>

        {/* Sender panel */}
        {isSender && (
          <motion.div style={{ width:"100%", maxWidth:320, marginTop:36 }}
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
            ) : showPaywallCta ? (
              <motion.div
                initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-8 }}
                transition={{ duration:0.35 }}>
                <div style={{ textAlign:"center", marginBottom:14 }}>
                  <p style={{ fontSize:12, color:"#D4AF37", fontWeight:600,
                    letterSpacing:"0.01em", marginBottom:4, margin:"0 0 4px" }}>
                    You've created a stunning card! ✨
                  </p>
                  <p style={{ fontSize:17, color:"#D4AF37", fontWeight:800,
                    letterSpacing:"0.01em", margin:0 }}>
                    Don't leave it now.
                  </p>
                </div>
                <motion.button onClick={onOpenPaywall}
                  whileTap={{ scale:0.97 }}
                  style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                    width:"100%", height:56, borderRadius:16,
                    background:"linear-gradient(135deg,#FFD700 0%,#FFAA00 100%)",
                    border:"none", cursor:"pointer",
                    color:"#000", fontWeight:800, fontSize:17,
                    boxShadow:"0 6px 28px rgba(255,165,0,0.45)" }}>
                  Make {name} smile. Send now. ❤️
                </motion.button>
                <div style={{ marginTop:10, textAlign:"center" }}>
                  <Link href="/send">
                    <span style={{ fontSize:11, color:"rgba(212,175,55,0.3)", cursor:"pointer" }}>
                      Make another card
                    </span>
                  </Link>
                </div>
              </motion.div>
            ) : null}
          </motion.div>
        )}

        {/* Recipient panel */}
        {isRecipient && (
          <motion.div style={{ width:"100%", maxWidth:320, marginTop:20 }}
            initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.6 }}>
            <ViralReplyCTA template="birthday" occasion="birthday"/>
          </motion.div>
        )}

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
    ? decodeMsg(msgRaw) || "Happy Birthday! I hope this year brings you every bit of the joy, love, and magic you so easily give to everyone around you — today, the whole world should stop and celebrate you. 🎂✨"
    : "Happy Birthday! I hope this year brings you every bit of the joy, love, and magic you so easily give to everyone around you — today, the whole world should stop and celebrate you. 🎂✨";
  const isSender    = params.get("sender") === "1";
  const isPreview   = params.get("preview") === "1";
  const isAutoplay  = params.get("autoplay") === "1";
  const previewSpeed = Math.max(1, Number(params.get("speed")) || 1);
  const isRecipient = !isSender;

  /* ── Background music — plays the actual "Happy Birthday to You" melody ── */
  const [musicMuted, setMusicMuted] = useState(false);
  useEffect(() => {
    if (isPreview) return;
    /* Start immediately — works on desktop/Android.
       On iOS the AudioContext starts suspended; the gesture handler below
       detects this and restarts music cleanly from within a user gesture
       (required by iOS to actually play audio). */
    music.start("envelope", "birthday");

    function onFirstGesture() {
      const wasSuspended = isAudioSuspended();
      resumeAudio();
      if (wasSuspended) {
        // Restart the scheduler from the current (now-resumed) time
        music.stop();
        music.start("envelope", "birthday");
      }
    }
    document.addEventListener("touchstart", onFirstGesture, { once: true });
    document.addEventListener("click",      onFirstGesture, { once: true });
    return () => {
      music.stop();
      document.removeEventListener("touchstart", onFirstGesture);
      document.removeEventListener("click",      onFirstGesture);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview]);
  function toggleMute() {
    const next = !musicMuted;
    setMusicMuted(next);
    music.setVolume(next ? 0 : 1);
  }

  /* ── Paywall-dismissed flag — CTA only appears after the bottom sheet has been closed ── */
  const [paywallDismissed, setPaywallDismissed] = useState(false);
  const [cardId, setCardId] = useState<string>(() => params.get("id") ?? "");

  /* ── view tracking ── fire once when a recipient opens the card, mirroring
     the other templates so the analytics "Views" column counts birthday cards. */
  useEffect(() => {
    if (isRecipient && !isAutoplay) {
      trackEvent({ event: "card_viewed", occasion, template: "birthday", recipient_name: name, card_id: params.get("id") ?? undefined });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const photosRaw   = params.get("photos");
  const photoUrls   = parsePhotoUrls(photosRaw);
  /* Eagerly preload all photo images as soon as the card mounts, so they
     are already in the browser cache by the time Scene4 renders. */
  useEffect(() => {
    photoUrls.filter(Boolean).forEach(url => { const i=new Image(); i.src=url; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photosRaw]);
  const personalPicUrl = params.get("personalpicture")
    ? decodeURIComponent(params.get("personalpicture")!)
    : "";
  const voiceUrl = params.get("voicenote")
    ? decodeURIComponent(params.get("voicenote")!)
    : "";

  /* scenes: 1 = gift, 2 = cake, 4 = polaroids, 5 = confetti+voice, 6 = message */
  const [scene, setScene] = useState<1|2|4|5|6>(1);

  /* Generate a card ID for sender sessions that don't have one yet.
     This is needed so UnlockModal can call /api/cards/:id/auto-unlock and
     /api/cards/:id/pay-unlock with a real ID — both endpoints use INSERT … ON CONFLICT
     so they create the hs_cards row on first successful unlock. */
  useEffect(() => {
    if (!isSender || cardId) return;
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    const id = Array.from(arr, b => chars[b % chars.length]).join("");
    setCardId(id);
    const p = new URLSearchParams(window.location.search);
    p.set("id", id);
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Preload photos as early as possible so they're ready when Scene 4 appears */
  useEffect(() => {
    photoUrls.forEach(url => { const img = new Image(); img.src = url; });
    if (personalPicUrl) { const img = new Image(); img.src = personalPicUrl; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [isUnlocked, setIsUnlocked] = useState(false);

  /* On mount, check the DB to see if this card is already paid/premium.
     This makes the page reflect the real unlock state without needing the
     user to go through the modal again (e.g. after a manual admin unlock). */
  useEffect(() => {
    if (!cardId) return;
    const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    fetch(`${base}/api/cards/${cardId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { is_premium?: boolean } | null) => {
        if (data?.is_premium) setIsUnlocked(true);
      })
      .catch(() => { /* ignore — page still works, modal will appear */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showDesktopPaywall, setShowDesktopPaywall] = useState(false);
  const [senderCopied, setSenderCopied] = useState(false);
  const [senderIgCopied, setSenderIgCopied] = useState(false);
  const autoOpenFiredRef = useRef(false);
  /* Per-scene view tracking — each birthday scene fires once per session so we
     can build a created → scene → paywall funnel and pinpoint the drop-off. */
  const scenesSeenRef = useRef<Set<number>>(new Set());

  /* Build the recipient URL */
  /* Share URL — /api/share generates a personalised og:image for WhatsApp,
     then JS-redirects recipients to /birthday.html. */
  const senderShareUrl = (() => {
    const p = new URLSearchParams(window.location.search);
    p.delete("sender");
    p.set("t", "birthday");
    if (cardId) p.set("id", cardId);
    return window.location.origin + "/api/share?" + p.toString();
  })();

  /* Autoplay: advance through all scenes and loop — used by the UnlockModal iframe preview */
  useEffect(() => {
    if (!isAutoplay) return;
    const speed = (isPreview ? 0.5 : 1) / previewSpeed;
    const SCENE_DURATIONS: Record<number, number> = { 1: 5000*speed, 2: 6000*speed, 4: 5000*speed, 5: 6000*speed, 6: 5000*speed };
    const NEXT_SCENE: Record<number, 1|2|4|5|6> = { 1: 2, 2: 4, 4: 5, 5: 6, 6: 1 };
    const t = setTimeout(() => { setScene(NEXT_SCENE[scene]); }, SCENE_DURATIONS[scene] ?? 5000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoplay, scene]);

  /* Auto-open paywall 3s after landing on scene 6 (once per session) */
  useEffect(() => {
    if (scene !== 6 || !isSender || isUnlocked || autoOpenFiredRef.current || isPreview) return;
    autoOpenFiredRef.current = true;
    const t = setTimeout(() => {
      const isMobile = window.innerWidth < 768;
      // Fire the "sheet opened" event here (mirrors SenderPanel) so birthday's
      // open rate is finally measurable — bundle_paywall_shown == sheet opened,
      // consistent with the SenderPanel-based templates (sorry / feel_good).
      trackEvent({ event: "bundle_paywall_shown", occasion, card_id: cardId });
      if (isMobile) setShowUnlockModal(true);
      else setShowDesktopPaywall(true);
    }, 3000);
    return () => clearTimeout(t);
  }, [scene, isSender, isUnlocked]);

  /* Fire a per-scene "viewed" event the first time each scene becomes visible
     (real user sessions only — never autoplay/preview iframes). The scene number
     is encoded in the event name and the sender/recipient role in `channel`. */
  useEffect(() => {
    if (isAutoplay || isPreview) return;
    // For sender sessions the card id is generated asynchronously on mount, so
    // wait until it exists before logging — otherwise Scene 1 fires without a
    // card_id and can't be joined to card_created in the funnel.
    const id = cardId || params.get("id") || "";
    if (isSender && !id) return;
    if (scenesSeenRef.current.has(scene)) return;
    scenesSeenRef.current.add(scene);
    trackEvent({
      event: `birthday_scene${scene}_viewed`,
      occasion,
      template: "birthday",
      channel: isSender ? "sender" : "recipient",
      card_id: id || undefined,
      recipient_name: name,
      has_voice_note: voiceUrl.length > 0,
      photo_count: photoUrls.length,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, cardId]);

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

  /* ── Scale the 390×844 design canvas to fill the device screen edge-to-edge.
     viewport-fit=cover (set in index.html) makes window.innerHeight return the
     FULL screen height on iOS (≈844pt on iPhone 15), so scale=vpW/390 works
     perfectly on both iOS and Android with no side gaps and no clipping. */
  const vpW = typeof window !== "undefined" ? window.innerWidth  : 390;
  const vpH = typeof window !== "undefined" ? window.innerHeight : 844;
  const scale  = vpW / 390;
  const scaledH = Math.ceil(vpH / scale);

  return (
    <div style={{
      position:"fixed", inset:0, overflow:"hidden",
      overscrollBehavior:"none",           // prevent iOS rubber-band / elastic scroll
      background:"linear-gradient(175deg,#0e0502 0%,#1c0a06 40%,#0e0402 100%)",
      fontFamily:"Georgia,'Times New Roman',serif",
      userSelect:"none",
    }}>
      {/* Scaled scene canvas — 390px design space scaled to fit viewport.
          Centered horizontally so any side gaps are symmetric (matters on iOS). */}
      <div style={{
        position:"absolute",
        top:0, left:"50%", marginLeft:-195,
        width:390,
        height:scaledH,
        transformOrigin:"top center",
        transform:`scale(${scale})`,
        overflow:"hidden",
      }}>
        <AnimatePresence mode="wait">
          {scene === 1 && (
            <Scene1 key="s1" name={name} onNext={() => setScene(2)}/>
          )}
          {scene === 2 && (
            <Scene2 key="s2" onNext={() => setScene(4)}/>
          )}
          {scene === 4 && (
            <Scene4 key="s4" photoUrls={photoUrls} onNext={() => setScene(5)}/>
          )}
          {scene === 5 && (
            <Scene5 key="s5" personalPicUrl={personalPicUrl} fallbackPicUrl={photoUrls[0] ?? ""} voiceUrl={voiceUrl} onNext={() => setScene(6)}/>
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
              showPaywallCta={paywallDismissed}
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
      </div>

      {/* Payment modals — outside the scale transform so position:fixed anchors to real viewport */}
      <AnimatePresence>
        {showUnlockModal && (
          <Suspense fallback={null}>
            <UnlockModal
              cardId={cardId}
              recipientName={name}
              occasion={occasion}
              senderShareUrl={senderShareUrl}
              onClose={() => { setShowUnlockModal(false); setPaywallDismissed(true); }}
              onSuccess={() => { setIsUnlocked(true); setShowUnlockModal(false); setPaywallDismissed(true); }}
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
              occasion={occasion}
              onClose={() => setShowDesktopPaywall(false)}
              onSuccess={() => { setShowDesktopPaywall(false); setIsUnlocked(true); }}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Floating music toggle — top-right corner (clear of iOS status bar) */}
      {!isPreview && (
        <motion.button
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.5 }}
          onClick={toggleMute}
          style={{
            position:"fixed", top:"max(14px, env(safe-area-inset-top, 14px))", right:14, zIndex:60,
            width:34, height:34, borderRadius:"50%",
            background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)",
            backdropFilter:"blur(8px)", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:15, lineHeight:1,
          }}
          whileTap={{ scale:0.88 }}
          aria-label={musicMuted ? "Unmute music" : "Mute music"}
        >
          {musicMuted ? "🔇" : "🎵"}
        </motion.button>
      )}

      {/* Back link — clear of iOS status bar */}
      <Link href="/send?ref=card">
        <motion.div
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:2 }}
          style={{ position:"fixed", top:"max(14px, env(safe-area-inset-top, 14px))", left:14, fontSize:11,
            color:"rgba(255,255,255,0.14)", cursor:"pointer", zIndex:60,
            padding:"4px 10px", borderRadius:999, background:"rgba(255,255,255,0.04)" }}>
          ← make your own
        </motion.div>
      </Link>
    </div>
  );
}
