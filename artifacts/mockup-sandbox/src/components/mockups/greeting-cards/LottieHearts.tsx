import { motion } from "framer-motion";

/* ── Floating hearts data ────────────────────────── */
const HEARTS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  size: 13 + (i % 4) * 6,
  left: 4 + (i * 6.8) % 88,
  duration: 7 + (i % 5) * 1.6,
  delay: (i * 0.55) % 5.5,
  drift: i % 2 === 0 ? 14 : -14,
  opacity: 0.3 + (i % 3) * 0.15,
}));

const HEART_COLORS = [
  "#fb7185","#f43f5e","#fda4af","#e11d48",
  "#fecdd3","#ff6b8a","#f472b6","#fb923c",
];

/* ── Sparkle positions ───────────────────────────── */
const SPARKLES = [
  { top: "8%",  left: "12%", delay: 0,    size: 10 },
  { top: "14%", left: "78%", delay: 0.7,  size: 8  },
  { top: "28%", left: "6%",  delay: 1.3,  size: 7  },
  { top: "22%", left: "88%", delay: 0.4,  size: 9  },
  { top: "72%", left: "9%",  delay: 1.8,  size: 8  },
  { top: "65%", left: "83%", delay: 0.9,  size: 10 },
  { top: "82%", left: "22%", delay: 2.1,  size: 7  },
  { top: "78%", left: "72%", delay: 1.5,  size: 8  },
];

/* ── SVG pieces ──────────────────────────────────── */
const HeartSVG = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

/* Decorative rose at top */
const RoseGraphic = () => (
  <svg width={52} height={52} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 0 8px rgba(244,63,94,0.5))" }}>
    {/* petals */}
    {[0,45,90,135,180,225,270,315].map((deg, i) => (
      <ellipse
        key={i}
        cx={50} cy={30} rx={10} ry={20}
        fill={i % 2 === 0 ? "rgba(244,63,94,0.75)" : "rgba(251,113,133,0.6)"}
        transform={`rotate(${deg} 50 50)`}
      />
    ))}
    {/* centre */}
    <circle cx={50} cy={50} r={12} fill="rgba(229,27,64,0.9)" />
    <circle cx={50} cy={50} r={6}  fill="rgba(255,180,190,0.7)" />
  </svg>
);

/* Corner decoration (top-left, rotated for others) */
const Corner = ({ rotate }: { rotate: number }) => (
  <svg
    width={36} height={36} viewBox="0 0 36 36"
    style={{ position: "absolute", opacity: 0.35, transform: `rotate(${rotate}deg)` }}
  >
    <path d="M2 34 L2 2 L34 2" fill="none" stroke="rgba(251,113,133,0.9)" strokeWidth={1.2} strokeLinecap="round" />
    <circle cx={2} cy={2} r={2.5} fill="rgba(251,113,133,0.8)" />
  </svg>
);

/* ── Animated word spans ─────────────────────────── */
const MESSAGE = "Every moment with you feels like a dream come true";
const WORDS = MESSAGE.split(" ");

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 1.8 } },
};
const wordVariant = {
  hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
  show:   { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: "easeOut" } },
};

/* ── Name letter stagger ─────────────────────────── */
const NAME = "Priya";
const nameContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.4 } },
};
const letterVariant = {
  hidden: { opacity: 0, y: -12, scale: 0.8 },
  show:   { opacity: 1, y: 0,   scale: 1,   transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

/* ════════════════════════════════════════════════════ */
export function LottieHearts() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0008" }}>
      <div
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
        <div className="absolute pointer-events-none" style={{
          top: 10, left: "50%", transform: "translateX(-50%)",
          width: 160, height: 110,
          background: "radial-gradient(ellipse, rgba(251,113,133,0.1) 0%, transparent 70%)",
          filter: "blur(14px)",
        }} />

        {/* Twinkling sparkles */}
        {SPARKLES.map((s, i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none select-none"
            style={{ top: s.top, left: s.left, fontSize: s.size, color: "#fda4af", lineHeight: 1 }}
            animate={{ opacity: [0.1, 0.8, 0.1], scale: [0.7, 1.2, 0.7] }}
            transition={{ duration: 2.2, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
          >
            ✦
          </motion.div>
        ))}

        {/* Floating hearts */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {HEARTS.map((h) => (
            <motion.div
              key={h.id}
              className="absolute"
              style={{ left: h.left + "%", bottom: 0 }}
              animate={{
                y: [-10, -450],
                x: [0, h.drift, -(h.drift / 2), h.drift / 3, 0],
                opacity: [0, h.opacity, h.opacity, 0],
                scale: [0.7, 1, 1.1, 0.85],
              }}
              transition={{ duration: h.duration, delay: h.delay, repeat: Infinity, ease: "easeInOut" }}
            >
              <HeartSVG size={h.size} color={HEART_COLORS[h.id % HEART_COLORS.length]} />
            </motion.div>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="relative h-full flex flex-col items-center justify-center text-center z-10 px-8">

          {/* Rose graphic */}
          <motion.div
            className="mb-3"
            initial={{ scale: 0, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <RoseGraphic />
            </motion.div>
          </motion.div>

          {/* "For" label */}
          <motion.span
            className="block uppercase tracking-[0.28em] font-medium mb-1"
            style={{ fontSize: 9, color: "rgba(253,164,175,0.5)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            For
          </motion.span>

          {/* Name — letter-by-letter stagger */}
          <motion.div
            className="flex items-center justify-center mb-1"
            variants={nameContainer}
            initial="hidden"
            animate="show"
          >
            {NAME.split("").map((char, i) => (
              <motion.span
                key={i}
                variants={letterVariant}
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 31,
                  fontWeight: 700,
                  color: "#fecdd3",
                  lineHeight: 1.15,
                  display: "inline-block",
                }}
              >
                {char}
              </motion.span>
            ))}
          </motion.div>

          {/* Name glow loop after stagger */}
          <motion.div
            style={{ position: "absolute", top: "43%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }}
            animate={{
              opacity: [0, 0.6, 0],
              scale: [0.8, 1.3, 0.8],
            }}
            transition={{ duration: 3.5, repeat: Infinity, delay: 1.2, ease: "easeInOut" }}
          >
            <div style={{ width: 120, height: 40, background: "radial-gradient(ellipse, rgba(244,63,94,0.4) 0%, transparent 70%)", filter: "blur(10px)" }} />
          </motion.div>

          {/* Divider */}
          <motion.div
            className="my-3"
            style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(251,113,133,0.45), transparent)" }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 70, opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.7, ease: "easeOut" }}
          />

          {/* Message — word by word */}
          <motion.p
            className="leading-relaxed"
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 13.5,
              fontStyle: "italic",
              color: "rgba(255,228,230,0.0)",
              maxWidth: 252,
            }}
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.span style={{ color: "rgba(255,228,230,0.55)", fontSize: 15 }} variants={wordVariant}>"</motion.span>
            {WORDS.map((word, i) => (
              <motion.span
                key={i}
                variants={wordVariant}
                style={{
                  display: "inline",
                  color: "rgba(255,228,230,0.88)",
                  fontFamily: "Georgia, serif",
                  fontSize: 13.5,
                  fontStyle: "italic",
                }}
              >
                {word}{i < WORDS.length - 1 ? " " : ""}
              </motion.span>
            ))}
            <motion.span style={{ color: "rgba(255,228,230,0.55)", fontSize: 15 }} variants={wordVariant}>"</motion.span>
          </motion.p>
        </div>

        {/* Watermark */}
        <motion.div
          className="absolute bottom-[18px] right-5 z-10"
          style={{ fontSize: 9.5, color: "rgba(253,164,175,0.3)", letterSpacing: "0.04em" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.5, duration: 0.8 }}
        >
          💙 HeartSync AI
        </motion.div>
      </div>
    </div>
  );
}
