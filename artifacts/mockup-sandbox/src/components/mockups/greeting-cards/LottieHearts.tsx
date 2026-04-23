import { motion, useAnimation } from "framer-motion";
import { useEffect, useState } from "react";

/* ── Hearts data ─────────────────────────────────── */
const HEARTS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  size: 13 + (i % 4) * 6,
  left: 4 + (i * 6.8) % 88,
  duration: 7 + (i % 5) * 1.6,
  delay: (i * 0.55) % 5.5 + 3.8, // start after envelope reveal
  drift: i % 2 === 0 ? 14 : -14,
  opacity: 0.3 + (i % 3) * 0.15,
}));
const HEART_COLORS = ["#fb7185","#f43f5e","#fda4af","#e11d48","#fecdd3","#ff6b8a","#f472b6","#fb923c"];

const SPARKLES = [
  { top: "8%",  left: "12%", delay: 4.5, size: 10 },
  { top: "14%", left: "78%", delay: 5.0, size: 8  },
  { top: "28%", left: "6%",  delay: 5.5, size: 7  },
  { top: "22%", left: "88%", delay: 4.8, size: 9  },
  { top: "72%", left: "9%",  delay: 5.2, size: 8  },
  { top: "65%", left: "83%", delay: 5.7, size: 10 },
  { top: "82%", left: "22%", delay: 4.6, size: 7  },
  { top: "78%", left: "72%", delay: 5.9, size: 8  },
];

/* ── SVGs ─────────────────────────────────────────── */
const HeartSVG = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const RoseGraphic = () => (
  <svg width={48} height={48} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 0 8px rgba(244,63,94,0.5))" }}>
    {[0,45,90,135,180,225,270,315].map((deg, i) => (
      <ellipse key={i} cx={50} cy={30} rx={10} ry={20}
        fill={i % 2 === 0 ? "rgba(244,63,94,0.75)" : "rgba(251,113,133,0.6)"}
        transform={`rotate(${deg} 50 50)`}
      />
    ))}
    <circle cx={50} cy={50} r={12} fill="rgba(229,27,64,0.9)" />
    <circle cx={50} cy={50} r={6}  fill="rgba(255,180,190,0.7)" />
  </svg>
);

const Corner = ({ rotate }: { rotate: number }) => (
  <svg width={32} height={32} viewBox="0 0 36 36"
    style={{ position: "absolute", opacity: 0.3, transform: `rotate(${rotate}deg)` }}>
    <path d="M2 34 L2 2 L34 2" fill="none" stroke="rgba(251,113,133,0.9)" strokeWidth={1.2} strokeLinecap="round" />
    <circle cx={2} cy={2} r={2.5} fill="rgba(251,113,133,0.8)" />
  </svg>
);

/* ── Text animations ─────────────────────────────── */
const MESSAGE_WORDS = "Every moment with you feels like a dream come true".split(" ");

const nameContainer  = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 3.2 } } };
const letterVariant  = {
  hidden: { opacity: 0, y: -14, scale: 0.75 },
  show:   { opacity: 1, y: 0,   scale: 1,   transition: { duration: 0.35, ease: [0.22,1,0.36,1] } },
};
const wordContainer  = { hidden: {}, show: { transition: { staggerChildren: 0.085, delayChildren: 4.0 } } };
const wordVariant    = {
  hidden: { opacity: 0, y: 9, filter: "blur(5px)" },
  show:   { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.42, ease: "easeOut" } },
};

/* ════════════════════════════════════════════════════
   ENVELOPE COMPONENT
   ══════════════════════════════════════════════════ */
const ENV_W = 290;
const ENV_H = 182;

function Envelope({ onDone }: { onDone: () => void }) {
  const flapCtrl    = useAnimation();
  const envCtrl     = useAnimation();
  const glowCtrl    = useAnimation();

  useEffect(() => {
    async function run() {
      // 1. Appear
      await envCtrl.start({ opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } });
      await new Promise(r => setTimeout(r, 400));

      // 2. Glow pulse (like a heartbeat before opening)
      await glowCtrl.start({ opacity: [0, 0.8, 0], scale: [1, 1.3, 1], transition: { duration: 0.7, ease: "easeInOut" } });
      await new Promise(r => setTimeout(r, 120));

      // 3. Flap opens — rotateX back around its top edge
      await flapCtrl.start({ rotateX: -175, transition: { duration: 0.75, ease: [0.33, 1, 0.68, 1] } });
      await new Promise(r => setTimeout(r, 200));

      // 4. Signal card to rise; then envelope fades
      onDone();
      await new Promise(r => setTimeout(r, 820));
      await envCtrl.start({ opacity: 0, y: 30, scale: 0.92, transition: { duration: 0.45, ease: "easeIn" } });
    }
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      animate={envCtrl}
      initial={{ opacity: 0, y: 30 }}
      style={{
        position: "absolute",
        bottom: "18%",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 30,
        pointerEvents: "none",
      }}
    >
      {/* Glow pulse on the seal */}
      <motion.div
        animate={glowCtrl}
        initial={{ opacity: 0, scale: 1 }}
        style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 60, height: 60,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(244,63,94,0.7) 0%, transparent 70%)",
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />

      {/* Envelope body */}
      <div style={{ position: "relative", width: ENV_W, height: ENV_H }}>
        {/* Back body */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: 10,
          background: "linear-gradient(160deg, #3a0018 0%, #5a0028 60%, #2e0014 100%)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 0 30px rgba(244,63,94,0.15)",
          border: "1px solid rgba(251,113,133,0.2)",
          overflow: "hidden",
        }}>
          {/* Inside envelope colour (visible when flap open) */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "55%",
            background: "linear-gradient(to bottom, #1a0010, #2d0016)",
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
          }} />
          {/* Left fold shadow */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(60deg, rgba(0,0,0,0.3) 0%, transparent 50%)",
            clipPath: "polygon(0 0, 47% 50%, 0 100%)",
          }} />
          {/* Right fold shadow */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(-60deg, rgba(0,0,0,0.3) 0%, transparent 50%)",
            clipPath: "polygon(100% 0, 53% 50%, 100% 100%)",
          }} />
          {/* Bottom fold */}
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.18)",
            clipPath: "polygon(0 100%, 47% 50%, 53% 50%, 100% 100%)",
          }} />
          {/* Heart seal in center */}
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -38%)",
          }}>
            <HeartSVG size={22} color="rgba(244,63,94,0.85)" />
          </div>
        </div>

        {/* Flap — perspective wrapper */}
        <div style={{ perspective: 500, perspectiveOrigin: "50% 0%", position: "absolute", top: 0, left: 0, right: 0, height: "55%", zIndex: 10 }}>
          <motion.div
            animate={flapCtrl}
            initial={{ rotateX: 0 }}
            style={{
              transformOrigin: "50% 0%",
              transformStyle: "preserve-3d",
              width: "100%",
              height: "100%",
              position: "relative",
            }}
          >
            {/* Flap front face */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(175deg, #480020 0%, #380016 100%)",
              clipPath: "polygon(0 0, 100% 0, 50% 88%)",
              borderRadius: "8px 8px 0 0",
              backfaceVisibility: "hidden",
              border: "1px solid rgba(251,113,133,0.15)",
            }} />
            {/* Flap back face (inside, shown when fully open) */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(175deg, #1a0010 0%, #2d0016 100%)",
              clipPath: "polygon(0 0, 100% 0, 50% 88%)",
              transform: "rotateX(180deg)",
              backfaceVisibility: "hidden",
            }} />
          </motion.div>
        </div>
      </div>

      {/* Label on envelope */}
      <div style={{
        position: "absolute",
        bottom: -22, left: "50%", transform: "translateX(-50%)",
        fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
        color: "rgba(253,164,175,0.45)", whiteSpace: "nowrap", fontFamily: "Georgia, serif",
        fontStyle: "italic",
      }}>
        A message for Priya ♥
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN CARD
   ══════════════════════════════════════════════════ */
export function LottieHearts() {
  const [cardVisible, setCardVisible] = useState(false);
  const cardCtrl = useAnimation();

  useEffect(() => {
    if (!cardVisible) return;
    // Rise up from envelope position
    cardCtrl.start({
      y: 0, opacity: 1, scale: 1,
      transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
    });
  }, [cardVisible, cardCtrl]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0008" }}>
      <div style={{ position: "relative", width: 340, height: 420 }}>

        {/* ── The card (rises from behind envelope) ── */}
        <motion.div
          animate={cardCtrl}
          initial={{ y: 70, opacity: 0, scale: 0.94 }}
          className="relative overflow-hidden rounded-3xl"
          style={{
            width: 340, height: 420,
            background: "linear-gradient(145deg, #1a0010 0%, #4a0022 48%, #2d0015 100%)",
            border: "1px solid rgba(251,113,133,0.22)",
            boxShadow: "0 0 60px rgba(244,63,94,0.17), 0 30px 60px rgba(0,0,0,0.55)",
          }}
        >
          {/* Corner decorations */}
          <div style={{ position: "absolute", top: 14, left: 14 }}><Corner rotate={0} /></div>
          <div style={{ position: "absolute", top: 14, right: 14 }}><Corner rotate={90} /></div>
          <div style={{ position: "absolute", bottom: 14, left: 14 }}><Corner rotate={270} /></div>
          <div style={{ position: "absolute", bottom: 14, right: 14 }}><Corner rotate={180} /></div>

          {/* Background glows */}
          <div className="absolute pointer-events-none" style={{
            bottom: -40, left: "50%", transform: "translateX(-50%)",
            width: 260, height: 200,
            background: "radial-gradient(ellipse, rgba(244,63,94,0.22) 0%, transparent 70%)",
            filter: "blur(22px)",
          }} />

          {/* Sparkles */}
          {SPARKLES.map((s, i) => (
            <motion.div key={i} className="absolute pointer-events-none select-none"
              style={{ top: s.top, left: s.left, fontSize: s.size, color: "#fda4af", lineHeight: 1 }}
              animate={{ opacity: [0.1, 0.8, 0.1], scale: [0.7, 1.2, 0.7] }}
              transition={{ duration: 2.2, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}>
              ✦
            </motion.div>
          ))}

          {/* Floating hearts */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {HEARTS.map((h) => (
              <motion.div key={h.id} className="absolute"
                style={{ left: h.left + "%", bottom: 0 }}
                animate={{ y: [-10, -450], x: [0, h.drift, -(h.drift/2), h.drift/3, 0], opacity: [0, h.opacity, h.opacity, 0], scale: [0.7,1,1.1,0.85] }}
                transition={{ duration: h.duration, delay: h.delay, repeat: Infinity, ease: "easeInOut" }}>
                <HeartSVG size={h.size} color={HEART_COLORS[h.id % HEART_COLORS.length]} />
              </motion.div>
            ))}
          </div>

          {/* ── Card content ── */}
          <div className="relative h-full flex flex-col items-center justify-center text-center z-10 px-8">

            {/* Rose */}
            <motion.div className="mb-3"
              initial={{ scale: 0, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ duration: 0.65, delay: 3.0, ease: [0.34,1.56,0.64,1] }}>
              <motion.div
                animate={{ rotate: [0,5,-5,0], scale: [1,1.06,1] }}
                transition={{ duration: 5, delay: 3.6, repeat: Infinity, ease: "easeInOut" }}>
                <RoseGraphic />
              </motion.div>
            </motion.div>

            {/* "For" */}
            <motion.span className="block uppercase tracking-[0.28em] font-medium mb-1"
              style={{ fontSize: 9, color: "rgba(253,164,175,0.5)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 3.1, duration: 0.5 }}>
              For
            </motion.span>

            {/* Name — letter stagger */}
            <motion.div className="flex items-center justify-center mb-1"
              variants={nameContainer} initial="hidden" animate="show">
              {"Priya".split("").map((char, i) => (
                <motion.span key={i} variants={letterVariant}
                  style={{ fontFamily: "Georgia, serif", fontSize: 31, fontWeight: 700, color: "#fecdd3", lineHeight: 1.15, display: "inline-block" }}>
                  {char}
                </motion.span>
              ))}
            </motion.div>

            {/* Glow under name */}
            <motion.div style={{ position: "absolute", top: "46%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }}
              animate={{ opacity: [0,0.55,0], scale: [0.8,1.3,0.8] }}
              transition={{ duration: 3.5, repeat: Infinity, delay: 3.6, ease: "easeInOut" }}>
              <div style={{ width: 120, height: 40, background: "radial-gradient(ellipse, rgba(244,63,94,0.4) 0%, transparent 70%)", filter: "blur(10px)" }} />
            </motion.div>

            {/* Divider */}
            <motion.div className="my-3"
              style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(251,113,133,0.45), transparent)" }}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 70, opacity: 1 }}
              transition={{ delay: 3.8, duration: 0.7, ease: "easeOut" }} />

            {/* Message — word by word */}
            <motion.p className="leading-relaxed"
              style={{ maxWidth: 252 }}
              variants={wordContainer} initial="hidden" animate="show">
              <motion.span variants={wordVariant} style={{ color: "rgba(255,228,230,0.55)", fontSize: 15, fontFamily: "Georgia, serif", fontStyle: "italic" }}>"</motion.span>
              {MESSAGE_WORDS.map((word, i) => (
                <motion.span key={i} variants={wordVariant}
                  style={{ display: "inline", color: "rgba(255,228,230,0.88)", fontFamily: "Georgia, serif", fontSize: 13.5, fontStyle: "italic" }}>
                  {word}{i < MESSAGE_WORDS.length - 1 ? " " : ""}
                </motion.span>
              ))}
              <motion.span variants={wordVariant} style={{ color: "rgba(255,228,230,0.55)", fontSize: 15, fontFamily: "Georgia, serif", fontStyle: "italic" }}>"</motion.span>
            </motion.p>
          </div>

          {/* Watermark */}
          <motion.div className="absolute bottom-[18px] right-5 z-10"
            style={{ fontSize: 9.5, color: "rgba(253,164,175,0.3)", letterSpacing: "0.04em" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 5.5, duration: 0.8 }}>
            💙 HeartSync AI
          </motion.div>
        </motion.div>

        {/* ── Envelope overlaid on top ── */}
        <Envelope onDone={() => setCardVisible(true)} />
      </div>
    </div>
  );
}
