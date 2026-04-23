/**
 * UnboxCard — Gift Unbox, 3D Cinematic Reveal
 *
 * Phase 1 (0–1.3s):  Camera dolly-in toward the envelope
 * Phase 2 (1.3–2.3s): Spring flap opens (damping:10 → bouncy tactile)
 * Phase 3 (2.0–3.2s): Luxury card slides out, envelope dissolves
 * Post-reveal:         Photo ring glow, shimmer sweep, word-stagger message
 */
import { motion, useAnimation } from "framer-motion";
import { useEffect, useState } from "react";

/* ─── tiny SVG pieces ─────────────────────────────── */

const HeartPath = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

function StampSVG() {
  return (
    <div style={{
      width: 36, height: 42,
      background: "#fffef8",
      borderRadius: 2,
      border: "1px solid rgba(160,130,80,0.35)",
      boxShadow: "1px 1px 4px rgba(0,0,0,0.18)",
      padding: 3,
      flexShrink: 0,
    }}>
      <div style={{
        width: "100%", height: "100%",
        border: "1px dashed rgba(160,120,60,0.55)",
        borderRadius: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 2,
      }}>
        <svg width={12} height={11} viewBox="0 0 24 22" fill="#e07040">
          <path d={HeartPath} />
        </svg>
        <span style={{
          fontFamily: "monospace", fontSize: 4.5,
          color: "rgba(80,50,20,0.65)", letterSpacing: "0.04em",
        }}>♥ 5.00</span>
      </div>
    </div>
  );
}

function PostmarkSVG() {
  return (
    <svg width={34} height={34} viewBox="0 0 34 34" style={{ opacity: 0.5 }}>
      <circle cx={17} cy={17} r={14} fill="none" stroke="rgba(90,55,18,0.6)" strokeWidth={1.5} />
      {/* Horizontal cancel lines */}
      <line x1={9} y1={14} x2={25} y2={14} stroke="rgba(90,55,18,0.45)" strokeWidth={0.9} />
      <line x1={9} y1={17} x2={25} y2={17} stroke="rgba(90,55,18,0.45)" strokeWidth={0.9} />
      <line x1={9} y1={20} x2={25} y2={20} stroke="rgba(90,55,18,0.45)" strokeWidth={0.9} />
      {/* "HEARTSYNC" text at top arc - approximated with straight text */}
      <text
        fontSize={4.2} fill="rgba(90,55,18,0.55)"
        fontFamily="monospace" letterSpacing={1.1}
        textAnchor="middle" x={17} y={9}
      >
        HEARTSYNC
      </text>
    </svg>
  );
}

function CherryBlossomDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, marginTop: 8 }}>
      {/* Left line */}
      <div style={{
        width: 38, height: 1,
        background: "linear-gradient(to right, transparent, rgba(180,140,60,0.4))",
      }} />
      {/* Blossom SVG */}
      <svg width={16} height={16} viewBox="0 0 16 16">
        {[0, 72, 144, 216, 288].map((deg, i) => (
          <ellipse
            key={i} cx={8} cy={4.8} rx={2} ry={3.4}
            fill={i % 2 === 0 ? "rgba(255,175,188,0.85)" : "rgba(240,145,160,0.75)"}
            transform={`rotate(${deg} 8 8)`}
          />
        ))}
        <circle cx={8} cy={8} r={2.2} fill="rgba(220,70,90,0.85)" />
        <circle cx={8} cy={8} r={0.9} fill="rgba(255,210,218,0.95)" />
      </svg>
      {/* Right line */}
      <div style={{
        width: 38, height: 1,
        background: "linear-gradient(to left, transparent, rgba(180,140,60,0.4))",
      }} />
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width={18} height={15} viewBox="0 0 18 15" fill="none">
      <rect x={0.6} y={2.8} width={16.8} height={11.4} rx={1.8}
        stroke="rgba(160,120,60,0.5)" strokeWidth={1.1} />
      <circle cx={9} cy={8.5} r={3.2}
        stroke="rgba(160,120,60,0.5)" strokeWidth={1.1} />
      <path d="M6 0.7 h6 a0.6 0.6 0 0 1 0.6 0.6 v1.5 H5.4 V1.3 A0.6 0.6 0 0 1 6 0.7z"
        stroke="rgba(160,120,60,0.5)" strokeWidth={1} fill="none" />
      <circle cx={14.2} cy={5} r={0.9} fill="rgba(160,120,60,0.45)" />
    </svg>
  );
}

/* ─── Gold double-line SVG border ─────────────────── */
function GoldBorder({ w, h }: { w: number; h: number }) {
  const o = 13; // outer inset
  const i = 18; // inner inset
  return (
    <svg
      width={w} height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <rect
        x={o} y={o} width={w - o * 2} height={h - o * 2}
        fill="none" stroke="rgba(175,138,58,0.55)" strokeWidth={0.9}
      />
      <rect
        x={i} y={i} width={w - i * 2} height={h - i * 2}
        fill="none" stroke="rgba(200,165,78,0.3)" strokeWidth={0.7}
      />
      {/* Gold corner diamonds */}
      {[
        [o, o], [w - o, o], [o, h - o], [w - o, h - o]
      ].map(([cx, cy], idx) => (
        <polygon
          key={idx}
          points={`${cx},${cy - 3.5} ${cx + 3.5},${cy} ${cx},${cy + 3.5} ${cx - 3.5},${cy}`}
          fill="rgba(185,148,58,0.55)"
        />
      ))}
    </svg>
  );
}

/* ─── Dot-grid address decoration ─────────────────── */
function DotGrid() {
  const dots = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      dots.push(
        <circle key={`${r}-${c}`}
          cx={c * 4} cy={r * 4} r={0.8}
          fill="rgba(100,65,25,0.35)"
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

/* ─── Message words ───────────────────────────────── */
const MSG_WORDS = "Every moment with you feels like a dream come true".split(" ");
const wordCont = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 3.0 } },
};
const wordVar = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export function UnboxCard() {
  const envCtrl  = useAnimation();
  const sealCtrl = useAnimation();
  const [shimmerKey, setShimmerKey] = useState(0);

  /* ── Animation sequence ── */
  useEffect(() => {
    async function run() {
      // Phase 1: Dolly in (scale up from depth)
      envCtrl.start({
        scale: 1, opacity: 1,
        transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] },
      });

      // Wax seal glow loop (starts immediately)
      sealCtrl.start({
        boxShadow: [
          "0 3px 10px rgba(0,0,0,0.45), 0 0 4px rgba(180,60,40,0.0)",
          "0 3px 10px rgba(0,0,0,0.45), 0 0 22px rgba(210,80,50,0.55)",
          "0 3px 10px rgba(0,0,0,0.45), 0 0 4px rgba(180,60,40,0.0)",
        ],
        transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
      });

      // Phase 3: After card rises, dissolve envelope at t=2.5s
      await new Promise(r => setTimeout(r, 2500));
      await envCtrl.start({
        opacity: 0, scale: 0.95, y: 14,
        transition: { duration: 0.42, ease: "easeIn" },
      });
    }
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Shimmer repeat trigger ── */
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const first = setTimeout(() => {
      setShimmerKey(k => k + 1);
      interval = setInterval(() => setShimmerKey(k => k + 1), 6000);
    }, 3800);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#06050a" }}
    >
      {/* ── Scene container ── */}
      <div
        className="relative overflow-hidden"
        style={{
          width: 340, height: 420,
          borderRadius: 22,
          background: "#0a080f",
          boxShadow: "0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >

        {/* ══ LAYER B: Luxury inner card (z=10) ══ */}
        <motion.div
          style={{ position: "absolute", inset: 0, zIndex: 10 }}
          initial={{ y: 90, scale: 0.9, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 18, stiffness: 120, delay: 2.0 }}
        >
          {/* Ivory parchment background */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(148deg, #fdfaf5 0%, #f9f1e4 38%, #f3e9d6 100%)",
          }} />

          {/* Very subtle paper grain */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04, pointerEvents: "none" }}>
            <filter id="ucpapergrain">
              <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" result="noise" />
              <feColorMatrix type="saturate" values="0" in="noise" />
            </filter>
            <rect width="100%" height="100%" filter="url(#ucpapergrain)" />
          </svg>

          {/* Gold double-line border */}
          <GoldBorder w={340} h={420} />

          {/* Shimmer sweep — rerenders on key change to replay */}
          {shimmerKey > 0 && (
            <motion.div
              key={shimmerKey}
              style={{
                position: "absolute", top: 0, bottom: 0,
                width: "55%",
                background: "linear-gradient(108deg, transparent 30%, rgba(255,255,255,0.52) 50%, transparent 70%)",
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
              {/* Outer gold ring */}
              <motion.div
                style={{
                  width: 98, height: 98, borderRadius: "50%",
                  border: "2px solid rgba(178,138,58,0.65)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                animate={{
                  boxShadow: [
                    "0 0 0px rgba(195,160,75,0)",
                    "0 0 20px rgba(195,160,75,0.45)",
                    "0 0 0px rgba(195,160,75,0)",
                  ]
                }}
                transition={{ duration: 3.5, repeat: Infinity, delay: 3.2, ease: "easeInOut" }}
              >
                {/* Inner white pearl ring */}
                <div style={{
                  width: 88, height: 88, borderRadius: "50%",
                  border: "1.5px solid rgba(255,255,255,0.85)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "linear-gradient(135deg, #eee0cb 0%, #f6ecdc 50%, #eddcc8 100%)",
                  flexDirection: "column", gap: 4,
                }}>
                  <CameraIcon />
                  <span style={{
                    fontSize: 6.5, letterSpacing: "0.22em", textTransform: "uppercase",
                    color: "rgba(155,115,55,0.7)", fontFamily: "sans-serif",
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
                color: "#3d2a1e",
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
                color: "rgba(85,55,28,0.72)",
                lineHeight: 1.78, textAlign: "center",
                maxWidth: 228,
              }}
              variants={wordCont}
              initial="hidden"
              animate="show"
            >
              {MSG_WORDS.map((w, i) => (
                <motion.span
                  key={i}
                  variants={wordVar}
                  style={{ display: "inline" }}
                >
                  {w}{i < MSG_WORDS.length - 1 ? " " : ""}
                </motion.span>
              ))}
            </motion.p>
          </div>

          {/* Watermark */}
          <motion.div
            style={{
              position: "absolute", bottom: 18, right: 20, zIndex: 6,
              fontSize: 9, color: "rgba(158,120,58,0.38)", letterSpacing: "0.045em",
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
          initial={{ scale: 0.68, opacity: 0 }}
          style={{ position: "absolute", inset: 0, zIndex: 20, pointerEvents: "none" }}
        >
          {/* Dark room atmosphere */}
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse at 50% 30%, #1a1008 0%, #0a0806 100%)",
          }} />

          {/* Ambient light from above (like a desk lamp) */}
          <div style={{
            position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)",
            width: 240, height: 200,
            background: "radial-gradient(ellipse, rgba(255,210,140,0.08) 0%, transparent 70%)",
            filter: "blur(20px)",
            pointerEvents: "none",
          }} />

          {/* Desk surface */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 155,
            background: "linear-gradient(to bottom, #2c1a0c, #1c1008)",
            borderTop: "1px solid rgba(120,80,40,0.2)",
          }}>
            {/* Wood grain texture */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.07 }}>
              <filter id="ucwoodgrain">
                <feTurbulence type="turbulence" baseFrequency="0.02 0.5" numOctaves="4" seed="3" result="noise" />
                <feColorMatrix type="saturate" values="0" in="noise" />
              </filter>
              <rect width="100%" height="100%" filter="url(#ucwoodgrain)" />
            </svg>
            {/* Subtle desk reflection under envelope */}
            <div style={{
              position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
              width: 280, height: 40,
              background: "radial-gradient(ellipse, rgba(180,120,60,0.12) 0%, transparent 70%)",
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
            {/* Envelope shadow on desk */}
            <div style={{
              position: "absolute", bottom: -8, left: "5%", right: "5%", height: 20,
              background: "rgba(0,0,0,0.45)",
              filter: "blur(14px)",
              borderRadius: "50%",
            }} />

            {/* Envelope body surface */}
            <div style={{
              position: "absolute", inset: 0,
              borderRadius: 6,
              background: "linear-gradient(158deg, #f2e8d5 0%, #e9d7b8 45%, #ddc9a0 100%)",
              boxShadow: "0 18px 55px rgba(0,0,0,0.52), 0 6px 18px rgba(0,0,0,0.32), inset 0 0 28px rgba(0,0,0,0.07)",
              border: "1px solid rgba(175,145,95,0.45)",
              overflow: "hidden",
            }}>
              {/* Inside view — top center area (behind fold lines) */}
              <div style={{
                position: "absolute", top: 0, left: "23%", right: "23%", height: "54%",
                background: "linear-gradient(to bottom, #f8f2e8, #eedfc8)",
                clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
                opacity: 0.9,
              }} />

              {/* Left fold shadow */}
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(0,0,0,0)",
                clipPath: "polygon(0 0, 46% 52%, 0 100%)",
                backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.14), rgba(0,0,0,0.04))",
              }} />
              {/* Left fold tone */}
              <div style={{
                position: "absolute", inset: 0,
                background: "#d8c49e",
                clipPath: "polygon(0 0, 46% 52%, 0 100%)",
                opacity: 0.55,
              }} />

              {/* Right fold shadow */}
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: "linear-gradient(to left, rgba(0,0,0,0.14), rgba(0,0,0,0.04))",
                clipPath: "polygon(100% 0, 54% 52%, 100% 100%)",
              }} />
              {/* Right fold tone */}
              <div style={{
                position: "absolute", inset: 0,
                background: "#d8c49e",
                clipPath: "polygon(100% 0, 54% 52%, 100% 100%)",
                opacity: 0.55,
              }} />

              {/* Bottom fold */}
              <div style={{
                position: "absolute", inset: 0,
                background: "#e2ceac",
                clipPath: "polygon(0 100%, 46% 52%, 54% 52%, 100% 100%)",
                opacity: 0.7,
              }} />

              {/* Crease shadow at fold hinge line (appears when flap opens) */}
              <motion.div
                style={{
                  position: "absolute",
                  top: "51%", left: 0, right: 0, height: 4,
                  background: "linear-gradient(to bottom, rgba(0,0,0,0.22), transparent)",
                  pointerEvents: "none",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 1.3, duration: 0.4 }}
              />

              {/* Stamp — top right */}
              <div style={{
                position: "absolute", top: 8, right: 8,
                display: "flex", flexDirection: "column", alignItems: "flex-end",
              }}>
                <StampSVG />
              </div>

              {/* Postmark — overlapping stamp slightly */}
              <motion.div
                style={{
                  position: "absolute", top: 2, right: 30,
                  transform: "rotate(-12deg)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <PostmarkSVG />
              </motion.div>

              {/* Address block — appears when flap opens */}
              <motion.div
                style={{
                  position: "absolute",
                  top: "55%", left: 14,
                  display: "flex", flexDirection: "column", gap: 2,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.35, duration: 0.6 }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <DotGrid />
                  <span style={{
                    fontFamily: "Georgia, serif", fontSize: 8.5,
                    color: "rgba(75,48,18,0.65)", letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}>To:</span>
                </div>
                <span style={{
                  fontFamily: "Georgia, serif", fontSize: 11,
                  fontStyle: "italic",
                  color: "rgba(65,38,12,0.8)",
                  letterSpacing: "0.02em",
                  paddingLeft: 17,
                }}>Priya  ♥</span>
              </motion.div>
            </div>

            {/* ── Wax seal (sits at the flap–body junction) ── */}
            <div style={{
              position: "absolute",
              top: "48%", left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 15,
            }}>
              <motion.div
                animate={sealCtrl}
                style={{
                  width: 30, height: 30,
                  borderRadius: "50%",
                  background: "radial-gradient(circle at 38% 35%, #d44030 0%, #a02618 55%, #7b1c12 100%)",
                  boxShadow: "0 3px 10px rgba(0,0,0,0.45)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1.5px solid rgba(190,70,50,0.4)",
                }}
              >
                <span style={{
                  fontFamily: "Georgia, serif", fontSize: 12, fontWeight: 700,
                  color: "rgba(255,225,215,0.88)",
                  textShadow: "0 1px 3px rgba(0,0,0,0.45)",
                  lineHeight: 1,
                  userSelect: "none",
                }}>
                  H
                </span>
              </motion.div>
            </div>

            {/* ── Envelope FLAP (opens with spring) ── */}
            <div style={{
              perspective: 620, perspectiveOrigin: "50% 0%",
              position: "absolute", top: 0, left: 0, right: 0,
              height: "56%",
              zIndex: 12,
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
                {/* Flap front (outside of envelope) */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(172deg, #d6b990 0%, #c8a878 55%, #b89860 100%)",
                  clipPath: "polygon(0 0, 100% 0, 50% 88%)",
                  borderRadius: "5px 5px 0 0",
                  backfaceVisibility: "hidden",
                  border: "1px solid rgba(165,130,80,0.3)",
                  boxShadow: "inset 0 -3px 12px rgba(0,0,0,0.1)",
                }} />
                {/* Flap back (inside, cream — shown when open) */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to bottom, #f8f2e8 0%, #eddfca 100%)",
                  clipPath: "polygon(0 0, 100% 0, 50% 88%)",
                  transform: "rotateX(180deg)",
                  backfaceVisibility: "hidden",
                }} />
              </motion.div>
            </div>

            {/* "A letter for Priya" — small label beneath envelope */}
            <motion.div
              style={{
                position: "absolute", bottom: -22, left: "50%",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                fontFamily: "Georgia, serif", fontStyle: "italic",
                fontSize: 9, color: "rgba(200,175,130,0.45)",
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
