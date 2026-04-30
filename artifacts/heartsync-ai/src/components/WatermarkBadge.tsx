import { useEffect, useState } from "react";
import { Link } from "wouter";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

interface CardMeta {
  is_watermarked: boolean;
}

interface WatermarkBadgeProps {
  id?: string | null;
}

export default function WatermarkBadge({ id }: WatermarkBadgeProps) {
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

  if (!show) return null;

  const back = typeof window !== "undefined"
    ? encodeURIComponent(window.location.pathname + window.location.search)
    : "";

  const removeHref = `${BASE}/remove-watermark?id=${id ?? ""}&back=${back}`;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "max(24px, env(safe-area-inset-bottom, 24px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        display: "flex",
        alignItems: "stretch",
        borderRadius: 999,
        overflow: "hidden",
        boxShadow: "0 6px 28px rgba(0,0,0,0.65), 0 0 0 1.5px rgba(255,255,255,0.12) inset, 0 4px 24px rgba(168,85,247,0.5)",
        whiteSpace: "nowrap",
        userSelect: "none",
        WebkitUserSelect: "none",
        animation: "wm-pulse 3s ease-in-out infinite",
      } as React.CSSProperties}
    >
      <style>{`
        @keyframes wm-pulse {
          0%, 100% { box-shadow: 0 6px 28px rgba(0,0,0,0.65), 0 0 0 1.5px rgba(255,255,255,0.12) inset, 0 4px 24px rgba(168,85,247,0.5); }
          50%       { box-shadow: 0 6px 28px rgba(0,0,0,0.65), 0 0 0 1.5px rgba(255,255,255,0.18) inset, 0 6px 36px rgba(168,85,247,0.75); }
        }
      `}</style>

      {/* Left: Made on HeartSync — links to homepage */}
      <Link href="/">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "11px 16px 11px 20px",
            background: "linear-gradient(135deg, #5B21B6 0%, #9333EA 55%, #7C3AED 100%)",
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "0.01em" }}>
            Made on HeartSync
          </span>
          <span style={{ fontSize: 16 }}>✨</span>
        </div>
      </Link>

      {/* Divider */}
      <div style={{ width: 1, background: "rgba(255,255,255,0.22)", flexShrink: 0 }} />

      {/* Right: Remove → CTA */}
      <a
        href={removeHref}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "11px 20px 11px 14px",
          background: "linear-gradient(135deg, #92400E 0%, #D97706 50%, #F59E0B 100%)",
          cursor: "pointer",
          textDecoration: "none",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 900, color: "#fff", letterSpacing: "0.04em" }}>
          Remove watermark →
        </span>
      </a>
    </div>
  );
}
