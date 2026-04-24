import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Lock, Info, ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth, useClerk } from "@clerk/react";
import { OCCASIONS, RELATIONS, getTemplate, getFallbackTemplate } from "@/lib/card-templates";
import { useCardUsage, gateNeeded } from "@/lib/usage";
import { trackEvent } from "@/lib/trackEvent";

const GEN_EMOJIS = ["✨", "💌", "🎀", "💛", "🎁", "🌟", "🥰", "💫", "🎊"];

function useSearchParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export default function Send() {
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded, getToken, userId: clerkUserId } = useAuth();
  const clerk = useClerk();
  const [, navigate] = useLocation();

  const { usage, loading: usageLoading, incrementUsage, fingerprint, userEmail } = useCardUsage();

  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [occasion, setOccasion] = useState(searchParams.get("occasion") ?? "feel_good");
  const [relation, setRelation] = useState(searchParams.get("relation") ?? "");
  const [recipientName, setRecipientName] = useState("");
  const [likes, setLikes] = useState("");
  const [customMsg, setCustomMsg] = useState("");
  const [showGenerating, setShowGenerating] = useState(false);
  const [genEmojiIdx, setGenEmojiIdx] = useState(0);
  const [showSignInGate, setShowSignInGate] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [cardUtr, setCardUtr] = useState("");
  const [cardUtrError, setCardUtrError] = useState("");
  const [cardUtrDone, setCardUtrDone] = useState(false);
  const [cardUtrLoading, setCardUtrLoading] = useState(false);

  // Track when user transitions from signed-out → signed-in while gate was shown
  const prevSignedIn = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && prevSignedIn.current === false && showSignInGate) {
      setShowSignInGate(false);
    }
    prevSignedIn.current = isSignedIn ?? false;
  }, [isSignedIn, isLoaded, showSignInGate]);

  const defaultMsg = (() => {
    if (!occasion || !relation) return "";
    const t = getTemplate(occasion, relation) ?? getFallbackTemplate(occasion);
    return t.final_message;
  })();

  useEffect(() => {
    if (occasion && relation) {
      const t = getTemplate(occasion, relation) ?? getFallbackTemplate(occasion);
      setCustomMsg(t.final_message);
    }
  }, [occasion, relation]);

  useEffect(() => {
    if (searchParams.get("occasion") && !occasion) setOccasion(searchParams.get("occasion") ?? "");
    if (searchParams.get("relation") && !relation) setRelation(searchParams.get("relation") ?? "");
  }, []);

  function goTo(nextStep: number, direction: number) {
    setDir(direction);
    setStep(nextStep);
  }

  /** Pick template respecting auth state and vinyl-first-post-signup logic. */
  function pickTemplate(): string {
    // Anonymous users only get Envelope or Cosmic
    if (!isSignedIn) {
      const anonTemplates = ["envelope", "cosmic", "crystal"];
      return anonTemplates[Math.floor(Math.random() * anonTemplates.length)];
    }
    // First signed-in card: always Vinyl (the premium reveal)
    const vinylUsed = localStorage.getItem("hs_vinyl_used");
    if (!vinylUsed) {
      localStorage.setItem("hs_vinyl_used", "1");
      return "vinyl";
    }
    // Subsequent: rotate all 4
    const ALL = ["envelope", "cosmic", "vinyl", "crystal"];
    return ALL[Math.floor(Math.random() * ALL.length)];
  }

  function buildCardUrl(name: string, msg: string, senderFlag = false, template = "envelope") {
    const base = window.location.origin + (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    const p = new URLSearchParams({ to: name, occasion, relation });
    if (likes.trim()) p.set("likes", likes.trim());
    if (msg.trim() && msg.trim() !== defaultMsg) {
      try { p.set("msg", btoa(unescape(encodeURIComponent(msg.trim())))); } catch { /* ignore */ }
    }
    if (senderFlag) p.set("sender", "1");
    /* Each template uses its own .html file so WhatsApp reads template-specific OG tags */
    if (template === "crystal") return `${base}/crystal.html?${p.toString()}`;
    if (template === "cosmic")  return `${base}/cosmic.html?${p.toString()}`;
    if (template === "vinyl")   return `${base}/vinyl.html?${p.toString()}`;
    return `${base}/envelope.html?${p.toString()}`;
  }

  useEffect(() => {
    if (!showGenerating) return;
    const iv = setInterval(() => {
      setGenEmojiIdx(i => (i + 1) % GEN_EMOJIS.length);
    }, 650);
    return () => clearInterval(iv);
  }, [showGenerating]);

  function isValidUtr(v: string) {
    const t = v.trim();
    return /^\d{12}$/.test(t) || /^[A-Za-z]{4}[A-Za-z0-9]{12,18}$/.test(t);
  }

  async function handleCardUtrSubmit() {
    const trimmed = cardUtr.trim();
    if (!isValidUtr(trimmed)) return;
    setCardUtrError("");
    setCardUtrLoading(true);
    try {
      const token = await getToken();
      const base = window.location.origin + (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
      const res = await fetch(`${base}/api/usage/card-pack-utr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ utr: trimmed }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        setCardUtrError(data.message ?? "Submission failed. Please try again.");
      } else {
        setCardUtrDone(true);
        trackEvent({ event: "paywall_paid", fingerprint, email: userEmail ?? undefined, occasion });
      }
    } catch {
      setCardUtrError("Submission failed. Please try again.");
    } finally {
      setCardUtrLoading(false);
    }
  }

  async function handleFinish() {
    if (!recipientName.trim() || showGenerating) return;

    // Check gate (only after usage has loaded)
    if (!usageLoading) {
      const gate = gateNeeded(usage);
      if (gate === "signin") {
        setShowSignInGate(true);
        trackEvent({ event: "signup_wall_shown", fingerprint, occasion });
        return;
      }
      if (gate === "paywall") {
        setShowPaywall(true);
        trackEvent({ event: "paywall_shown", fingerprint, clerk_user_id: isSignedIn ? undefined : undefined, email: userEmail ?? undefined, occasion });
        return;
      }
    }

    // Increment usage server-side before generating
    await incrementUsage();

    const template = pickTemplate();
    const isFree = !usage || usage.is_superuser || (!usage.is_signed_in ? usage.anon_used < 2 : usage.signed_in_used < 2);
    const fromCardRef = (() => { try { return localStorage.getItem("hs_from_card") === "1"; } catch { return false; } })();

    trackEvent({
      event: "card_created",
      fingerprint,
      clerk_user_id: clerkUserId ?? undefined,
      email: userEmail ?? undefined,
      occasion,
      template,
      has_likes: likes.trim().length > 0,
      used_custom_msg: customMsg.trim() !== defaultMsg.trim(),
      is_free: isFree,
      from_card_ref: fromCardRef,
    });

    const url = buildCardUrl(recipientName.trim(), customMsg, true, template);
    setShowGenerating(true);
    setTimeout(() => { window.location.href = url; }, 1800);
  }

  const stepVariants = {
    initial: { opacity: 0, x: dir * 50 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
    exit: { opacity: 0, x: dir * -50, transition: { duration: 0.2 } },
  };

  return (
    <div
      className="h-dvh flex flex-col items-center overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 50% 20%, #1a0a2e 0%, #0d0618 60%, #060310 100%)",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2" style={{ maxWidth: 520 }}>
        <Link href="/">
          <button className="flex items-center gap-1 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            <ChevronLeft size={16} /> Back
          </button>
        </Link>
        <span className="text-sm font-semibold" style={{ color: "rgba(255,215,0,0.7)", letterSpacing: "0.04em" }}>
          ✨ Create 3D Card
        </span>
        <div className="flex gap-1">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                width: step >= i ? 20 : 6,
                height: 4,
                borderRadius: 99,
                background: step >= i ? "linear-gradient(90deg, #FFD700, #FFA500)" : "rgba(255,255,255,0.15)",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>
      </div>

      <div className="w-full flex-1 flex flex-col items-center justify-center px-4 py-2" style={{ maxWidth: 520, minHeight: 0 }}>
        <AnimatePresence mode="wait" initial={false}>

          {/* Step 1: Occasion */}
          {step === 1 && (
            <motion.div key="step1" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <div className="relative flex justify-center items-center mb-1">
                <motion.span className="absolute -top-2 left-[8%] text-yellow-300 text-xs pointer-events-none"
                  animate={{ scale:[0,1.3,0], opacity:[0,1,0] }}
                  transition={{ duration:0.85, repeat:Infinity, repeatDelay:2.8, ease:"easeInOut" }}>✦</motion.span>
                <motion.span className="absolute -top-1 right-[10%] text-yellow-200 text-sm pointer-events-none"
                  animate={{ scale:[0,1.0,0], opacity:[0,0.85,0] }}
                  transition={{ duration:1.0, repeat:Infinity, repeatDelay:2.2, delay:1.1, ease:"easeInOut" }}>✦</motion.span>
                <motion.span className="absolute bottom-0 left-[38%] text-pink-300 text-xs pointer-events-none"
                  animate={{ scale:[0,1.1,0], opacity:[0,1,0] }}
                  transition={{ duration:0.75, repeat:Infinity, repeatDelay:3.2, delay:1.8, ease:"easeInOut" }}>✦</motion.span>
                <h1 className="text-2xl font-bold text-white text-center">What's the occasion?</h1>
              </div>
              <p className="text-center text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                Pick the vibe for your card
              </p>
              <div className="flex flex-col gap-2">
                {OCCASIONS.map(occ => (
                  <motion.button
                    key={occ.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setOccasion(occ.id); goTo(2, 1); }}
                    style={{
                      padding: "11px 16px",
                      borderRadius: 16,
                      background: occasion === occ.id
                        ? "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.12))"
                        : "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${occasion === occ.id ? "rgba(255,215,0,0.5)" : "rgba(255,255,255,0.08)"}`,
                      display: "flex", alignItems: "center", gap: 16,
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{occ.emoji}</span>
                    <div>
                      <div className="text-sm font-semibold text-white">{occ.label}</div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{occ.description}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Relation */}
          {step === 2 && (
            <motion.div key="step2" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <button onClick={() => goTo(1, -1)} className="flex items-center gap-1 text-sm mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>
                <ChevronLeft size={15} /> Back
              </button>
              <div className="relative flex justify-center items-center mb-2">
                <motion.span className="absolute -top-2 left-[14%] text-yellow-300 text-xs pointer-events-none"
                  animate={{ scale:[0,1.2,0], opacity:[0,1,0] }}
                  transition={{ duration:0.9, repeat:Infinity, repeatDelay:2.6, ease:"easeInOut" }}>✦</motion.span>
                <motion.span className="absolute -top-1 right-[14%] text-yellow-200 text-sm pointer-events-none"
                  animate={{ scale:[0,1.0,0], opacity:[0,0.9,0] }}
                  transition={{ duration:1.0, repeat:Infinity, repeatDelay:2.4, delay:1.0, ease:"easeInOut" }}>✦</motion.span>
                <motion.span className="absolute bottom-0 right-[35%] text-pink-300 text-xs pointer-events-none"
                  animate={{ scale:[0,1.1,0], opacity:[0,1,0] }}
                  transition={{ duration:0.8, repeat:Infinity, repeatDelay:3.0, delay:1.7, ease:"easeInOut" }}>✦</motion.span>
                <h1 className="text-2xl font-bold text-white text-center">Who is it for?</h1>
              </div>
              <p className="text-center text-sm mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
                We'll personalise the message
              </p>
              <div className="grid grid-cols-2 gap-3">
                {RELATIONS.map(rel => (
                  <motion.button
                    key={rel.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setRelation(rel.id); goTo(3, 1); }}
                    style={{
                      padding: "20px 14px",
                      borderRadius: 16,
                      background: relation === rel.id
                        ? "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.12))"
                        : "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${relation === rel.id ? "rgba(255,215,0,0.5)" : "rgba(255,255,255,0.08)"}`,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 32 }}>{rel.emoji}</span>
                    <div className="font-semibold text-white text-sm">{rel.label}</div>
                    <div className="text-xs text-center" style={{ color: "rgba(255,255,255,0.35)" }}>{rel.sub}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Name + Likes + Message */}
          {step === 3 && (
            <motion.div key="step3" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <button onClick={() => goTo(2, -1)} className="flex items-center gap-1 text-sm mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>
                <ChevronLeft size={15} /> Back
              </button>
              <h1 className="text-2xl font-bold text-white text-center mb-2">Who's it for?</h1>
              <p className="text-center text-sm mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
                We'll make it feel personal to them ✨
              </p>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                    Their name
                  </label>
                  <Input
                    placeholder="e.g. Rahul, Priya, Aditya…"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && recipientName.trim() && handleFinish()}
                    autoFocus
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1.5px solid rgba(255,255,255,0.12)",
                      color: "white",
                      fontSize: 16,
                      borderRadius: 12,
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "rgba(255,215,0,0.75)" }}>
                    ✨ What do they love?
                  </label>
                  <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                    We'll add a personal orb just for them — travel, pandas, coffee, cricket…
                  </p>
                  <Input
                    placeholder="e.g. travel, panda, cricket, pink, coffee…"
                    value={likes}
                    onChange={e => setLikes(e.target.value)}
                    style={{
                      background: "rgba(255,215,0,0.05)",
                      border: "1.5px solid rgba(255,215,0,0.2)",
                      color: "white",
                      fontSize: 14,
                      borderRadius: 12,
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                    Message <span style={{ color: "rgba(255,255,255,0.3)" }}>(optional — edit to personalise)</span>
                  </label>
                  <textarea
                    value={customMsg}
                    onChange={e => setCustomMsg(e.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.06)",
                      border: "1.5px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.9)",
                      fontSize: 14,
                      borderRadius: 12,
                      padding: "12px 14px",
                      resize: "vertical",
                      outline: "none",
                      lineHeight: 1.6,
                    }}
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={!recipientName.trim() || usageLoading || showGenerating}
                  onClick={handleFinish}
                  style={{
                    padding: "16px",
                    borderRadius: 14,
                    background: recipientName.trim() && !usageLoading
                      ? "linear-gradient(135deg, #FFD700, #FFA500)"
                      : "rgba(255,255,255,0.08)",
                    color: recipientName.trim() && !usageLoading ? "#000" : "rgba(255,255,255,0.3)",
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: recipientName.trim() && !usageLoading ? "pointer" : "default",
                    border: "none",
                    transition: "all 0.2s",
                  }}
                >
                  {usageLoading ? "Loading…" : "✨ Generate Link"}
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ════ GENERATING SPLASH ════ */}
      <AnimatePresence>
        {showGenerating && (
          <motion.div
            key="generating-splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed", inset: 0, zIndex: 80,
              background: "radial-gradient(ellipse at 50% 40%, #1a0a2e 0%, #0d0618 55%, #050210 100%)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20,
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={genEmojiIdx}
                initial={{ opacity: 0, scale: 0.65, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.65, y: -12 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                style={{ fontSize: 76 }}
              >
                {GEN_EMOJIS[genEmojiIdx]}
              </motion.div>
            </AnimatePresence>
            <motion.p
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{ fontSize: 20, fontWeight: 700, color: "#FFD700", letterSpacing: "0.04em", textAlign: "center", margin: 0, fontFamily: "'Segoe UI', system-ui, sans-serif" }}
            >
              Creating your card…
            </motion.p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", margin: 0, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
              Sprinkling the magic ✨
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ SIGN-IN GATE ════ */}
      <AnimatePresence>
        {showSignInGate && (
          <motion.div
            key="signin-gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              position: "fixed", inset: 0, zIndex: 90,
              background: "radial-gradient(ellipse at 50% 30%, #1a0030 0%, #080112 55%, #020008 100%)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "24px", fontFamily: "'Segoe UI', system-ui, sans-serif",
            }}
          >
            {/* Floating stars */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ y: [-8, 8, -8], opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
                style={{
                  position: "absolute",
                  left: `${12 + i * 15}%`,
                  top: `${15 + (i % 3) * 20}%`,
                  fontSize: 18 + (i % 3) * 6,
                  pointerEvents: "none",
                }}
              >
                {["⭐", "✨", "💫", "🌟", "✨", "⭐"][i]}
              </motion.div>
            ))}

            <div style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
              {/* Icon */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                style={{ fontSize: 72, marginBottom: 16 }}
              >
                💌
              </motion.div>

              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 8, lineHeight: 1.3 }}
              >
                You've sent 2 free cards!
              </motion.h2>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 28, lineHeight: 1.6 }}
              >
                Sign in with Google to unlock{" "}
                <span style={{ color: "#FFD700", fontWeight: 700 }}>2 more free cards</span>
                {" "}— plus your first exclusive Vinyl card ✨
              </motion.p>

              {/* Google sign-in button */}
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => clerk.openSignIn()}
                style={{
                  width: "100%",
                  padding: "15px 20px",
                  borderRadius: 14,
                  background: "#fff",
                  color: "#1a1a1a",
                  fontWeight: 700,
                  fontSize: 16,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  marginBottom: 14,
                  boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </motion.button>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 20 }}
              >
                No spam. No hidden fees. Just love. 💛
              </motion.p>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={() => setShowSignInGate(false)}
                style={{
                  background: "none", border: "none", color: "rgba(255,255,255,0.3)",
                  fontSize: 13, cursor: "pointer", textDecoration: "underline",
                }}
              >
                Maybe later
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ PAYWALL ════ */}
      <AnimatePresence>
        {showPaywall && (
          <motion.div
            key="paywall"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[90] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center px-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-sm"
            >
              {cardUtrDone ? (
                <div className="text-center">
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold text-white mb-2">You're all set!</h2>
                  <p className="text-white/60 mb-8 text-sm">10 cards have been added to your account.</p>
                  <button
                    onClick={() => { setShowPaywall(false); setCardUtrDone(false); setCardUtr(""); }}
                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm"
                  >
                    ✨ Continue Sending Cards
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold mb-1 text-white">Get More Cards</h1>
                  <p className="text-white/60 mb-6 text-sm">Pay via UPI, submit your UTR, and cards are added instantly.</p>

                  <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-3">
                        <Lock className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1">10 Cards for ₹50</h3>
                      <p className="text-sm text-white/45 mb-6 max-w-xs">
                        That's ₹5 per card — less than a samosa 🫶
                      </p>

                      <div className="flex gap-4 items-center mb-6 w-full">
                        <div className="bg-white rounded-xl p-2 shadow-lg shrink-0">
                          <img
                            src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=upi://pay?pa=8905158970@upi%26pn=HeartSync%20AI%26am=50%26cu=INR%26tn=HeartSync+Cards"
                            alt="UPI QR Code"
                            className="w-24 h-24 rounded-lg"
                          />
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-[10px] text-white/35 uppercase tracking-wide mb-1">UPI ID</p>
                          <p className="font-mono font-bold text-white text-sm">8905158970@upi</p>
                          <p className="text-xs text-white/35 mt-1.5">Amount: ₹50</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Info className="w-3 h-3 text-white/25" />
                            <p className="text-[10px] text-white/25">Scan QR or copy UPI ID</p>
                          </div>
                        </div>
                      </div>

                      <div className="w-full space-y-3">
                        <Input
                          placeholder="Paste UTR / Transaction ID"
                          value={cardUtr}
                          onChange={(e) => { setCardUtr(e.target.value); setCardUtrError(""); }}
                          className="bg-white/5 border-white/10 h-11 text-sm rounded-xl placeholder:text-white/20 text-center text-white"
                        />
                        {cardUtrError && <p className="text-xs text-destructive text-center">{cardUtrError}</p>}
                        <button
                          onClick={handleCardUtrSubmit}
                          disabled={!isValidUtr(cardUtr) || cardUtrLoading}
                          className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                        >
                          {cardUtrLoading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                          ) : (
                            <>Unlock 10 Cards <ArrowRight className="w-4 h-4" /></>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowPaywall(false)}
                    className="w-full text-center text-xs text-white/30 hover:text-white/50 transition-colors mt-4"
                  >
                    Go back
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
