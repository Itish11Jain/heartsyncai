import { useEffect, useState } from "react";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

interface CardMeta {
  is_watermarked: boolean;
}

interface WatermarkBadgeProps {
  id?: string | null;
  showRemoveCta?: boolean;
  hidden?: boolean;
}

export default function WatermarkBadge({ id, showRemoveCta = false, hidden = false }: WatermarkBadgeProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${BASE}/api/cards/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CardMeta | null) => {
        if (data?.is_watermarked) setShow(true);
      })
      .catch(() => {});
  }, [id]);

  if (!show || hidden) return null;

  const back = typeof window !== "undefined"
    ? encodeURIComponent(window.location.pathname + window.location.search)
    : "";

  const removeHref = `${BASE}/remove-watermark?id=${id ?? ""}&back=${back}`;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "max(160px, env(safe-area-inset-bottom, 160px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        whiteSpace: "nowrap",
        userSelect: "none",
        WebkitUserSelect: "none",
      } as React.CSSProperties}
    >
      {/* Branded pill — static, not interactive */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "12px 22px",
          background: "linear-gradient(135deg, #5B21B6 0%, #9333EA 55%, #7C3AED 100%)",
          borderRadius: 999,
          cursor: "default",
          pointerEvents: "none",
          boxShadow: "0 6px 28px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(255,255,255,0.12) inset, 0 4px 24px rgba(168,85,247,0.55)",
          animation: "wm-pulse 3s ease-in-out infinite",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "0.01em" }}>
          Made for free on HeartSync
        </span>
        <span style={{ fontSize: 16 }}>✨</span>
      </div>

      {/* Remove CTA — only for the card sender */}
      {showRemoveCta && (
        <a
          href={removeHref}
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "rgba(255,255,255,0.75)",
            textDecoration: "underline",
            textDecorationColor: "rgba(255,255,255,0.35)",
            textUnderlineOffset: 3,
            cursor: "pointer",
            letterSpacing: "0.02em",
          }}
        >
          Remove watermark →
        </a>
      )}

      <style>{`
        @keyframes wm-pulse {
          0%, 100% { box-shadow: 0 6px 28px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(255,255,255,0.12) inset, 0 4px 24px rgba(168,85,247,0.55); }
          50%       { box-shadow: 0 6px 28px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(255,255,255,0.2) inset, 0 6px 36px rgba(168,85,247,0.8); }
        }
      `}</style>
    </div>
  );
}
