/**
 * V1 — THE NAME IS THE CARD
 *
 * Axis explored: spatial composition / name as visual protagonist.
 * "Priya" at 96px owns the entire card. No decoration, no icons,
 * no corner brackets. Just the name breathing in negative space.
 * The message subordinates completely.
 */
import { motion } from "framer-motion";

const NAME_LETTERS = ["P","r","i","y","a"];
const MESSAGE_WORDS = "Every moment with you feels like a dream come true".split(" ");

const wordC = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 2.8 } } };
const wordV = {
  hidden: { opacity: 0, filter: "blur(6px)" },
  show:   { opacity: 1, filter: "blur(0px)", transition: { duration: 0.5, ease: "easeOut" } },
};

export function HeartV1() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#07070e" }}>
      <div
        className="relative overflow-hidden rounded-3xl flex flex-col items-center justify-center"
        style={{
          width: 340, height: 420,
          background: "#0c0c18",
          border: "1px solid rgba(255,210,140,0.08)",
          boxShadow: "0 0 80px rgba(255,180,80,0.06), 0 30px 60px rgba(0,0,0,0.7)",
        }}
      >
        {/* Ambient glow behind name — breathes */}
        <motion.div
          style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -60%)",
            width: 320, height: 180,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(255,190,90,0.09) 0%, transparent 70%)",
            filter: "blur(30px)",
            pointerEvents: "none",
          }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.92, 1.06, 0.92] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* "A message for" — ultra small, almost invisible */}
        <motion.p
          style={{
            fontSize: 8, letterSpacing: "0.35em", textTransform: "uppercase",
            color: "rgba(255,210,140,0.25)", fontFamily: "sans-serif",
            marginBottom: 8, position: "relative", zIndex: 2,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 1.2 }}
        >
          a message for
        </motion.p>

        {/* THE NAME — each letter fades + scales in */}
        <div
          style={{
            display: "flex", alignItems: "baseline", gap: 0,
            position: "relative", zIndex: 2, marginBottom: 24,
          }}
        >
          {NAME_LETTERS.map((char, i) => (
            <motion.span
              key={i}
              style={{
                fontFamily: "'Georgia', serif",
                fontSize: 96,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: "#fff",
                display: "inline-block",
              }}
              initial={{ opacity: 0, scale: 0.6, filter: "blur(14px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{
                delay: 0.5 + i * 0.14,
                duration: 0.9,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {char}
            </motion.span>
          ))}
        </div>

        {/* Thin gold rule — draws itself */}
        <motion.div
          style={{
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(255,210,140,0.4), transparent)",
            position: "relative", zIndex: 2, marginBottom: 20,
          }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 180, opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.9, ease: "easeOut" }}
        />

        {/* Message — word by word, small, centered */}
        <motion.p
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 12,
            fontStyle: "italic",
            lineHeight: 1.7,
            textAlign: "center",
            maxWidth: 220,
            position: "relative", zIndex: 2,
          }}
          variants={wordC}
          initial="hidden"
          animate="show"
        >
          <motion.span variants={wordV} style={{ color: "rgba(255,210,140,0.4)", fontSize: 14 }}>"</motion.span>
          {MESSAGE_WORDS.map((w, i) => (
            <motion.span
              key={i} variants={wordV}
              style={{ display: "inline", color: "rgba(255,255,255,0.55)", fontFamily: "Georgia, serif", fontSize: 12, fontStyle: "italic" }}
            >
              {w}{i < MESSAGE_WORDS.length - 1 ? " " : ""}
            </motion.span>
          ))}
          <motion.span variants={wordV} style={{ color: "rgba(255,210,140,0.4)", fontSize: 14 }}>"</motion.span>
        </motion.p>

        {/* Watermark */}
        <motion.div
          style={{
            position: "absolute", bottom: 18, right: 20,
            fontSize: 9, color: "rgba(255,210,140,0.18)", letterSpacing: "0.05em",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4.5, duration: 1 }}
        >
          💛 HeartSync AI
        </motion.div>
      </div>
    </div>
  );
}
