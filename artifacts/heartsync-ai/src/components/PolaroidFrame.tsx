import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const FRAMED_W = 200;
const FRAMED_H = 260;

interface Props {
  src: string;
  isFramed: boolean;
}

export default function PolaroidFrame({ src, isFramed }: Props) {
  // `revealing` flips true after a short fixed delay — no waiting for decode
  const [revealing, setRevealing] = useState(false);

  const sketchW = typeof window !== "undefined" ? Math.min(280, window.innerWidth * 0.75) : 260;
  const sketchH = sketchW * 1.28;
  const w = isFramed ? FRAMED_W : sketchW;
  const h = isFramed ? FRAMED_H : sketchH;

  // Start the top-to-bottom reveal 200 ms after mounting in sketch mode.
  // We don't wait for decode() — the preload in card.tsx fills the cache
  // while the user is on the envelope, so the image is usually ready.
  useEffect(() => {
    if (isFramed) return;
    const t = setTimeout(() => setRevealing(true), 200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  return (
    <motion.div
      initial={{ opacity: 0, width: w, height: h }}
      animate={{ opacity: 1, width: w, height: h }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
      transition={{
        opacity: { duration: 0.3 },
        width: { type: "spring", damping: 24, stiffness: 180 },
        height: { type: "spring", damping: 24, stiffness: 180 },
      }}
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        x: "-50%",
        y: "-50%",
        zIndex: 30,
        pointerEvents: "none",
      }}
    >
      {/* Photo container — overflow:hidden clips the reveal */}
      <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: 6, position: "relative" }}>
        <motion.div
          initial={{ clipPath: isFramed ? "inset(0% 0% 0% 0%)" : "inset(0% 0% 100% 0%)" }}
          animate={{ clipPath: (revealing || isFramed) ? "inset(0% 0% 0% 0%)" : "inset(0% 0% 100% 0%)" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ width: "100%", height: "100%" }}
        >
          <img
            src={src}
            alt="photo"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              filter: isFramed ? "none" : "grayscale(1) contrast(2.1) brightness(1.18)",
              transition: "filter 0.9s ease",
            }}
          />
        </motion.div>
      </div>

      {/* ✏️ Pen — sibling so it escapes overflow:hidden */}
      {!isFramed && (
        <motion.div
          initial={{ y: -16, opacity: 1 }}
          animate={{ y: revealing ? h : -16, opacity: revealing ? 0 : 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            transform: "translateX(-50%)",
            fontSize: 30,
            lineHeight: 1,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          ✏️
        </motion.div>
      )}

      {/* Animated SVG border — only in framed mode */}
      {isFramed && (
        <motion.svg
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1 }}
          style={{
            position: "absolute",
            top: -5,
            left: -5,
            overflow: "visible",
            pointerEvents: "none",
            zIndex: 5,
          }}
          width={FRAMED_W + 10}
          height={FRAMED_H + 10}
        >
          <motion.rect
            x={3} y={3}
            width={FRAMED_W + 4} height={FRAMED_H + 4}
            rx={8} ry={8}
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.25 }}
          />
          <motion.rect
            x={3} y={3}
            width={FRAMED_W + 4} height={FRAMED_H + 4}
            rx={8} ry={8}
            fill="none"
            stroke="rgba(168,85,247,0.35)"
            strokeWidth={5}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
          />
        </motion.svg>
      )}
    </motion.div>
  );
}
