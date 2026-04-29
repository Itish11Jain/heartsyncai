import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Lock, Info, ArrowRight, Loader2, Check, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth, useClerk } from "@clerk/react";
import { OCCASIONS, RELATIONS, getTemplate, getFallbackTemplate } from "@/lib/card-templates";
import {
  useCardUsage,
  templateGate,
  isPremiumTemplate,
  type TemplateId,
} from "@/lib/usage";
import { trackEvent } from "@/lib/trackEvent";
import { TemplatePreview } from "@/components/template-preview";

const GEN_EMOJIS = ["✨", "💌", "🎀", "💛", "🎁", "🌟", "🥰", "💫", "🎊"];

const DRAFT_KEY = "hs_send_draft_v1";
const DRAFT_TTL_MS = 30 * 60 * 1000; // 30 minutes — long enough for a sign-in detour

interface SendDraft {
  occasion: string;
  relation: string;
  recipientName: string;
  likes: string;
  customMsg: string;
  selectedTemplate: TemplateId;
  step: number;
  savedAt: number;
}

/* ─── Template visual catalog (picker cards) ───────────────────────────── */

interface TemplateMeta {
  id: TemplateId;
  name: string;
  emoji: string;
  tagline: string;
  gradient: string;
  ringColor: string;
}

const TEMPLATE_CATALOG: TemplateMeta[] = [
  {
    id: "envelope",
    name: "Envelope",
    emoji: "💌",
    tagline: "Classic letter, always free",
    gradient: "linear-gradient(135deg, #5a1030 0%, #2d0618 100%)",
    ringColor: "rgba(255,176,204,0.6)",
  },
  {
    id: "cosmic",
    name: "Cosmic",
    emoji: "✨",
    tagline: "Stars align just for them",
    gradient: "linear-gradient(135deg, #0a1a4a 0%, #040c28 100%)",
    ringColor: "rgba(160,192,255,0.55)",
  },
  {
    id: "crystal",
    name: "Crystal",
    emoji: "🔮",
    tagline: "A glowing crystal vision",
    gradient: "linear-gradient(135deg, #2a0a5a 0%, #0d0320 100%)",
    ringColor: "rgba(200,160,255,0.55)",
  },
  {
    id: "vinyl",
    name: "Vinyl",
    emoji: "🎵",
    tagline: "A spinning record dedication",
    // Warm cream background to mirror the actual vinyl template's
    // record-store aesthetic. Title text on this card switches to dark.
    gradient: "linear-gradient(160deg, #F4ECE1 0%, #EDE0CC 50%, #DDD0B0 100%)",
    ringColor: "rgba(184,118,42,0.6)",
  },
];

function useSearchParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function loadDraft(): SendDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SendDraft;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

export default function Send() {
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded, getToken, userId: clerkUserId } = useAuth();
  const clerk = useClerk();

  const { usage, loading: usageLoading, incrementUsage, fingerprint, userEmail, refetch: refetchUsage } = useCardUsage();

  const initialRecipientName = (() => {
    const raw = searchParams.get("to") ?? "";
    return raw.trim().slice(0, 40);
  })();

  // Restore draft (e.g. after a Clerk sign-in redirect bounced us back here).
  const initialDraft = loadDraft();

  const [step, setStep] = useState<number>(Math.min(initialDraft?.step ?? 1, 3));
  const [dir, setDir] = useState(1);
  const [occasion, setOccasion] = useState(initialDraft?.occasion ?? searchParams.get("occasion") ?? "feel_good");
  const [relation, setRelation] = useState(initialDraft?.relation ?? searchParams.get("relation") ?? "");
  const [recipientName, setRecipientName] = useState(initialDraft?.recipientName ?? initialRecipientName);
  const [likes, setLikes] = useState(initialDraft?.likes ?? "");
  const [customMsg, setCustomMsg] = useState(initialDraft?.customMsg ?? "");
  // Template selection is intentionally NOT restored from draft — Envelope is always
  // the predictable default on a fresh load. Selections survive the in-page lifecycle
  // (signin modal, paywall modal) via React state, which is what matters for the flow.
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("envelope");

  const [showGenerating, setShowGenerating] = useState(false);
  const [genEmojiIdx, setGenEmojiIdx] = useState(0);
  const [showSignInGate, setShowSignInGate] = useState(false);
  const [signInGateContext, setSignInGateContext] = useState<TemplateId>("envelope");

  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallPlan, setPaywallPlan] = useState<"single" | "bundle">("bundle");
  const [paywallStage, setPaywallStage] = useState<"plan" | "claim" | "done">("plan");
  const [paywallUtr, setPaywallUtr] = useState("");
  const [paywallUtrError, setPaywallUtrError] = useState("");
  const [paywallLoading, setPaywallLoading] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);

  /* ─── Persist draft on every change ─────────────────────────────────── */
  useEffect(() => {
    // Don't bother saving the draft for empty / step-1 unless they've made progress.
    const meaningful =
      step > 1 || recipientName.trim().length > 0 || relation.length > 0 || likes.trim().length > 0;
    if (!meaningful) return;
    try {
      const draft: SendDraft = {
        occasion, relation, recipientName, likes, customMsg, selectedTemplate, step,
        savedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch { /* ignore quota */ }
  }, [occasion, relation, recipientName, likes, customMsg, selectedTemplate, step]);

  /* ─── Sign-in transition: dismiss the gate when Clerk reports signed-in ─ */
  const prevSignedIn = useRef<boolean | null>(null);
  const pendingPremiumAfterSignin = useRef<TemplateId | null>(null);
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && prevSignedIn.current === false && showSignInGate) {
      // If the user clicked a premium template before signing in, remember
      // it so we can route them straight to the paywall after refetch.
      if (isPremiumTemplate(signInGateContext)) {
        pendingPremiumAfterSignin.current = signInGateContext;
      }
      setShowSignInGate(false);
      refetchUsage();
    }
    prevSignedIn.current = isSignedIn ?? false;
  }, [isSignedIn, isLoaded, showSignInGate, signInGateContext, refetchUsage]);

  /* ─── After post-signin refetch lands, open paywall if still locked. ─── */
  useEffect(() => {
    const tpl = pendingPremiumAfterSignin.current;
    if (!tpl || usageLoading || !usage?.is_signed_in) return;
    if (usage.is_superuser || usage.unlocked_templates.includes(tpl)) {
      pendingPremiumAfterSignin.current = null;
      return;
    }
    if (templateGate(usage, tpl) === "paywall") {
      setSelectedTemplate(tpl);
      pendingPremiumAfterSignin.current = null;
      openPaywall();
    }
  }, [usage, usageLoading]);

  const defaultMsg = (() => {
    if (!occasion || !relation) return "";
    const t = getTemplate(occasion, relation) ?? getFallbackTemplate(occasion);
    return t.final_message;
  })();

  // Re-seed message when occasion/relation change (but only if user hasn't customised it).
  useEffect(() => {
    if (occasion && relation) {
      const t = getTemplate(occasion, relation) ?? getFallbackTemplate(occasion);
      setCustomMsg((current) => {
        // If empty or matches the previous template's default, replace.
        return !current.trim() ? t.final_message : current;
      });
    }
  }, [occasion, relation]);

  function goTo(nextStep: number, direction: number) {
    setDir(direction);
    setStep(nextStep);
  }

  function buildCardUrl(name: string, msg: string, senderFlag = false, template: TemplateId = "envelope", cardId?: string) {
    const base = window.location.origin + (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    const p = new URLSearchParams({ to: name, occasion, relation });
    if (likes.trim()) p.set("likes", likes.trim());
    if (msg.trim() && msg.trim() !== defaultMsg) {
      try { p.set("msg", btoa(unescape(encodeURIComponent(msg.trim())))); } catch { /* ignore */ }
    }
    if (senderFlag) p.set("sender", "1");
    if (cardId) p.set("cid", cardId);
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

  /* ─── Paywall: submit UTR for ₹29 / ₹49 plan ───────────────────────── */
  const handlePaywallUtrSubmit = useCallback(async () => {
    const trimmed = paywallUtr.trim();
    if (!isValidUtr(trimmed)) return;
    setPaywallUtrError("");
    setPaywallLoading(true);
    try {
      const token = await getToken();
      const base = window.location.origin + (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
      const res = await fetch(`${base}/api/usage/template-unlock-utr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ utr: trimmed, plan: paywallPlan }),
      });
      const data = await res.json() as { ok?: boolean; plan?: string; message?: string };
      if (!res.ok) {
        setPaywallUtrError(data.message ?? "Submission failed. Please try again.");
        return;
      }
      trackEvent({
        event: "paywall_paid",
        fingerprint, email: userEmail ?? undefined, occasion,
      });
      await refetchUsage();
      if (paywallPlan === "bundle") {
        // All 3 unlocked. Skip claim, go to done.
        setPaywallStage("done");
      } else {
        // Single — user must pick one of the 3 to claim.
        setPaywallStage("claim");
      }
    } catch {
      setPaywallUtrError("Submission failed. Please try again.");
    } finally {
      setPaywallLoading(false);
    }
  }, [paywallUtr, paywallPlan, getToken, fingerprint, userEmail, occasion, refetchUsage]);

  /* ─── Paywall: claim the chosen template after a ₹29 payment ───────── */
  const handleClaimTemplate = useCallback(async (template: TemplateId) => {
    if (!isPremiumTemplate(template)) return;
    setClaimError("");
    setClaimLoading(true);
    try {
      const token = await getToken();
      const base = window.location.origin + (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
      const res = await fetch(`${base}/api/usage/claim-template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ template }),
      });
      const data = await res.json() as { ok?: boolean; message?: string };
      if (!res.ok) {
        setClaimError(data.message ?? "Could not claim template. Please try again.");
        return;
      }
      setSelectedTemplate(template);
      trackEvent({
        event: "template_claimed",
        fingerprint, email: userEmail ?? undefined, occasion, template,
      });
      await refetchUsage();
      setPaywallStage("done");
    } catch {
      setClaimError("Could not claim template. Please try again.");
    } finally {
      setClaimLoading(false);
    }
  }, [getToken, fingerprint, userEmail, occasion, refetchUsage]);

  /* ─── Open paywall in a clean state ────────────────────────────────── */
  function openPaywall() {
    setPaywallStage("plan");
    setPaywallPlan("bundle");
    setPaywallUtr("");
    setPaywallUtrError("");
    setClaimError("");
    setShowPaywall(true);
    trackEvent({
      event: "paywall_shown",
      fingerprint,
      email: userEmail ?? undefined,
      occasion,
      template: selectedTemplate,
    });
  }

  function closePaywall() {
    setShowPaywall(false);
    // Don't reset stage immediately — user might want to scroll back.
    setTimeout(() => {
      setPaywallStage("plan");
      setPaywallUtr("");
      setPaywallUtrError("");
      setClaimError("");
    }, 350);
  }

  /* ─── The big one: handle the final generate click ─────────────────── */
  async function handleFinish() {
    if (!recipientName.trim() || showGenerating) return;

    trackEvent({
      event: "generate_clicked",
      fingerprint,
      clerk_user_id: clerkUserId ?? undefined,
      email: userEmail ?? undefined,
      occasion,
      template: selectedTemplate,
      recipient_name: recipientName.trim() || undefined,
    });

    if (!usageLoading) {
      const gate = templateGate(usage, selectedTemplate);
      if (gate === "signin") {
        setSignInGateContext(selectedTemplate);
        setShowSignInGate(true);
        trackEvent({
          event: "signup_wall_shown",
          fingerprint, occasion, template: selectedTemplate,
        });
        return;
      }
      if (gate === "paywall") {
        openPaywall();
        return;
      }
    }

    // If the gate passed only because of a pending single unlock, consume it
    // now so the entitlement is recorded before the card is generated.
    const needsAutoClaim =
      isPremiumTemplate(selectedTemplate) &&
      !!usage &&
      !usage.is_superuser &&
      !usage.unlocked_templates.includes(selectedTemplate) &&
      usage.pending_single_unlocks > 0;

    if (needsAutoClaim) {
      try {
        const token = await getToken();
        const baseApi = window.location.origin + (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
        const claimRes = await fetch(`${baseApi}/api/usage/claim-template`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ template: selectedTemplate }),
        });
        if (!claimRes.ok) {
          openPaywall();
          return;
        }
        await refetchUsage();
        trackEvent({
          event: "template_claimed",
          fingerprint, email: userEmail ?? undefined, occasion, template: selectedTemplate,
        });
      } catch {
        openPaywall();
        return;
      }
    }

    await incrementUsage();

    const isFree =
      selectedTemplate === "envelope" ||
      !!usage?.is_superuser ||
      (usage?.unlocked_templates ?? []).includes(selectedTemplate);
    const fromCardRef = (() => { try { return localStorage.getItem("hs_from_card") === "1"; } catch { return false; } })();

    const cardId = crypto.randomUUID().replace(/-/g, "").slice(0, 10);

    trackEvent({
      event: "card_created",
      fingerprint,
      clerk_user_id: clerkUserId ?? undefined,
      email: userEmail ?? undefined,
      occasion,
      template: selectedTemplate,
      has_likes: likes.trim().length > 0,
      used_custom_msg: customMsg.trim() !== defaultMsg.trim(),
      is_free: isFree,
      from_card_ref: fromCardRef,
      recipient_name: recipientName.trim() || undefined,
      card_id: cardId,
    });

    const url = buildCardUrl(recipientName.trim(), customMsg, true, selectedTemplate, cardId);
    clearDraft();
    setShowGenerating(true);
    setTimeout(() => { window.location.href = url; }, 1800);
  }

  /* ─── Sign-in trigger: persist draft + bounce to /sign-in ──────────── */
  function startSignIn() {
    // Persist now (the redirect would skip our debounced effect on some browsers).
    try {
      const draft: SendDraft = {
        occasion, relation, recipientName, likes, customMsg, selectedTemplate, step,
        savedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch { /* ignore */ }
    clerk.openSignIn();
  }

  /* ─── Step 4 picker: select + immediately route locked templates to gate. */
  // Tracks a tap on a locked template that we couldn't gate immediately
  // because usage was still loading. The effect below will pick this up
  // once usage resolves and trigger the right gate (signin or paywall).
  const pendingGateForTemplate = useRef<TemplateId | null>(null);

  function fireGateFor(t: TemplateId) {
    const gate = templateGate(usage, t);
    if (gate === "signin") {
      setSignInGateContext(t);
      setShowSignInGate(true);
      trackEvent({
        event: "signup_wall_shown",
        fingerprint, occasion, template: t,
      });
    } else if (gate === "paywall") {
      openPaywall();
    }
  }

  function handlePickTemplate(t: TemplateId) {
    setSelectedTemplate(t);
    trackEvent({
      event: "template_selected",
      fingerprint, email: userEmail ?? undefined, occasion, template: t,
    });

    // If this template is locked for the current user, route them to the
    // appropriate gate immediately rather than waiting until they click
    // Generate at the end of the wizard. If usage is still loading we
    // defer until the load completes.
    if (usageLoading) {
      pendingGateForTemplate.current = t;
    } else {
      fireGateFor(t);
    }
  }

  // Drains a deferred gate request once usage finishes loading, so a fast tap
  // on a premium thumbnail never silently swallows the gate intent.
  useEffect(() => {
    if (!usageLoading && pendingGateForTemplate.current) {
      const t = pendingGateForTemplate.current;
      pendingGateForTemplate.current = null;
      fireGateFor(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usageLoading, usage]);

  /* ─── UI helpers ────────────────────────────────────────────────────── */

  const stepVariants = {
    initial: { opacity: 0, x: dir * 50 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
    exit: { opacity: 0, x: dir * -50, transition: { duration: 0.2 } },
  };

  // Decide what the bottom Generate button should say based on the current
  // template choice + auth state. This is the "pre-flight" copy.
  const generateButtonLabel = (() => {
    if (usageLoading) return "Loading…";
    const gate = templateGate(usage, selectedTemplate);
    if (gate === "signin") {
      if (selectedTemplate === "envelope") return "Sign in to send another";
      return "Sign in to unlock";
    }
    if (gate === "paywall") return "Unlock to send →";
    return "✨ Generate Link";
  })();

  // Whether this template (right now) is locked for this user.
  function isTemplateLocked(t: TemplateId): boolean {
    if (usage?.is_superuser) return false;
    if (t === "envelope") {
      // Locked for anon users only after their first free Envelope.
      return !usage?.is_signed_in && (usage?.anon_used ?? 0) >= 1;
    }
    if (!usage?.is_signed_in) return true;
    if ((usage.unlocked_templates ?? []).includes(t)) return false;
    if ((usage.pending_single_unlocks ?? 0) > 0) return false;
    return true;
  }

  return (
    <div
      className="h-dvh flex flex-col items-center overflow-hidden"
      style={{
        position: "relative",
        background: "radial-gradient(ellipse at 50% 20%, #1a0a2e 0%, #0d0618 60%, #060310 100%)",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* ── Full-screen sparkle background — persists across all steps ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        {[
          { top: "6%",  left: "4%",  color: "#FFD700", sz: 11, delay: 0.0, dur: 1.5 },
          { top: "4%",  left: "82%", color: "#FFD700", sz: 9,  delay: 1.1, dur: 1.3 },
          { top: "13%", left: "42%", color: "#fff",    sz: 7,  delay: 0.5, dur: 1.7 },
          { top: "20%", left: "91%", color: "#FF69B4", sz: 10, delay: 2.0, dur: 1.2 },
          { top: "28%", left: "2%",  color: "#FFD700", sz: 8,  delay: 0.8, dur: 1.6 },
          { top: "33%", left: "62%", color: "#fff",    sz: 7,  delay: 1.4, dur: 1.4 },
          { top: "38%", left: "88%", color: "#A78BFA", sz: 9,  delay: 0.3, dur: 1.8 },
          { top: "44%", left: "16%", color: "#FF69B4", sz: 8,  delay: 2.2, dur: 1.3 },
          { top: "52%", left: "74%", color: "#FFD700", sz: 10, delay: 1.0, dur: 1.5 },
          { top: "58%", left: "7%",  color: "#fff",    sz: 7,  delay: 0.6, dur: 1.4 },
          { top: "64%", left: "52%", color: "#FF69B4", sz: 9,  delay: 1.7, dur: 1.3 },
          { top: "70%", left: "84%", color: "#FFD700", sz: 8,  delay: 0.4, dur: 1.6 },
          { top: "76%", left: "28%", color: "#fff",    sz: 7,  delay: 2.4, dur: 1.5 },
          { top: "82%", left: "66%", color: "#FF69B4", sz: 10, delay: 1.3, dur: 1.2 },
          { top: "88%", left: "11%", color: "#FFD700", sz: 8,  delay: 0.9, dur: 1.7 },
          { top: "93%", left: "46%", color: "#A78BFA", sz: 7,  delay: 1.6, dur: 1.4 },
          { top: "18%", left: "56%", color: "#FFD700", sz: 6,  delay: 2.7, dur: 1.3 },
          { top: "47%", left: "38%", color: "#fff",    sz: 6,  delay: 0.2, dur: 1.6 },
        ].map((s, i) => (
          <motion.span
            key={i}
            style={{ position: "absolute", top: s.top, left: s.left, fontSize: s.sz, color: s.color, lineHeight: 1 }}
            animate={{ scale: [0, 1.2, 0], opacity: [0, 0.75, 0] }}
            transition={{ duration: s.dur, repeat: Infinity, repeatDelay: 2.2 + (i % 5) * 0.4, delay: s.delay, ease: "easeInOut" }}
          >✦</motion.span>
        ))}
      </div>

      {/* Header — single contextual Back button. On steps 2 & 3 it walks
          one step backward in the wizard; on step 1 it falls back to /
          (home). This is the only Back affordance — inline backs were
          removed to keep the form fully on one screen fold. */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2" style={{ maxWidth: 520, position: "relative", zIndex: 1 }}>
        {step > 1 ? (
          <button
            onClick={() => goTo(step - 1, -1)}
            className="flex items-center gap-1 text-sm"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <ChevronLeft size={16} /> Back
          </button>
        ) : (
          <Link href="/">
            <button className="flex items-center gap-1 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              <ChevronLeft size={16} /> Back
            </button>
          </Link>
        )}
        <span className="text-sm font-semibold" style={{ color: "rgba(255,215,0,0.7)", letterSpacing: "0.04em" }}>
          ✨ Create 3D Card
        </span>
        <div className="flex gap-1">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                width: step >= i ? 18 : 6,
                height: 4,
                borderRadius: 99,
                background: step >= i ? "linear-gradient(90deg, #FFD700, #FFA500)" : "rgba(255,255,255,0.15)",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>
      </div>

      <div className="w-full flex-1 flex flex-col items-center justify-start md:justify-center px-4 pt-3 pb-2 md:py-2 overflow-y-auto" style={{ maxWidth: 520, minHeight: 0, position: "relative", zIndex: 1 }}>
        <AnimatePresence mode="wait" initial={false}>

          {/* Step 1: Occasion */}
          {step === 1 && (
            <motion.div key="step1" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="w-full">
              <div className="relative flex justify-center items-center mb-1">
                <h1 className="text-2xl font-bold text-white text-center px-4">
                  {recipientName.trim() ? (
                    <>What's the vibe for <span style={{ color: "#FFD700" }}>{recipientName.trim()}</span>?</>
                  ) : (
                    <>What's the occasion?</>
                  )}
                </h1>
              </div>
              <p className="text-center text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                {recipientName.trim() ? "Tap one — we'll write it" : "Pick the vibe for your card"}
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
            <motion.div key="step2" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="w-full mt-8 md:mt-0">
              <div className="relative flex justify-center items-center mb-2">
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
              {/* Inline Back removed — header Back covers it. Heading +
                  subtitle margins tightened so the form fits in one fold. */}
              <h1 className="text-2xl font-bold text-white text-center mb-1">Who's it for?</h1>
              <p className="text-center text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
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
                    onKeyDown={e => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
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
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,215,0,0.75)" }}>
                    ✨ What do they love?
                  </label>
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
                  data-testid="generate-button"
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
                  {generateButtonLabel}
                </motion.button>

                {/* Inline template picker — Envelope pre-selected, premium tap → gate. */}
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                      Card style
                    </label>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      Envelope is free forever ✨
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {TEMPLATE_CATALOG.map((tpl) => {
                      const selected = selectedTemplate === tpl.id;
                      const locked = isTemplateLocked(tpl.id);
                      const isPremium = isPremiumTemplate(tpl.id);
                      return (
                        <motion.button
                          key={tpl.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePickTemplate(tpl.id)}
                          data-testid={`template-card-${tpl.id}`}
                          style={{
                            position: "relative",
                            padding: 0,
                            borderRadius: 12,
                            overflow: "hidden",
                            cursor: "pointer",
                            border: `2px solid ${selected ? "rgba(255,215,0,0.85)" : "rgba(255,255,255,0.08)"}`,
                            boxShadow: selected
                              ? "0 0 0 2px rgba(255,215,0,0.18), 0 4px 14px rgba(0,0,0,0.45)"
                              : "0 2px 8px rgba(0,0,0,0.3)",
                            aspectRatio: "3 / 4",
                            background: tpl.gradient,
                          }}
                        >
                          <div style={{
                            position: "absolute", inset: 0,
                            background: `radial-gradient(ellipse at 50% 30%, ${tpl.ringColor} 0%, transparent 65%)`,
                            pointerEvents: "none",
                          }} />

                          {selected && (
                            <div style={{
                              position: "absolute", top: 4, right: 4, zIndex: 2,
                              width: 18, height: 18, borderRadius: 99,
                              background: "linear-gradient(135deg, #FFD700, #FFA500)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                            }}>
                              <Check size={11} color="#000" strokeWidth={3} />
                            </div>
                          )}
                          {/* Locked state — kept minimal so the artwork
                              stays the hero: a subtle dim veil over the
                              card plus a prominent gold "🔒 ₹29" pill in
                              the top-right corner. No centered lock glyph
                              (the veil + pill are enough). */}
                          {!selected && locked && (
                            <>
                              {/* Card-wide dim veil */}
                              <div style={{
                                position: "absolute", inset: 0, zIndex: 3,
                                background:
                                  "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.42) 100%)",
                                pointerEvents: "none",
                              }} />
                              {/* Top-right gold price pill */}
                              <div style={{
                                position: "absolute", top: 5, right: 5, zIndex: 5,
                                padding: "3px 7px", borderRadius: 99,
                                background:
                                  "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                                fontSize: 10, fontWeight: 800, color: "#1A0A02",
                                letterSpacing: "0.02em",
                                display: "flex", alignItems: "center", gap: 3,
                                boxShadow: "0 2px 6px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.2) inset",
                              }}>
                                <Lock size={10} strokeWidth={3} /> ₹29
                              </div>
                            </>
                          )}

                          {/* Centered hero graphic — fills the card so it
                              reads as a real preview, not a stamp at the top. */}
                          <div style={{
                            position: "absolute", inset: 0, zIndex: 1,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            paddingBottom: 22, // leave room for the title overlay
                          }}>
                            <TemplatePreview id={tpl.id} size={62} />
                          </div>
                          {/* Title overlay at the very bottom of the card. */}
                          <div style={{
                            position: "absolute", left: 0, right: 0, bottom: 4,
                            zIndex: 2, textAlign: "center",
                          }}>
                            <div style={{
                              color: tpl.id === "vinyl" ? "#3A2E24" : "#fff",
                              fontWeight: 700, fontSize: 11, lineHeight: 1.1,
                              textShadow: tpl.id === "vinyl"
                                ? "none"
                                : "0 1px 3px rgba(0,0,0,0.55)",
                            }}>
                              {tpl.name}
                            </div>
                            <div style={{
                              marginTop: 1, fontSize: 8, fontWeight: 700, letterSpacing: "0.05em",
                              color: tpl.id === "vinyl"
                                ? (isPremium ? "#8A5515" : "#3A6B1A")
                                : (isPremium ? "#FFD700" : "#90EE90"),
                            }}>
                              {isPremium ? "✦ PREMIUM" : "FREE"}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  {selectedTemplate !== "envelope" && isTemplateLocked(selectedTemplate) && usage?.is_signed_in && (
                    <p className="text-center text-xs mt-2" style={{ color: "rgba(255,215,0,0.6)" }}>
                      💡 Tip: ₹49 unlocks all 3 premium templates forever
                    </p>
                  )}
                </div>
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
              overflowY: "auto",
            }}
          >
            <div style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                style={{ fontSize: 64, marginBottom: 12 }}
              >
                {signInGateContext === "envelope" ? "💌" : (TEMPLATE_CATALOG.find(t => t.id === signInGateContext)?.emoji ?? "✨")}
              </motion.div>

              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 10, lineHeight: 1.3 }}
              >
                {signInGateContext === "envelope"
                  ? "Sign in for unlimited Envelope cards"
                  : `Sign in to unlock ${TEMPLATE_CATALOG.find(t => t.id === signInGateContext)?.name ?? "this template"}`}
              </motion.h2>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 18, lineHeight: 1.55 }}
              >
                {signInGateContext === "envelope"
                  ? <>You've used your free Envelope card. <span style={{ color: "#90EE90", fontWeight: 700 }}>Signing in unlocks unlimited Envelopes.</span></>
                  : <>This is a premium template. Sign in first — then unlock it with a one-time UPI payment.</>}
              </motion.p>

              {/* What signup gives you — explicit clarification */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  marginBottom: 20,
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ color: "#FFD700", fontSize: 16, lineHeight: 1.2 }}>✦</span>
                  <div>
                    <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Premium templates separately</div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Cosmic / Crystal / Vinyl unlock for ₹29 each, or all 3 for ₹49.</div>
                  </div>
                </div>
              </motion.div>

              {/* Google sign-in button */}
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                whileTap={{ scale: 0.97 }}
                onClick={startSignIn}
                data-testid="signin-gate-google"
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  borderRadius: 14,
                  background: "#fff",
                  color: "#1a1a1a",
                  fontWeight: 700,
                  fontSize: 15,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  marginBottom: 12,
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
                transition={{ delay: 0.5 }}
                style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14 }}
              >
                Your card draft is saved — we'll bring you right back.
              </motion.p>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
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

      {/* ════ PAYWALL (₹29 single / ₹49 bundle) ════ */}
      <AnimatePresence>
        {showPaywall && (
          <motion.div
            key="paywall"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[90] backdrop-blur-sm flex flex-col items-center justify-start px-4 py-6 overflow-y-auto"
            style={{ background: "radial-gradient(ellipse at 50% 30%, #1a0030 0%, #080112 55%, #020008 100%)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-sm my-auto"
            >
              {paywallStage === "done" ? (
                <div className="text-center">
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold text-white mb-2">You're all set!</h2>
                  <p className="text-white/60 mb-8 text-sm">
                    {paywallPlan === "bundle"
                      ? "All 3 premium templates are unlocked on your account — forever."
                      : `${TEMPLATE_CATALOG.find(t => t.id === selectedTemplate)?.name ?? "Your premium template"} is unlocked on your account — forever.`}
                  </p>
                  <button
                    onClick={() => { closePaywall(); }}
                    className="w-full h-12 rounded-xl text-white font-bold text-sm"
                    style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", color: "#000" }}
                    data-testid="paywall-done-continue"
                  >
                    ✨ Continue & Generate
                  </button>
                </div>
              ) : paywallStage === "claim" ? (
                <div>
                  <h1 className="text-2xl font-bold mb-1 text-white text-center">Pick your template</h1>
                  <p className="text-white/55 mb-5 text-sm text-center">Payment received! Choose which premium template to unlock on your account.</p>
                  <div className="grid grid-cols-1 gap-3">
                    {TEMPLATE_CATALOG.filter(t => isPremiumTemplate(t.id)).map((tpl) => (
                      <button
                        key={tpl.id}
                        disabled={claimLoading}
                        onClick={() => handleClaimTemplate(tpl.id)}
                        data-testid={`claim-${tpl.id}`}
                        style={{
                          position: "relative",
                          padding: "14px 16px",
                          borderRadius: 16,
                          background: tpl.gradient,
                          border: "1.5px solid rgba(255,255,255,0.12)",
                          textAlign: "left",
                          cursor: claimLoading ? "default" : "pointer",
                          opacity: claimLoading ? 0.6 : 1,
                          display: "flex", alignItems: "center", gap: 14,
                          overflow: "hidden",
                        }}
                      >
                        <div style={{
                          position: "absolute", inset: 0,
                          background: `radial-gradient(ellipse at 30% 30%, ${tpl.ringColor} 0%, transparent 70%)`,
                          pointerEvents: "none",
                        }} />
                        <div style={{ fontSize: 32, position: "relative", zIndex: 1 }}>{tpl.emoji}</div>
                        <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
                          <div className="text-white font-bold text-base">{tpl.name}</div>
                          <div className="text-white/55 text-xs">{tpl.tagline}</div>
                        </div>
                        <ArrowRight className="text-white/60" size={18} style={{ position: "relative", zIndex: 1 }} />
                      </button>
                    ))}
                  </div>
                  {claimError && <p className="text-xs text-destructive text-center mt-3">{claimError}</p>}
                  {claimLoading && <p className="text-xs text-white/45 text-center mt-3 flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Unlocking…</p>}
                </div>
              ) : (
                <>
                  <div className="text-center mb-5">
                    <Sparkles className="w-7 h-7 text-yellow-400 mx-auto mb-2" />
                    <h1 className="text-2xl font-bold text-white mb-1">Unlock premium</h1>
                    <p className="text-white/55 text-sm">Pay once via UPI, your account keeps it forever.</p>
                  </div>

                  {/* Plan toggle */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      onClick={() => setPaywallPlan("single")}
                      data-testid="plan-single"
                      style={{
                        padding: "14px 12px", borderRadius: 14,
                        background: paywallPlan === "single" ? "linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,165,0,0.10))" : "rgba(255,255,255,0.04)",
                        border: `1.5px solid ${paywallPlan === "single" ? "rgba(255,215,0,0.55)" : "rgba(255,255,255,0.08)"}`,
                        textAlign: "left", cursor: "pointer",
                      }}
                    >
                      <div className="text-white font-extrabold text-lg leading-tight">₹29</div>
                      <div className="text-white/55 text-xs">Unlock 1 template</div>
                      <div className="text-white/35 text-[10px] mt-1">Pick after payment</div>
                    </button>
                    <button
                      onClick={() => setPaywallPlan("bundle")}
                      data-testid="plan-bundle"
                      style={{
                        position: "relative",
                        padding: "14px 12px", borderRadius: 14,
                        background: paywallPlan === "bundle" ? "linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,165,0,0.10))" : "rgba(255,255,255,0.04)",
                        border: `1.5px solid ${paywallPlan === "bundle" ? "rgba(255,215,0,0.55)" : "rgba(255,255,255,0.08)"}`,
                        textAlign: "left", cursor: "pointer",
                      }}
                    >
                      <div style={{
                        position: "absolute", top: -8, right: 8,
                        background: "linear-gradient(135deg, #FFD700, #FFA500)",
                        color: "#000", fontWeight: 800, fontSize: 9,
                        padding: "2px 7px", borderRadius: 99, letterSpacing: "0.04em",
                      }}>BEST VALUE</div>
                      <div className="text-white font-extrabold text-lg leading-tight">₹49</div>
                      <div className="text-white/55 text-xs">Unlock all 3</div>
                      <div className="text-white/35 text-[10px] mt-1">Save ₹38 vs singles</div>
                    </button>
                  </div>

                  {/* UPI box */}
                  <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
                    <div className="flex gap-3 items-center mb-4">
                      <div className="bg-white rounded-xl p-1.5 shadow-lg shrink-0">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`upi://pay?pa=8905158970@upi&pn=HeartSync%20AI&am=${paywallPlan === "single" ? 29 : 49}&cu=INR&tn=HeartSync+Premium`)}`}
                          alt={`UPI QR Code ₹${paywallPlan === "single" ? 29 : 49}`}
                          className="w-20 h-20 rounded-lg"
                        />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-[10px] text-white/35 uppercase tracking-wide mb-0.5">UPI ID</p>
                        <p className="font-mono font-bold text-white text-sm break-all">8905158970@upi</p>
                        <p className="text-xs text-white/50 mt-1">Amount: <span className="text-white font-bold">₹{paywallPlan === "single" ? 29 : 49}</span></p>
                        <div className="flex items-center gap-1 mt-1">
                          <Info className="w-3 h-3 text-white/25 shrink-0" />
                          <p className="text-[10px] text-white/30">Scan QR or copy UPI ID</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Input
                        placeholder="Paste UTR / Transaction ID"
                        value={paywallUtr}
                        onChange={(e) => { setPaywallUtr(e.target.value); setPaywallUtrError(""); }}
                        data-testid="paywall-utr-input"
                        className="bg-white/5 border-white/10 h-11 text-sm rounded-xl placeholder:text-white/20 text-center text-white"
                      />
                      {paywallUtrError && <p className="text-xs text-destructive text-center">{paywallUtrError}</p>}
                      <button
                        onClick={handlePaywallUtrSubmit}
                        disabled={!isValidUtr(paywallUtr) || paywallLoading}
                        data-testid="paywall-utr-submit"
                        className="w-full h-11 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                        style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", color: "#000" }}
                      >
                        {paywallLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin text-black" /> Verifying…</>
                        ) : (
                          <>
                            {paywallPlan === "single" ? "Submit & pick template" : "Submit & unlock all"}
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-center text-[11px] text-white/35 mt-3">
                    Account-wide: works on every card you ever send. No subscription.
                  </p>

                  <button
                    onClick={closePaywall}
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
