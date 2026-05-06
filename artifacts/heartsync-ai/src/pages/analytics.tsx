import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { isSuperUser } from "@/lib/trackEvent";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

type Overview = {
  names_entered: string;
  cta_clicks: string;
  generate_clicks: string;
  cards_created: string;
  card_views: string;
  free_cards: string;
  paid_cards: string;
  shared_wa: string;
  shared_ig: string;
  shared_link: string;
  website_from_card: string;
  created_from_card_ref: string;
  signup_walls_shown: string;
  paywall_shown: string;
  paywall_paid: string;
  likes_filled: string;
  likes_total: string;
  custom_msg_changed: string;
  signed_in_free_cards: string;
  names_entered_users: string;
  cta_users: string;
  generate_users: string;
  cards_created_users: string;
  card_viewed_users: string;
  photo_added: string;
  photo_added_users: string;
  signup_unlock_clicked: string;
  signup_unlock_users: string;
  continue_to_signin_clicked: string;
  continue_to_signin_users: string;
  share_without_photo_clicked: string;
  share_without_photo_users: string;
  photo_paywall_shown: string;
  photo_paywall_shown_users: string;
  google_signin_completed: string;
  google_signin_completed_users: string;
  bundle_paywall_shown: string;
  bundle_paywall_shown_users: string;
  pay_now_clicked: string;
  pay_now_clicked_users: string;
  utr_entered: string;
  utr_entered_users: string;
  confirm_unlock_clicked: string;
  confirm_unlock_clicked_users: string;
  paywall_paid_users: string;
};

type Occasion = { occasion: string; cnt: string };
type Cohort = { cards_used?: string; card_count?: string; users: string };
type RecentCard = { card_id: string | null; recipient_name: string | null; occasion: string | null; template: string | null; is_free: boolean | null; created_at: string; view_count: string | number };
type VitalRow = { metric_name: string; samples: number; p50: string | number | null; p75: string | number | null; p90: string | number | null };
type UtmRow = { source: string; sessions: string | number; cta_users: string | number; card_creators: string | number; cards: string | number; paid_cards: string | number };
type PhotoBreakdown = { photo_created: string; nophoto_created: string; photo_shared: string; nophoto_shared: string; photo_viewed: string; nophoto_viewed: string };
type RecipientCtaFunnel = { clicks: number; unique_clickers: number; cards_after_click: number };
type UserCardRow = { email: string; clerk_user_id: string; cards_used: string | number; created_at: string };

type AnalyticsData = {
  overview: Overview;
  occasions: Occasion[];
  signed_in_cohorts: Cohort[];
  anon_cohorts: Cohort[];
  signed_up_after_wall: string | number;
  recent_cards: RecentCard[];
  vitals?: VitalRow[];
  utm_funnel?: UtmRow[];
  photo_breakdown?: PhotoBreakdown | null;
  recipient_cta_funnel?: RecipientCtaFunnel;
  user_cards?: UserCardRow[];
  range?: { from: string | null; to: string | null };
};

/**
 * Date range chosen by the user. `from` / `to` are YYYY-MM-DD strings (the
 * API accepts both inclusive). `null` for either side means open-ended on
 * that side. Both null = "All time".
 */
type DateRange = { from: string | null; to: string | null };

/** Returns today's date as a local YYYY-MM-DD string. */
function todayLocal(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Returns the local YYYY-MM-DD that is `n` days before today (n >= 0). */
function daysAgoLocal(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const DATE_PRESETS: { id: string; label: string; build: () => DateRange }[] = [
  { id: "all",     label: "All time", build: () => ({ from: null, to: null }) },
  { id: "today",   label: "Today",    build: () => ({ from: todayLocal(), to: todayLocal() }) },
  { id: "7d",      label: "Last 7 days",  build: () => ({ from: daysAgoLocal(6), to: todayLocal() }) },
  { id: "30d",     label: "Last 30 days", build: () => ({ from: daysAgoLocal(29), to: todayLocal() }) },
  { id: "90d",     label: "Last 90 days", build: () => ({ from: daysAgoLocal(89), to: todayLocal() }) },
];

/** Human-friendly label for the currently active range. */
function describeRange(range: DateRange): string {
  if (!range.from && !range.to) return "All time";
  if (range.from === range.to && range.from === todayLocal()) return "Today";
  if (range.from && range.to) return `${range.from} → ${range.to}`;
  if (range.from) return `From ${range.from}`;
  return `Up to ${range.to ?? ""}`;
}

const VITAL_DESCRIPTIONS: Record<string, string> = {
  LCP: "Largest Contentful Paint",
  FCP: "First Contentful Paint",
  TTFB: "Time to First Byte",
  INP: "Interaction to Next Paint",
  CLS: "Cumulative Layout Shift",
};

function fmtMs(v: string | number | null): string {
  if (v === null) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(2)}s`;
  return `${Math.round(n)}ms`;
}

function fmtCls(v: string | number | null): string {
  if (v === null) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(3);
}

/** Web Vitals "good" thresholds per Google's Core Web Vitals guidance.
 * Units: LCP/FCP/TTFB/INP are milliseconds; CLS is unitless (the client sends
 * the raw value such as 0.05). */
function vitalColor(metric: string, value: number): string {
  const good: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
    INP: [200, 500],
    CLS: [0.1, 0.25],
  };
  const t = good[metric];
  if (!t) return "#FFD700";
  if (value <= t[0]) return "#34d399"; // green
  if (value <= t[1]) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

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
  const { getToken } = useAuth();
  const [, navigate] = useLocation();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /** Current date filter applied to the dashboard. Defaults to "All time". */
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  /** Which preset (or "custom") is currently selected, for highlighting. */
  const [activePreset, setActivePreset] = useState<string>("all");
  /** Drafts for the custom date inputs — only applied when the user clicks Apply. */
  const [draftFrom, setDraftFrom] = useState<string>("");
  const [draftTo, setDraftTo] = useState<string>("");

  const userEmail = user?.emailAddresses?.[0]?.emailAddress;

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      navigate("/sign-in?redirect_url=/analytics");
      return;
    }
    if (!isSuperUser(userEmail)) {
      navigate("/");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Not signed in — please reload and sign in again.");

        const qs = new URLSearchParams();
        if (range.from) qs.set("from", range.from);
        if (range.to) qs.set("to", range.to);
        const url = `${BASE}/api/events/analytics${qs.toString() ? "?" + qs.toString() : ""}`;

        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) {
          throw new Error(
            r.status === 401 || r.status === 403
              ? `Analytics API ${r.status}: your account is not authorised.`
              : `Analytics API returned ${r.status}.`,
          );
        }
        const d = (await r.json()) as AnalyticsData;
        if (!d.overview) throw new Error("API response missing overview field");
        if (cancelled) return;
        setData(d);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(String(e));
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isLoaded, user, userEmail, navigate, getToken, range.from, range.to]);

  /** Apply a quick-preset range and clear any custom-mode drafts. */
  function applyPreset(presetId: string): void {
    const preset = DATE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId);
    setRange(preset.build());
  }

  /** Apply the custom date inputs. Validates that at least one is set. */
  function applyCustom(): void {
    const from = draftFrom.trim() || null;
    const to = draftTo.trim() || null;
    if (!from && !to) {
      // Treat empty custom as "All time" rather than a no-op.
      applyPreset("all");
      return;
    }
    if (from && to && from > to) {
      // Swap to keep the range valid.
      setRange({ from: to, to: from });
    } else {
      setRange({ from, to });
    }
    setActivePreset("custom");
  }

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
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 16 }}>
          Excluding superuser · Real users only
        </p>

        {/* ── Date range filter ──
           Quick presets + custom from/to inputs. Applies to every panel
           on the page (funnel, UTM, cards, occasions, cohorts, vitals)
           except the lifetime "Signed-In Cohorts" table. */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,215,0,0.15)",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <span style={{ color: "rgba(255,215,0,0.7)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Date range
            </span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
              Showing: <span style={{ color: "#FFD700", fontWeight: 600 }}>{describeRange(range)}</span>
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: activePreset === "custom" ? 10 : 0 }}>
            {DATE_PRESETS.map((p) => {
              const isActive = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => applyPreset(p.id)}
                  style={{
                    background: isActive ? "rgba(255,215,0,0.18)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isActive ? "rgba(255,215,0,0.5)" : "rgba(255,255,255,0.1)"}`,
                    color: isActive ? "#FFD700" : "rgba(255,255,255,0.7)",
                    padding: "5px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={activePreset === "custom"}
              onClick={() => {
                setActivePreset("custom");
                setDraftFrom(range.from ?? "");
                setDraftTo(range.to ?? "");
              }}
              style={{
                background: activePreset === "custom" ? "rgba(255,215,0,0.18)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${activePreset === "custom" ? "rgba(255,215,0,0.5)" : "rgba(255,255,255,0.1)"}`,
                color: activePreset === "custom" ? "#FFD700" : "rgba(255,255,255,0.7)",
                padding: "5px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Custom…
            </button>
          </div>
          {activePreset === "custom" && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, paddingTop: 4 }}>
              <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                From
                <input
                  type="date"
                  value={draftFrom}
                  max={draftTo || undefined}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,215,0,0.2)",
                    borderRadius: 6,
                    padding: "4px 8px",
                    color: "white",
                    fontSize: 12,
                    fontFamily: "inherit",
                    colorScheme: "dark",
                  }}
                />
              </label>
              <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                To
                <input
                  type="date"
                  value={draftTo}
                  min={draftFrom || undefined}
                  max={todayLocal()}
                  onChange={(e) => setDraftTo(e.target.value)}
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,215,0,0.2)",
                    borderRadius: 6,
                    padding: "4px 8px",
                    color: "white",
                    fontSize: 12,
                    fontFamily: "inherit",
                    colorScheme: "dark",
                  }}
                />
              </label>
              <button
                type="button"
                onClick={applyCustom}
                style={{
                  background: "linear-gradient(135deg, #FFD700, #FFA500)",
                  border: "none",
                  color: "#1a0a2e",
                  padding: "5px 14px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* ── Conversion Funnel ── */}
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Conversion Funnel</h2>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,215,0,0.1)", marginBottom: 24, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", gap: 0, padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Step</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>Events</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>Users</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>Conv.</span>
          </div>
          {[
            { label: "Name Entered (Landing)", events: o.names_entered, users: o.names_entered_users, nextEvents: o.cta_clicks,        nextUsers: o.cta_users },
            { label: "Home CTA Clicked",  events: o.cta_clicks,      users: o.cta_users,           nextEvents: o.generate_clicks,   nextUsers: o.generate_users },
            { label: "Generate Clicked",  events: o.generate_clicks,  users: o.generate_users,      nextEvents: o.cards_created,     nextUsers: o.cards_created_users },
            { label: "Card Created",      events: o.cards_created,    users: o.cards_created_users, nextEvents: o.card_views,        nextUsers: o.card_viewed_users },
            { label: "Card Viewed (recip.)", events: o.card_views,    users: o.card_viewed_users,   nextEvents: null,                nextUsers: null },
          ].map((step, i, arr) => (
            <div key={step.label} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", gap: 0, padding: "10px 16px", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", alignItems: "center" }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 500 }}>{step.label}</div>
                {step.nextEvents !== null && (
                  <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 11, marginTop: 2 }}>
                    ↓ {pct(step.nextEvents, step.events)} events · {pct(step.nextUsers ?? "0", step.users)} users continue
                  </div>
                )}
              </div>
              <span style={{ color: "#FFD700", fontWeight: 800, fontSize: 18, textAlign: "right" }}>{step.events}</span>
              <span style={{ color: "rgba(255,215,0,0.6)", fontWeight: 700, fontSize: 16, textAlign: "right" }}>{step.users}</span>
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, textAlign: "right" }}>
                {step.nextEvents !== null ? pct(step.nextEvents, step.events) : "—"}
              </span>
            </div>
          ))}
        </div>

        {/* ── UTM / Source Attribution ── */}
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
          Acquisition by Source (UTM)
        </h2>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,215,0,0.1)", marginBottom: 24, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 70px 70px 70px 70px 70px", padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Source</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>Visitors</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>CTA</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>Cards</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>Paid</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>Conv%</span>
          </div>
          {(!data.utm_funnel || data.utm_funnel.length === 0) && (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, padding: "12px 14px" }}>
              No UTM data yet — share links with <code style={{ color: "#FFD700" }}>?utm_source=meta&utm_campaign=...</code> to start attributing visits.
            </p>
          )}
          {(data.utm_funnel ?? []).map((r, i, arr) => (
            <div key={r.source + String(i)} style={{ display: "grid", gridTemplateColumns: "1.4fr 70px 70px 70px 70px 70px", padding: "10px 14px", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", alignItems: "center" }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: 600 }}>{r.source}</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 2 }}>
                  {r.card_creators} unique creator{Number(r.card_creators) === 1 ? "" : "s"}
                </div>
              </div>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, textAlign: "right" }}>{r.sessions}</span>
              <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, textAlign: "right" }}>{r.cta_users}</span>
              <span style={{ color: "#FFD700", fontWeight: 700, fontSize: 14, textAlign: "right" }}>{r.cards}</span>
              <span style={{ color: Number(r.paid_cards) > 0 ? "#34d399" : "rgba(255,255,255,0.3)", fontWeight: Number(r.paid_cards) > 0 ? 700 : 400, fontSize: 13, textAlign: "right" }}>{r.paid_cards}</span>
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "right" }}>{pct(r.cards, r.sessions)}</span>
            </div>
          ))}
        </div>

        {/* ── Page Load Performance (Web Vitals, last 24h) ── */}
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
          Page Load (last 24h)
        </h2>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,215,0,0.1)", marginBottom: 24, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px 80px 80px", padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Metric</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>Samples</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>P50</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>P75</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>P90</span>
          </div>
          {(!data.vitals || data.vitals.length === 0) && (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, padding: "12px 16px" }}>
              No vitals samples yet — they'll appear once real users load the production build.
            </p>
          )}
          {(data.vitals ?? []).map((v, i, arr) => {
            const isCls = v.metric_name === "CLS";
            const p75n = Number(v.p75);
            const color = Number.isFinite(p75n) ? vitalColor(v.metric_name, p75n) : "#FFD700";
            return (
              <div key={v.metric_name} style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px 80px 80px", padding: "10px 16px", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", alignItems: "center" }}>
                <div>
                  <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 600 }}>{v.metric_name}</div>
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 2 }}>
                    {VITAL_DESCRIPTIONS[v.metric_name] ?? ""}
                  </div>
                </div>
                <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "right" }}>{v.samples}</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textAlign: "right" }}>{isCls ? fmtCls(v.p50) : fmtMs(v.p50)}</span>
                <span style={{ color, fontSize: 14, fontWeight: 700, textAlign: "right" }}>{isCls ? fmtCls(v.p75) : fmtMs(v.p75)}</span>
                <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, textAlign: "right" }}>{isCls ? fmtCls(v.p90) : fmtMs(v.p90)}</span>
              </div>
            );
          })}
        </div>

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

        {/* ── Funnels ── */}
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Funnel</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          <Stat label="Signup Walls Shown" value={o.signup_walls_shown} />
          <Stat label="Signed-In Creators" value={String(data.signed_up_after_wall)} sub={"unique users who created a card"} />
          <Stat label="Paywall Shown" value={o.paywall_shown} />
          <Stat label="Paywall Paid" value={o.paywall_paid} sub={pct(o.paywall_paid, o.paywall_shown) + " paid"} />
        </div>

        {/* ── Recipient CTA → Card Created funnel ──
         * "Create your own card" sits at the end of every received card.
         * This block answers: how many recipients tapped it, and how many
         * of them became creators themselves. Conversion ratios are
         * computed against unique devices, not raw clicks. */}
        {(() => {
          const f = data.recipient_cta_funnel ?? { clicks: 0, unique_clickers: 0, cards_after_click: 0 };
          return (
            <>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                Recipient CTA → Card Created
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
                <Stat label="CTA Clicks" value={f.clicks} sub={"taps on 'Create your own card'"} />
                <Stat label="Unique Recipients Clicked" value={f.unique_clickers} sub={"distinct devices"} />
                <Stat
                  label="Cards Created After Click"
                  value={f.cards_after_click}
                  sub={pct(String(f.cards_after_click), String(f.unique_clickers)) + " of clickers converted"}
                />
              </div>
            </>
          );
        })()}

        {/* ── Photo vs No-Photo breakdown ── */}
        {(() => {
          const pb = data.photo_breakdown;
          const rows = [
            {
              label: "Card with photo",
              created: Number(pb?.photo_created ?? 0),
              shared: Number(pb?.photo_shared ?? 0),
              viewed: Number(pb?.photo_viewed ?? 0),
            },
            {
              label: "Card without photo",
              created: Number(pb?.nophoto_created ?? 0),
              shared: Number(pb?.nophoto_shared ?? 0),
              viewed: Number(pb?.nophoto_viewed ?? 0),
            },
          ];
          return (
            <>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                Photo vs No-Photo
              </h2>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,215,0,0.1)", marginBottom: 24, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 130px 120px", padding: "8px 14px", background: "rgba(255,215,0,0.06)", fontSize: 11, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  <div>Card Type</div>
                  <div style={{ textAlign: "right" }}>Created</div>
                  <div style={{ textAlign: "right" }}>Shared / Copied</div>
                  <div style={{ textAlign: "right" }}>Viewed (Recipient)</div>
                </div>
                {rows.map((r, i) => (
                  <div
                    key={r.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 90px 130px 120px",
                      padding: "12px 14px",
                      borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{r.label}</div>
                    <div style={{ textAlign: "right", color: "#FFD700", fontWeight: 700 }}>{r.created}</div>
                    <div style={{ textAlign: "right", color: "#FFD700", fontWeight: 700 }}>{r.shared}</div>
                    <div style={{ textAlign: "right", color: "#FFD700", fontWeight: 700 }}>{r.viewed}</div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}

        {/* ── Photo Funnel ── */}
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Photo Funnel</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          <Stat label="Photos Added" value={o.photo_added_users} sub={`${o.photo_added} total events`} />
          <Stat label="Sign up & Unlock Clicks" value={o.signup_unlock_users} sub={`${o.signup_unlock_clicked} total events`} />
          <Stat label="Continue to Sign In Clicks" value={o.continue_to_signin_users} sub={`${o.continue_to_signin_clicked} total events`} />
          <Stat label="Share Without Photo Clicks" value={o.share_without_photo_users} sub={`${o.share_without_photo_clicked} total events`} />
          <Stat label="Cards Created with Photo" value={String(data.photo_breakdown?.photo_created ?? 0)} sub="from Photo vs No-Photo" />
          <Stat label="Cards Viewed with Photo" value={String(data.photo_breakdown?.photo_viewed ?? 0)} sub="recipient views" />
        </div>

        {/* ── Photo Paywall Funnel ── */}
        {(() => {
          const steps = [
            { label: "Saw 'Share with Photo' popup", users: Number(o.photo_paywall_shown_users) },
            { label: "Clicked 'Sign up & Unlock'", users: Number(o.signup_unlock_users) },
            { label: "Clicked 'Continue with Google'", users: Number(o.continue_to_signin_users) },
            { label: "Successfully signed up", users: Number(o.google_signin_completed_users) },
            { label: "Saw payment paywall", users: Number(o.bundle_paywall_shown_users) },
            { label: "Clicked 'Pay ₹49 Now'", users: Number(o.pay_now_clicked_users) },
            { label: "Entered last 4 digits of UTR", users: Number(o.utr_entered_users) },
            { label: "Clicked 'Confirm & Unlock'", users: Number(o.confirm_unlock_clicked_users) },
            { label: "Payment confirmed (paid)", users: Number(o.paywall_paid_users) },
          ];
          return (
            <>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Photo Paywall Funnel</h2>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,215,0,0.1)", marginBottom: 24, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 70px 80px", padding: "8px 14px", background: "rgba(255,215,0,0.06)", fontSize: 11, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  <div>#</div><div>Step</div><div style={{ textAlign: "right" }}>Users</div><div style={{ textAlign: "right" }}>Conv.</div>
                </div>
                {steps.map((s, i) => {
                  const prev = i === 0 ? null : steps[i - 1].users;
                  const conv = prev != null && prev > 0 ? Math.round((s.users / prev) * 100) + "%" : "—";
                  const isLast = s.label === "Payment confirmed (paid)";
                  return (
                    <div key={s.label} style={{ display: "grid", gridTemplateColumns: "24px 1fr 70px 80px", padding: "11px 14px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)", alignItems: "center", background: isLast ? "rgba(255,215,0,0.04)" : undefined }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 700 }}>{i + 1}</div>
                      <div style={{ color: isLast ? "rgba(255,215,0,0.9)" : "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: isLast ? 700 : 400 }}>{s.label}</div>
                      <div style={{ textAlign: "right", color: "#FFD700", fontWeight: 700, fontSize: 15 }}>{s.users}</div>
                      <div style={{ textAlign: "right", fontSize: 12, color: conv === "—" ? "rgba(255,255,255,0.2)" : s.users === 0 ? "#f87171" : "#4ade80", fontWeight: 600 }}>{conv}</div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}

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

        {/* ── Recent Cards ── */}
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Recent Cards (Last 20)</h2>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,215,0,0.1)", marginBottom: 24, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 60px 60px", gap: 0 }}>
            {["Recipient", "Occasion", "Template", "Free?", "👁 Views"].map(h => (
              <div key={h} style={{ padding: "8px 14px", fontSize: 11, fontWeight: 700, color: "rgba(255,215,0,0.6)", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", textAlign: h === "👁 Views" ? "center" : "left" }}>{h}</div>
            ))}
          </div>
          {(data.recent_cards ?? []).length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, padding: "12px 14px" }}>No cards yet</p>
          )}
          {(data.recent_cards ?? []).map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 60px 60px", borderBottom: i < (data.recent_cards ?? []).length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", alignItems: "center" }}>
              <div style={{ padding: "8px 14px", color: r.recipient_name ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)", fontSize: 13 }}>
                {r.recipient_name ?? "—"}
              </div>
              <div style={{ padding: "8px 14px", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                {r.occasion?.replace(/_/g, " ") ?? "—"}
              </div>
              <div style={{ padding: "8px 14px", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                {r.template ?? "—"}
              </div>
              <div style={{ padding: "8px 14px", fontSize: 12, color: r.is_free ? "#34d399" : "#f59e0b", fontWeight: 600 }}>
                {r.is_free === null ? "—" : r.is_free ? "Free" : "Paid"}
              </div>
              <div style={{ padding: "8px 6px", textAlign: "center" }}>
                {Number(r.view_count) > 0
                  ? <span style={{ background: "rgba(255,215,0,0.15)", color: "#FFD700", fontWeight: 700, fontSize: 13, borderRadius: 6, padding: "2px 8px" }}>{r.view_count}</span>
                  : <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>0</span>}
              </div>
            </div>
          ))}
        </div>

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

        {/* ── Signed-In Users by Cards Created ── */}
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,215,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
          Signed-In Users by Cards Created
        </h2>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,215,0,0.1)", marginBottom: 24, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 120px", padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>Cards</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>Joined</span>
          </div>
          {(!data.user_cards || data.user_cards.length === 0) ? (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, padding: "12px 16px" }}>No signed-in users yet</p>
          ) : (
            data.user_cards.map((r, i) => (
              <div
                key={r.clerk_user_id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 90px 120px",
                  padding: "10px 16px",
                  borderBottom: i < (data.user_cards ?? []).length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.email}
                </span>
                <span style={{
                  color: Number(r.cards_used) >= 3 ? "#f59e0b" : Number(r.cards_used) >= 1 ? "#FFD700" : "rgba(255,255,255,0.4)",
                  fontWeight: 800,
                  fontSize: 16,
                  textAlign: "right",
                }}>
                  {r.cards_used}
                </span>
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, textAlign: "right" }}>
                  {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                </span>
              </div>
            ))
          )}
        </div>

        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, textAlign: "center" }}>
          HeartSync Admin · Data refreshed on page load
        </p>
      </div>
    </div>
  );
}
