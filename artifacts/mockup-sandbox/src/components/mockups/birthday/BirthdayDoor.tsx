import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import photo1Src from "@/assets/photo1.jpg";
import photo2Src from "@/assets/photo2.jpg";
import photo3Src from "@/assets/photo3.jpg";
import photo1StickerSrc from "@/assets/photo1_sticker.png";
import cakeStickerSrc   from "@/assets/cake_sticker.png";

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
   SCENE 1 DATA — balloon gradients & layout
══════════════════════════════════════════ */
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
const BOW_CY = GBY - GBH - GBD - 4;
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
   SCENE 1 — Gift box SVG
══════════════════════════════════════════ */
/* Small gift boxes scattered around the main one */
const SIDE_GIFTS = [
  { cx:110, cy:752, w:50, h:42, d:13, front:"#4A1520", side:"#300D14", top:"#6A2030", ribbon:"#EFC840", delay:0.35, amp:4 },
  { cx:280, cy:746, w:56, h:46, d:15, front:"#3A1A58", side:"#250E3C", top:"#52288A", ribbon:"#E87060", delay:0.9,  amp:5 },
  { cx:58,  cy:762, w:40, h:34, d:11, front:"#0A3A28", side:"#052416", top:"#125A3E", ribbon:"#D4AF37", delay:1.5,  amp:3 },
  { cx:330, cy:755, w:46, h:38, d:12, front:"#3A2808", side:"#261B04", top:"#5A3E0E", ribbon:"#C9846A", delay:0.65, amp:4.5 },
] as const;

function SmallGiftBox({ cx,cy,w,h,d,front,side,top,ribbon,delay,amp }:
  { cx:number;cy:number;w:number;h:number;d:number;front:string;side:string;top:string;ribbon:string;delay:number;amp:number }) {
  const lx=cx-w/2, ty=cy-h;
  return (
    <motion.g
      animate={{ y:[0,-amp,0,amp*0.5,0] }}
      transition={{ duration:2.8+delay*0.4, repeat:Infinity, ease:"easeInOut", delay }}>
      <motion.g initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.7, delay:delay+0.2, ease:[0.34,1.56,0.64,1] }}>
        {/* Right face */}
        <path d={`M${lx+w} ${ty} L${lx+w+d} ${ty-d} L${lx+w+d} ${cy-d} L${lx+w} ${cy} Z`} fill={side}/>
        {/* Top face */}
        <path d={`M${lx} ${ty} L${lx+d} ${ty-d} L${lx+w+d} ${ty-d} L${lx+w} ${ty} Z`} fill={top}/>
        {/* Front face */}
        <rect x={lx} y={ty} width={w} height={h} fill={front} rx={2}/>
        {/* Ribbon vertical */}
        <rect x={cx-3} y={ty} width={6} height={h} fill={ribbon} rx={1} opacity={0.9}/>
        {/* Ribbon horizontal */}
        <rect x={lx} y={ty+h*0.44} width={w} height={h*0.12} fill={ribbon} rx={1} opacity={0.9}/>
        {/* Bow loop left */}
        <ellipse cx={cx-6} cy={ty-3} rx={5} ry={3.5} fill={ribbon} opacity={0.85} transform={`rotate(-20,${cx-6},${ty-3})`}/>
        {/* Bow loop right */}
        <ellipse cx={cx+6} cy={ty-3} rx={5} ry={3.5} fill={ribbon} opacity={0.85} transform={`rotate(20,${cx+6},${ty-3})`}/>
        {/* Bow centre */}
        <circle cx={cx} cy={ty-1} r={3} fill={ribbon}/>
      </motion.g>
    </motion.g>
  );
}

function GiftBoxSVG() {
  const x=GBX, y=GBY, w=GBW, h=GBH, d=GBD;
  const lx=x-w/2, ty=y-h;
  return (
    <motion.g
      animate={{ y:[0,-7,0,5,0] }}
      transition={{ duration:3.4, repeat:Infinity, ease:"easeInOut", delay:1.1 }}>
    <motion.g initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.8, delay:0.3, ease:[0.34,1.56,0.64,1] }}>

      {/* ── Box body ── */}
      {/* Right face (shadow side) */}
      <path d={`M${lx+w} ${ty} L${lx+w+d} ${ty-d} L${lx+w+d} ${y-d} L${lx+w} ${y} Z`}
        fill="#3A0F14"/>
      {/* Top face */}
      <path d={`M${lx} ${ty} L${lx+d} ${ty-d} L${lx+w+d} ${ty-d} L${lx+w} ${ty} Z`}
        fill="#4A1520"/>
      {/* Front face */}
      <rect x={lx} y={ty} width={w} height={h} fill="#5C1A22" rx={2}/>
      {/* Front face subtle left-side sheen */}
      <rect x={lx} y={ty} width={w*0.38} height={h} fill="rgba(255,255,255,0.04)" rx={2}/>

      {/* ── Gold ribbon on right face ── */}
      <path d={`M${lx+w} ${ty+h*0.44} L${lx+w+d} ${ty+h*0.44-d} L${lx+w+d} ${ty+h*0.56-d} L${lx+w} ${ty+h*0.56} Z`}
        fill="#C4913A" opacity={0.9}/>

      {/* ── Gold ribbon on top face ── */}
      <path d={`M${x-5} ${ty} L${x-5+d} ${ty-d} L${x+5+d} ${ty-d} L${x+5} ${ty} Z`}
        fill="#D4AF37" opacity={0.92}/>

      {/* ── Gold ribbon on front face ── */}
      {/* Vertical */}
      <rect x={x-5} y={ty} width={10} height={h} fill="#D4AF37" rx={1.5} opacity={0.92}/>
      {/* Horizontal */}
      <rect x={lx} y={ty+h*0.44} width={w} height={h*0.12} fill="#D4AF37" rx={1.5} opacity={0.92}/>
      {/* Ribbon shimmer */}
      <rect x={x-2} y={ty+3} width={3} height={h-6} fill="rgba(255,248,140,0.45)" rx={1}/>

    </motion.g>
    </motion.g>
  );
}

/* ══════════════════════════════════════════
   SCENE 1 — Bouquet balloon
══════════════════════════════════════════ */
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

/* ══════════════════════════════════════════
   SCENE 1 — Floating tappable balloon
══════════════════════════════════════════ */
const BURST_COLORS = ["#D4AF37","#C9846A","#F0D060","#FFF4B0","#E8803A"];
const BURST_PTS = Array.from({length:22}, (_,i)=>{
  const angle = (i/22)*Math.PI*2 - Math.PI/2;
  const dist  = 75 + (i%5)*20;
  return { tx: Math.round(Math.cos(angle)*dist), ty: Math.round(Math.sin(angle)*dist),
    c: BURST_COLORS[i%BURST_COLORS.length], r:4+(i%4)*2 };
});

function FloatingBalloonSVG({ onTap }: { onTap:()=>void }) {
  const cx=195, cy=255, r=50;
  const gid = S1G[5].id;
  const [popped, setPopped] = useState(false);

  const handleTap = () => {
    if (popped) return;
    setPopped(true);
    setTimeout(onTap, 680);
  };

  return (
    <g>
      {/* Long string to gift — hides on pop */}
      {!popped && (
        <path d={`M${cx} ${cy+r+5} Q${cx+14} 560 ${GBX} ${GBY-GBH}`}
          fill="none" stroke="#D4AF37" strokeWidth={1.3} opacity={0.42}/>
      )}
      {/* Pulsing ring — hides on pop */}
      {!popped && (
        <motion.circle cx={cx} cy={cy} r={r+8}
          fill="none" stroke="rgba(212,175,55,0.45)" strokeWidth={2.5}
          animate={{ r:[r+8,r+22], opacity:[0.6,0] }}
          transition={{ duration:1.9, repeat:Infinity, ease:"easeOut" }}/>
      )}

      {/* Burst particles — shown on pop */}
      {popped && BURST_PTS.map((p,i)=>(
        <motion.circle key={i} cx={cx} cy={cy} r={p.r}
          fill={p.c}
          initial={{ x:0, y:0, opacity:1, scale:1 }}
          animate={{ x:p.tx, y:p.ty, opacity:0, scale:0.4 }}
          transition={{ duration:0.7, delay:i*0.014, ease:[0.16,1,0.3,1] }}/>
      ))}
      {/* Shockwave ring 1 */}
      {popped && (
        <motion.circle cx={cx} cy={cy} r={r}
          fill="none" stroke="#D4AF37" strokeWidth={3}
          initial={{ scale:1, opacity:0.9 }}
          animate={{ scale:3.2, opacity:0 }}
          transition={{ duration:0.55, ease:"easeOut" }}/>
      )}
      {/* Shockwave ring 2 */}
      {popped && (
        <motion.circle cx={cx} cy={cy} r={r}
          fill="none" stroke="#F0D060" strokeWidth={1.5}
          initial={{ scale:1, opacity:0.7 }}
          animate={{ scale:4.5, opacity:0 }}
          transition={{ duration:0.75, ease:"easeOut", delay:0.06 }}/>
      )}
      {/* Pop flash */}
      {popped && (
        <motion.circle cx={cx} cy={cy} r={r+18}
          fill="white"
          initial={{ opacity:0.85 }}
          animate={{ opacity:0 }}
          transition={{ duration:0.28 }}/>
      )}

      {/* The balloon — floats, then pops out */}
      <motion.g
        animate={popped
          ? { opacity:0 }
          : { y:[0,-13,0,9,0], rotate:[-2,2,-1,2.5,-2] }}
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

/* ══════════════════════════════════════════
   SCENE 1 — Main component
══════════════════════════════════════════ */
const S1_TWINKLES = [
  // [left%, top%, size, color, delay, duration]
  ["12%","8%",  14,"#D4AF37",0.3,2.0],  ["85%","6%",  11,"#F0D060",0.8,2.4],
  ["5%", "28%", 10,"#C9846A",1.1,1.8],  ["91%","32%", 13,"#FFF4B0",0.5,2.2],
  ["18%","42%", 9, "#D4AF37",1.6,2.6],  ["78%","48%", 12,"#E8A060",0.2,1.9],
  ["6%", "60%", 11,"#F0D060",1.9,2.1],  ["88%","62%", 10,"#D4AF37",0.7,2.3],
  ["25%","72%", 13,"#C9846A",1.3,1.7],  ["70%","70%", 9, "#FFF4B0",1.0,2.5],
  ["50%","6%",  10,"#D4AF37",2.0,2.0],  ["40%","78%", 12,"#F0D060",0.4,2.2],
  ["14%","86%", 8, "#C9846A",1.7,1.8],  ["82%","84%", 11,"#D4AF37",0.9,2.4],
] as const;

function Scene1({ onNext }: { onNext:()=>void }) {
  return (
    <motion.div key="scene1new" style={{ position:"absolute", inset:0, zIndex:10 }}
      exit={{ opacity:0 }} transition={{ duration:0.6 }}>

      {/* Full twinkle layer — same as Scene 5 */}
      <TwinkleBackground />

      {/* Extra scattered sparkles all over the screen */}
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

      {/* Handwritten "Happy Birthday" — left-to-right reveal */}
      <div style={{ position:"absolute", left:0, right:0, top:50,
        textAlign:"center", zIndex:5, pointerEvents:"none" }}>
        <motion.p style={{
          fontFamily:"'Great Vibes', cursive",
          fontWeight:400, fontSize:46, lineHeight:1.2, margin:0,
          display:"inline-block", letterSpacing:1,
          background:"linear-gradient(120deg,#C9846A,#D4AF37,#FFF4B0,#D4AF37,#C9846A)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}
          initial={{ clipPath:"inset(0 102% 0 0)" }}
          animate={{ clipPath:"inset(0 0% 0 0)" }}
          transition={{ duration:2.8, ease:"linear", delay:0.5 }}>
          Happy Birthday
        </motion.p>
        <motion.p style={{
          fontFamily:"'Playfair Display',Georgia,serif", fontStyle:"italic",
          fontSize:22, fontWeight:700, margin:"8px 0 0", letterSpacing:6, textTransform:"uppercase",
          color:"rgba(212,175,55,0.95)", display:"block",
        }}
          initial={{ opacity:0 }} animate={{ opacity:1 }}
          transition={{ delay:3.5, duration:1.0 }}>
          {name}
        </motion.p>
      </div>

      {/* Sparkles around "Happy Birthday" */}
      {(["✦","✨","✦","✨","✦","✨"] as const).map((s,i)=>{
        const positions = [
          { left:"8%",  top:"2%" },
          { left:"82%", top:"3%" },
          { left:"4%",  top:"14%"},
          { left:"88%", top:"16%"},
          { left:"22%", top:"20%"},
          { left:"68%", top:"20%"},
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

      {/* SVG canvas — gift, balloons, confetti, strings */}
      <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", zIndex:4 }}
        viewBox="0 0 390 844" preserveAspectRatio="xMidYMid meet">
        <defs>
          {S1G.map(g => (
            <radialGradient key={g.id} id={g.id} cx="34%" cy="28%" r="65%">
              <stop offset="0%"  stopColor={g.hi}/>
              <stop offset="46%" stopColor={g.mid}/>
              <stop offset="100%" stopColor={g.lo}/>
            </radialGradient>
          ))}
        </defs>

        {/* Confetti pieces */}
        {S1_CONF.map((p,i) => (
          <motion.rect key={i} x={p.x-p.s/2} y={p.y-p.s/2} width={p.s} height={p.s}
            fill={p.c} rx={i%4===0 ? p.s/2 : 1}
            initial={{ opacity:0 }}
            animate={{ opacity:[0,0.88,0.42,0.76,0], rotate:[p.r, p.r+80, p.r+180], y:[0,-6,4,-5,0] }}
            transition={{ duration:3+i*0.16, repeat:Infinity, delay:i*0.18, ease:"easeInOut" }}/>
        ))}

        {/* Small side gifts */}
        {SIDE_GIFTS.map((g,i) => <SmallGiftBox key={i} {...g}/>)}

        {/* Main gift box */}
        <GiftBoxSVG />

        {/* Bouquet balloons */}
        {BOUQUET.map((b,i) => (
          <BouquetBalloonSVG key={i} {...b}/>
        ))}

        {/* Floating tappable balloon */}
        <FloatingBalloonSVG onTap={onNext}/>
      </svg>
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   (old curtain — replaced by Scene1 above)
══════════════════════════════════════════ */
const FOLD_FABRIC = `repeating-linear-gradient(
  to right,
  #DDD4C4  0px,
  #EDE5D8  5px,
  #F8F2EA 10px,
  #FEFCF8 14px,
  #FFF9F3 17px,
  #FEFCF8 20px,
  #F4EDE4 25px,
  #E6DDD0 32px,
  #DDD4C4 40px
)`;

const CURTAIN_SPARKLES = [
  { x:"14%", y:"12%"}, { x:"72%", y:"8%" }, { x:"38%", y:"22%"},
  { x:"88%", y:"28%"}, { x:"22%", y:"42%"}, { x:"64%", y:"38%"},
  { x:"10%", y:"58%"}, { x:"82%", y:"55%"}, { x:"44%", y:"68%"},
  { x:"28%", y:"78%"}, { x:"76%", y:"72%"}, { x:"58%", y:"85%"},
];

function Curtain({ open }: { open: boolean }) {
  const panelW = 195;
  const leftSparks  = CURTAIN_SPARKLES.slice(0, 6);
  const rightSparks = CURTAIN_SPARKLES.slice(6);

  const sharedPanel = {
    position:"absolute", top:0, width:panelW, height:"100%",
    background:FOLD_FABRIC, zIndex:2,
  };

  return (
    <div style={{
      position:"absolute", left:0, top:0, width:390, height:844,
      overflow:"hidden", zIndex:5,
    }}>
      {/* LEFT PANEL */}
      <motion.div style={{ ...sharedPanel, left:0,
        boxShadow:"inset -10px 0 28px rgba(180,160,130,0.35), inset -2px 0 8px rgba(255,255,255,0.25)" }}
        animate={open ? { x:-(panelW+4), opacity:0.55 } : { x:0, opacity:1 }}
        transition={{ duration:1.1, ease:[0.4,0,0.2,1] }}>
        <motion.div style={{ position:"absolute", inset:0, pointerEvents:"none",
          background:"linear-gradient(105deg,transparent 15%,rgba(255,255,255,0.38) 42%,rgba(255,252,240,0.18) 55%,transparent 72%)" }}
          animate={{ opacity:[0.55,1,0.55] }}
          transition={{ duration:3.2, repeat:Infinity, ease:"easeInOut" }}/>
        <motion.div style={{ position:"absolute", inset:0, pointerEvents:"none",
          background:"linear-gradient(80deg,transparent 30%,rgba(212,175,55,0.13) 50%,transparent 70%)" }}
          animate={{ x:[0,10,0] }} transition={{ duration:5.5, repeat:Infinity, ease:"easeInOut" }}/>
        {leftSparks.map((sp,i) => (
          <motion.div key={i} style={{ position:"absolute", left:sp.x, top:sp.y,
            fontSize:10, color:"#C9A840", lineHeight:1, pointerEvents:"none",
            textShadow:"0 0 5px rgba(212,175,55,0.85)" }}
            animate={{ opacity:[0,1,0.2,1,0], scale:[0.5,1.2,0.7,1.1,0.5] }}
            transition={{ duration:2.5+i*0.5, repeat:Infinity, delay:i*0.7, ease:"easeInOut" }}>✦</motion.div>
        ))}
        <div style={{ position:"absolute", right:0, top:0, bottom:0, width:3,
          background:"linear-gradient(to bottom,rgba(212,180,80,0.95),rgba(200,160,40,0.5))" }}/>
      </motion.div>

      {/* RIGHT PANEL — uses left:panelW so x-transforms work correctly */}
      <motion.div style={{ ...sharedPanel, left:panelW,
        boxShadow:"inset 10px 0 28px rgba(180,160,130,0.35), inset 2px 0 8px rgba(255,255,255,0.25)" }}
        animate={open ? { x:(panelW+4), opacity:0.55 } : { x:0, opacity:1 }}
        transition={{ duration:1.1, ease:[0.4,0,0.2,1] }}>
        <motion.div style={{ position:"absolute", inset:0, pointerEvents:"none",
          background:"linear-gradient(255deg,transparent 15%,rgba(255,255,255,0.38) 42%,rgba(255,252,240,0.18) 55%,transparent 72%)" }}
          animate={{ opacity:[0.55,1,0.55] }}
          transition={{ duration:3.2, repeat:Infinity, ease:"easeInOut", delay:0.9 }}/>
        <motion.div style={{ position:"absolute", inset:0, pointerEvents:"none",
          background:"linear-gradient(280deg,transparent 30%,rgba(212,175,55,0.13) 50%,transparent 70%)" }}
          animate={{ x:[0,-10,0] }} transition={{ duration:5.5, repeat:Infinity, ease:"easeInOut" }}/>
        {rightSparks.map((sp,i) => (
          <motion.div key={i} style={{ position:"absolute", left:sp.x, top:sp.y,
            fontSize:10, color:"#C9A840", lineHeight:1, pointerEvents:"none",
            textShadow:"0 0 5px rgba(212,175,55,0.85)" }}
            animate={{ opacity:[0,1,0.2,1,0], scale:[0.5,1.2,0.7,1.1,0.5] }}
            transition={{ duration:2.5+i*0.5, repeat:Infinity, delay:i*0.7+0.4, ease:"easeInOut" }}>✦</motion.div>
        ))}
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3,
          background:"linear-gradient(to bottom,rgba(212,180,80,0.95),rgba(200,160,40,0.5))" }}/>
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
        {/* 3D candle cylinder gradients — horizontal, dark edges → bright centre */}
        <linearGradient id="cnd1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#6B2C14"/>
          <stop offset="28%"  stopColor="#E8A07A"/>
          <stop offset="52%"  stopColor="#C9846A"/>
          <stop offset="100%" stopColor="#6B2C14"/>
        </linearGradient>
        <linearGradient id="cnd2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#6B4800"/>
          <stop offset="28%"  stopColor="#F5D060"/>
          <stop offset="52%"  stopColor="#D4AF37"/>
          <stop offset="100%" stopColor="#6B4800"/>
        </linearGradient>
        <linearGradient id="cnd3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#AE9880"/>
          <stop offset="28%"  stopColor="#FFFFFF"/>
          <stop offset="52%"  stopColor="#FFF5EE"/>
          <stop offset="100%" stopColor="#AE9880"/>
        </linearGradient>
        {/* Candle top-cap radial for the flat top disc */}
        <radialGradient id="cap1" cx="35%" cy="35%" r="65%"><stop offset="0%" stopColor="#F2C0A0"/><stop offset="100%" stopColor="#8C4A30"/></radialGradient>
        <radialGradient id="cap2" cx="35%" cy="35%" r="65%"><stop offset="0%" stopColor="#FAE090"/><stop offset="100%" stopColor="#8C6A10"/></radialGradient>
        <radialGradient id="cap3" cx="35%" cy="35%" r="65%"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#C8B0A0"/></radialGradient>
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
          {/* 3D cylinder body */}
          <rect x={cx-5} y={78} width={10} height={25} rx={3} fill={`url(#cnd${i+1})`}/>
          {/* Bottom rim ellipse (shadow) */}
          <ellipse cx={cx} cy={103} rx={5} ry={2} fill={["#6B2C14","#6B4800","#AE9880"][i]} opacity={0.7}/>
          {/* Top cap disc */}
          <ellipse cx={cx} cy={78} rx={5} ry={2} fill={`url(#cap${i+1})`}/>
          {/* Wick */}
          <line x1={cx} y1={78} x2={cx} y2={73} stroke="#3B1A00" strokeWidth={1.5} strokeLinecap="round"/>
          <CandleFlame cx={cx} cy={71} blown={blown}/>
          {/* Smoke puffs — 4 staggered wisps per candle */}
          {blown && [0,1,2,3].map(j=>(
            <motion.ellipse key={j} cx={cx + (j%2===0?-4:4)} cy={72}
              rx={5+j*2.5} ry={6+j*2}
              fill={j<2?"rgba(220,215,210,0.72)":"rgba(200,195,190,0.45)"}
              initial={{ opacity:0, y:0, scaleX:0.35, x:0 }}
              animate={{
                opacity:[0, 0.72, 0.55, 0.2, 0],
                y:[0, -(22+j*16)],
                scaleX:[0.35, 1.4, 1.8, 2.2, 0.8],
                x:[0, (j%2===0?-8:8), (j%2===0?-14:14), (j%2===0?-10:10)],
              }}
              transition={{ duration:1.6+j*0.32, delay:j*0.2+i*0.06, repeat:Infinity, repeatDelay:0.15, ease:"easeOut" }}/>
          ))}
        </g>
      ))}
    </svg>
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
          const rot    = HB_ROTS[i];
          const pivot  = sy;
          // floatY = baseline; Great Vibes ascender ≈ 0.82em → top of letter at sy
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
          fontStyle:"italic", fontSize:30, lineHeight:1.3, textAlign:"center",
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

      {/* Sparkles */}
      {sparkles.map((s,i)=>(
        <motion.div key={i} style={{ position:"absolute", left:s.x, top:s.y,
          fontSize:11, color:"#D4AF37", zIndex:7, pointerEvents:"none" }}
          animate={{ opacity:[0.3,1,0.3], scale:[0.8,1.3,0.8], rotate:[0,30,0] }}
          transition={{ duration:1.8+i*0.45, repeat:Infinity, delay:i*0.38 }}>✦</motion.div>
      ))}

      {/* Heading */}
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

      {/* 3 Floating polaroids */}
      <PolaroidFrame idx={0} top={168} left={6}  rotate={-7} floatDelay={0}   imageSrc={photo1Src}/>
      <PolaroidFrame idx={1} top={341} left={34} rotate={-2} floatDelay={0.6} imageSrc={photo2Src}/>
      <PolaroidFrame idx={2} top={514} left={6}  rotate={-5} floatDelay={1.1} imageSrc={photo3Src}/>

      {/* Right-side caption */}
      <motion.div style={{ position:"absolute", right:36, top:492, width:148, textAlign:"right" }}
        initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
        transition={{ delay:0.9, duration:0.7 }}>
        <p style={{
          fontFamily:"Georgia,'Times New Roman',serif", fontStyle:"italic",
          fontSize:14, lineHeight:1.7, color:"#D4AF37",
          margin:0, textShadow:"0 0 18px rgba(212,175,55,0.35)",
        }}>Cheers to another year of fun, laughter &amp; unforgettable memories!</p>
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
/* ══════════════════════════════════════════
   SCENE 2 — Hybrid cake: 2D body + 3D candles
══════════════════════════════════════════ */
function BirthdayCakeHybrid({ blown }: { blown:boolean }) {
  const CANDLES = [
    { x:-30, top:"#F9A8D4", bot:"#BE185D", dur:0.37 },
    { x:  0, top:"#FDE68A", bot:"#B45309", dur:0.43 },
    { x: 30, top:"#C4B5FD", bot:"#6D28D9", dur:0.40 },
  ];
  const cpw = 2*5*Math.sin(Math.PI/12);
  return (
    <div style={{ position:"relative", width:280, height:250 }}>
      {/* ── 2D cake SVG body (no candles) ── */}
      <svg style={{ position:"absolute", bottom:0, left:0 }}
        width={280} height={195} viewBox="0 0 142 98">
        <defs>
          <linearGradient id="hckBot" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C9849A"/><stop offset="100%" stopColor="#8A3A50"/>
          </linearGradient>
          <linearGradient id="hckTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4909E"/><stop offset="100%" stopColor="#A05060"/>
          </linearGradient>
          <linearGradient id="hckPlate" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F0D060"/><stop offset="100%" stopColor="#B89020"/>
          </linearGradient>
        </defs>
        {/* Gold plate */}
        <ellipse cx={71} cy={96} rx={70} ry={5} fill="url(#hckPlate)" opacity={0.85}/>
        {/* Bottom tier */}
        <rect x={4} y={54} width={134} height={42} rx={8} fill="url(#hckBot)"/>
        <rect x={4} y={54} width={134} height={7} rx={4} fill="rgba(255,255,255,0.12)"/>
        <path d="M4,54 C14,43 24,54 34,46 C44,38 54,54 64,46 C74,38 84,54 98,46 C108,38 120,54 138,46"
          fill="none" stroke="#F5DDE6" strokeWidth={5} strokeLinecap="round"/>
        {[24,44,71,98,118].map((x,i) => (
          <circle key={i} cx={x} cy={74} r={3} fill="#F0D0DA" opacity={0.8}/>
        ))}
        <rect x={4} y={70} width={134} height={3} rx={1} fill="#D4AF37" opacity={0.38}/>
        {/* Top tier */}
        <rect x={26} y={22} width={90} height={36} rx={6} fill="url(#hckTop)"/>
        <rect x={26} y={22} width={90} height={5} rx={3} fill="rgba(255,255,255,0.14)"/>
        <path d="M26,22 C36,12 46,22 56,14 C66,6 76,22 86,14 C96,6 108,22 116,14"
          fill="none" stroke="#F8E8EE" strokeWidth={4} strokeLinecap="round"/>
        <rect x={26} y={38} width={90} height={3} rx={1} fill="#D4AF37" opacity={0.32}/>
      </svg>
      {/* ── 3D candles ── */}
      {CANDLES.map((cd,i)=>(
        <div key={i} style={{
          position:"absolute", width:10, height:32,
          left:"50%", top:48, marginLeft:cd.x-5,
          transformStyle:"preserve-3d", perspective:200,
        }}>
          {Array.from({length:12},(_,j)=>{
            const lit = Math.max(0.4,0.7+0.3*Math.cos((j/12)*Math.PI*2));
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
          <div style={{
            position:"absolute", width:12, height:12, borderRadius:"50%",
            background:`radial-gradient(circle at 38% 35%,#fff 15%,${cd.top} 70%)`,
            left:-1, top:-6, transformOrigin:"center bottom",
            transform:"rotateX(-90deg)",
          }}/>
          <div style={{
            position:"absolute", width:2, height:7, borderRadius:1,
            background:"#3B2000", left:4, top:-13,
          }}/>
          {!blown ? (
            <motion.div style={{
              position:"absolute", width:14, height:22, left:-2, top:-33,
              borderRadius:"50% 50% 35% 35% / 65% 65% 35% 35%",
              background:"linear-gradient(180deg,#FFFFE0 0%,#FFAA00 45%,#FF5500 100%)",
              filter:"blur(0.6px)",
              boxShadow:"0 0 14px 7px rgba(255,150,0,0.65),0 0 5px 2px rgba(255,255,100,0.5)",
            }}
              animate={{ scaleX:[1,0.5,1,0.68,1], scaleY:[1,1.22,0.86,1.18,1], rotate:[-3,3,-1,4,-3] }}
              transition={{ duration:cd.dur, repeat:Infinity, ease:"easeInOut" }}/>
          ) : (
            <motion.div style={{
              position:"absolute", width:3, height:16, left:3.5, top:-26,
              borderRadius:3, background:"rgba(220,220,220,0.45)",
            }}
              animate={{ opacity:[0.7,0], y:[0,-14,-20], scaleX:[1,2.5,0] }}
              transition={{ duration:1.4, repeat:Infinity, delay:i*0.22 }}/>
          )}
        </div>
      ))}
    </div>
  );
}

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
   SCENE 5 — Confetti + voice note + sticker
══════════════════════════════════════════ */

// Confetti piece types: 0=circle, 1=rounded-square, 2=ribbon, 3=wide-oval
// Vibrant confetti palette
const CC = ["#FF6BB5","#FF9B45","#60E8C0","#60C8F0","#D4AF37","#C9846A","#F0D060","#C060F0","#FF4E8A","#FFF4B0"];

const S5_CL = [
  {x:130,y:200,c:CC[0], s:14,t:0,r:40, d:0.55},{x:210,y:150,c:CC[4], s:12,t:1,r:-55,d:0.60},
  {x:80, y:290,c:CC[2], s:8, t:2,r:70, d:0.57},{x:270,y:120,c:CC[1], s:16,t:0,r:-30,d:0.63},
  {x:160,y:370,c:CC[5], s:13,t:1,r:45, d:0.51},{x:55, y:250,c:CC[6], s:10,t:3,r:-65,d:0.67},
  {x:235,y:300,c:CC[3], s:15,t:0,r:85, d:0.55},{x:115,y:430,c:CC[8], s:9, t:2,r:-75,d:0.69},
  {x:300,y:190,c:CC[9], s:14,t:1,r:52, d:0.61},{x:185,y:470,c:CC[7], s:11,t:3,r:-28,d:0.63},
  {x:75, y:195,c:CC[4], s:12,t:0,r:90, d:0.52},{x:255,y:255,c:CC[0], s:16,t:1,r:-80,d:0.65},
  {x:145,y:335,c:CC[2], s:8, t:2,r:62, d:0.58},{x:330,y:145,c:CC[1], s:13,t:3,r:-42,d:0.71},
  {x:195,y:415,c:CC[6], s:15,t:0,r:38, d:0.60},{x:96, y:355,c:CC[3], s:11,t:1,r:-58,d:0.56},
  {x:175,y:510,c:CC[5], s:10,t:3,r:25, d:0.74},{x:310,y:330,c:CC[8], s:14,t:0,r:-35,d:0.53},
];
const S5_CR = S5_CL.map(p=>({...p, x:-p.x}));

// Waveform bar heights (static seed, 24 bars)
const WAVE_H = [14,28,20,38,16,44,22,36,18,32,30,46,14,38,24,42,16,28,26,40,18,34,22,30,14,44];

function VoiceNote({ onDone }: { onDone:()=>void }) {
  const [playing, setPlaying] = useState(false);
  const [secs, setSecs]       = useState(0);
  const [done, setDone]       = useState(false);
  const TOTAL = 8;

  useEffect(() => {
    if (!playing || done) return;
    const iv = setInterval(() => {
      setSecs(s => {
        if (s + 1 >= TOTAL) {
          setPlaying(false); setDone(true); onDone();
          clearInterval(iv); return TOTAL;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [playing, done, onDone]);

  const pct  = done ? 100 : (secs / TOTAL) * 100;
  const fmt  = (n: number) => `0:${String(n).padStart(2,"0")}`;

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:12,
      background:"rgba(255,255,255,0.07)", backdropFilter:"blur(12px)",
      border:"1px solid rgba(212,175,55,0.28)", borderRadius:50,
      padding:"10px 16px 10px 10px",
    }}>
      {/* Play / pause */}
      <motion.button
        onClick={() => { if (!done) setPlaying(p => !p); }}
        whileTap={{ scale:0.88 }}
        style={{
          width:46, height:46, borderRadius:"50%", flexShrink:0,
          background:"linear-gradient(135deg,#C4913A,#D4AF37,#F0D060)",
          border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:20, color:"#1c0a06", boxShadow:"0 2px 10px rgba(212,175,55,0.4)",
        }}>
        {playing ? "⏸" : "▶"}
      </motion.button>

      {/* Waveform */}
      <div style={{ flex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:2, height:40 }}>
          {WAVE_H.map((h,i) => {
            const filled = pct >= (i / WAVE_H.length) * 100;
            return (
              <motion.div key={i}
                style={{
                  flex:1, borderRadius:3,
                  background: filled
                    ? "linear-gradient(180deg,#F0D060,#C4913A)"
                    : "rgba(255,255,255,0.18)",
                }}
                animate={{ height: playing ? [h*0.4, h, h*0.55, h*0.85, h*0.4] : h*0.45 }}
                transition={{
                  duration: 0.45 + (i%5)*0.12,
                  repeat: playing ? Infinity : 0,
                  delay: i*0.022,
                  ease:"easeInOut",
                  repeatType:"mirror",
                }}/>
            );
          })}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
          <span style={{ fontSize:9, color:"rgba(212,175,55,0.75)", fontFamily:"monospace" }}>
            {fmt(secs)}
          </span>
          <span style={{ fontSize:9, color:"rgba(255,255,255,0.28)", fontFamily:"monospace" }}>
            {fmt(TOTAL)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Emoji orbs with floating + message below ── */
const EMOJI_ORBS = [
  { emoji:"💗", msg:"You're loved more than words can say! 🌸" },
  { emoji:"⭐", msg:"You shine brighter than all the stars! ✨" },
  { emoji:"🥂", msg:"Here's to you & all your dreams coming true! 🎉" },
];

function EmojiOrbs() {
  const [active, setActive] = useState<number|null>(null);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
      {/* Orbs row — each floats independently */}
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
              style={{
                width:56, height:56, borderRadius:"50%",
                border:"1px solid rgba(212,175,55,0.3)",
                backdropFilter:"blur(10px)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:27, cursor:"pointer",
              }}>
              {o.emoji}
            </motion.button>
          </motion.div>
        ))}
      </div>
      {/* Message below — swaps with AnimatePresence */}
      <div style={{ minHeight:44, display:"flex", alignItems:"center", justifyContent:"center", width:"100%" }}>
        <AnimatePresence mode="wait">
          {active !== null && (
            <motion.p key={active}
              initial={{ opacity:0, y:6, scale:0.94 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:-4, scale:0.94 }}
              transition={{ duration:0.24 }}
              style={{
                margin:0, fontSize:12.5, lineHeight:1.55,
                textAlign:"center",
                fontFamily:"Georgia,'Times New Roman',serif", fontStyle:"italic",
                color:"rgba(255,241,220,0.92)",
                background:"rgba(28,10,6,0.72)",
                border:"1px solid rgba(212,175,55,0.28)",
                borderRadius:12, padding:"8px 16px",
                backdropFilter:"blur(8px)",
              }}>
              {EMOJI_ORBS[active].msg}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Scene5({ onNext }: { onNext:()=>void }) {
  return (
    <motion.div key="scene5new"
      style={{ position:"absolute", inset:0, zIndex:12,
        background:"linear-gradient(160deg,#0e0502 0%,#1c0a06 55%,#130604 100%)" }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.6 }}>

      <TwinkleBackground />

      {/* ── Confetti cannons from top corners ── */}
      {[...S5_CL.map((p,i)=>({...p,side:0,i})), ...S5_CR.map((p,i)=>({...p,side:1,i}))].map(p=>{
        const ox = p.side===0 ? 0 : 390;
        // shape dimensions
        const w = p.t===2 ? p.s*0.45 : p.t===3 ? p.s*1.5 : p.s;
        const h = p.t===2 ? p.s*2.8  : p.t===3 ? p.s*0.6  : p.s;
        const br= p.t===0 ? "50%" : p.t===2 ? p.s*0.2 : p.t===3 ? "50%" : p.s*0.22;
        return (
          <motion.div key={`c${p.side}${p.i}`}
            style={{
              position:"absolute", left:ox, top:0,
              width:w, height:h,
              borderRadius:br,
              background:p.c,
              pointerEvents:"none", zIndex:28,
              boxShadow:`0 0 4px ${p.c}88`,
            }}
            initial={{ x:0, y:0, opacity:0, rotate:0, scale:0.4 }}
            animate={{ x:p.x, y:p.y, opacity:[0,1,1,0.7,0], rotate:p.r, scale:[0.4,1,1,0.9,0.7] }}
            transition={{ duration:2.4, delay:p.d, ease:[0.2,1,0.4,1] }}/>
        );
      })}

      {/* ── Wish text ── */}
      <motion.p style={{
        position:"absolute", top:95, left:22, right:22,
        textAlign:"center", margin:0,
        fontFamily:"Georgia,'Times New Roman',serif", fontStyle:"italic", fontSize:17,
        lineHeight:1.55,
        background:"linear-gradient(120deg,#C9846A,#D4AF37,#FFF4B0,#D4AF37)",
        WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        zIndex:8, letterSpacing:0.4,
      }}
        initial={{ opacity:0 }} animate={{ opacity:1 }}
        transition={{ delay:0.5, duration:0.6 }}>
        The world is so lucky to have you in it. Wishing you all the happiness you deserve. May all your wishes come true!
      </motion.p>

      {/* ── Emoji orbs + message ── */}
      <motion.div style={{ position:"absolute", top:210, left:20, right:20, zIndex:22 }}
        initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:0.7, duration:0.55 }}>
        <EmojiOrbs />
      </motion.div>

      {/* ── Voice note + always-on arrow ── */}
      <motion.div style={{
        position:"absolute", top:340, left:20, right:20, zIndex:12,
        display:"flex", alignItems:"center", gap:10,
      }}
        initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:0.88, duration:0.55 }}>
        <div style={{ flex:1 }}>
          <VoiceNote onDone={() => {}}/>
        </div>
        {/* Arrow — always lit */}
        <motion.button
          onClick={onNext}
          style={{
            width:50, height:50, borderRadius:"50%", flexShrink:0,
            background:"linear-gradient(135deg,#C4913A,#D4AF37)",
            color:"#1c0a06", border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:22, boxShadow:"0 4px 18px rgba(212,175,55,0.5)",
          }}
          whileHover={{ scale:1.1 }}
          whileTap={{ scale:0.92 }}>
          →
        </motion.button>
      </motion.div>

      {/* ── Photo sticker — covers lower half, bottom-pinned ── */}
      <motion.div style={{
        position:"absolute", top:"50%", bottom:0,
        left:0, right:0, zIndex:10,
        display:"flex", alignItems:"flex-end", justifyContent:"center",
        overflow:"hidden",
      }}
        initial={{ opacity:0, y:30 }}
        animate={{ opacity:1, y:0 }}
        transition={{ delay:0.42, duration:0.85, ease:[0.34,1.56,0.64,1] }}>
        <img src={photo1StickerSrc} alt=""
          style={{
            height:"100%", width:"auto", maxWidth:"100%", display:"block",
            filter:"drop-shadow(0 0 5px white) drop-shadow(0 0 4px rgba(255,255,255,0.75)) drop-shadow(0 5px 20px rgba(0,0,0,0.6))",
          }}/>
      </motion.div>

    </motion.div>
  );
}

/* ══════════════════════════════════════════
   SCENE 6 — Personal message card + share sheet
══════════════════════════════════════════ */
const CUSTOM_MSG =
  `Priya, wishing you the most magical birthday! You mean the world to us and deserve every bit of happiness life has to offer. Here's to you and the beautiful year ahead! 🎉✨`;

function Scene6({ onReplay }: { onReplay:()=>void }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSheetOpen(true), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div key="scene6"
      style={{ position:"absolute", inset:0, zIndex:12,
        background:"linear-gradient(160deg,#0e0502 0%,#1c0a06 55%,#130604 100%)" }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.6 }}>

      <TwinkleBackground />

      {/* Replay pill */}
      <motion.button onClick={onReplay}
        style={{
          position:"absolute", top:52, left:20, zIndex:20,
          background:"rgba(212,175,55,0.07)", border:"1px solid rgba(212,175,55,0.22)",
          borderRadius:20, padding:"7px 16px",
          fontSize:11, color:"rgba(212,175,55,0.65)",
          fontFamily:"sans-serif", letterSpacing:1.2, cursor:"pointer",
        }}
        whileTap={{ scale:0.94 }}>
        ↺ Replay
      </motion.button>

      {/* Floating message card */}
      <motion.div
        style={{
          position:"absolute", top:108, left:"50%", marginLeft:-153,
          width:306,
          background:"linear-gradient(148deg,rgba(212,175,55,0.09) 0%,rgba(201,132,106,0.05) 100%)",
          border:"1.5px solid rgba(212,175,55,0.32)",
          borderRadius:24,
          backdropFilter:"blur(18px)",
          boxShadow:"0 8px 48px rgba(0,0,0,0.55), inset 0 0 32px rgba(212,175,55,0.04)",
          padding:"26px 22px 26px",
          zIndex:15, display:"flex", flexDirection:"column", alignItems:"center",
        }}
        initial={{ opacity:0, scale:0.84, rotate:-2 }}
        animate={{ opacity:1, scale:1, rotate:0 }}
        transition={{ delay:0.3, duration:0.75, ease:[0.34,1.56,0.64,1] }}>

        {/* Corner emoji accents */}
        {([
          {top:10, left:12,  e:"🌸"},
          {top:10, right:12, e:"✨"},
          {bottom:12, left:12,  e:"💛"},
          {bottom:12, right:12, e:"🎂"},
        ] as React.CSSProperties[]).map((c,i)=>(
          <motion.span key={i}
            style={{ position:"absolute", fontSize:13, ...c }}
            animate={{ rotate:[0,10,-8,5,0], scale:[1,1.15,0.95,1.1,1] }}
            transition={{ duration:3+i*0.5, repeat:Infinity, delay:i*0.7 }}>
            {(c as any).e}
          </motion.span>
        ))}

        {/* Top ornament */}
        <div style={{ width:44, height:2, borderRadius:1, marginBottom:18,
          background:"linear-gradient(90deg,transparent,#D4AF37,transparent)" }}/>

        {/* Recipient name */}
        <motion.p style={{
          margin:"0 0 4px", textAlign:"center",
          fontFamily:"'Great Vibes',cursive", fontSize:30,
          background:"linear-gradient(120deg,#C9846A,#D4AF37,#FFF4B0)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}
          initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.65, duration:0.6 }}>
          Hey {name}! 💛
        </motion.p>

        {/* Thin rule */}
        <div style={{ width:72, height:1, background:"rgba(212,175,55,0.28)", marginBottom:18 }}/>

        {/* Custom message */}
        <motion.p style={{
          margin:0, fontSize:13.5, lineHeight:1.78, textAlign:"center",
          fontFamily:"Georgia,'Times New Roman',serif", fontStyle:"italic",
          color:"rgba(255,241,220,0.86)", letterSpacing:0.3,
        }}
          initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.85, duration:0.7 }}>
          {CUSTOM_MSG}
        </motion.p>

        {/* Bottom ornament */}
        <div style={{ width:40, height:1.5, borderRadius:1, marginTop:22,
          background:"linear-gradient(90deg,transparent,#D4AF37,transparent)" }}/>
      </motion.div>

      {/* Continuous card float */}
      {/* (applied via nested wrapper below) */}

      {/* ── Auto-popup bottom share sheet ── */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            initial={{ y:"100%" }}
            animate={{ y:0 }}
            exit={{ y:"100%" }}
            transition={{ type:"spring", stiffness:260, damping:28 }}
            style={{
              position:"absolute", bottom:0, left:0, right:0, zIndex:30,
              background:"linear-gradient(175deg,#1c0804 0%,#0e0502 100%)",
              borderTop:"1.5px solid rgba(212,175,55,0.32)",
              borderRadius:"24px 24px 0 0",
              padding:"18px 24px 38px",
              boxShadow:"0 -10px 48px rgba(0,0,0,0.65)",
            }}>

            {/* Pull handle */}
            <div style={{ width:40, height:4, borderRadius:2, margin:"0 auto 20px",
              background:"rgba(212,175,55,0.28)" }}/>

            {/* Sheet headline */}
            <motion.p style={{
              margin:"0 0 5px", textAlign:"center",
              fontFamily:"'Great Vibes',cursive", fontSize:26,
              background:"linear-gradient(120deg,#C9846A,#D4AF37,#FFF4B0)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              transition={{ delay:0.1 }}>
              Make {name} smile ❤️
            </motion.p>
            <p style={{
              margin:"0 0 22px", fontSize:12, textAlign:"center",
              color:"rgba(255,241,220,0.45)", fontFamily:"sans-serif",
            }}>
              Your card is ready — send it now!
            </p>

            {/* Share buttons */}
            <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
              {[
                { label:"Share on WhatsApp", icon:"💬", bg:"linear-gradient(135deg,#25D366,#128C7E)", color:"#fff", border:"none" },
                { label:"Share on Instagram", icon:"📸", bg:"linear-gradient(135deg,#E1306C,#833AB4)", color:"#fff", border:"none" },
                { label:"Copy Link", icon:"🔗", bg:"transparent", color:"#D4AF37", border:"1.5px solid rgba(212,175,55,0.38)" },
              ].map((b,i) => (
                <motion.button key={i}
                  style={{
                    width:"100%", padding:"14px",
                    borderRadius:14, border:b.border,
                    background:b.bg, color:b.color,
                    fontSize:14, fontWeight:600,
                    fontFamily:"sans-serif", cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:9,
                  }}
                  initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
                  transition={{ delay:0.15 + i*0.08 }}
                  whileTap={{ scale:0.97 }}>
                  <span style={{ fontSize:16 }}>{b.icon}</span> {b.label}
                </motion.button>
              ))}
            </div>

            <motion.button onClick={() => setSheetOpen(false)}
              style={{
                marginTop:14, width:"100%", padding:"10px",
                background:"none", border:"none",
                color:"rgba(255,255,255,0.28)", fontSize:12,
                fontFamily:"sans-serif", cursor:"pointer",
              }}
              whileTap={{ scale:0.96 }}>
              Dismiss
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
export function BirthdayDoor() {
  const [scene,      setScene]      = useState<1|2|3|4|5|6>(1);
  const [confetti,   setConfetti]   = useState(false);
  const [cakePhase,  setCakePhase]  = useState<"cta"|"counting"|"blown">("cta");
  const [countdown,  setCountdown]  = useState(3);
  const [blown,      setBlown]      = useState(false);
  const [flyUp,      setFlyUp]      = useState(false);

  const cfPieces = Array.from({ length:55 }, (_,i) => ({
    id:i, x:(i*18.7)%100, color:P[i%P.length].c, delay:i*0.065,
  }));

  function handleBlow() {
    setCakePhase("counting");
    setCountdown(3);
    setTimeout(() => setCountdown(2), 800);
    setTimeout(() => setCountdown(1), 1600);
    setTimeout(() => { setCakePhase("blown"); setBlown(true); setConfetti(true); setFlyUp(true); }, 2400);
    setTimeout(() => setConfetti(false), 5200);
    setTimeout(() => setScene(4), 6200);
  }
  function handleReplay() {
    setScene(1); setConfetti(false); setBlown(false); setFlyUp(false);
    setCakePhase("cta"); setCountdown(3);
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

      {/* ══ SCENE 1 : BIRTHDAY GREETING ══ */}
      <AnimatePresence>
        {scene === 1 && <Scene1 onNext={() => setScene(2)} />}
      </AnimatePresence>

      {/* ══ SCENE 2 : CAKE ══ */}
      <AnimatePresence>
        {scene === 2 && (
          <motion.div key="scene2"
            style={{ position:"absolute", inset:0, zIndex:12, display:"flex", flexDirection:"column", alignItems:"center" }}
            initial={{ opacity:0, scale:0.9 }}
            animate={{ opacity:1, scale:1 }}
            transition={{ duration:0.55, ease:[0.34,1.56,0.64,1] }}>

            <TwinkleBackground />
            <BunchBalloons flyUp={flyUp} />

            {/* "Make a Wish" headline */}
            <motion.h1
              style={{
                position:"absolute", top:52, left:0, right:0, textAlign:"center",
                fontFamily:"'Great Vibes', cursive",
                fontSize:44, lineHeight:1,
                background:"linear-gradient(120deg,#C9846A,#D4AF37,#FFF4B0,#D4AF37,#C9846A)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                margin:0, pointerEvents:"none",
              }}
              initial={{ opacity:0, y:-16 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay:0.2, duration:0.6 }}>
              Make a Wish ✨
            </motion.h1>

            {/* Cake — entrance pop then continuous float */}
            <motion.div style={{
                position:"absolute",
                left:"50%", marginLeft:-152,
                top: 200,
                width:304, height:304,
              }}
              initial={{ scale:0.1, opacity:0 }}
              animate={{ scale:1, opacity:1 }}
              transition={{ delay:0.3, duration:0.7, ease:[0.34,1.56,0.64,1] }}>
              <motion.div style={{ width:"100%", height:"100%" }}
                animate={{ y:[0,-9,0,6,0] }}
                transition={{ duration:3.6, repeat:Infinity, ease:"easeInOut", delay:1.2 }}>
                <Cake blown={blown} />
              </motion.div>
            </motion.div>

            {/* CTA */}
            <AnimatePresence>
              {cakePhase === "cta" && (
                <motion.div key="cta-wrap"
                  style={{ position:"absolute", top:510, left:0, right:0, display:"flex", justifyContent:"center" }}
                  initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
                  exit={{ opacity:0, y:-10 }} transition={{ delay:0.7 }}>
                  <motion.button onClick={handleBlow}
                    style={{
                      background:"rgba(212,175,55,0.1)",
                      border:"1.5px solid rgba(212,175,55,0.55)",
                      borderRadius:32, padding:"13px 32px",
                      color:"#F0D060", fontSize:14, letterSpacing:2,
                      textTransform:"uppercase", fontFamily:"sans-serif",
                      cursor:"pointer", whiteSpace:"nowrap",
                    }}
                    whileHover={{ background:"rgba(212,175,55,0.22)", scale:1.04 }}>
                    🕯️ Blow the Candles
                  </motion.button>
                </motion.div>
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
        {scene === 5 && <Scene5 onNext={() => setScene(6)} />}
      </AnimatePresence>

      {/* ══ SCENE 6 : MESSAGE CARD + SHARE SHEET ══ */}
      <AnimatePresence>
        {scene === 6 && <Scene6 onReplay={handleReplay} />}
      </AnimatePresence>
    </div>
  );
}
