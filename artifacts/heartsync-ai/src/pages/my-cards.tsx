/**
 * /my-cards/:token — Secret bundle dashboard.
 * Shows bundle credits remaining + cards unlocked via this bundle.
 * Token stored in localStorage so SenderPanel can read it.
 */
import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { trackEvent } from "@/lib/trackEvent";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

interface BundleCard {
  id: string;
  occasion: string | null;
  recipient_name: string | null;
  template: string | null;
  created_at: string;
}

interface BundleData {
  token: string;
  cards_remaining: number;
  created_at: string;
  upi_name: string | null;
  cards: BundleCard[];
}

const OCCASION_EMOJI: Record<string, string> = {
  birthday: "🎂",
  anniversary: "🥂",
  thank_you: "🙏",
  sorry: "💔",
  feel_good: "🌟",
  congratulations: "🏆",
};

function cardPagePath(card: BundleCard): string {
  const templateMap: Record<string, string> = {
    cosmic: "/cosmic",
    crystal: "/crystal",
    vinyl: "/vinyl",
  };
  return templateMap[card.template ?? ""] ?? "/card";
}

export default function MyCardsPage() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const [bundle, setBundle] = useState<BundleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { __clearHsSplash?: () => void }).__clearHsSplash?.();
    }
  }, []);

  // Store bundle token in localStorage so SenderPanel can use it
  useEffect(() => {
    if (!token) return;
    try { localStorage.setItem("hs_bundle_token", token); } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    if (!token || !/^[0-9a-f-]{36}$/.test(token)) {
      setError("Invalid bundle link.");
      setLoading(false);
      return;
    }

    fetch(`${BASE}/api/bundles/${token}`)
      .then((r) => {
        if (r.status === 404) throw new Error("Bundle not found. Check your link.");
        if (!r.ok) throw new Error("Something went wrong.");
        return r.json() as Promise<BundleData>;
      })
      .then((data) => {
        setBundle(data);
        setLoading(false);
        trackEvent({ event: "bundle_dashboard_viewed" });
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  function copyCardLink(card: BundleCard) {
    const path = cardPagePath(card);
    const url = `${window.location.origin}${BASE}${path}?id=${card.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedId(card.id);
    setTimeout(() => setCopiedId((c) => (c === card.id ? null : c)), 2200);
    trackEvent({ event: "bundle_card_link_copied", card_id: card.id });
  }

  function shareCardWhatsApp(card: BundleCard) {
    const path = cardPagePath(card);
    const url = `${window.location.origin}${BASE}${path}?id=${card.id}`;
    const name = card.recipient_name ?? "you";
    const text = `💌 Hey ${name}, I made you something special!\n\nYour surprise is waiting 👇\n${url}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    const a = document.createElement("a");
    a.href = waUrl; a.target = "_blank"; a.rel = "noopener noreferrer";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    trackEvent({ event: "bundle_card_shared_wa", card_id: card.id });
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#04000c" }}>
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 15, fontFamily: "system-ui" }}>Loading your cards…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#04000c", fontFamily: "system-ui", padding: "0 24px", textAlign: "center" }}>
        <div style={{ fontSize: 42, marginBottom: 16 }}>😕</div>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{error}</div>
        <Link href="/send">
          <span style={{ color: "rgba(255,215,0,0.7)", fontSize: 14, cursor: "pointer" }}>Create a new card →</span>
        </Link>
      </div>
    );
  }

  const hasUnlockedCards = (bundle?.cards.length ?? 0) > 0;
  const creditsRemaining = bundle?.cards_remaining ?? 0;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "radial-gradient(ellipse at 50% 0%, #1a003a 0%, #0a0014 55%, #04000c 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: "0 0 60px",
    }}>
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "0 20px" }}>

        {/* Header */}
        <div style={{ paddingTop: 32, paddingBottom: 24, textAlign: "center" }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>💌</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#FFD700", marginBottom: 6 }}>
            My Card Bundle
          </div>
          {bundle?.upi_name && (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
              Paid by {bundle.upi_name}
            </div>
          )}
        </div>

        {/* Credits bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: creditsRemaining > 0
              ? "rgba(255,215,0,0.07)"
              : "rgba(255,255,255,0.04)",
            border: `1px solid ${creditsRemaining > 0 ? "rgba(255,215,0,0.2)" : "rgba(255,255,255,0.07)"}`,
            borderRadius: 20, padding: "20px 22px", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 16,
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
            background: creditsRemaining > 0
              ? "linear-gradient(135deg,#FFD700,#FFAA00)"
              : "rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 900, color: creditsRemaining > 0 ? "#000" : "rgba(255,255,255,0.3)",
          }}>
            {creditsRemaining}
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 3 }}>
              {creditsRemaining > 0
                ? `${creditsRemaining} card unlock${creditsRemaining !== 1 ? "s" : ""} remaining`
                : "All credits used"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 1.5 }}>
              {creditsRemaining > 0
                ? "Create a card and unlock it free — your bundle credit is saved in this browser"
                : "Get another bundle to unlock more cards"}
            </div>
          </div>
        </motion.div>

        {/* Create card CTA */}
        {creditsRemaining > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Link href={`/send?bundle_token=${token}`}>
              <motion.div
                whileTap={{ scale: 0.97 }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  width: "100%", height: 54, borderRadius: 16,
                  background: "linear-gradient(135deg,#FFD700,#FFAA00)",
                  color: "#000", fontWeight: 800, fontSize: 17,
                  cursor: "pointer", boxShadow: "0 6px 24px rgba(255,165,0,0.38)",
                  marginBottom: 10,
                }}
              >
                ✨ Create a new card
              </motion.div>
            </Link>
            <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 24 }}>
              After creating, tap "Use bundle credit" on your card page
            </p>
          </motion.div>
        )}

        {/* Cards list */}
        {hasUnlockedCards && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 14 }}>
              Your cards
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <AnimatePresence>
                {bundle!.cards.map((card, i) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    style={{
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 16, padding: "16px 18px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                      <div style={{ fontSize: 28, flexShrink: 0 }}>
                        {OCCASION_EMOJI[card.occasion ?? ""] ?? "💌"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                          For {card.recipient_name ?? "someone special"}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
                          {card.occasion ? card.occasion.replace(/_/g, " ") : "Card"} · {card.template ?? "envelope"}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: "#4ade80",
                        background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)",
                        padding: "3px 8px", borderRadius: 99,
                      }}>
                        Unlocked ✓
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => shareCardWhatsApp(card)}
                        style={{
                          flex: 1, height: 40, borderRadius: 10,
                          background: "linear-gradient(135deg,#25D366,#128C7E)",
                          border: "none", color: "#fff", fontWeight: 700, fontSize: 13,
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => copyCardLink(card)}
                        style={{
                          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                          background: copiedId === card.id ? "rgba(74,222,128,0.15)" : "rgba(255,215,0,0.07)",
                          border: `1px solid ${copiedId === card.id ? "rgba(74,222,128,0.3)" : "rgba(255,215,0,0.18)"}`,
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                        title="Copy link"
                      >
                        {copiedId === card.id ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,215,0,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {creditsRemaining === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ textAlign: "center", padding: "8px 0 24px" }}
          >
            {!hasUnlockedCards && (
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, marginBottom: 16 }}>
                All credits used — get another bundle to keep going!
              </div>
            )}
            <Link href="/bundle">
              <motion.div
                whileTap={{ scale: 0.97 }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "14px 32px", borderRadius: 14,
                  background: "linear-gradient(135deg,#FFD700,#FFAA00)",
                  color: "#000", fontWeight: 800, fontSize: 16, cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(255,165,0,0.3)",
                }}
              >
                💌 Get 2 more cards · ₹49
              </motion.div>
            </Link>
          </motion.div>
        )}

        {/* Bookmark reminder */}
        <div style={{
          marginTop: 28, padding: "14px 18px",
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 14,
        }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, textAlign: "center" }}>
            🔖 Bookmark this page — it's your personal dashboard.<br />
            This link is secret and unique to you.
          </div>
        </div>

      </div>
    </div>
  );
}
