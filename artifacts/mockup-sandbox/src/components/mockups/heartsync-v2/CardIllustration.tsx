import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PREVIEW_ORBS = ["💖", "✨", "🎉", "🌸"];
const PREVIEW_ORB_POSITIONS = PREVIEW_ORBS.map((_, i) => {
  const angle = (i / 4) * 2 * Math.PI - Math.PI / 2;
  return { x: Math.cos(angle) * 65, y: Math.sin(angle) * 65 };
});

const PREVIEW_BLURB = { emoji: "🐼", text: "Panda-sized birthday hugs!" };

export function CardIllustration() {
  const [seq, setSeq] = useState(0);
  const [showBlurb, setShowBlurb] = useState(false);
  const [loopCount, setLoopCount] = useState(0);

  useEffect(() => {
    setSeq(0);
    setShowBlurb(false);
    const t1 = setTimeout(() => setSeq(1), 1400);
    const t2 = setTimeout(() => setSeq(2), 2100);
    const t3 = setTimeout(() => setShowBlurb(true), 2850);
    const t4 = setTimeout(() => setShowBlurb(false), 3500);
    const t5 = setTimeout(() => setSeq(3), 3700);
    const t6 = setTimeout(() => setLoopCount(c => c + 1), 5400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); clearTimeout(t6); };
  }, [loopCount]);

  return (
    <div className="relative w-72 h-96 select-none">
      <div
        className="absolute inset-0 rounded-3xl blur-3xl scale-110"
        style={{ background: "radial-gradient(ellipse, rgba(255,215,0,0.48) 0%, rgba(255,120,0,0.22) 50%, transparent 75%)" }}
      />

      <div
        className="relative w-full h-full rounded-3xl overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at 50% 20%, #1a0a2e 0%, #0d0618 70%, #060310 100%)",
          border: "1.5px solid rgba(255,215,0,0.50)",
          boxShadow: "0 24px 56px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,215,0,0.22), 0 0 48px rgba(200,80,255,0.14)",
        }}
      >
        {[
          { t: "18%", l: "12%", d: 0.4 }, { t: "8%", l: "65%", d: 1.2 },
          { t: "72%", l: "82%", d: 0.8 }, { t: "85%", l: "22%", d: 1.8 },
          { t: "42%", l: "90%", d: 0.2 }, { t: "55%", l: "5%", d: 2.5 },
        ].map((s, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.1, 0.6, 0.1] }}
            transition={{ duration: 2.2 + i * 0.4, delay: s.d, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", top: s.t, left: s.l, width: 2, height: 2, borderRadius: "50%", background: "white" }}
          />
        ))}

        <AnimatePresence>
          {(seq === 0 || seq === 1) && (
            <motion.div
              key="env"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: 120, transition: { duration: 0.45, ease: "easeIn" } }}
              style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}
            >
              <motion.p
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ fontSize: 11, fontWeight: 700, color: "#FFD700", letterSpacing: "0.06em", textAlign: "center" }}
              >
                ✨ A Surprise For You! ✨
              </motion.p>

              <div style={{ position: "relative", width: 180, height: 112, filter: "drop-shadow(0 12px 24px rgba(255,165,0,0.4))" }}>
                <div style={{
                  position: "absolute", inset: 0, borderRadius: 7,
                  background: "linear-gradient(145deg, #F5C518 0%, #FFD700 28%, #FFBC00 55%, #E8AA00 80%, #D4960A 100%)",
                  boxShadow: "inset 0 1px 4px rgba(255,255,255,0.3)",
                  overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #C49000, transparent 42%)", clipPath: "polygon(0 100%, 44% 52%, 0 4%)", opacity: 0.55 }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to left, #C49000, transparent 42%)", clipPath: "polygon(100% 100%, 56% 52%, 100% 4%)", opacity: 0.55 }} />
                  <div style={{ position: "absolute", inset: 0, background: "#B8870A", clipPath: "polygon(0 100%, 44% 52%, 56% 52%, 100% 100%)", opacity: 0.6 }} />
                  <div style={{ position: "absolute", bottom: "10%", left: "50%", transform: "translateX(-50%)", fontFamily: "Georgia,serif", fontSize: 8, color: "rgba(80,40,0,0.7)", fontStyle: "italic", whiteSpace: "nowrap" }}>
                    To: <span style={{ fontWeight: 800, color: "rgba(45,18,0,0.9)" }}>Priya</span>
                  </div>
                </div>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "56%", perspective: 400, perspectiveOrigin: "50% 0%", zIndex: 10 }}>
                  <motion.div
                    animate={seq === 1 ? { rotateX: -175 } : { rotateX: 0 }}
                    transition={{ type: "spring", damping: 10, stiffness: 100 }}
                    style={{ width: "100%", height: "100%", transformOrigin: "50% 0%", transformStyle: "preserve-3d", position: "relative" }}
                  >
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(172deg, #E8B800 0%, #D4A000 45%, #C49000 100%)", clipPath: "polygon(0 0, 100% 0, 50% 88%)", borderRadius: "7px 7px 0 0", backfaceVisibility: "hidden" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, #FFE566 0%, #FFCC00 100%)", clipPath: "polygon(0 0, 100% 0, 50% 88%)", transform: "rotateX(180deg)", backfaceVisibility: "hidden" }} />
                  </motion.div>
                </div>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 5 }}>
                  <motion.div
                    animate={seq === 1 ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      width: 30, height: 30, borderRadius: "50%",
                      background: "radial-gradient(circle at 38% 33%, #A82020, #7A0A0A 58%, #4A0000 92%)",
                      boxShadow: "0 2px 8px rgba(80,0,0,0.6), inset 0 1px 2px rgba(255,140,140,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative", overflow: "hidden",
                    }}
                  >
                    <div style={{ position: "absolute", inset: "12%", borderRadius: "50%", border: "1px solid rgba(255,160,160,0.18)" }} />
                    <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 10, color: "rgba(255,210,210,0.6)", zIndex: 2 }}>H</span>
                  </motion.div>
                </div>
              </div>

              <div style={{
                width: 160, height: 28, borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,215,0,0.2)",
                display: "flex", alignItems: "center",
                paddingLeft: 32, fontSize: 9,
                color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em",
                position: "relative",
              }}>
                <div style={{ position: "absolute", left: 4, top: 4, width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg, #FFD700, #FFA500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>→</div>
                Slide to unlock →
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(seq === 2 || seq === 3) && (
            <motion.div
              key="orbs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: "absolute", inset: 0 }}
            >
              {seq === 2 && !showBlurb && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ position: "absolute", top: 18, left: 0, right: 0, textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}
                >
                  Tap the orbs! ✨
                </motion.p>
              )}
              <AnimatePresence>
                {showBlurb && (
                  <motion.div
                    key="blurb"
                    initial={{ scale: 0.8, opacity: 0, y: -6 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.85, opacity: 0, y: -4 }}
                    transition={{ type: "spring", damping: 18, stiffness: 320 }}
                    style={{
                      position: "absolute",
                      top: 14, left: 12, right: 12,
                      padding: "10px 12px",
                      borderRadius: 14,
                      background: "rgba(8, 4, 18, 0.92)",
                      border: "1px solid rgba(255,215,0,0.3)",
                      backdropFilter: "blur(16px)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      zIndex: 30,
                    }}
                  >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{PREVIEW_BLURB.emoji}</span>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.88)", fontStyle: "italic", lineHeight: 1.5, margin: 0 }}>
                      "{PREVIEW_BLURB.text}"
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {PREVIEW_ORBS.map((emoji, i) => {
                  const pos = PREVIEW_ORB_POSITIONS[i];
                  const exploding = seq === 3;
                  return (
                    <motion.div
                      key={i}
                      initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                      animate={exploding
                        ? { x: pos.x * 5, y: pos.y * 5, scale: 0, opacity: 0 }
                        : { x: pos.x, y: pos.y, scale: 1, opacity: 1 }
                      }
                      transition={exploding
                        ? { duration: 0.5, ease: "easeIn", delay: i * 0.06 }
                        : { type: "spring", damping: 16, stiffness: 200, delay: i * 0.08 }
                      }
                      style={{
                        position: "absolute", width: 52, height: 52,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,165,0,0.1))",
                        border: "1.5px solid rgba(255,215,0,0.4)",
                        backdropFilter: "blur(6px)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 20,
                        marginLeft: -21, marginTop: -21,
                      }}
                    >
                      <motion.span
                        animate={{ y: [-2, 2, -2] }}
                        transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
                      >
                        {emoji}
                      </motion.span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {seq === 3 && (
            <motion.div
              key="finale"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 14, stiffness: 160, delay: 0.5 }}
              style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 20,
              }}
            >
              <div style={{
                width: 200, padding: "20px 18px",
                borderRadius: 18,
                background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,215,0,0.06))",
                border: "1.5px solid rgba(255,215,0,0.35)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.5), 0 0 40px rgba(255,215,0,0.1)",
                textAlign: "center",
                position: "relative",
              }}>
                <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 1.5, background: "linear-gradient(90deg, transparent, #FFD700, transparent)", borderRadius: 99 }} />
                <p style={{ fontSize: 9, color: "rgba(255,215,0,0.6)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Happy Birthday</p>
                <p style={{ fontSize: 22, marginBottom: 6 }}>🎉</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: "white", fontFamily: "Georgia,serif", marginBottom: 8 }}>Priya</p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontStyle: "italic", fontFamily: "Georgia,serif", lineHeight: 1.6 }}>
                  "Wishing you all the happiness in the world."
                </p>
                {[
                  "#FFD700","#FF69B4","#A78BFA","#34D399","#4FC3F7",
                  "#FFD700","#FF69B4","#FF4444","#FFAB40","#81D4FA",
                  "#FFD700","#F06292","#A78BFA","#34D399",
                ].map((c, i) => {
                  const xOff = -90 + (i % 7) * 28;
                  const sz = i % 3 === 0 ? 6 : i % 3 === 1 ? 4 : 3;
                  const rot = (i % 2 === 0 ? 1 : -1) * (25 + i * 12);
                  return (
                    <motion.div
                      key={i}
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 80 + (i % 3) * 22, opacity: [0, 1, 1, 0], rotate: rot }}
                      transition={{ duration: 1.4, delay: 0.45 + i * 0.07, repeat: Infinity, repeatDelay: 1.2 }}
                      style={{ position: "absolute", top: 0, left: "50%", width: sz, height: sz * 2.8, borderRadius: 2, background: c, marginLeft: xOff }}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ position: "absolute", bottom: 14, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "rgba(255,215,0,0.4)", letterSpacing: "0.1em" }}
        >
          ✦ HeartSync AI
        </motion.div>
      </div>

      {[
        { top: "-6%", right: "-6%", size: 22, delay: 0 },
        { top: "35%", right: "-12%", size: 14, delay: 1.2 },
        { bottom: "-4%", left: "-8%", size: 18, delay: 0.7 },
      ].map((s, i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.5 + i * 0.8, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
          style={{ position: "absolute", ...s, fontSize: s.size }}
        >
          ✦
        </motion.div>
      ))}
    </div>
  );
}
