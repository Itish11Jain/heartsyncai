import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/react";
import { ChevronLeft, HeartPulse, Sparkles, Crown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface CardRow {
  id: string;
  template: string | null;
  occasion: string | null;
  recipient_name: string | null;
  is_premium: boolean;
  is_watermarked: boolean;
  created_at: string;
}

interface Profile {
  plan: "free" | "premium";
  cards: CardRow[];
}

const TEMPLATE_LABELS: Record<string, string> = {
  envelope: "Envelope",
  crystal:  "Crystal",
  cosmic:   "Cosmic",
  vinyl:    "Vinyl",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CardRow({ card }: { card: CardRow }) {
  const shareUrl = `${window.location.origin}${BASE}/card?id=${card.id}`;
  const label = TEMPLATE_LABELS[card.template ?? ""] ?? (card.template ?? "Card");
  const isPremium = card.is_premium;

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-medium text-sm truncate">
            {card.recipient_name ? `To: ${card.recipient_name}` : "Unnamed recipient"}
          </span>
          {card.occasion && (
            <>
              <span className="text-white/25 text-xs">·</span>
              <span className="text-white/45 text-xs truncate">{card.occasion}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-white/30 text-xs">{label}</span>
          <span className="text-white/20 text-xs">·</span>
          <span className="text-white/30 text-xs">{fmtDate(card.created_at)}</span>
          {isPremium && (
            <>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-yellow-400/80 text-xs flex items-center gap-0.5">
                <Crown className="w-3 h-3" /> Premium
              </span>
            </>
          )}
        </div>
      </div>
      <a
        href={shareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 p-2 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
        title="Open card"
      >
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}

export default function Account() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${BASE}/api/clerk/profile`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Profile;
        if (!cancelled) setProfile(data);
      } catch (e) {
        if (!cancelled) setError("Could not load profile. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-white/60 text-sm">Sign in to view your account.</p>
        <Button asChild className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  const isPremium = profile?.plan === "premium";

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Button asChild variant="ghost" className="pl-0 text-white/60 hover:text-white hover:bg-transparent">
            <Link href="/" className="flex items-center gap-2">
              <ChevronLeft className="w-5 h-5" /> Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-primary to-secondary p-1.5 rounded-lg">
              <HeartPulse className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">HeartSync AI</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Plan card */}
          <div className={`rounded-2xl border p-6 mb-8 ${
            isPremium
              ? "bg-gradient-to-br from-yellow-400/10 to-orange-400/5 border-yellow-400/20"
              : "bg-white/[0.03] border-white/[0.07]"
          }`}>
            <div className="flex items-center gap-3">
              {isPremium ? (
                <div className="w-10 h-10 rounded-xl bg-yellow-400/15 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-yellow-400" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white/40" />
                </div>
              )}
              <div>
                <p className={`font-bold text-base ${isPremium ? "text-yellow-400" : "text-white"}`}>
                  {isPremium ? "Premium" : "Free"} Plan
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  {isPremium
                    ? "All templates unlocked · No watermarks"
                    : "Envelope template · Watermarked cards"}
                </p>
              </div>
              {!isPremium && (
                <Button
                  asChild
                  className="ml-auto shrink-0 h-8 px-4 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-semibold text-xs hover:opacity-90"
                >
                  <Link href="/send">Upgrade ₹99</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Cards list */}
          <h2 className="text-xl font-bold text-white mb-4">
            My Cards{" "}
            {profile && (
              <span className="text-white/30 text-sm font-normal ml-1">
                ({profile.cards.length})
              </span>
            )}
          </h2>

          {!profile || profile.cards.length === 0 ? (
            <div className="text-center py-16 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-white/20" />
              </div>
              <p className="text-white/35 text-sm mb-5">No cards yet.</p>
              <Button asChild className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm">
                <Link href="/send">Send your first card</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {profile.cards.map((card) => (
                <CardRow key={card.id} card={card} />
              ))}
            </div>
          )}

          {/* Sign out */}
          <div className="mt-10 pt-6 border-t border-white/[0.06]">
            <Button
              asChild
              variant="ghost"
              className="text-white/30 hover:text-white/60 hover:bg-white/5 text-sm px-0"
            >
              <Link href="/sign-out">Sign out</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
