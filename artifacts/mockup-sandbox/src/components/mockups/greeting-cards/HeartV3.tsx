/**
 * V3 — CINEMATIC DEPTH
 *
 * Axis explored: spatial composition / three depth planes.
 * Background: "PRIYA" at 160px as ghost text — name as atmosphere.
 * Midground: floating particles + graphic.
 * Foreground: intimate message in a frosted "polaroid" box.
 *
 * The name is everywhere and nowhere. You feel it before you read it.
 */
import { motion } from "framer-motion";

const BG_LETTERS = ["P","R","I","Y","A"];

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: 8 + (i * 14.8) % 82,
  y: 10 + (i * 11.3) % 78,
  size: 2 + (i % 3),
  dur: 4 + (i % 4) * 0.8,
  del: (i * 0.38) % 3.5,
  color: i % 3 === 0 ? "#fb7185" : i % 3 === 1 ? "#fda4af" : "#f472b6",
}));

const MESSAGE_WORDS = "Every moment with you feels like a dream come true".split(" ");
const wordC = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 2.8 } } };
const wordV = {
  hidden: { opacity: 0, y: 5 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export function HeartV3() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#07090e" }}>
      <div
        className="relative overflow-hidden rounded-3xl"
        style={{
          width: 340, height: 420,
          background: "linear-gradient(145deg, #080d18 0%, #0f1628 60%, #0a0d1e 100%)",
          border: "1px solid rgba(130,160,255,0.1)",
          boxShadow: "0 0 80px rgba(100,130,255,0.1), 0 30px 60px rgba(0,0,0,0.7)",
        }}
      >

        {/* ══ BACKGROUND PLANE: Ghost name ══ */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", pointerEvents: "none" }}>
          {BG_LETTERS.map((char, i) => (
            <motion.span
              key={i}
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 160,
                fontWeight: 900,
                color: "transparent",
                WebkitTextStroke: "1px rgba(130,160,255,0.12)",
                lineHeight: 1,
                display: "inline-block",
                userSelect: "none",
                position: "relative",
                zIndex: 1,
              }}
              initial={{ opacity: 0, scale: 1.2, filter: "blur(20px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ delay: 0.2 + i * 0.1, duration: 1.4, ease: "easeOut" }}
            >
              {char}
            </motion.span>
          ))}

          {/* Soft nebula glow over the ghost name */}
          <motion.div
            style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse at 50% 50%, rgba(100,130,255,0.07) 0%, transparent 65%)",
              filter: "blur(20px)",
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* ══ MIDDLE PLANE: Particles ══ */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 2, pointerEvents: "none" }}>
          {PARTICLES.map(p => (
            <motion.div
              key={p.id}
              style={{
                position: "absolute",
                left: p.x + "%", top: p.y + "%",
                width: p.size, height: p.size,
                borderRadius: "50%",
                background: p.color,
                boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
              }}
              animate={{ opacity: [0, 0.7, 0], scale: [0.5, 1.4, 0.5] }}
              transition={{ duration: p.dur, delay: p.del, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>

        {/* ══ FOREGROUND PLANE: Frosted message card ══ */}
        <motion.div
          style={{
            position: "absolute",
            bottom: 30, left: 24, right: 24,
            borderRadius: 16,
            background: "rgba(15,22,50,0.75)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(130,160,255,0.15)",
            padding: "20px 22px",
            zIndex: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(130,160,255,0.08)",
          }}
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* "for Priya" */}
          <motion.div
            style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.0, duration: 0.5 }}
          >
            <span style={{ fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(130,160,255,0.5)", fontFamily: "sans-serif" }}>for</span>
            <span style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: "rgba(200,215,255,0.95)", lineHeight: 1 }}>Priya</span>
          </motion.div>

          {/* Thin rule */}
          <motion.div
            style={{ height: 1, background: "linear-gradient(90deg, rgba(130,160,255,0.3), transparent)", marginBottom: 10 }}
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 2.3, duration: 0.5 }}
          />

          {/* Message */}
          <motion.p
            style={{ lineHeight: 1.6 }}
            variants={wordC}
            initial="hidden"
            animate="show"
          >
            {MESSAGE_WORDS.map((w, i) => (
              <motion.span
                key={i} variants={wordV}
                style={{ display: "inline", fontFamily: "Georgia, serif", fontSize: 13, fontStyle: "italic", color: "rgba(200,220,255,0.8)" }}
              >
                {w}{i < MESSAGE_WORDS.length - 1 ? " " : ""}
              </motion.span>
            ))}
          </motion.p>
        </motion.div>

        {/* Floating "Priya" top label — large, personal, top-left */}
        <motion.div
          style={{
            position: "absolute", top: 28, left: 28, zIndex: 5, pointerEvents: "none",
          }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.0, duration: 0.7, ease: "easeOut" }}
        >
          <p style={{ fontSize: 8, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(130,160,255,0.35)", fontFamily: "sans-serif", marginBottom: 2 }}>a note for</p>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 600, color: "rgba(200,215,255,0.7)", lineHeight: 1 }}>Priya</p>
        </motion.div>

        {/* Watermark */}
        <motion.div
          style={{ position: "absolute", bottom: 12, right: 18, fontSize: 9, color: "rgba(130,160,255,0.2)", letterSpacing: "0.05em", zIndex: 20 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4, duration: 1 }}
        >
          💙 HeartSync AI
        </motion.div>
      </div>
    </div>
  );
}
