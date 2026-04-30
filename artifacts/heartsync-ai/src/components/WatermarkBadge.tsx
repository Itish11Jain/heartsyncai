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

  return (
    <Link href="/">
      <div
        style={{
          position: "fixed",
          bottom: "max(20px, env(safe-area-inset-bottom, 20px))",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9998,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 16px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.18)",
          cursor: "pointer",
          textDecoration: "none",
          whiteSpace: "nowrap",
        } as React.CSSProperties}
      >
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.95)", fontWeight: 600, letterSpacing: "0.02em" }}>
          Made for free on HeartSync
        </span>
        <span style={{ fontSize: 13 }}>✨</span>
      </div>
    </Link>
  );
}
