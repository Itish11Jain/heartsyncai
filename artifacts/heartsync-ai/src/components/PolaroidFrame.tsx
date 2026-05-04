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
        zIndex: 30,
        pointerEvents: "none",
        background: "#fff",
        padding: "10px 10px 36px",
        borderRadius: 3,
        boxShadow: "0 10px 50px rgba(0,0,0,0.5)",
        width: 200,
      }}
    >
      <img
        src={src}
        alt="Personal photo"
        onLoad={() => setLoaded(true)}
        style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
      />
      <p style={{ textAlign: "center", fontSize: 11, color: "#888", margin: "8px 0 0", fontFamily: "serif" }}>
        Made with 💌
      </p>
    </motion.div>
  );
}
