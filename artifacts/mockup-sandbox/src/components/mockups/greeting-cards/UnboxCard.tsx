/**
 * UnboxCard — Gift Unbox, 3D Cinematic Reveal
 *
 * Phase 1 (0–1.3s):  Camera dolly-in toward the envelope (z-depth + scale)
 * Phase 2 (1.3–2.3s): Spring flap opens — rose flower seal twists, petals float
 * Phase 3 (2.0–3.2s): Luxury blush card slides out, envelope dissolves
 * Post-reveal:         Photo ring glow, shimmer, word-stagger, petals continue
 *
 * Palette: deep plum room · blush parchment envelope · pearl-blush inner card
 */
import { motion, useAnimation } from "framer-motion";
import { useEffect, useState } from "react";

/* ─── Floating petal particles ──────────────────────── */
const PETALS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  size: 9 + (i % 4) * 5,
  left: 4 + (i * 4.9) % 90,
  duration: 9 + (i % 5) * 2.2,
  delay: (i * 0.55) % 8,
  drift: i % 2 === 0 ? 22 : -22,
  rotate: (i * 47) % 360,
  opacity: 0.22 + (i % 4) * 0.1,
}));
const PETAL_COLORS = [
  "#fda4af", "#fb7185", "#f9a8d4",
  "#f472b6", "#fce7f3", "#fbcfe8",
  "#fecdd3", "#ff6b8a",
];

/* ─── Rose petal SVG ─────────────────────────────────── */
function PetalSVG({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      {[0, 72, 144, 216, 288].map((deg, i) => (
        <ellipse key={i}
          cx={8} cy={4.6} rx={1.9} ry={3.4}
          fill={i % 2 === 0 ? color : color + "bb"}
          transform={`rotate(${deg} 8 8)`}
        />
      ))}
      <circle cx={8} cy={8} r={2} fill="rgba(220,60,90,0.75)" />
      <circle cx={8} cy={8} r={0.9} fill="rgba(255,200,215,0.9)" />
    </svg>
  );
}

/* ─── Floating petals layer ──────────────────────────── */
function FloatingPetals({ startDelay = 0 }: { startDelay?: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {PETALS.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: "absolute",
            left: p.left + "%",
            bottom: "-10%",
          }}
          initial={{ opacity: 0, y: 0, x: 0, rotate: p.rotate }}
          animate={{
            opacity: [0, p.opacity, p.opacity, 0],
            y: [0, -(320 + p.size * 10)],
            x: [0, p.drift, p.drift * 0.5, p.drift * 1.3],
            rotate: [p.rotate, p.rotate + 180],
          }}
          transition={{
            duration: p.duration,
            delay: startDelay + p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <PetalSVG size={p.size} color={PETAL_COLORS[p.id % PETAL_COLORS.length]} />
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Rose flower seal ───────────────────────────────── */
function FlowerSeal() {
  return (
    <svg width={36} height={36} viewBox="0 0 100 100">
      {/* 8 petals arranged in a circle */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <ellipse key={i}
          cx={50} cy={23} rx={10} ry={19}
          fill={i % 2 === 0 ? "rgba(244,63,94,0.88)" : "rgba(251,113,133,0.72)"}
          transform={`rotate(${deg} 50 50)`}
        />
      ))}
      {/* Center circles */}
      <circle cx={50} cy={50} r={15} fill="rgba(205,25,65,0.95)" />
      <circle cx={50} cy={50} r={8}  fill="rgba(255,175,195,0.85)" />
      <circle cx={50} cy={50} r={3}  fill="rgba(255,230,235,0.95)" />
    </svg>
  );
}

/* ─── Stamp ──────────────────────────────────────────── */
function StampSVG() {
  return (
    <div style={{
      width: 36, height: 42,
      background: "#fff8fa",
      borderRadius: 2,
      border: "1px solid rgba(200,140,160,0.4)",
      boxShadow: "1px 1px 4px rgba(0,0,0,0.18)",
      padding: 3,
      flexShrink: 0,
    }}>
      <div style={{
        width: "100%", height: "100%",
        border: "1px dashed rgba(200,120,140,0.55)",
        borderRadius: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 2,
      }}>
        {/* Mini flower stamp art */}
        <svg width={12} height={12} viewBox="0 0 100 100">
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <ellipse key={i}
              cx={50} cy={26} rx={9} ry={17}
              fill={i % 2 === 0 ? "#fb7185" : "#fda4af"}
              transform={`rotate(${deg} 50 50)`}
            />
          ))}
          <circle cx={50} cy={50} r={12} fill="#e11d48" />
        </svg>
        <span style={{
          fontFamily: "monospace", fontSize: 4.5,
          color: "rgba(120,50,70,0.65)", letterSpacing: "0.04em",
        }}>♥ 5.00</span>
      </div>
    </div>
  );
}

/* ─── Postmark ───────────────────────────────────────── */
function PostmarkSVG() {
  return (
    <svg width={36} height={36} viewBox="0 0 36 36" style={{ opacity: 0.5 }}>
      <defs>
        <path id="ucpm-arc" d="M 4,18 A 14,14 0 0,1 32,18" />
      </defs>
      <circle cx={18} cy={18} r={14} fill="none" stroke="rgba(160,60,90,0.55)" strokeWidth={1.4} />
      <line x1={10} y1={15} x2={26} y2={15} stroke="rgba(160,60,90,0.4)" strokeWidth={0.85} />
      <line x1={10} y1={18} x2={26} y2={18} stroke="rgba(160,60,90,0.4)" strokeWidth={0.85} />
      <line x1={10} y1={21} x2={26} y2={21} stroke="rgba(160,60,90,0.4)" strokeWidth={0.85} />
      <text fontSize={4} fill="rgba(160,60,90,0.6)" fontFamily="monospace">
        <textPath href="#ucpm-arc" startOffset="50%" textAnchor="middle">
          HEARTSYNC
        </textPath>
      </text>
    </svg>
  );
}

/* ─── Cherry blossom divider ─────────────────────────── */
function CherryBlossomDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, marginTop: 8 }}>
      <div style={{
        width: 38, height: 1,
        background: "linear-gradient(to right, transparent, rgba(210,120,150,0.5))",
      }} />
      <svg width={16} height={16} viewBox="0 0 16 16">
        {[0, 72, 144, 216, 288].map((deg, i) => (
          <ellipse key={i} cx={8} cy={4.8} rx={2} ry={3.4}
            fill={i % 2 === 0 ? "rgba(255,160,185,0.9)" : "rgba(240,120,150,0.8)"}
            transform={`rotate(${deg} 8 8)`}
          />
        ))}
        <circle cx={8} cy={8} r={2.2} fill="rgba(210,40,70,0.9)" />
        <circle cx={8} cy={8} r={0.9} fill="rgba(255,210,225,0.95)" />
      </svg>
      <div style={{
        width: 38, height: 1,
        background: "linear-gradient(to left, transparent, rgba(210,120,150,0.5))",
      }} />
    </div>
  );
}

/* ─── Camera icon ────────────────────────────────────── */
function CameraIcon() {
  return (
    <svg width={18} height={15} viewBox="0 0 18 15" fill="none">
      <rect x={0.6} y={2.8} width={16.8} height={11.4} rx={1.8}
        stroke="rgba(190,100,130,0.55)" strokeWidth={1.1} />
      <circle cx={9} cy={8.5} r={3.2}
        stroke="rgba(190,100,130,0.55)" strokeWidth={1.1} />
      <path d="M6 0.7 h6 a0.6 0.6 0 0 1 0.6 0.6 v1.5 H5.4 V1.3 A0.6 0.6 0 0 1 6 0.7z"
        stroke="rgba(190,100,130,0.5)" strokeWidth={1} fill="none" />
      <circle cx={14.2} cy={5} r={0.9} fill="rgba(190,100,130,0.45)" />
    </svg>
  );
}

/* ─── Rose-gold double-line SVG border ───────────────── */
function RoseBorder({ w, h }: { w: number; h: number }) {
  const o = 13;
  const inn = 18;
  return (
    <svg
      width={w} height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <rect x={o} y={o} width={w - o * 2} height={h - o * 2}
        fill="none" stroke="rgba(210,130,155,0.55)" strokeWidth={0.9} />
      <rect x={inn} y={inn} width={w - inn * 2} height={h - inn * 2}
        fill="none" stroke="rgba(230,155,175,0.3)" strokeWidth={0.7} />
      {/* Rose-gold corner diamonds */}
      {[
        [o, o], [w - o, o], [o, h - o], [w - o, h - o]
      ].map(([cx, cy], idx) => (
        <polygon key={idx}
          points={`${cx},${cy - 3.5} ${cx + 3.5},${cy} ${cx},${cy + 3.5} ${cx - 3.5},${cy}`}
          fill="rgba(215,130,155,0.6)"
        />
      ))}
    </svg>
  );
}

/* ─── Dot-grid address decoration ───────────────────── */
function DotGrid() {
  const dots = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      dots.push(
        <circle key={`${r}-${c}`}
          cx={c * 4} cy={r * 4} r={0.8}
          fill="rgba(160,70,100,0.4)"
        />
      );
    }
  }
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" style={{ marginRight: 5, flexShrink: 0 }}>
      {dots}
    </svg>
  );
}

/* ─── Message variants ───────────────────────────────── */
const MSG_WORDS = "Every moment with you feels like a dream come true".split(" ");
const wordCont = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 3.0 } },
};
const wordVar = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════ */
export function UnboxCard() {
  const envCtrl     = useAnimation();
  const sealCtrl    = useAnimation(); // flower glow / filter
  const sealRotCtrl = useAnimation(); // spring rotation
  const [shimmerKey, setShimmerKey] = useState(0);

  /* ── Animation sequence ── */
  useEffect(() => {
    async function run() {
      // Phase 1: dolly-in — z-depth + scale
      envCtrl.start({
        scale: 1, opacity: 1, z: 0,
        transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] },
      });

      // Seal rotation tied to flap open
      sealRotCtrl.start({
        rotate: -8,
        transition: { type: "spring", damping: 10, stiffness: 100, delay: 1.3 },
      });

      // Flower seal petal-glow loop
      sealCtrl.start({
        filter: [
          "drop-shadow(0 0 2px rgba(244,63,94,0.0))",
          "drop-shadow(0 0 12px rgba(244,63,94,0.75)) drop-shadow(0 0 24px rgba(251,113,133,0.4))",
          "drop-shadow(0 0 2px rgba(244,63,94,0.0))",
        ],
        transition: { duration: 3.0, repeat: Infinity, ease: "easeInOut" },
      });

      // Dissolve envelope at t=2.5s
      await new Promise(r => setTimeout(r, 2500));
      await envCtrl.start({
        opacity: 0, scale: 0.95, y: 14,
        transition: { duration: 0.42, ease: "easeIn" },
      });
    }
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Shimmer repeat ── */
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const first = setTimeout(() => {
      setShimmerKey(k => k + 1);
      interval = setInterval(() => setShimmerKey(k => k + 1), 6000);
    }, 3800);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "#0d0509" }}
    >
      {/* Scene container — perspective for z-depth dolly */}
      <div
        className="relative overflow-hidden"
        style={{
          width: 340, height: 420,
          borderRadius: 22,
          background: "#110609",
          boxShadow: "0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,150,180,0.06)",
          perspective: 700,
          perspectiveOrigin: "50% 60%",
        }}
      >

        {/* ══ LAYER B: Blush luxury inner card (z=10) ══ */}
        <motion.div
          style={{ position: "absolute", inset: 0, zIndex: 10 }}
          initial={{ y: 90, scale: 0.9, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 18, stiffness: 120, delay: 2.0 }}
        >
          {/* Blush ivory background */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(148deg, #fff8f8 0%, #fdf0f2 35%, #f8e8eb 100%)",
          }} />

          {/* Subtle petals on card background (very faint) */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.35, zIndex: 1 }}>
            <FloatingPetals startDelay={2.8} />
          </div>

          {/* Paper grain */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.03, pointerEvents: "none", zIndex: 2 }}>
            <filter id="ucpapergrain">
              <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" result="noise" />
              <feColorMatrix type="saturate" values="0" in="noise" />
            </filter>
            <rect width="100%" height="100%" filter="url(#ucpapergrain)" />
          </svg>

          {/* Rose-gold double-line border */}
          <div style={{ position: "absolute", inset: 0, zIndex: 3 }}>
            <RoseBorder w={340} h={420} />
          </div>

          {/* Shimmer sweep */}
          {shimmerKey > 0 && (
            <motion.div
              key={shimmerKey}
              style={{
                position: "absolute", top: 0, bottom: 0,
                width: "55%",
                background: "linear-gradient(108deg, transparent 30%, rgba(255,230,235,0.55) 50%, transparent 70%)",
                pointerEvents: "none", zIndex: 8,
              }}
              initial={{ x: "-100%" }}
              animate={{ x: "280%" }}
              transition={{ duration: 0.85, ease: "easeInOut" }}
            />
          )}

          {/* ── Card content ── */}
          <div style={{
            position: "relative", zIndex: 5,
            height: "100%",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "28px 32px",
          }}>

            {/* Photo circle */}
            <motion.div
              style={{ position: "relative", marginBottom: 10 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 2.3, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {/* Outer rose-gold ring */}
              <motion.div
                style={{
                  width: 98, height: 98, borderRadius: "50%",
                  border: "2px solid rgba(215,120,145,0.7)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                animate={{
                  boxShadow: [
                    "0 0 0px rgba(240,120,150,0)",
                    "0 0 22px rgba(240,120,150,0.5)",
                    "0 0 0px rgba(240,120,150,0)",
                  ]
                }}
                transition={{ duration: 3.5, repeat: Infinity, delay: 3.2, ease: "easeInOut" }}
              >
                {/* Pearl inner ring */}
                <div style={{
                  width: 88, height: 88, borderRadius: "50%",
                  border: "1.5px solid rgba(255,220,230,0.9)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "linear-gradient(135deg, #fceef2 0%, #fdf5f6 50%, #f8e8ec 100%)",
                  flexDirection: "column", gap: 4,
                }}>
                  <CameraIcon />
                  <span style={{
                    fontSize: 6.5, letterSpacing: "0.22em", textTransform: "uppercase",
                    color: "rgba(190,80,110,0.7)", fontFamily: "sans-serif",
                    fontWeight: 500,
                  }}>
                    add photo
                  </span>
                </div>
              </motion.div>
            </motion.div>

            {/* Cherry blossom divider */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 2.5, ease: "easeOut" }}
            >
              <CherryBlossomDivider />
            </motion.div>

            {/* Name */}
            <motion.h2
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 33, fontWeight: 600,
                color: "#4a1c2c",
                letterSpacing: "0.025em",
                lineHeight: 1,
                marginBottom: 14,
              }}
              initial={{ opacity: 0, y: 9 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 2.6, ease: "easeOut" }}
            >
              Priya
            </motion.h2>

            {/* Message — word stagger */}
            <motion.p
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 12.5, fontStyle: "italic",
                color: "rgba(100,40,60,0.72)",
                lineHeight: 1.78, textAlign: "center",
                maxWidth: 228,
              }}
              variants={wordCont}
              initial="hidden"
              animate="show"
            >
              {MSG_WORDS.map((w, i) => (
                <motion.span key={i} variants={wordVar} style={{ display: "inline" }}>
                  {w}{i < MSG_WORDS.length - 1 ? " " : ""}
                </motion.span>
              ))}
            </motion.p>
          </div>

          {/* Watermark */}
          <motion.div
            style={{
              position: "absolute", bottom: 18, right: 20, zIndex: 6,
              fontSize: 9, color: "rgba(200,100,130,0.38)", letterSpacing: "0.045em",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 4.5, duration: 1.0 }}
          >
            ✦ HeartSync AI
          </motion.div>
        </motion.div>

        {/* ══ LAYER A: Envelope scene (z=20) ══ */}
        <motion.div
          animate={envCtrl}
          initial={{ scale: 0.68, opacity: 0, z: -200 }}
          style={{ position: "absolute", inset: 0, zIndex: 20, pointerEvents: "none" }}
        >
          {/* Deep plum/wine room atmosphere */}
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse at 50% 28%, #2e0d1c 0%, #16060e 60%, #0d0408 100%)",
          }} />

          {/* Ambient rosy desk-lamp glow from above */}
          <div style={{
            position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)",
            width: 260, height: 220,
            background: "radial-gradient(ellipse, rgba(255,130,165,0.1) 0%, rgba(255,200,160,0.04) 50%, transparent 75%)",
            filter: "blur(18px)",
          }} />

          {/* Floating petals in the room (start right away) */}
          <FloatingPetals startDelay={0.4} />

          {/* Desk surface — plum-tinted dark wood */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 155,
            background: "linear-gradient(to bottom, #1e0c16, #0f0609)",
            borderTop: "1px solid rgba(180,80,120,0.15)",
          }}>
            {/* Wood grain */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.07 }}>
              <filter id="ucwoodgrain">
                <feTurbulence type="turbulence" baseFrequency="0.02 0.5" numOctaves="4" seed="3" result="noise" />
                <feColorMatrix type="saturate" values="0" in="noise" />
              </filter>
              <rect width="100%" height="100%" filter="url(#ucwoodgrain)" />
            </svg>
            {/* Rosy desk reflection */}
            <div style={{
              position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
              width: 280, height: 40,
              background: "radial-gradient(ellipse, rgba(220,100,140,0.1) 0%, transparent 70%)",
              filter: "blur(8px)",
            }} />
          </div>

          {/* ── Envelope body ── */}
          <div style={{
            position: "absolute",
            bottom: 42,
            left: "50%", transform: "translateX(-50%)",
            width: 300, height: 190,
          }}>
            {/* Envelope drop shadow */}
            <div style={{
              position: "absolute", bottom: -8, left: "5%", right: "5%", height: 20,
              background: "rgba(0,0,0,0.45)",
              filter: "blur(14px)", borderRadius: "50%",
            }} />

            {/* Envelope parchment (blush-tinted) */}
            <div style={{
              position: "absolute", inset: 0,
              borderRadius: 6,
              background: "linear-gradient(158deg, #f8eef0 0%, #f2dde2 45%, #e8cdd4 100%)",
              boxShadow: "0 18px 55px rgba(0,0,0,0.5), 0 6px 18px rgba(0,0,0,0.3), inset 0 0 28px rgba(0,0,0,0.06)",
              border: "1px solid rgba(210,150,170,0.5)",
              overflow: "hidden",
            }}>
              {/* Inside center (cream, behind fold lines) */}
              <div style={{
                position: "absolute", top: 0, left: "23%", right: "23%", height: "54%",
                background: "linear-gradient(to bottom, #fdf5f6, #f5e0e5)",
                opacity: 0.9,
              }} />

              {/* Left fold */}
              <div style={{ position: "absolute", inset: 0, background: "#d8b0bc", clipPath: "polygon(0 0, 46% 52%, 0 100%)", opacity: 0.55 }} />
              <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.12), rgba(0,0,0,0.03))", clipPath: "polygon(0 0, 46% 52%, 0 100%)" }} />

              {/* Right fold */}
              <div style={{ position: "absolute", inset: 0, background: "#d8b0bc", clipPath: "polygon(100% 0, 54% 52%, 100% 100%)", opacity: 0.55 }} />
              <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(to left, rgba(0,0,0,0.12), rgba(0,0,0,0.03))", clipPath: "polygon(100% 0, 54% 52%, 100% 100%)" }} />

              {/* Bottom fold */}
              <div style={{ position: "absolute", inset: 0, background: "#e2c0ca", clipPath: "polygon(0 100%, 46% 52%, 54% 52%, 100% 100%)", opacity: 0.7 }} />

              {/* Crease shadow at hinge */}
              <motion.div
                style={{
                  position: "absolute", top: "51%", left: 0, right: 0, height: 4,
                  background: "linear-gradient(to bottom, rgba(0,0,0,0.2), transparent)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 1.3, duration: 0.4 }}
              />

              {/* Stamp */}
              <div style={{ position: "absolute", top: 8, right: 8 }}>
                <StampSVG />
              </div>

              {/* Postmark */}
              <motion.div
                style={{ position: "absolute", top: 2, right: 30, transform: "rotate(-12deg)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <PostmarkSVG />
              </motion.div>

              {/* Address block */}
              <motion.div
                style={{ position: "absolute", top: "55%", left: 14, display: "flex", flexDirection: "column", gap: 2 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.35, duration: 0.6 }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <DotGrid />
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 8.5, color: "rgba(140,50,80,0.65)", letterSpacing: "0.06em", textTransform: "uppercase" }}>To:</span>
                </div>
                <span style={{ fontFamily: "Georgia, serif", fontSize: 11, fontStyle: "italic", color: "rgba(120,40,65,0.8)", letterSpacing: "0.02em", paddingLeft: 17 }}>Priya  ♥</span>
              </motion.div>
            </div>

            {/* ── Flower seal ── */}
            <div style={{
              position: "absolute",
              top: "48%", left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 15,
            }}>
              <motion.div
                animate={sealRotCtrl}
                initial={{ rotate: 0 }}
              >
                <motion.div animate={sealCtrl}>
                  <FlowerSeal />
                </motion.div>
              </motion.div>
            </div>

            {/* ── Envelope flap (spring open) ── */}
            <div style={{
              perspective: 620, perspectiveOrigin: "50% 0%",
              position: "absolute", top: 0, left: 0, right: 0,
              height: "56%", zIndex: 12,
            }}>
              <motion.div
                initial={{ rotateX: 0 }}
                animate={{ rotateX: -172 }}
                transition={{ type: "spring", damping: 10, stiffness: 100, delay: 1.3 }}
                style={{
                  width: "100%", height: "100%",
                  transformOrigin: "50% 0%",
                  transformStyle: "preserve-3d",
                  position: "relative",
                }}
              >
                {/* Flap outside — blush parchment */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(172deg, #deb8c4 0%, #cfa4b2 55%, #c09098 100%)",
                  clipPath: "polygon(0 0, 100% 0, 50% 88%)",
                  borderRadius: "5px 5px 0 0",
                  backfaceVisibility: "hidden",
                  border: "1px solid rgba(190,120,145,0.3)",
                  boxShadow: "inset 0 -3px 12px rgba(0,0,0,0.08)",
                }} />
                {/* Flap inside — cream */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to bottom, #fdf5f6 0%, #f2e0e5 100%)",
                  clipPath: "polygon(0 0, 100% 0, 50% 88%)",
                  transform: "rotateX(180deg)",
                  backfaceVisibility: "hidden",
                }} />
              </motion.div>
            </div>

            {/* Subtitle beneath envelope */}
            <motion.div
              style={{
                position: "absolute", bottom: -22, left: "50%",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                fontFamily: "Georgia, serif", fontStyle: "italic",
                fontSize: 9, color: "rgba(220,150,175,0.45)",
                letterSpacing: "0.12em",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              a letter sealed with love
            </motion.div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
