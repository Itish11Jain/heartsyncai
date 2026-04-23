import { motion } from "framer-motion";

const HEARTS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  size: 14 + (i % 4) * 7,
  left: 5 + (i * 7.3) % 90,
  duration: 7 + (i % 5) * 1.5,
  delay: (i * 0.6) % 5,
  drift: i % 2 === 0 ? 12 : -12,
  opacity: 0.35 + (i % 3) * 0.15,
}));

const HeartSVG = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const HEART_COLORS = [
  "#fb7185", "#f43f5e", "#fda4af", "#e11d48",
  "#fecdd3", "#ff6b8a", "#f472b6", "#fb923c",
];

export function LottieHearts() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0008" }}>
      <div
        className="relative overflow-hidden rounded-3xl"
        style={{
          width: 340,
          height: 420,
          background: "linear-gradient(145deg, #1a0010 0%, #4a0022 45%, #2d0015 100%)",
          border: "1px solid rgba(251,113,133,0.25)",
          boxShadow: "0 0 60px rgba(244,63,94,0.18), 0 30px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Radial glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: -40, left: "50%", transform: "translateX(-50%)",
            width: 260, height: 200,
            background: "radial-gradient(ellipse, rgba(244,63,94,0.25) 0%, transparent 70%)",
            filter: "blur(20px)",
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            top: 20, left: "50%", transform: "translateX(-50%)",
            width: 180, height: 120,
            background: "radial-gradient(ellipse, rgba(251,113,133,0.12) 0%, transparent 70%)",
            filter: "blur(16px)",
          }}
        />

        {/* Floating hearts layer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {HEARTS.map((h) => (
            <motion.div
              key={h.id}
              className="absolute"
              style={{ left: h.left + "%", bottom: 0 }}
              animate={{
                y: [-20, -460],
                x: [0, h.drift, -h.drift / 2, h.drift / 3, 0],
                opacity: [0, h.opacity, h.opacity, 0],
                scale: [0.7, 1, 1.1, 0.8],
              }}
              transition={{
                duration: h.duration,
                delay: h.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <HeartSVG size={h.size} color={HEART_COLORS[h.id % HEART_COLORS.length]} />
            </motion.div>
          ))}
        </div>

        {/* Card content */}
        <div className="relative h-full flex flex-col items-center justify-center p-8 text-center z-10">
          <div className="mb-7">
            <span
              className="block mb-2 uppercase tracking-[0.28em] font-medium"
              style={{ fontSize: 10, color: "rgba(253,164,175,0.55)" }}
            >
              For
            </span>
            <motion.h1
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 30,
                fontWeight: 700,
                color: "#fecdd3",
                lineHeight: 1.15,
              }}
              animate={{
                scale: [1, 1.03, 1],
                textShadow: [
                  "0 0 18px rgba(244,63,94,0.3)",
                  "0 0 38px rgba(244,63,94,0.65), 0 0 60px rgba(251,113,133,0.25)",
                  "0 0 18px rgba(244,63,94,0.3)",
                ],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              Priya
            </motion.h1>
          </div>

          <div
            className="w-16 my-1"
            style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(251,113,133,0.4), transparent)" }}
          />

          <p
            className="mt-4 leading-relaxed"
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 14,
              fontStyle: "italic",
              color: "rgba(255,228,230,0.88)",
              maxWidth: 250,
            }}
          >
            "Every moment with you feels like a dream come true, Priya."
          </p>
        </div>

        {/* Watermark */}
        <div
          className="absolute bottom-4 right-4 z-10"
          style={{ fontSize: 10, color: "rgba(253,164,175,0.35)", letterSpacing: "0.04em" }}
        >
          💙 HeartSync AI
        </div>
      </div>
    </div>
  );
}
