import { useState } from "react";

export function ShareBadge() {
  const [waCopied, setWaCopied] = useState(false);
  const [igCopied, setIgCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [wmRemoved, setWmRemoved] = useState(false);

  function tap(setter: (v: boolean) => void) {
    setter(true);
    setTimeout(() => setter(false), 2000);
  }

  function shareInstagram() {
    tap(setIgCopied);
    try { navigator.clipboard.writeText("https://heartsync.in/card?..."); } catch { /* ignore */ }
    setTimeout(() => window.open("https://www.instagram.com", "_blank"), 300);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 60% 20%, #1a0e3a 0%, #0b0718 60%, #0a0612 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: "0 24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background stars */}
      {[...Array(30)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: i % 3 === 0 ? 2 : 1,
          height: i % 3 === 0 ? 2 : 1,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.4)",
          left: `${(i * 37 + 11) % 100}%`,
          top: `${(i * 53 + 7) % 100}%`,
        }} />
      ))}

      {/* Card preview (simulated) */}
      <div style={{
        width: "100%",
        maxWidth: 310,
        background: "linear-gradient(145deg, #1e1040 0%, #130d2e 100%)",
        borderRadius: 20,
        border: "1.5px solid rgba(255,215,0,0.2)",
        padding: "28px 24px",
        textAlign: "center",
        marginBottom: 32,
        boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,215,0,0.08)",
        position: "relative",
      }}>
        <p style={{ fontSize: 11, color: "rgba(255,215,0,0.55)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
          HEY YOU — YES, YOU
        </p>
        <p style={{ fontSize: 32, fontWeight: 800, color: "#fff", margin: "0 0 14px", letterSpacing: "-0.5px" }}>
          Itisha 🎉
        </p>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.65, margin: 0, fontStyle: "italic" }}>
          Just a reminder that you're incredible. Keep going — you've got this!
        </p>
        {/* Watermark badge on card */}
        <div style={{
          position: "absolute", bottom: 10, right: 12,
          fontSize: 9, color: "rgba(255,255,255,0.25)", fontWeight: 600, letterSpacing: "0.06em"
        }}>
          • Made with HeartSync AI •
        </div>
      </div>

      {/* Ready line */}
      <p style={{ fontSize: 12, color: "rgba(255,215,0,0.6)", fontWeight: 600, letterSpacing: "0.04em", marginBottom: 20 }}>
        ✨ Your card is ready — share it now!
      </p>

      {/* Share via section */}
      <div style={{
        width: "100%",
        maxWidth: 310,
        background: "rgba(255,255,255,0.04)",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "20px 24px 24px",
        backdropFilter: "blur(12px)",
      }}>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center", marginBottom: 20 }}>
          Share via
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 28 }}>
          {/* WhatsApp */}
          <button
            onClick={() => tap(setWaCopied)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
          >
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: waCopied ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#25D366,#128C7E)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 20px rgba(37,211,102,0.4)",
              transition: "transform 0.15s",
              transform: waCopied ? "scale(0.93)" : "scale(1)",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <span style={{ fontSize: 11, color: waCopied ? "#4ade80" : "rgba(255,255,255,0.6)", fontWeight: 600, transition: "color 0.2s" }}>
              {waCopied ? "Sent!" : "WhatsApp"}
            </span>
          </button>

          {/* Instagram */}
          <button
            onClick={shareInstagram}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
          >
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: igCopied ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 20px rgba(220,39,67,0.4)",
              transition: "transform 0.15s",
              transform: igCopied ? "scale(0.93)" : "scale(1)",
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <span style={{ fontSize: 11, color: igCopied ? "#4ade80" : "rgba(255,255,255,0.6)", fontWeight: 600, transition: "color 0.2s" }}>
              {igCopied ? "Copied!" : "Instagram"}
            </span>
          </button>

          {/* Copy Link */}
          <button
            onClick={() => tap(setLinkCopied)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
          >
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: linkCopied ? "linear-gradient(135deg,#22c55e,#16a34a)" : "rgba(255,215,0,0.12)",
              border: linkCopied ? "none" : "1.5px solid rgba(255,215,0,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: linkCopied ? "0 4px 20px rgba(34,197,94,0.35)" : "0 4px 16px rgba(255,215,0,0.1)",
              transition: "transform 0.15s, background 0.2s",
              transform: linkCopied ? "scale(0.93)" : "scale(1)",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={linkCopied ? "white" : "rgba(255,215,0,0.85)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <span style={{ fontSize: 11, color: linkCopied ? "#4ade80" : "rgba(255,215,0,0.7)", fontWeight: 600, transition: "color 0.2s" }}>
              {linkCopied ? "Copied!" : "Copy Link"}
            </span>
          </button>
        </div>
      </div>

      {/* Remove watermark CTA */}
      {!wmRemoved && (
        <button
          onClick={() => setWmRemoved(true)}
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontSize: 14, fontWeight: 700, marginTop: 18,
            color: "rgba(255,255,255,0.85)",
            textDecoration: "underline",
            textDecorationColor: "rgba(168,85,247,0.6)",
            textUnderlineOffset: 3,
            letterSpacing: "0.02em",
          }}
        >
          Remove watermark →
        </button>
      )}
      {wmRemoved && (
        <p style={{ fontSize: 13, color: "#4ade80", fontWeight: 600, marginTop: 18 }}>✓ Watermark removed!</p>
      )}

      {/* Make another card */}
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 14, cursor: "pointer" }}>
        Make another card
      </p>

      {/* HeartSync badge */}
      <div style={{
        position: "fixed", bottom: "max(24px, env(safe-area-inset-bottom, 16px))",
        left: 0, right: 0, display: "flex", justifyContent: "center",
      }}>
        <div style={{
          background: "linear-gradient(135deg, #7c3aed, #a855f7)",
          borderRadius: 999, padding: "12px 28px",
          fontSize: 14, fontWeight: 700, color: "white",
          boxShadow: "0 6px 24px rgba(124,58,237,0.5)",
          letterSpacing: "0.01em",
        }}>
          Made for free on HeartSync ✨
        </div>
      </div>
    </div>
  );
}
