/**
 * V2 — EDITORIAL LEFT
 *
 * Axis explored: spatial composition / asymmetric hierarchy.
 * Hard left alignment. The message is the visual hero at 18px.
 * "Priya" is almost a footnote — intimate, not announced.
 * A vertical rule anchors the left edge. Amber/gold tone.
 */
import { motion } from "framer-motion";

const MESSAGE_WORDS = [
  { text: "Every", size: 26, italic: true  },
  { text: "moment",size: 26, italic: true  },
  { text: "with",  size: 26, italic: true  },
  { text: "you",   size: 30, italic: true  },
  { text: "feels", size: 22, italic: false },
  { text: "like",  size: 22, italic: false },
  { text: "a",     size: 22, italic: false },
  { text: "dream", size: 28, italic: true  },
  { text: "come",  size: 22, italic: false },
  { text: "true.", size: 24, italic: false },
];

export function HeartV2() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#070508" }}>
      <div
        className="relative overflow-hidden rounded-3xl"
        style={{
          width: 340, height: 420,
          background: "linear-gradient(155deg, #0e0a14 0%, #1a1228 100%)",
          border: "1px solid rgba(255,200,100,0.1)",
          boxShadow: "0 0 60px rgba(200,140,255,0.07), 0 30px 60px rgba(0,0,0,0.7)",
        }}
      >
        {/* Vertical rule — draws top to bottom */}
        <motion.div
          style={{
            position: "absolute", left: 36, top: 32, width: 1,
            background: "linear-gradient(to bottom, rgba(255,200,100,0.6), rgba(255,200,100,0.1))",
            transformOrigin: "top",
          }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.9, ease: "easeInOut" }}
        >
          {/* Need height via a contained child */}
          <div style={{ height: 356 }} />
        </motion.div>

        {/* Content — left-padded */}
        <div style={{ position: "relative", padding: "42px 28px 28px 56px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>

          {/* Top section: small to/for */}
          <motion.p
            style={{ fontSize: 8.5, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,200,100,0.35)", fontFamily: "sans-serif" }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            For you
          </motion.p>

          {/* Middle section: message as hero */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 8, paddingBottom: 8 }}>
            <div style={{ lineHeight: 1.35 }}>
              {MESSAGE_WORDS.map((w, i) => (
                <motion.span
                  key={i}
                  style={{
                    display: "inline",
                    fontFamily: "Georgia, serif",
                    fontSize: w.size,
                    fontStyle: w.italic ? "italic" : "normal",
                    fontWeight: w.italic ? 400 : 600,
                    color: w.italic ? "rgba(255,255,255,0.9)" : "rgba(255,200,100,0.85)",
                    marginRight: 5,
                  }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.12, duration: 0.45, ease: "easeOut" }}
                >
                  {w.text}
                </motion.span>
              ))}
            </div>
          </div>

          {/* Bottom section: name — small, personal */}
          <div>
            <motion.div
              style={{ height: 1, marginBottom: 12, background: "linear-gradient(90deg, rgba(255,200,100,0.3), transparent)" }}
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 2.4, duration: 0.6, ease: "easeOut" }}
            />
            <motion.p
              style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,200,100,0.4)", fontFamily: "sans-serif", marginBottom: 4 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.6, duration: 0.5 }}
            >
              for
            </motion.p>
            <motion.p
              style={{ fontFamily: "Georgia, serif", fontSize: 38, fontWeight: 700, color: "rgba(255,255,255,0.92)", lineHeight: 1, letterSpacing: "-0.01em" }}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 2.8, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              Priya
            </motion.p>

            {/* Watermark */}
            <motion.p
              style={{ fontSize: 9, color: "rgba(255,200,100,0.2)", marginTop: 14, letterSpacing: "0.05em" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.8, duration: 0.8 }}
            >
              💛 HeartSync AI
            </motion.p>
          </div>
        </div>
      </div>
    </div>
  );
}
