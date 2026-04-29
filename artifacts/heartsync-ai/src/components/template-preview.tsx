/**
 * TemplatePreview — small, GPU-accelerated mini previews used in the
 * Send page template picker. Each preview is a faithful, scaled-down
 * version of the actual template hero (golden envelope, cosmic stars,
 * crystal orb, vinyl record) — not a generic emoji.
 *
 * Why hand-built mini versions instead of importing the real template
 * pages? Those are full-screen scenes with WebGL/heavy DOM. The picker
 * just needs a recognizable hint of each template, so we render bespoke
 * mini versions — keeps the picker render cheap on low-end Android and
 * avoids extra network/CPU work.
 *
 * All animations are CSS keyframes (defined once in src/index.css) and
 * only animate transform/opacity so the browser keeps them on the GPU.
 */

type TemplateId = "envelope" | "cosmic" | "crystal" | "vinyl";

interface Props {
  id: TemplateId;
  /** Edge length in px. Defaults to 64 — the picker thumbnail size. */
  size?: number;
}

export function TemplatePreview({ id, size = 64 }: Props) {
  switch (id) {
    case "envelope": return <EnvelopePreview size={size} />;
    case "cosmic":   return <CosmicPreview   size={size} />;
    case "crystal":  return <CrystalPreview  size={size} />;
    case "vinyl":    return <VinylPreview    size={size} />;
  }
}

/* ─── Envelope: golden envelope with closed flap + wax seal, gentle bob.
 * Matches the homepage golden envelope hero (gold gradient body, darker
 * triangle inserts, red wax seal). ──────────────────────────────────── */
function EnvelopePreview({ size }: { size: number }) {
  // Envelope is wider than tall — keep a 3:2 aspect ratio.
  const w = size;
  const h = Math.round(size * 0.66);
  const sealSize = Math.round(size * 0.26);
  return (
    <div
      className="hs-tpl-anim"
      style={{
        position: "relative",
        width: w,
        height: h,
        animation: "hs-bob 2.6s ease-in-out infinite",
        filter: "drop-shadow(0 6px 12px rgba(255,165,0,0.35))",
      }}
    >
      {/* Body */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: 4,
        background:
          "linear-gradient(145deg, #F5C518 0%, #FFD700 28%, #FFBC00 55%, #E8AA00 80%, #D4960A 100%)",
        boxShadow: "inset 0 1px 2px rgba(255,255,255,0.3)",
        overflow: "hidden",
      }}>
        {/* Darker side triangles for letter-fold depth */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to right, #C49000, transparent 42%)",
          clipPath: "polygon(0 100%, 44% 52%, 0 4%)", opacity: 0.55,
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to left, #C49000, transparent 42%)",
          clipPath: "polygon(100% 100%, 56% 52%, 100% 4%)", opacity: 0.55,
        }} />
        {/* Bottom flap shadow */}
        <div style={{
          position: "absolute", inset: 0,
          background: "#B8870A",
          clipPath: "polygon(0 100%, 44% 52%, 56% 52%, 100% 100%)",
          opacity: 0.6,
        }} />
      </div>

      {/* Top closed flap (triangle) */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "56%",
        background:
          "linear-gradient(172deg, #E8B800 0%, #D4A000 45%, #C49000 100%)",
        clipPath: "polygon(0 0, 100% 0, 50% 88%)",
        borderRadius: "4px 4px 0 0",
      }} />

      {/* Red wax seal — wrapped in a flex layer that fills the envelope so
          the seal is *guaranteed* dead-center horizontally AND vertically,
          regardless of size, sub-pixel rounding, or the flap above it.
          Flex centering avoids any top:50%/margin math drift. */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          width: sealSize, height: sealSize, borderRadius: "50%",
          background:
            "radial-gradient(circle at 38% 33%, #A82020, #7A0A0A 58%, #4A0000 92%)",
          boxShadow:
            "0 2px 6px rgba(80,0,0,0.6), inset 0 1px 2px rgba(255,140,140,0.2)",
          animation: "hs-pulse 2.2s ease-in-out infinite",
        }} />
      </div>
    </div>
  );
}

/* ─── Cosmic: drifting twinkling stars over the dark cosmic gradient. */
function CosmicPreview({ size }: { size: number }) {
  // Hand-placed star coordinates (relative units 0..1 → multiply by size).
  const stars: Array<{ x: number; y: number; r: number; delay: number }> = [
    { x: 0.10, y: 0.18, r: 1.2, delay: 0    },
    { x: 0.42, y: 0.12, r: 1.6, delay: 0.4  },
    { x: 0.72, y: 0.08, r: 1.2, delay: 0.9  },
    { x: 0.22, y: 0.55, r: 1.4, delay: 0.2  },
    { x: 0.58, y: 0.66, r: 1.2, delay: 0.7  },
    { x: 0.85, y: 0.42, r: 1.4, delay: 1.1  },
    { x: 0.06, y: 0.80, r: 0.9, delay: 1.3  },
    { x: 0.78, y: 0.86, r: 1.2, delay: 0.5  },
  ];
  const centerR = size * 0.07;
  return (
    <div
      className="hs-tpl-anim"
      style={{ position: "relative", width: size, height: size }}
    >
      {stars.map((s, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: s.x * size, top: s.y * size,
            width: s.r * 2, height: s.r * 2,
            borderRadius: 99,
            background: "#fff",
            boxShadow: "0 0 4px rgba(160,192,255,0.9)",
            animation: `hs-twinkle 1.8s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      {/* "North star" — bigger, slower */}
      <span
        style={{
          position: "absolute",
          left: size / 2 - centerR, top: size / 2 - centerR,
          width: centerR * 2, height: centerR * 2,
          borderRadius: 99,
          background: "#fff",
          boxShadow:
            "0 0 8px rgba(160,192,255,0.95), 0 0 14px rgba(255,255,255,0.5)",
          animation: "hs-twinkle 2.6s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/* ─── Crystal: rich crystal-ball orb (multi-stop gradient + highlights)
 * sitting on a small purple pedestal, with a pulsing aura. Closely
 * mirrors the actual /crystal template hero. ───────────────────────── */
function CrystalPreview({ size }: { size: number }) {
  const ballSize = Math.round(size * 0.78);
  return (
    <div
      className="hs-tpl-anim"
      style={{
        position: "relative",
        width: size, height: size,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}
    >
      {/* Outer aura — soft radial glow, pulsing opacity (no rotation jitter). */}
      <div
        style={{
          position: "absolute", inset: -2,
          borderRadius: 99,
          background:
            "radial-gradient(circle at 50% 45%, rgba(180,130,255,0.55) 0%, rgba(110,55,200,0.18) 40%, transparent 75%)",
          animation: "hs-orb-glow 2.6s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* The crystal ball — base gradient stays put (so the orb itself
          doesn't look like it's wobbling), while an inner *swirling mist*
          rotates inside, giving the visible "spinning crystal" motion
          users expect from a magic orb. The fixed top-left specular
          highlight reads as a stationary external light source. */}
      <div
        style={{
          position: "relative",
          width: ballSize, height: ballSize, borderRadius: "50%",
          background:
            "radial-gradient(circle at 32% 28%, " +
            "rgba(255,255,255,0.95) 0%, " +
            "rgba(240,225,255,0.78) 12%, " +
            "rgba(200,165,255,0.55) 32%, " +
            "rgba(130,80,225,0.5) 58%, " +
            "rgba(60,18,115,0.78) 84%, " +
            "rgba(18,4,45,0.95) 100%)",
          boxShadow:
            "0 0 14px rgba(150,90,255,0.45), inset 0 0 10px rgba(190,145,255,0.25)",
          overflow: "hidden",
        }}
      >
        {/* Swirling inner mist — clearly off-center so the rotation is
            visually obvious. 4s period reads as "alive and magical". */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background:
            "conic-gradient(from 0deg, " +
            "rgba(220,180,255,0) 0%, " +
            "rgba(220,180,255,0.45) 18%, " +
            "rgba(255,255,255,0.18) 32%, " +
            "rgba(170,120,240,0) 55%, " +
            "rgba(220,180,255,0.35) 78%, " +
            "rgba(220,180,255,0) 100%)",
          mixBlendMode: "screen",
          animation: "hs-spin 4s linear infinite",
        }} />
        {/* Primary specular highlight (top-left) — STATIONARY */}
        <div style={{
          position: "absolute", top: "8%", left: "12%",
          width: "40%", height: "32%", borderRadius: "50%",
          background:
            "radial-gradient(ellipse at 38% 30%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 38%, transparent 68%)",
          transform: "rotate(-18deg)",
        }} />
        {/* Secondary catch-light (bottom-right) — STATIONARY */}
        <div style={{
          position: "absolute", bottom: "16%", right: "16%",
          width: "20%", height: "14%", borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(220,195,255,0.45) 0%, transparent 70%)",
        }} />
      </div>

      {/* Tiny pedestal under the ball */}
      <div style={{
        marginTop: 2,
        width: size * 0.45, height: 2,
        borderRadius: 99,
        background:
          "linear-gradient(90deg, transparent, rgba(160,120,255,0.55), transparent)",
      }} />
    </div>
  );
}

/* ─── Vinyl: black record with grooves, golden-brown center label, and
 * a tonearm hovering over it — matches /vinyl template hero. ─────── */
function VinylPreview({ size }: { size: number }) {
  // Grooves at the same relative radii as the real template.
  const grooves = [0.32, 0.44, 0.56, 0.68, 0.78, 0.88];
  const labelSize = Math.round(size * 0.27);
  const spindleSize = Math.max(2, Math.round(size * 0.06));
  return (
    <div
      className="hs-tpl-anim"
      style={{ position: "relative", width: size, height: size }}
    >
      {/* Subtle warm glow halo */}
      <div style={{
        position: "absolute", inset: -3, borderRadius: "50%",
        background:
          "radial-gradient(circle, rgba(184,118,42,0.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Spinning record */}
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background:
          "radial-gradient(circle at 50% 50%, #2A2018 0%, #1A1410 35%, #120E0A 55%, #0D0A07 75%, #1A1410 88%, #2A2018 100%)",
        boxShadow:
          "0 4px 12px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.04)",
        position: "relative", overflow: "hidden",
        animation: "hs-spin 3.2s linear infinite",
      }}>
        {/* Concentric grooves */}
        {grooves.map((r, i) => (
          <div key={i} style={{
            position: "absolute",
            top: `${50 - r * 50}%`, left: `${50 - r * 50}%`,
            right: `${50 - r * 50}%`, bottom: `${50 - r * 50}%`,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.05)",
          }} />
        ))}
        {/* Sheen highlight */}
        <div style={{
          position: "absolute", top: "9%", left: "20%",
          width: "26%", height: "12%", borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(255,255,255,0.08) 0%, transparent 100%)",
          transform: "rotate(-30deg)",
        }} />
        {/* Warm wooden-tone center label */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: labelSize, height: labelSize, borderRadius: "50%",
          background:
            "radial-gradient(circle at 38% 32%, #D4924A 0%, #B8762A 45%, #8A5515 80%, #6B3F0D 100%)",
          boxShadow:
            "inset 0 1px 3px rgba(255,200,100,0.22), inset 0 -1px 2px rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* Spindle hole */}
          <div style={{
            width: spindleSize, height: spindleSize, borderRadius: "50%",
            background: "#1A1410", boxShadow: "0 1px 2px rgba(0,0,0,0.8)",
          }} />
        </div>
      </div>
    </div>
  );
}
