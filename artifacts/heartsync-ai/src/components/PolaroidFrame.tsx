import { useState, useRef } from "react";
import { motion } from "framer-motion";

interface Props {
  src: string;
  isFramed?: boolean; // unused, kept for call-site compat
}

export default function PolaroidFrame({ src }: Props) {
  // Always show the ring immediately; image fills in when it loads from the
  // preload cache. Starting as `true` means the spring animation fires on
  // mount regardless of network latency.
  const [loaded] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  return (
    <motion.div
      key="polaroid"
      initial={{ scale: 0.05, opacity: 0 }}
      animate={loaded ? { scale: 1, opacity: 1 } : { scale: 0.05, opacity: 0 }}
      exit={{ scale: 0.7, opacity: 0, transition: { duration: 0.3 } }}
      transition={{ type: "spring", damping: 18, stiffness: 200 }}
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        x: "-50%",
        y: "-50%",
        zIndex: 30,
        pointerEvents: "none",
        width: 220,
        height: 220,
      }}
    >
      {/* Outer glow pulse */}
      <motion.div
        animate={{ opacity: [0.35, 0.85, 0.35], scale: [0.97, 1.03, 0.97] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: -16,
          borderRadius: "50%",
          border: "10px solid rgba(255,200,0,0.45)",
          filter: "blur(6px)",
          pointerEvents: "none",
        }}
      />

      {/* Rotating arc — primary */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 7, ease: "linear" }}
        style={{
          position: "absolute",
          inset: -8,
          borderRadius: "50%",
          border: "5px solid transparent",
          borderTopColor: "rgba(255,220,0,1)",
          borderRightColor: "rgba(255,165,0,0.55)",
          borderBottomColor: "rgba(255,200,0,0.08)",
          borderLeftColor: "rgba(255,165,0,0.35)",
          pointerEvents: "none",
          filter: "drop-shadow(0 0 6px rgba(255,210,0,0.9))",
        }}
      />

      {/* Rotating arc — counter, slower */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
        style={{
          position: "absolute",
          inset: -5,
          borderRadius: "50%",
          border: "3px solid transparent",
          borderTopColor: "rgba(255,200,0,0.0)",
          borderRightColor: "rgba(255,215,0,0.7)",
          borderBottomColor: "rgba(255,165,0,0.15)",
          borderLeftColor: "rgba(255,215,0,0.0)",
          pointerEvents: "none",
        }}
      />

      {/* Static white ring */}
      <div
        style={{
          position: "absolute",
          inset: -2,
          borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.9)",
          pointerEvents: "none",
        }}
      />

      {/* Photo circle */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          overflow: "hidden",
        }}
      >
        <img
          ref={imgRef}
          src={src}
          alt="Personal photo"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
    </motion.div>
  );
}
