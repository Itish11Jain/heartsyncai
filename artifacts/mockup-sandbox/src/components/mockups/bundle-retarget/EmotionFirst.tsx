/**
 * Bundle retarget variant A — "Emotion First / Card-Led"
 * Hypothesis: cold retargeting traffic doesn't know HeartSync. Lead with the
 * recipient "wow" (a real card on screen), then the 2-for-49 offer.
 */
export function EmotionFirst() {
  const gold = "#FFD700";
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "radial-gradient(ellipse at 50% 0%, #1a003a 0%, #0a0014 55%, #04000c 100%)",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: "#fff",
        padding: "0 0 36px",
      }}
    >
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "18px 20px 0" }}>
        {/* Hook */}
        <div style={{ textAlign: "center", padding: "10px 0 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,215,0,0.8)", textTransform: "uppercase", marginBottom: 10 }}>
            Remember this feeling?
          </div>
          <div style={{ fontSize: 27, fontWeight: 900, lineHeight: 1.18, marginBottom: 8 }}>
            Make someone's
            <br />
            <span style={{ color: gold }}>whole day</span> in 30 seconds.
          </div>
        </div>

        {/* Card "wow" preview */}
        <div
          style={{
            position: "relative",
            borderRadius: 24,
            padding: "26px 22px 30px",
            background: "linear-gradient(160deg, #2a0d4e 0%, #12012e 70%)",
            border: "1px solid rgba(255,215,0,0.22)",
            boxShadow: "0 18px 60px rgba(120,40,200,0.4), inset 0 0 60px rgba(255,215,0,0.04)",
            overflow: "hidden",
            marginBottom: 22,
          }}
        >
          {/* sparkles */}
          {[
            { top: 18, left: 24, s: 6 }, { top: 40, right: 30, s: 4 },
            { bottom: 30, left: 36, s: 5 }, { bottom: 54, right: 40, s: 3 },
          ].map((p, i) => (
            <span key={i} style={{ position: "absolute", ...p, width: p.s, height: p.s, borderRadius: "50%", background: gold, opacity: 0.7, boxShadow: `0 0 8px ${gold}` }} />
          ))}
          <div style={{ textAlign: "center", fontFamily: "'Dancing Script', cursive", fontSize: 30, color: gold, fontWeight: 700, marginBottom: 4 }}>
            Happy Birthday
          </div>
          <div style={{ textAlign: "center", fontSize: 34, marginBottom: 14 }}>💛</div>
          <p style={{ textAlign: "center", fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.82)", fontStyle: "italic", margin: 0 }}>
            "Hey Riya 😘 — so grateful for every moment
            with you. Hope all your dreams come true. ❤️"
          </p>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 13px", borderRadius: 99, background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(255,215,0,0.9)" }}>
              🔒 ANIMATED · INVITE ONLY
            </span>
          </div>
        </div>

        {/* Offer */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>
            Keep <strong style={{ color: "#fff" }}>2 cards ready</strong> to send anytime
          </div>
          <div style={{ display: "inline-flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 17, color: "rgba(255,255,255,0.4)", textDecoration: "line-through" }}>₹98</span>
            <span style={{ fontSize: 38, fontWeight: 900, color: gold }}>₹49</span>
          </div>
        </div>

        <button
          style={{
            width: "100%", height: 60, borderRadius: 18,
            background: "linear-gradient(135deg, #FFD700 0%, #FFAA00 100%)",
            border: "none", color: "#000", fontWeight: 900, fontSize: 19,
            cursor: "pointer", boxShadow: "0 10px 36px rgba(255,165,0,0.5)",
          }}
        >
          Send Love — Get 2 Cards ❤️
        </button>
        <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.32)", marginTop: 14 }}>
          UPI · Instant unlock · No login · Links never expire
        </p>
      </div>
    </div>
  );
}
