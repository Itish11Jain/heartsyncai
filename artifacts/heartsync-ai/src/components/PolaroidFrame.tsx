import { motion } from "framer-motion";

interface PolaroidFrameProps {
  src: string;
}

export default function PolaroidFrame({ src }: PolaroidFrameProps) {
  return (
    <motion.div
      key="polaroid"
      initial={{ y: "110vh", scale: 0.6, rotate: -8, opacity: 0 }}
      animate={{ y: "-50%", scale: 1.15, rotate: -4, opacity: 1 }}
      exit={{ scale: 0, opacity: 0, transition: { duration: 0.4 } }}
      transition={{ type: "spring", damping: 18, stiffness: 120 }}
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        x: "-50%",
        zIndex: 30,
        background: "#fff",
        padding: "10px 10px 36px",
        borderRadius: 3,
        boxShadow: "0 10px 50px rgba(0,0,0,0.5)",
        width: 220,
      }}
    >
      <img
        src={src}
        alt="Personal photo"
        style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }}
      />
      <p style={{ textAlign: "center", fontSize: 11, color: "#888", marginTop: 8, fontFamily: "serif", margin: "8px 0 0" }}>
        Made with 💌
      </p>
    </motion.div>
  );
}
