import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { home } from "@/lib/audio";
import { trackEvent } from "@/lib/trackEvent";

const STEPS = [
  { num: "01", title: "Pick who it's for", desc: "Your partner, friend, date, or spouse. Tell us the relationship." },
  { num: "02", title: "Choose an occasion", desc: "I love you, sorry, thank you, or just to make them smile." },
  { num: "03", title: "Your card is ready", desc: "We craft a heartfelt message for you. Pick a style. Send or download." },
];

const TESTIMONIALS = [
  {
    quote: "I sent the 'I love you' card to my girlfriend and she cried (happy tears). She said it was the sweetest thing she had ever received.",
    name: "Rohan", city: "Pune", stars: 5,
  },
  {
    quote: "My best friend was going through a tough time. I sent the feel-good card and she called me immediately.",
    name: "Aditi", city: "Jaipur", stars: 5,
  },
  {
    quote: "Sent a sorry card after a fight. She loved it and we talked it out. Really helped break the ice.",
    name: "Karan", city: "Indore", stars: 5,
  },
  {
    quote: "My date was so impressed I sent something this thoughtful before we even met.",
    name: "Simran", city: "Lucknow", stars: 5,
  },
];

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

/* Mini orb positions for the home preview (4 orbs in a circle, radius ~65px) */
const PREVIEW_ORBS = ["💖", "✨", "🎉", "🌸"];
const PREVIEW_ORB_POSITIONS = PREVIEW_ORBS.map((_, i) => {
  const angle = (i / 4) * 2 * Math.PI - Math.PI / 2;
  return { x: Math.cos(angle) * 65, y: Math.sin(angle) * 65 };
});

const PREVIEW_BLURB = { emoji: "🐼", text: "Panda-sized birthday hugs!" };

/* One-shot page-level confetti that bursts from behind the preview on load */
const CONFETTI_PIECES = [
  { dx:  -55, dy: -420, color: "#FFD700", w: 6,  h: 14, rot: 120,  delay: 0.05, dur: 2.8 },
  { dx:   60, dy: -390, color: "#FF69B4", w: 5,  h: 11, rot: -95,  delay: 0.0,  dur: 3.0 },
  { dx: -130, dy: -310, color: "#A78BFA", w: 5,  h: 12, rot: 80,   delay: 0.1,  dur: 3.2 },
  { dx:  150, dy: -280, color: "#34D399", w: 4,  h: 10, rot: -110, delay: 0.05, dur: 2.9 },
  { dx:   -5, dy: -460, color: "#FFD700", w: 6,  h: 13, rot: 60,   delay: 0.12, dur: 2.7 },
  { dx:  220, dy: -200, color: "#FF69B4", w: 5,  h: 11, rot: -70,  delay: 0.0,  dur: 3.3 },
  { dx: -230, dy: -180, color: "#4FC3F7", w: 5,  h: 12, rot: 140,  delay: 0.08, dur: 3.1 },
  { dx:   95, dy: -430, color: "#FFAB40", w: 4,  h: 10, rot: -50,  delay: 0.15, dur: 2.6 },
  { dx: -100, dy: -400, color: "#F06292", w: 6,  h: 13, rot: 100,  delay: 0.02, dur: 3.0 },
  { dx:  310, dy:  -80, color: "#81D4FA", w: 5,  h: 11, rot: -130, delay: 0.1,  dur: 3.4 },
  { dx: -320, dy:  -60, color: "#FFD700", w: 4,  h: 9,  rot: 75,   delay: 0.06, dur: 3.2 },
  { dx:  170, dy: -360, color: "#A78BFA", w: 6,  h: 14, rot: -85,  delay: 0.0,  dur: 2.8 },
  { dx: -170, dy: -340, color: "#FF69B4", w: 5,  h: 11, rot: 115,  delay: 0.14, dur: 3.0 },
  { dx:  -30, dy:  200, color: "#FFD700", w: 5,  h: 12, rot: 45,   delay: 0.03, dur: 3.5 },
  { dx:   40, dy:  230, color: "#34D399", w: 4,  h: 10, rot: -60,  delay: 0.1,  dur: 3.3 },
  { dx: -260, dy:   80, color: "#4FC3F7", w: 5,  h: 12, rot: 90,   delay: 0.07, dur: 3.6 },
  { dx:  260, dy:   60, color: "#FFAB40", w: 4,  h: 9,  rot: -100, delay: 0.12, dur: 3.4 },
  { dx:  -80, dy: -480, color: "#FF69B4", w: 6,  h: 14, rot: 130,  delay: 0.0,  dur: 2.6 },
  { dx:   80, dy: -450, color: "#FFD700", w: 5,  h: 11, rot: -55,  delay: 0.09, dur: 2.9 },
  { dx:  370, dy:  120, color: "#F06292", w: 4,  h: 10, rot: 65,   delay: 0.04, dur: 3.7 },
  { dx: -370, dy:  100, color: "#A78BFA", w: 5,  h: 12, rot: -90,  delay: 0.11, dur: 3.5 },
  { dx:  130, dy:  310, color: "#81D4FA", w: 5,  h: 11, rot: 105,  delay: 0.06, dur: 3.8 },
  { dx: -140, dy:  290, color: "#FFD700", w: 4,  h: 9,  rot: -75,  delay: 0.13, dur: 3.6 },
  { dx:    5, dy: -500, color: "#FF69B4", w: 6,  h: 14, rot: 150,  delay: 0.01, dur: 2.7 },
  { dx:  -45, dy:  380, color: "#34D399", w: 5,  h: 12, rot: -40,  delay: 0.08, dur: 4.0 },
  { dx:   50, dy:  360, color: "#FFAB40", w: 4,  h: 10, rot: 85,   delay: 0.15, dur: 3.9 },
  { dx: -200, dy: -260, color: "#4FC3F7", w: 5,  h: 11, rot: -120, delay: 0.03, dur: 3.1 },
  { dx:  200, dy: -240, color: "#FFD700", w: 6,  h: 13, rot: 55,   delay: 0.1,  dur: 3.0 },
];

function PageConfetti() {
  const [fired, setFired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFired(true), 200);
    return () => clearTimeout(t);
  }, []);
  if (!fired) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none", overflow: "hidden" }}>
      {CONFETTI_PIECES.map((c, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            width: c.w,
            height: c.h,
            borderRadius: 2,
            background: c.color,
            originX: 0.5,
            originY: 0.5,
          }}
          initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.6 }}
          animate={{
            x: c.dx,
            y: c.dy,
            opacity: [0, 1, 1, 0],
            rotate: c.rot,
            scale: [0.6, 1.1, 1],
          }}
          transition={{ duration: c.dur, delay: c.delay, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

function CardIllustration() {
  /* seq: 0 = envelope, 1 = opening, 2 = orbs, 3 = finale */
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
      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-3xl blur-3xl scale-110"
        style={{ background: "radial-gradient(ellipse, rgba(255,215,0,0.48) 0%, rgba(255,120,0,0.22) 50%, transparent 75%)" }}
      />

      {/* Card container */}
      <div
        className="relative w-full h-full rounded-3xl overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at 50% 20%, #1a0a2e 0%, #0d0618 70%, #060310 100%)",
          border: "1.5px solid rgba(255,215,0,0.50)",
          boxShadow: "0 24px 56px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,215,0,0.22), 0 0 48px rgba(200,80,255,0.14)",
        }}
      >
        {/* Twinkling mini stars */}
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

        {/* ── PHASE 0/1: Golden Envelope ── */}
        <AnimatePresence>
          {(seq === 0 || seq === 1) && (
            <motion.div
              key="env"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: 120, transition: { duration: 0.45, ease: "easeIn" } }}
              style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}
            >
              {/* Pulsating headline */}
              <motion.p
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ fontSize: 11, fontWeight: 700, color: "#FFD700", letterSpacing: "0.06em", textAlign: "center" }}
              >
                ✨ A Surprise For You! ✨
              </motion.p>

              {/* Mini envelope */}
              <div style={{ position: "relative", width: 180, height: 112, filter: "drop-shadow(0 12px 24px rgba(255,165,0,0.4))" }}>
                {/* Body */}
                <div style={{
                  position: "absolute", inset: 0, borderRadius: 7,
                  background: "linear-gradient(145deg, #F5C518 0%, #FFD700 28%, #FFBC00 55%, #E8AA00 80%, #D4960A 100%)",
                  boxShadow: "inset 0 1px 4px rgba(255,255,255,0.3)",
                  overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #C49000, transparent 42%)", clipPath: "polygon(0 100%, 44% 52%, 0 4%)", opacity: 0.55 }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to left, #C49000, transparent 42%)", clipPath: "polygon(100% 100%, 56% 52%, 100% 4%)", opacity: 0.55 }} />
                  <div style={{ position: "absolute", inset: 0, background: "#B8870A", clipPath: "polygon(0 100%, 44% 52%, 56% 52%, 100% 100%)", opacity: 0.6 }} />
                  {/* To: label centered */}
                  <div style={{ position: "absolute", bottom: "10%", left: "50%", transform: "translateX(-50%)", fontFamily: "Georgia,serif", fontSize: 8, color: "rgba(80,40,0,0.7)", fontStyle: "italic", whiteSpace: "nowrap" }}>
                    To: <span style={{ fontWeight: 800, color: "rgba(45,18,0,0.9)" }}>Priya</span>
                  </div>
                </div>
                {/* Flap */}
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
                {/* Wax seal */}
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

              {/* Slider hint */}
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

        {/* ── PHASE 2: Orbs ── */}
        <AnimatePresence>
          {(seq === 2 || seq === 3) && (
            <motion.div
              key="orbs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: "absolute", inset: 0 }}
            >
              {/* Hint label */}
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
              {/* Orb blurb bubble — appears when one orb is "tapped" in the preview */}
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
              {/* Orbs */}
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

        {/* ── PHASE 3: Final mini card ── */}
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
                {/* Confetti — big burst */}
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

        {/* Bottom label */}
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ position: "absolute", bottom: 14, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "rgba(255,215,0,0.4)", letterSpacing: "0.1em" }}
        >
          ✦ HeartSync AI
        </motion.div>
      </div>

      {/* Floating sparkles around the card */}
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

/* ── Cosmic Stars Card Preview ───────────────────────────── */
const COSMIC_STARS = [
  { x: 14, y: 16 }, { x: 74, y: 11 }, { x: 88, y: 38 },
  { x: 52, y: 24 }, { x: 22, y: 58 }, { x: 81, y: 70 },
  { x: 11, y: 80 }, { x: 44, y: 84 },
];
const COSMIC_STAR_BURSTS = [
  { x: -130, y: -120 }, { x: 170, y: -100 }, { x: 200, y: 50 },
  { x: 100, y: -160 }, { x: -140, y: 70 }, { x: 160, y: 130 },
  { x: -120, y: 140 }, { x: 40, y: 180 },
];

function CosmicCardIllustration() {
  const [seq, setSeq] = useState(0);
  const [loopCount, setLoopCount] = useState(0);

  useEffect(() => {
    setSeq(0);
    const t1 = setTimeout(() => setSeq(1), 3000);
    const t2 = setTimeout(() => setSeq(2), 4800);
    const t3 = setTimeout(() => setSeq(3), 7600);
    const t4 = setTimeout(() => setLoopCount(c => c + 1), 11000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [loopCount]);

  return (
    <div className="relative w-72 h-96 select-none">
      {/* Ambient glow — deep purple */}
      <div
        className="absolute inset-0 rounded-3xl blur-3xl scale-110"
        style={{ background: "radial-gradient(ellipse, rgba(160,80,255,0.52) 0%, rgba(80,0,220,0.24) 50%, transparent 75%)" }}
      />

      {/* Card shell */}
      <div
        className="relative w-full h-full rounded-3xl overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at 50% 35%, #120728 0%, #080414 60%, #040208 100%)",
          border: "1.5px solid rgba(160,80,255,0.52)",
          boxShadow: "0 24px 56px rgba(0,0,0,0.80), 0 0 0 1px rgba(120,60,200,0.25), 0 0 48px rgba(120,40,255,0.18)",
        }}
      >
        {/* Background nebula */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 30% 40%, rgba(80,20,180,0.18) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(20,0,100,0.12) 0%, transparent 50%)",
        }} />

        {/* Stars */}
        {COSMIC_STARS.map((s, i) => {
          const burst = COSMIC_STAR_BURSTS[i];
          const scattered = seq >= 1;
          return (
            <motion.div
              key={i}
              animate={scattered ? {
                x: burst.x, y: burst.y,
                opacity: seq >= 2 ? 0 : [0.6, 1, 0.6],
                scale: seq >= 2 ? 0 : [1, 1.4, 1],
              } : {
                x: 0, y: 0,
                opacity: [0.3, 0.9, 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={scattered
                ? { duration: 0.65, ease: "easeOut" }
                : { duration: 1.8 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }
              }
              style={{
                position: "absolute",
                left: `${s.x}%`, top: `${s.y}%`,
                width: i % 3 === 0 ? 6 : 4, height: i % 3 === 0 ? 6 : 4,
                borderRadius: "50%",
                background: i % 2 === 0
                  ? "radial-gradient(circle, rgba(200,160,255,1) 0%, rgba(140,80,255,0.6) 100%)"
                  : "radial-gradient(circle, rgba(255,240,200,1) 0%, rgba(255,200,100,0.5) 100%)",
                boxShadow: `0 0 ${i % 3 === 0 ? 8 : 4}px rgba(180,120,255,0.8)`,
              }}
            />
          );
        })}

        {/* ── Phase 0: Hold hint ── */}
        <AnimatePresence>
          {seq === 0 && (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(120,60,255,0.25) 0%, rgba(80,20,180,0.1) 100%)",
                  border: "1.5px solid rgba(160,100,255,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
                }}
              >
                ✨
              </motion.div>
              <motion.p
                animate={{ opacity: [0.4, 0.85, 0.4] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{ fontSize: 11, color: "rgba(200,160,255,0.7)", letterSpacing: "0.08em", textAlign: "center" }}
              >
                Hold to reveal stars ✦
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Phase 2–3: Glowing message card ── */}
        <AnimatePresence>
          {seq >= 2 && (
            <motion.div
              key="msg"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 14, stiffness: 140, delay: 0.15 }}
              style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {/* Central glow */}
              <div style={{
                position: "absolute", width: 180, height: 180, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(120,60,255,0.22) 0%, transparent 70%)",
              }} />

              <div style={{
                width: 196, padding: "22px 18px",
                borderRadius: 20,
                background: "linear-gradient(145deg, rgba(100,40,220,0.12), rgba(60,10,150,0.08))",
                border: "1.5px solid rgba(160,100,255,0.35)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 16px 48px rgba(0,0,0,0.55), 0 0 32px rgba(100,40,255,0.15)",
                textAlign: "center", position: "relative",
              }}>
                {/* Top accent line */}
                <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 1.5, background: "linear-gradient(90deg, transparent, rgba(160,100,255,0.7), transparent)", borderRadius: 99 }} />

                <AnimatePresence>
                  {seq === 2 && (
                    <motion.p
                      key="sub2"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{ fontSize: 9, color: "rgba(200,160,255,0.55)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}
                    >
                      A message from the stars
                    </motion.p>
                  )}
                </AnimatePresence>

                <p style={{ fontSize: 26, marginBottom: 8 }}>💫</p>
                <p style={{ fontSize: 17, fontWeight: 800, color: "rgba(255,255,255,0.9)", fontFamily: "Georgia,serif", marginBottom: 8 }}>Priya</p>

                <AnimatePresence>
                  {seq === 3 && (
                    <motion.p
                      key="quote"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      style={{ fontSize: 10, color: "rgba(220,200,255,0.75)", fontStyle: "italic", fontFamily: "Georgia,serif", lineHeight: 1.6 }}
                    >
                      "You light up my universe."
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Floating micro-stars in finale */}
                {seq === 3 && [
                  { top: "-8%", left: "10%", d: 0 }, { top: "-6%", right: "14%", d: 0.2 },
                  { bottom: "-6%", left: "18%", d: 0.4 }, { bottom: "-8%", right: "8%", d: 0.1 },
                ].map((p, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                    transition={{ duration: 1.4, delay: p.d, repeat: Infinity, repeatDelay: 1.2 }}
                    style={{ position: "absolute", fontSize: 10, ...p }}
                  >
                    ✦
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom label */}
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3.5, repeat: Infinity }}
          style={{ position: "absolute", bottom: 14, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "rgba(160,100,255,0.4)", letterSpacing: "0.1em" }}
        >
          ✦ HeartSync AI
        </motion.div>
      </div>

      {/* Floating sparkles */}
      {[
        { top: "-6%", left: "-8%", size: 18, delay: 0.5 },
        { top: "28%", right: "-12%", size: 13, delay: 1.0 },
        { bottom: "-5%", right: "-7%", size: 20, delay: 0.2 },
      ].map((s, i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 2.6 + i * 0.7, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
          style={{ position: "absolute", ...s, fontSize: s.size, color: "rgba(160,100,255,0.65)" }}
        >
          ✦
        </motion.div>
      ))}
    </div>
  );
}

/* ── 2-Card Carousel ─────────────────────────────────────── */
function CardCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive(a => (a + 1) % 2), 12000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: 288, height: 384 }}>
        <AnimatePresence mode="wait">
          {active === 0 ? (
            <motion.div
              key="env"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <CardIllustration />
            </motion.div>
          ) : (
            <motion.div
              key="cosmic"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <CosmicCardIllustration />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-2">
        {[0, 1].map(i => (
          <button
            key={i}
            onClick={() => setActive(i)}
            style={{
              width: i === active ? 20 : 6,
              height: 6, borderRadius: 99,
              background: i === active ? "rgba(255,215,0,0.7)" : "rgba(255,255,255,0.15)",
              border: "none", cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const guideCta = "/date-guide";

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref === "card") {
      try { localStorage.setItem("hs_from_card", "1"); } catch { /* ignore */ }
      trackEvent({ event: "website_visited_from_card" });
    }
  }, []);


  return (
    <div className="min-h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary/30">
      <PageConfetti />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[55%] h-[55%] rounded-full bg-primary/15 blur-[130px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/15 blur-[160px]" />
        <div className="absolute top-[30%] right-[0%] w-[40%] h-[40%] rounded-full bg-accent/8 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-6 pb-20">
        {/* Header */}
        <header className="flex justify-between items-center mb-3 md:mb-20">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-primary to-secondary p-2 rounded-xl">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              HeartSync AI
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-white/40 hover:text-white/70 hover:bg-transparent text-sm px-3 h-auto py-1.5">
              <Link href={guideCta} onClick={() => home.navTap()}>Date Guide</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 text-sm px-4 h-auto py-1.5 text-white/70">
              <Link href="/sign-in" onClick={() => home.navTap()}>Log in</Link>
            </Button>
          </div>
        </header>

        {/* HERO */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="mb-28"
        >
          {/* ── Mobile layout (< md): headline first, card, then CTA ── */}
          <div className="md:hidden flex flex-col items-center pt-2">

            {/* 1. Headline at the top */}
            <h1 className="text-4xl font-extrabold tracking-tight leading-[1.08] mb-2 text-white text-center">
              Send love<br />in a card.
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/8 mb-3">
              <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-xs font-medium text-primary">2 cards free. Try now.</span>
            </div>

            {/* 2. Envelope preview — larger & more prominent */}
            <div style={{ position: "relative", transform: "scale(0.82)", transformOrigin: "top center", marginBottom: -60 }}>
              <div style={{ position: "relative", zIndex: 1 }}>
                <CardIllustration />
              </div>
            </div>

            {/* 3. Subtitle + CTA + social proof */}
            <div className="w-full px-1">
              <p className="text-xs font-semibold mb-4 mt-2 tracking-wide text-center" style={{ color: "rgba(255,215,0,0.6)" }}>
                Personalised &nbsp;·&nbsp; 100+ Templates &nbsp;·&nbsp; All Occasions
              </p>

              {/* Explainer steps */}
              <div className="flex items-center justify-center gap-1.5 mb-5 flex-wrap">
                {[
                  "Pick who it's for",
                  "→",
                  "We write the message",
                  "→",
                  "Share the link",
                ].map((item, i) => (
                  <span key={i} className="text-xs font-medium" style={{
                    color: item === "→" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.55)",
                    letterSpacing: item === "→" ? 0 : "0.01em",
                  }}>{item}</span>
                ))}
              </div>

              <div className="relative w-full">
                <motion.span className="absolute -top-3 left-[10%] text-yellow-300 text-xs pointer-events-none z-10"
                  animate={{ scale:[0,1.3,0], opacity:[0,1,0] }}
                  transition={{ duration:0.9, repeat:Infinity, repeatDelay:2.6, ease:"easeInOut" }}>✦</motion.span>
                <motion.span className="absolute -top-3 right-[16%] text-yellow-200 text-sm pointer-events-none z-10"
                  animate={{ scale:[0,1.0,0], opacity:[0,0.9,0] }}
                  transition={{ duration:1.1, repeat:Infinity, repeatDelay:2.0, delay:0.9, ease:"easeInOut" }}>✦</motion.span>
                <motion.span className="absolute -bottom-2 right-[28%] text-pink-300 text-xs pointer-events-none z-10"
                  animate={{ scale:[0,1.1,0], opacity:[0,1,0] }}
                  transition={{ duration:0.8, repeat:Infinity, repeatDelay:2.9, delay:1.6, ease:"easeInOut" }}>✦</motion.span>
                <Button
                  asChild
                  size="lg"
                  className="w-full rounded-2xl h-13 text-sm sm:text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white shadow-[0_0_40px_-10px_rgba(236,72,153,0.6)] transition-all relative overflow-hidden"
                >
                  <Link href="/send" className="flex items-center justify-center gap-2" onClick={() => home.cta()}>
                    <motion.span className="absolute inset-0 -skew-x-12 pointer-events-none"
                      style={{ background:"linear-gradient(to right, transparent 0%, rgba(255,255,255,0.0) 20%, rgba(255,255,255,0.42) 40%, rgba(255,255,255,0.42) 60%, rgba(255,255,255,0.0) 80%, transparent 100%)" }}
                      animate={{ x:["-130%","130%"] }}
                      transition={{ duration:2.8, repeat:Infinity, repeatDelay:0.6, ease:"easeInOut" }} />
                    <span className="relative z-10 flex items-center gap-2">
                      Send a card in 20 seconds — Free
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </span>
                  </Link>
                </Button>
              </div>

              <div className="flex items-center justify-center gap-3 mt-3" style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
                <div className="flex -space-x-1.5">
                  {["#f472b6","#fb923c","#a78bfa","#34d399","#60a5fa"].map((c, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-background" style={{ background: c }} />
                  ))}
                </div>
                <p className="text-xs text-white/30">3,200+ cards sent this month</p>
              </div>
            </div>
          </div>

          {/* ── Desktop layout (md+): side-by-side ── */}
          <div className="hidden md:grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/8 mb-7">
                <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-xs font-medium text-primary">2 cards free. Try now.</span>
              </div>

              <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-4 text-white">
                Send love in<br />a card.
              </h1>

              <p className="text-sm font-semibold mb-5 tracking-wide" style={{ color: "rgba(255,215,0,0.65)" }}>
                Personalised &nbsp;·&nbsp; 100+ Unique Templates &nbsp;·&nbsp; All Occasions
              </p>

              <p className="text-sm text-white/40 mb-10 leading-relaxed max-w-sm">
                We write the perfect heartfelt message for you. Pick a style. Share in 60 seconds.
              </p>

              {/* Explainer steps */}
              <div className="flex items-center gap-2 mb-7 flex-wrap">
                {[
                  "Pick who it's for",
                  "→",
                  "We write the message",
                  "→",
                  "Share the link",
                ].map((item, i) => (
                  <span key={i} className="text-sm font-medium" style={{
                    color: item === "→" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)",
                    letterSpacing: item === "→" ? 0 : "0.01em",
                  }}>{item}</span>
                ))}
              </div>

              <div className="mb-10 relative inline-block">
                <motion.span className="absolute -top-3 left-[8%] text-yellow-300 text-xs pointer-events-none z-10"
                  animate={{ scale:[0,1.3,0], opacity:[0,1,0] }}
                  transition={{ duration:0.9, repeat:Infinity, repeatDelay:2.6, ease:"easeInOut" }}>✦</motion.span>
                <motion.span className="absolute -top-3 right-[12%] text-yellow-200 text-sm pointer-events-none z-10"
                  animate={{ scale:[0,1.0,0], opacity:[0,0.9,0] }}
                  transition={{ duration:1.1, repeat:Infinity, repeatDelay:2.0, delay:0.9, ease:"easeInOut" }}>✦</motion.span>
                <motion.span className="absolute -bottom-2 right-[22%] text-pink-300 text-xs pointer-events-none z-10"
                  animate={{ scale:[0,1.1,0], opacity:[0,1,0] }}
                  transition={{ duration:0.8, repeat:Infinity, repeatDelay:2.9, delay:1.6, ease:"easeInOut" }}>✦</motion.span>
                <Button
                  asChild
                  size="lg"
                  className="rounded-2xl h-14 px-8 text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white shadow-[0_0_50px_-12px_rgba(236,72,153,0.6)] transition-all relative overflow-hidden"
                >
                  <Link href="/send" className="flex items-center gap-2" onClick={() => home.cta()}>
                    <motion.span className="absolute inset-0 -skew-x-12 pointer-events-none"
                      style={{ background:"linear-gradient(to right, transparent 0%, rgba(255,255,255,0.0) 20%, rgba(255,255,255,0.42) 40%, rgba(255,255,255,0.42) 60%, rgba(255,255,255,0.0) 80%, transparent 100%)" }}
                      animate={{ x:["-130%","130%"] }}
                      transition={{ duration:2.8, repeat:Infinity, repeatDelay:0.6, ease:"easeInOut" }} />
                    <span className="relative z-10 flex items-center gap-2">
                      Send a card in 20 seconds — Free
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </span>
                  </Link>
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {["#f472b6","#fb923c","#a78bfa","#34d399","#60a5fa"].map((c, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-background" style={{ background: c }} />
                  ))}
                </div>
                <p className="text-xs text-white/30">3,200+ cards sent this month</p>
              </div>
            </div>

            <div className="flex justify-center md:justify-start md:pl-4">
              <div style={{ position: "relative" }}>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <CardIllustration />
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* How it works */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mb-28"
        >
          <p className="text-white/20 text-xs font-semibold uppercase tracking-[0.2em] text-center mb-10">How it works</p>
          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 + i * 0.1 }}
                className="p-6 rounded-3xl bg-white/[0.025] border border-white/[0.05] relative overflow-hidden"
              >
                <div className="absolute top-3 right-4 text-6xl font-black text-white/[0.025] select-none leading-none">{s.num}</div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-sm font-bold text-white bg-gradient-to-br from-primary to-secondary">
                  {parseInt(s.num)}
                </div>
                <h3 className="text-base font-semibold text-white/90 mb-2">{s.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Testimonials */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-20"
        >
          <p className="text-white/20 text-xs font-semibold uppercase tracking-[0.2em] text-center mb-8">What people are saying</p>
          <div className="grid md:grid-cols-2 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 + i * 0.08 }}
                className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.055]"
              >
                <StarRow count={t.stars} />
                <p className="text-sm text-white/60 leading-relaxed mt-3 mb-3">"{t.quote}"</p>
                <p className="text-xs text-white/25 font-medium">{t.name}, {t.city}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Date Guide — quiet footer mention */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="text-center py-8 border-t border-white/[0.05]"
        >
          <p className="text-white/25 text-sm mb-2">Also from HeartSync</p>
          <p className="text-white/40 text-sm mb-5 max-w-md mx-auto leading-relaxed">
            Going on a date? We put together a personalised guide for you — conversation starters, the right questions, and confidence tips. First guide free.
          </p>
          <Button asChild variant="ghost" className="rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 text-sm px-5 h-10">
            <Link href={guideCta} className="flex items-center gap-2">
              Try the Date Guide
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </Button>
        </motion.section>
      </div>
    </div>
  );
}
