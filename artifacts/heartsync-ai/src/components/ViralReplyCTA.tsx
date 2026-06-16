import { useEffect } from "react";
import { trackEvent } from "@/lib/trackEvent";
import type { TemplateId } from "@/lib/usage";

interface ViralReplyCTAProps {
  template: TemplateId;
  /**
   * The occasion of the card the recipient just RECEIVED. Drives which reply
   * experience (A Gratitude Bloom / B Blooming Burst / C Playful Forgiveness)
   * the replier lands on. Defaults to thank_you when unknown.
   */
  occasion?: string;
}

export default function ViralReplyCTA({ template, occasion = "thank_you" }: ViralReplyCTAProps) {
  useEffect(() => {
    const t = setTimeout(() => {
      trackEvent({ event: "viral_cta_viewed", template, occasion });
    }, 2500);
    return () => clearTimeout(t);
  }, [template, occasion]);

  function handleClick() {
    trackEvent({ event: "viral_cta_clicked", template, occasion });
    const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    // Land on the dedicated low-effort reply experience (NOT the full builder).
    // `ro` = received occasion → picks the reply experience; `received` = the
    // visual template they got (kept for analytics / future theming).
    window.location.href = `${base}/reply?ro=${encodeURIComponent(occasion)}&received=${encodeURIComponent(template)}&utm_source=viral_reply`;
  }

  function handleInstagramClick() {
    trackEvent({ event: "viral_instagram_clicked", template, occasion });
    window.open(
      "https://www.instagram.com/heart.syncai?igsh=ZzZubWJubnIxaTVq&utm_source=qr",
      "_blank",
      "noopener,noreferrer",
    );
  }

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

      <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 14, lineHeight: 1.3 }}>
        Feeling the love?
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
        Send Love Back ❤️
      </button>

      <button
        onClick={handleInstagramClick}
        style={{
          width: "100%", padding: "12px",
          marginTop: 10,
          borderRadius: 14,
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.25)",
          color: "rgba(255,255,255,0.9)",
          fontWeight: 600, fontSize: 14,
          cursor: "pointer", letterSpacing: "0.02em",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        <span aria-hidden style={{ fontSize: 16 }}>📸</span>
        Follow us on Instagram
      </button>
    </div>
  );
}
