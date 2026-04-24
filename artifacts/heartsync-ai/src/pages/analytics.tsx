import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { SUPERUSER_EMAIL } from "@/lib/trackEvent";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
const ADMIN_KEY = import.meta.env.VITE_ADMIN_SECRET ?? "";

type Overview = {
  cards_created: string;
  free_cards: string;
  paid_cards: string;
  shared_wa: string;
  shared_ig: string;
  shared_link: string;
  card_views: string;
  website_from_card: string;
  created_from_card_ref: string;
  signup_walls_shown: string;
  paywall_shown: string;
  paywall_paid: string;
  likes_filled: string;
  likes_total: string;
  custom_msg_changed: string;
  signed_in_free_cards: string;
};

type Occasion = { occasion: string; cnt: string };
type Cohort = { cards_used?: string; card_count?: string; users: string };

type AnalyticsData = {
  overview: Overview;
  occasions: Occasion[];
  signed_in_cohorts: Cohort[];
  anon_cohorts: Cohort[];
  signed_up_after_wall: string | number;
};

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,215,0,0.15)",
        borderRadius: 12,
        padding: "14px 18px",
        flex: "1 1 140px",
        minWidth: 130,
      }}
    >
      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: "#FFD700", fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function pct(num: string | number, denom: string | number): string {
  const n = Number(num);
  const d = Number(denom);
  if (!d) return "—";
  return `${Math.round((n / d) * 100)}%`;
}

export default function Analytics() {
  const { user, isLoaded } = useUser();
  const [, navigate] = useLocation();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const userEmail = user?.emailAddresses?.[0]?.emailAddress;

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      navigate("/sign-in?redirect_url=/analytics");
      return;
    }
    if (userEmail !== SUPERUSER_EMAIL) {
      navigate("/");
      return;
    }
    const key = ADMIN_KEY || prompt("Enter admin key:") || "";
    fetch(`${BASE}/api/events/analytics?key=${encodeURIComponent(key)}`)
      .then(r => r.json())
      .then((d: AnalyticsData) => { setData(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [isLoaded, userEmail, navigate]);

  if (!isLoaded || loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0618", color: "#FFD700" }}>
        Loading analytics…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0618", color: "#ff6b6b" }}>
        {error ?? "No data"}
      </div>
    );
  }

  const o = data.overview;
  const totalCards = Number(o.cards_created);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "radial-gradient(ellipse at 50% 10%, #1a0a2e 0%, #0d0618 70%)",
        color: "white",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        padding: "24px 16px 60px",
      }}
    >
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#FFD700", marginBottom: 4 }}>📊 HeartSync Analytics</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 28 }}>
          Excluding superuser · Real users only
        </p>

        {/* ── Cards Created ── */}
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Cards</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          <Stat label="Total Created" value={o.cards_created} />
          <Stat label="Free Cards" value={o.free_cards} sub={pct(o.free_cards, o.cards_created) + " of total"} />
          <Stat label="Paid Cards" value={o.paid_cards} sub={pct(o.paid_cards, o.cards_created) + " of total"} />
          <Stat label="Free + Paid Sum" value={String(Number(o.free_cards) + Number(o.paid_cards))} sub={"gap = cards before is_free tracking"} />
        </div>

        {/* ── Sharing ── */}
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Sharing</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          <Stat label="WhatsApp Shares" value={o.shared_wa} />
          <Stat label="Instagram Copies" value={o.shared_ig} />
          <Stat label="Link Copies" value={o.shared_link} />
          <Stat label="Card Views (Recipients)" value={o.card_views} />
        </div>

        {/* ── Referrals ── */}
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Viral / Referral</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          <Stat label="Site Visits from Card" value={o.website_from_card} />
          <Stat label="Cards Created via Ref" value={o.created_from_card_ref} sub={pct(o.created_from_card_ref, o.website_from_card) + " of visitors"} />
        </div>

        {/* ── Funnels ── */}
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Funnel</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          <Stat label="Signup Walls Shown" value={o.signup_walls_shown} />
          <Stat label="Signed-In Creators" value={String(data.signed_up_after_wall)} sub={"unique users who created a card"} />
          <Stat label="Paywall Shown" value={o.paywall_shown} />
          <Stat label="Paywall Paid" value={o.paywall_paid} sub={pct(o.paywall_paid, o.paywall_shown) + " paid"} />
        </div>

        {/* ── Engagement ── */}
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Engagement</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          <Stat label="Filled 'What They Love'" value={o.likes_filled} sub={pct(o.likes_filled, o.likes_total) + " of senders"} />
          <Stat label="Changed Default Msg" value={o.custom_msg_changed} sub={pct(o.custom_msg_changed, o.likes_total) + " of senders"} />
        </div>

        {/* ── Occasions ── */}
        {data.occasions.length > 0 && (
          <>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Top Occasions</h2>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,215,0,0.1)", padding: "12px 16px", marginBottom: 24 }}>
              {data.occasions.slice(0, 10).map((r, i) => (
                <div key={r.occasion} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < Math.min(data.occasions.length, 10) - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <span style={{ color: "rgba(255,255,255,0.8)" }}>{r.occasion.replace(/_/g, " ")}</span>
                  <span style={{ color: "#FFD700", fontWeight: 700 }}>{r.cnt} <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>({pct(r.cnt, totalCards)})</span></span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── User Cohorts ── */}
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>User Cohorts (Signed-In)</h2>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,215,0,0.1)", padding: "12px 16px", marginBottom: 24 }}>
          {data.signed_in_cohorts.length === 0 && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>No data yet</p>}
          {data.signed_in_cohorts.map((r, i) => (
            <div key={String(r.cards_used)} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < data.signed_in_cohorts.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <span style={{ color: "rgba(255,255,255,0.8)" }}>{r.cards_used} card{Number(r.cards_used) === 1 ? "" : "s"} sent</span>
              <span style={{ color: "#FFD700", fontWeight: 700 }}>{r.users} users</span>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>User Cohorts (Anonymous)</h2>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,215,0,0.1)", padding: "12px 16px", marginBottom: 24 }}>
          {data.anon_cohorts.length === 0 && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>No data yet</p>}
          {data.anon_cohorts.map((r, i) => (
            <div key={String(r.card_count)} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < data.anon_cohorts.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <span style={{ color: "rgba(255,255,255,0.8)" }}>{r.card_count} card{Number(r.card_count) === 1 ? "" : "s"} sent (anon)</span>
              <span style={{ color: "#FFD700", fontWeight: 700 }}>{r.users} sessions</span>
            </div>
          ))}
        </div>

        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, textAlign: "center" }}>
          HeartSync Admin · Data refreshed on page load
        </p>
      </div>
    </div>
  );
}
