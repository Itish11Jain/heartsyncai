import { useState } from "react";
import { motion } from "framer-motion";

interface PolaroidFrameProps {
  src: string;
}

export default function PolaroidFrame({ src }: PolaroidFrameProps) {
  const [loaded, setLoaded] = useState(false);

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
        width: 210,
        height: 210,
        borderRadius: "50%",
        overflow: "hidden",
        boxShadow: "0 0 0 4px rgba(255,255,255,0.9), 0 0 0 8px rgba(168,85,247,0.5), 0 8px 40px rgba(0,0,0,0.55), 0 0 60px rgba(168,85,247,0.25)",
      }}
    >
      <img
        src={src}
        alt="Personal photo"
        onLoad={() => setLoaded(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </motion.div>
  );
}
