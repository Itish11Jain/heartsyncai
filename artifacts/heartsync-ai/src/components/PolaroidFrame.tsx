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
      initial={{ y: "110vh", scale: 0.75, opacity: 0 }}
      animate={loaded ? { y: "-50%", scale: 1, opacity: 1 } : { y: "-50%", scale: 1, opacity: 0 }}
      exit={{ scale: 0.7, opacity: 0, y: "20vh", transition: { duration: 0.35 } }}
      transition={{ type: "spring", damping: 22, stiffness: 130 }}
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
