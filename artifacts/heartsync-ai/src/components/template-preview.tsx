/**
 * TemplatePreview — small, GPU-accelerated mini previews used in the
 * Send page template picker. Each preview is a handful of <div>/<svg>
 * nodes animated with the keyframes defined in src/index.css.
 *
 * Why not import the real template pages? They are full-screen scenes
 * with WebGL/heavy DOM. The picker just needs a recognizable hint of
 * each template, so we render bespoke mini versions instead. This keeps
 * the picker render under a few KB and avoids extra network/CPU work.
 */

type TemplateId = "envelope" | "cosmic" | "crystal" | "vinyl";

interface Props {
  id: TemplateId;
}

export function TemplatePreview({ id }: Props) {
  switch (id) {
    case "envelope":
      return <EnvelopePreview />;
    case "cosmic":
      return <CosmicPreview />;
    case "crystal":
      return <CrystalPreview />;
    case "vinyl":
      return <VinylPreview />;
  }
}

/* ─── Envelope: classic letter with a peeking heart, gentle bob. ───── */
function EnvelopePreview() {
  return (
    <div
      className="hs-tpl-anim"
      style={{
        position: "relative",
        width: 44,
        height: 32,
        animation: "hs-bob 2.6s ease-in-out infinite",
      }}
    >
      <svg width="44" height="32" viewBox="0 0 44 32" fill="none">
        {/* Envelope body */}
        <rect x="1" y="6" width="42" height="25" rx="3"
          fill="#fff5f7" stroke="#ffb0cc" strokeWidth="1" />
        {/* Closed flap (triangle) */}
        <path d="M2 7 L22 21 L42 7" stroke="#ff7aa7" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
        {/* Heart wax seal */}
        <g
          style={{
            transformOrigin: "22px 18px",
            animation: "hs-pulse 1.8s ease-in-out infinite",
          }}
        >
          <path
            d="M22 22 L17.5 17.5 a3 3 0 0 1 4.5 -4 a3 3 0 0 1 4.5 4 Z"
            fill="#ff3a6e"
          />
        </g>
      </svg>
    </div>
  );
}

/* ─── Cosmic: 8 stars twinkling at staggered offsets. ──────────────── */
function CosmicPreview() {
  // Hand-placed star coordinates — looks more deliberate than random.
  const stars: Array<{ x: number; y: number; size: number; delay: number }> = [
    { x: 8,  y: 6,  size: 2,   delay: 0    },
    { x: 30, y: 10, size: 3,   delay: 0.4  },
    { x: 48, y: 4,  size: 2,   delay: 0.9  },
    { x: 18, y: 22, size: 2.5, delay: 0.2  },
    { x: 40, y: 26, size: 2,   delay: 0.7  },
    { x: 56, y: 18, size: 2.5, delay: 1.1  },
    { x: 4,  y: 28, size: 1.5, delay: 1.3  },
    { x: 62, y: 32, size: 2,   delay: 0.5  },
  ];
  return (
    <div
      className="hs-tpl-anim"
      style={{ position: "relative", width: 68, height: 38 }}
    >
      {stars.map((s, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: s.x,
            top: s.y,
            width: s.size * 2,
            height: s.size * 2,
            borderRadius: 99,
            background: "#ffffff",
            boxShadow: "0 0 4px rgba(160,192,255,0.9)",
            animation: `hs-twinkle 1.8s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      {/* Center "north star" — slightly bigger, slower */}
      <span
        style={{
          position: "absolute",
          left: 30,
          top: 16,
          width: 6,
          height: 6,
          borderRadius: 99,
          background: "#fff",
          boxShadow: "0 0 8px rgba(160,192,255,0.95), 0 0 14px rgba(255,255,255,0.5)",
          animation: "hs-twinkle 2.6s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/* ─── Crystal: glowing orb that rotates slowly with a pulsing aura. ── */
function CrystalPreview() {
  return (
    <div
      className="hs-tpl-anim"
      style={{ position: "relative", width: 40, height: 40 }}
    >
      {/* Outer halo (pulsing opacity, no rotation = no jitter) */}
      <div
        style={{
          position: "absolute",
          inset: -4,
          borderRadius: 99,
          background:
            "radial-gradient(circle, rgba(200,160,255,0.55) 0%, transparent 70%)",
          animation: "hs-orb-glow 2.2s ease-in-out infinite",
        }}
      />
      {/* Orb itself, slowly spinning so the highlight sweeps */}
      <div
        style={{
          position: "relative",
          width: 40,
          height: 40,
          borderRadius: 99,
          background:
            "radial-gradient(circle at 35% 32%, #ffffff 0%, #d8b8ff 30%, #6d3acc 75%, #2a0a5a 100%)",
          boxShadow: "inset -4px -4px 8px rgba(0,0,0,0.35)",
          animation: "hs-spin 7s linear infinite",
        }}
      />
    </div>
  );
}

/* ─── Vinyl: spinning record with grooves and red center label. ───── */
function VinylPreview() {
  return (
    <div
      className="hs-tpl-anim"
      style={{
        position: "relative",
        width: 42,
        height: 42,
        borderRadius: 99,
        // Concentric grooves via repeating gradient
        background:
          "repeating-radial-gradient(circle, #1a1a1a 0 1.5px, #0a0a0a 1.5px 3px), radial-gradient(circle, #2a2a2a 0%, #050505 100%)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.5), inset 0 0 6px rgba(0,0,0,0.6)",
        animation: "hs-spin 3.2s linear infinite",
      }}
    >
      {/* Red center label */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 14,
          height: 14,
          borderRadius: 99,
          background: "radial-gradient(circle, #ff5a3a 0%, #b8311a 100%)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.15)",
        }}
      >
        {/* Center spindle hole */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 3,
            height: 3,
            borderRadius: 99,
            background: "#000",
          }}
        />
      </div>
    </div>
  );
}
