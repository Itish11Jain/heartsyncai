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
        bottom: "max(80px, env(safe-area-inset-bottom, 80px))",
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
      {/* Top: Made for free on HeartSync — main branded pill */}
      <Link href="/">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "12px 22px",
            background: "linear-gradient(135deg, #5B21B6 0%, #9333EA 55%, #7C3AED 100%)",
            borderRadius: 999,
            cursor: "pointer",
            textDecoration: "none",
            boxShadow: "0 6px 28px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(255,255,255,0.12) inset, 0 4px 24px rgba(168,85,247,0.55)",
            animation: "wm-pulse 3s ease-in-out infinite",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "0.01em" }}>
            Made for free on HeartSync
          </span>
          <span style={{ fontSize: 16 }}>✨</span>
        </div>
      </Link>

      {/* Bottom: Remove watermark CTA — subtle link */}
      <a
        href={removeHref}
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "rgba(255,255,255,0.55)",
          textDecoration: "underline",
          textDecorationColor: "rgba(255,255,255,0.25)",
          textUnderlineOffset: 3,
          cursor: "pointer",
          letterSpacing: "0.02em",
        }}
      >
        Remove watermark →
      </a>

      <style>{`
        @keyframes wm-pulse {
          0%, 100% { box-shadow: 0 6px 28px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(255,255,255,0.12) inset, 0 4px 24px rgba(168,85,247,0.55); }
          50%       { box-shadow: 0 6px 28px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(255,255,255,0.2) inset, 0 6px 36px rgba(168,85,247,0.8); }
        }
      `}</style>
    </div>
  );
}
