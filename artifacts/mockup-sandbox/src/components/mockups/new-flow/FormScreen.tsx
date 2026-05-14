import { useState } from "react";

const OCCASIONS = [
  { id: "feel_good", label: "I love you", emoji: "💛" },
  { id: "sorry", label: "Sorry", emoji: "🥺" },
  { id: "thank_you", label: "Thank you", emoji: "🙏" },
  { id: "miss_you", label: "Miss you", emoji: "💭" },
  { id: "birthday", label: "Birthday", emoji: "🎂" },
  { id: "get_well", label: "Get well soon", emoji: "🌸" },
];

const TEMPLATES = [
  {
    id: "envelope",
    name: "Envelope",
    desc: "Classic letter",
    emoji: "💌",
    bg: "linear-gradient(135deg, #7c2d43 0%, #be185d 100%)",
    accent: "#ff8fab",
  },
  {
    id: "cosmic",
    name: "Cosmic",
    desc: "Stars align",
    emoji: "🌌",
    bg: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
    accent: "#a78bfa",
  },
  {
    id: "crystal",
    name: "Crystal",
    desc: "Glowing vision",
    emoji: "💎",
    bg: "linear-gradient(135deg, #2e1065 0%, #5b21b6 100%)",
    accent: "#c4b5fd",
  },
  {
    id: "vinyl",
    name: "Vinyl",
    desc: "Spinning record",
    emoji: "🎵",
    bg: "linear-gradient(135deg, #292524 0%, #57534e 100%)",
    accent: "#fbbf24",
  },
];

export function FormScreen() {
  const [occasion, setOccasion] = useState("feel_good");
  const [template, setTemplate] = useState("envelope");
  const [name, setName] = useState("Yogita");
  const [hasPhoto, setHasPhoto] = useState(true);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0618",
        fontFamily: "'Inter', system-ui, sans-serif",
        color: "#fff",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 20px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.6)",
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ←
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
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
        <div style={{ width: 34 }} />
      </div>

      <div style={{ padding: "20px 20px 100px" }}>
        {/* Step indicator */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 24,
          }}
        >
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background:
                  s === 1
                    ? "linear-gradient(90deg, #FFD700, #FF8C00)"
                    : s === 2
                      ? "linear-gradient(90deg, #FFD700, #FF8C00)"
                      : "rgba(255,255,255,0.12)",
              }}
            />
          ))}
        </div>

        {/* Section: Occasion */}
        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,215,0,0.7)",
              marginBottom: 10,
            }}
          >
            What's the occasion?
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {OCCASIONS.map((o) => (
              <button
                key={o.id}
                onClick={() => setOccasion(o.id)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 50,
                  border:
                    occasion === o.id
                      ? "1.5px solid #FFD700"
                      : "1px solid rgba(255,255,255,0.12)",
                  background:
                    occasion === o.id
                      ? "rgba(255,215,0,0.12)"
                      : "rgba(255,255,255,0.04)",
                  color: occasion === o.id ? "#FFD700" : "rgba(255,255,255,0.7)",
                  fontSize: 13,
                  fontWeight: occasion === o.id ? 700 : 400,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span>{o.emoji}</span> {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recipient name */}
        <div style={{ marginBottom: 20 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,215,0,0.7)",
              marginBottom: 8,
            }}
          >
            Their name
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Yogita"
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              fontSize: 15,
              padding: "0 14px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* What do they like */}
        <div style={{ marginBottom: 20 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,215,0,0.7)",
              marginBottom: 8,
            }}
          >
            What do they like? <span style={{ color: "rgba(255,255,255,0.25)", textTransform: "none", fontWeight: 400 }}>optional</span>
          </p>
          <input
            placeholder="e.g. sunsets, coffee, cats…"
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              fontSize: 15,
              padding: "0 14px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Photo upload */}
        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,215,0,0.7)",
              marginBottom: 8,
            }}
          >
            Add a photo <span style={{ color: "rgba(255,255,255,0.25)", textTransform: "none", fontWeight: 400 }}>optional</span>
          </p>
          <div
            onClick={() => setHasPhoto(!hasPhoto)}
            style={{
              border: hasPhoto
                ? "1.5px solid rgba(255,215,0,0.5)"
                : "1.5px dashed rgba(255,255,255,0.15)",
              borderRadius: 14,
              background: hasPhoto
                ? "rgba(255,215,0,0.05)"
                : "rgba(255,255,255,0.03)",
              padding: "18px 16px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
            }}
          >
            {hasPhoto ? (
              <>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #f97316 0%, #ec4899 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    flexShrink: 0,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  📸
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#FFD700", marginBottom: 2 }}>
                    Photo added ✓
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    Tap to change
                  </div>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  📷
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 2 }}>
                    Add their photo
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                    Makes it personal & unforgettable
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Template picker */}
        <div style={{ marginBottom: 28 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,215,0,0.7)",
              marginBottom: 10,
            }}
          >
            Choose a style
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                style={{
                  borderRadius: 14,
                  border:
                    template === t.id
                      ? "2px solid #FFD700"
                      : "1.5px solid rgba(255,255,255,0.1)",
                  background: template === t.id ? "rgba(255,215,0,0.06)" : "rgba(255,255,255,0.03)",
                  padding: "12px 10px",
                  cursor: "pointer",
                  textAlign: "left",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Mini card preview */}
                <div
                  style={{
                    width: "100%",
                    height: 70,
                    borderRadius: 10,
                    background: t.bg,
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                  }}
                >
                  {t.emoji}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                  {t.desc}
                </div>
                {template === t.id && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#FFD700",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      color: "#000",
                      fontWeight: 900,
                    }}
                  >
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "16px 20px 28px",
          background:
            "linear-gradient(to top, #0d0618 80%, transparent)",
        }}
      >
        <button
          style={{
            width: "100%",
            height: 56,
            borderRadius: 16,
            background: "linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)",
            border: "none",
            color: "#000",
            fontWeight: 800,
            fontSize: 17,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 4px 24px rgba(255,165,0,0.45)",
          }}
        >
          Generate my card ✨
        </button>
      </div>
    </div>
  );
}
