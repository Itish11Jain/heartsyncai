import { useEffect } from "react";
import { trackEvent } from "@/lib/trackEvent";
import type { TemplateId } from "@/lib/usage";

const VIRAL_NEXT: Record<string, TemplateId> = {
  envelope: "cosmic",
  cosmic: "vinyl",
  vinyl: "crystal",
  crystal: "envelope",
};

interface ViralReplyCTAProps {
  template: TemplateId;
}

export default function ViralReplyCTA({ template }: ViralReplyCTAProps) {
  useEffect(() => {
    const t = setTimeout(() => {
      trackEvent({ event: "viral_cta_viewed", template });
    }, 2500);
    return () => clearTimeout(t);
  }, [template]);

  function handleClick() {
    trackEvent({ event: "viral_cta_clicked", template });
    const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    window.location.href = `${base}/send?source=reply&received=${template}&utm_source=viral_reply`;
  }

  const nextTpl = VIRAL_NEXT[template];
  const nextEmoji = nextTpl === "cosmic" ? "✨" : nextTpl === "vinyl" ? "🎵" : nextTpl === "crystal" ? "🔮" : "💌";

  return (
    <div style={{
      opacity: 0,
      animation: "hsViralFadeIn 0.6s ease forwards",
      animationDelay: "2.5s",
      width: "min(300px, calc(100vw - 32px))",
      margin: "0 auto",
      textAlign: "center",
      paddingBottom: 8,
    }}>
      <style>{`
        @keyframes hsViralFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 12px", borderRadius: 99, marginBottom: 10,
        background: "rgba(255,215,0,0.12)",
        border: "1px solid rgba(255,215,0,0.35)",
        boxShadow: "0 0 12px rgba(255,215,0,0.15)",
      }}>
        <span style={{ fontSize: 11 }}>🔒</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,215,0,0.9)" }}>
          INVITE ONLY
        </span>
      </div>

      <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4, lineHeight: 1.3 }}>
        Feeling the love?
      </p>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 14, lineHeight: 1.55 }}>
        Send one back ✨ You've unlocked a secret {nextEmoji} 3D template to surprise them.
      </p>

      <button
        onClick={handleClick}
        style={{
          width: "100%", padding: "14px",
          borderRadius: 14,
          background: "linear-gradient(135deg, #FFD700, #FFA500)",
          border: "none",
          color: "#1a0800",
          fontWeight: 700, fontSize: 15,
          cursor: "pointer", letterSpacing: "0.02em",
          boxShadow: "0 4px 18px rgba(255,180,0,0.35)",
        }}
      >
        🔓 Unlock &amp; Reply
      </button>
    </div>
  );
}
