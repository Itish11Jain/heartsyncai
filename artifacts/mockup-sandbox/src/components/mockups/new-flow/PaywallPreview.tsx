import { useEffect, useState } from "react";

const ENVELOPE_KEYFRAMES = `
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(-1deg); }
  50% { transform: translateY(-10px) rotate(1deg); }
}
@keyframes shimmer {
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
}
@keyframes seal-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,215,0,0.4); }
  50% { box-shadow: 0 0 0 14px rgba(255,215,0,0); }
}
@keyframes orb1 {
  0%, 100% { transform: translate(0,0) scale(1); }
  33% { transform: translate(8px,-12px) scale(1.15); }
  66% { transform: translate(-6px,8px) scale(0.9); }
}
@keyframes orb2 {
  0%, 100% { transform: translate(0,0) scale(1); }
  33% { transform: translate(-10px,8px) scale(1.1); }
  66% { transform: translate(12px,-6px) scale(0.95); }
}
@keyframes orb3 {
  0%, 100% { transform: translate(0,0) scale(1); }
  50% { transform: translate(6px,10px) scale(1.2); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes sparkle {
  0%, 100% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1); }
}
`;

function Orb({ color, size, top, left, animName, delay }: { color: string; size: number; top: string; left: string; animName: string; delay: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: "blur(1px)",
        animation: `${animName} 4s ease-in-out ${delay} infinite`,
        opacity: 0.85,
        pointerEvents: "none",
      }}
    />
  );
}

export function PaywallPreview() {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 0%, #200040 0%, #0d0618 55%, #04000c 100%)",
        fontFamily: "'Inter', system-ui, sans-serif",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <style>{ENVELOPE_KEYFRAMES}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px 20px 0",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            background: "linear-gradient(90deg, #FFD700, #FF8C00)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          HeartSync AI
        </div>
      </div>

      {/* Card Preview Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 20px 0",
          gap: 0,
        }}
      >
        {/* Headline */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 28,
            animation: revealed ? "fadeUp 0.6s ease forwards" : "none",
            opacity: revealed ? 1 : 0,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.3, marginBottom: 6 }}>
            Your card is ready! 🎉
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
            Here's a preview of what{" "}
            <span style={{ color: "rgba(255,215,0,0.85)", fontWeight: 600 }}>Yogita</span>{" "}
            will experience
          </div>
        </div>

        {/* Envelope card preview */}
        <div
          style={{
            position: "relative",
            width: 220,
            height: 260,
            marginBottom: 12,
            animation: "float 5s ease-in-out infinite",
          }}
        >
          {/* Ambient orbs */}
          <Orb color="radial-gradient(circle,#ff4da6,transparent)" size={60} top="-20px" left="-20px" animName="orb1" delay="0s" />
          <Orb color="radial-gradient(circle,#7c3aed,transparent)" size={50} top="30%" left="85%" animName="orb2" delay="-1.5s" />
          <Orb color="radial-gradient(circle,#f59e0b,transparent)" size={40} top="80%" left="5%" animName="orb3" delay="-2.5s" />

          {/* Envelope body */}
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 20,
              background: "linear-gradient(160deg, #7c1f3a 0%, #be185d 50%, #9d174d 100%)",
              boxShadow: "0 24px 60px rgba(190,24,93,0.35), 0 8px 20px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Envelope flap lines */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "45%",
                background: "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 100%)",
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              }}
            />

            {/* Wax seal */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "radial-gradient(circle at 35% 35%, #FFD700, #FF8C00)",
                boxShadow: "0 4px 16px rgba(255,165,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                animation: "seal-pulse 2.5s ease-in-out infinite",
                position: "relative",
                zIndex: 1,
              }}
            >
              💌
            </div>

            {/* Polaroid photo hint */}
            <div
              style={{
                position: "absolute",
                bottom: 18,
                width: 90,
                height: 90,
                background: "#fff",
                borderRadius: 6,
                padding: 6,
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                transform: "rotate(-3deg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 66,
                  background: "linear-gradient(135deg, #f97316, #ec4899)",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                📸
              </div>
            </div>

            {/* Watermark overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(135deg, rgba(13,6,24,0.65) 0%, rgba(45,10,80,0.55) 100%)",
                backdropFilter: "blur(2px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 20,
              }}
            >
              <div
                style={{
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  padding: "5px 12px",
                  background: "rgba(0,0,0,0.4)",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.5)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                HeartSync AI
              </div>
            </div>
          </div>

          {/* Sparkles around card */}
          {[
            { top: "-10px", right: "10px", delay: "0s", size: 14 },
            { top: "20px", left: "-14px", delay: "0.8s", size: 10 },
            { bottom: "10px", right: "-12px", delay: "1.4s", size: 12 },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                ...s,
                animation: `sparkle 2s ease-in-out ${s.delay} infinite`,
                fontSize: s.size,
              }}
            >
              ✦
            </div>
          ))}
        </div>

        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.06em",
            marginBottom: 20,
            textTransform: "uppercase",
          }}
        >
          Preview
        </div>
      </div>

      {/* Bottom CTA area */}
      <div
        style={{
          padding: "0 20px 36px",
          animation: revealed ? "fadeUp 0.6s ease 0.3s both" : "none",
        }}
      >
        {/* Feature strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            marginBottom: 16,
          }}
        >
          {["🚫 No watermark", "📸 Photo included", "✨ Premium card"].map((f) => (
            <span
              key={f}
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.5)",
                whiteSpace: "nowrap",
              }}
            >
              {f}
            </span>
          ))}
        </div>

        {/* Main CTA button */}
        <button
          style={{
            width: "100%",
            height: 60,
            borderRadius: 18,
            background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
            border: "none",
            color: "#000",
            fontWeight: 800,
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            boxShadow:
              "0 6px 32px rgba(255,165,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
            lineHeight: 1.2,
          }}
        >
          <span>Pay ₹49 & unlock your card</span>
        </button>

        {/* Subtext */}
        <p
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.35)",
            fontSize: 12,
            marginTop: 10,
            lineHeight: 1.5,
          }}
        >
          Card will be immediately available after you make the payment
        </p>
      </div>
    </div>
  );
}
