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
        bottom: "max(20px, env(safe-area-inset-bottom, 20px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9998,
        display: "flex",
        alignItems: "stretch",
        borderRadius: 999,
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5), 0 2px 8px rgba(168,85,247,0.35)",
        whiteSpace: "nowrap",
        userSelect: "none",
        WebkitUserSelect: "none",
      } as React.CSSProperties}
    >
      {/* Left: Made on HeartSync — links to homepage */}
      <Link href="/">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "9px 14px 9px 16px",
            background: "linear-gradient(135deg, #6B21A8 0%, #9333EA 50%, #7C3AED 100%)",
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "0.02em" }}>
            Made on HeartSync
          </span>
          <span style={{ fontSize: 14 }}>✨</span>
        </div>
      </Link>

      {/* Divider */}
      <div style={{ width: 1, background: "rgba(255,255,255,0.18)", flexShrink: 0 }} />

      {/* Right: Remove → CTA */}
      <a
        href={removeHref}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "9px 14px 9px 12px",
          background: "linear-gradient(135deg, #92400E 0%, #D97706 50%, #F59E0B 100%)",
          cursor: "pointer",
          textDecoration: "none",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", letterSpacing: "0.03em" }}>
          Remove watermark →
        </span>
      </a>
    </div>
  );
}
