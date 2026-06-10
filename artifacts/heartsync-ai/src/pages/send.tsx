import { useState, useEffect, useRef, useCallback, useTransition, memo, useMemo, lazy, Suspense } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ArrowRight, Loader2, Check, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSendAuth, SendAuthCtx, defaultSendAuth } from "@/contexts/sendAuthContext";
import { OCCASIONS, RELATIONS, getTemplate, getFallbackTemplate } from "@/lib/card-templates";
import {
  useCardUsageWithAuth,
  templateGate,
  isPremiumTemplate,
  type TemplateId,
} from "@/lib/usage";

/* ── Lazy Clerk bridge — loads concurrently with the form, fills SendAuthCtx ── */
const LazyClerkBridge = lazy(async () => {
  const [layerMod, bridgeMod] = await Promise.all([
    import("@/components/ClerkAuthLayer"),
    import("@/components/ClerkBridgeForSend"),
  ]);
  const Layer = layerMod.default;
  const Bridge = bridgeMod.default;
  return {
    default: function ClerkBridgeWrapper() {
      return <Layer><Bridge /></Layer>;
    },
  };
});
import { trackEvent } from "@/lib/trackEvent";
import { getOccasionPrice, getPriceConfigForOccasion } from "@/lib/priceArm";
import { payWithRazorpay, PaymentCancelled } from "@/lib/razorpay";
import { TemplatePreview } from "@/components/template-preview";

const GEN_EMOJIS = ["✨", "💌", "🎀", "💛", "🎁", "🌟", "🥰", "💫", "🎊"];

const VIRAL_NEXT: Record<string, TemplateId> = {
  envelope: "cosmic",
  cosmic: "vinyl",
  vinyl: "crystal",
  crystal: "envelope",
};

const DRAFT_KEY = "hs_send_draft_v1";
const DRAFT_TTL_MS = 30 * 60 * 1000; // 30 minutes — long enough for a sign-in detour

// Paywall state survives a refresh, tab close, or jump out to a UPI app.
// We persist enough to reopen the modal in exactly the same place so the
// user can finish entering the UTR after coming back from PhonePe / GPay
// / Paytm. 1 hour is plenty for a UPI round-trip without leaving stale
// prompts hanging around for days.
const PAYWALL_KEY = "hs_paywall_state_v1";
const PAYWALL_TTL_MS = 60 * 60 * 1000;
type PaywallStage = "plan" | "done";
type WatermarkStage = "choose" | "upi" | "done";
type PhotoSlot = {
  id: string;
  previewSrc: string;
  url: string | null;
  status: "uploading" | "done" | "error";
};
interface PaywallSnapshot {
  open: boolean;
  stage: PaywallStage;
  utr: string;
  savedAt: number;
}

interface SendDraft {
  occasion: string;
  relation: string;
  recipientName: string;
  likes?: string;
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

/* ─── Memoized template picker grid ───────────────────────────────────────
   Extracted from Send so that keystrokes in recipient-name / likes / message
   inputs don't re-render all 4 template cards.  React.memo skips re-renders
   as long as selectedTemplate, lockedTemplateIds, and onPick are stable.
   lockedTemplateIds is computed via useMemo in Send; onPick is useCallback. */

interface TemplatePickerProps {
  selectedTemplate: TemplateId;
  lockedTemplateIds: ReadonlySet<TemplateId>;
  onPick: (t: TemplateId) => void;
}

const TemplatePicker = memo(function TemplatePicker({
  selectedTemplate,
  lockedTemplateIds,
  onPick,
}: TemplatePickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {TEMPLATE_CATALOG.map((tpl) => {
        const selected = selectedTemplate === tpl.id;
        const locked = lockedTemplateIds.has(tpl.id);
        const isPremium = isPremiumTemplate(tpl.id);
        return (
          <motion.button
            key={tpl.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPick(tpl.id)}
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

            {!selected && locked && (
              <>
                <div style={{
                  position: "absolute", inset: 0, zIndex: 3,
                  background:
                    "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.42) 100%)",
                  pointerEvents: "none",
                }} />
                <div style={{
                  position: "absolute", top: 5, right: 5, zIndex: 5,
                  padding: "3px 7px", borderRadius: 99,
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.75)",
                  letterSpacing: "0.04em",
                  backdropFilter: "blur(6px)",
                }}>
                  ✨ Premium
                </div>
              </>
            )}

            <div style={{
              position: "absolute", inset: 0, zIndex: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              paddingBottom: 22,
            }}>
              <TemplatePreview id={tpl.id} size={62} />
            </div>

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
  );
});

function useSearchParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

/** Read Meta browser cookies for server-side CAPI match quality improvement.
 *  _fbp: Meta pixel cookie set on site visit.
 *  _fbc: Facebook click cookie (set when arriving from an ad).
 *  Falls back to building fbc from the fbclid URL param if the cookie is absent. */
function getMetaCookies(): { fbp: string | null; fbc: string | null } {
  try {
    const cookieMap = Object.fromEntries(
      document.cookie.split(";").map((c) => {
        const eq = c.indexOf("=");
        return eq === -1
          ? [c.trim(), ""]
          : [c.slice(0, eq).trim(), c.slice(eq + 1).trim()];
      }),
    );
    const fbp = cookieMap["_fbp"] ?? null;
    let fbc = cookieMap["_fbc"] ?? null;
    if (!fbc) {
      const fbclid = new URLSearchParams(window.location.search).get("fbclid");
      if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
    }
    return { fbp: fbp || null, fbc: fbc || null };
  } catch {
    return { fbp: null, fbc: null };
  }
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

function loadPaywallSnapshot(): PaywallSnapshot | null {
  try {
    const raw = localStorage.getItem(PAYWALL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    const p = parsed as Record<string, unknown>;
    const savedAt = p.savedAt;
    const stage = p.stage;
    if (typeof savedAt !== "number" || Date.now() - savedAt > PAYWALL_TTL_MS) {
      localStorage.removeItem(PAYWALL_KEY);
      return null;
    }
    // Don't auto-resurrect a "done" or "claim" modal (old format) — finished.
    if (stage === "done" || stage === "claim") {
      localStorage.removeItem(PAYWALL_KEY);
      return null;
    }
    return {
      open: !!p.open,
      stage: "plan",
      utr: typeof p.utr === "string" ? p.utr : "",
      savedAt,
    };
  } catch {
    return null;
  }
}

function clearPaywallSnapshot() {
  try { localStorage.removeItem(PAYWALL_KEY); } catch { /* ignore */ }
}

function SendInner() {
  const searchParams = useSearchParams();

  // Viral reply flow: source=reply&received=<template>&utm_source=viral_reply
  const isViralReply = searchParams.get("source") === "reply";
  const receivedTemplate = (searchParams.get("received") ?? "envelope") as TemplateId;

  const { isSignedIn, isLoaded, getToken, clerkUserId, userEmail, openSignIn } = useSendAuth();

  const { usage, loading: usageLoading, incrementUsage, fingerprint, refetch: refetchUsage } = useCardUsageWithAuth({ isLoaded, isSignedIn, getToken, userEmail });

  const initialRecipientName = (() => {
    const raw = searchParams.get("to") ?? "";
    return raw.trim().slice(0, 40);
  })();

  // Persist bundle_token from URL into localStorage so SenderPanel can pick it up
  // even after card.tsx redirects strip query params.
  useEffect(() => {
    const urlToken = searchParams.get("bundle_token");
    if (urlToken && /^[0-9a-f-]{36}$/.test(urlToken)) {
      try { localStorage.setItem("hs_bundle_token", urlToken); } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore draft (e.g. after a Clerk sign-in redirect bounced us back here).
  // When arriving via viral reply flow, skip the draft to start fresh.
  const initialDraft = isViralReply ? null : loadDraft();

  // Viral reply skips step 1 (occasion) — pre-filled as feel_good.
  const [step, setStep] = useState<number>(isViralReply ? 2 : Math.min(initialDraft?.step ?? 1, 3));
  const [dir, setDir] = useState(1);
  // Viral reply always uses thank_you regardless of URL params or draft state.
  const [occasion, setOccasion] = useState(isViralReply ? "thank_you" : (initialDraft?.occasion ?? searchParams.get("occasion") ?? "feel_good"));
  // Occasion-based unlock pricing (₹99 birthday/sorry · ₹49 others) + anchor.
  const unlockPricing = getPriceConfigForOccasion(occasion);
  // Viral reply pre-selects "partner" so the user can tap through quickly.
  const [relation, setRelation] = useState(isViralReply ? "partner" : (initialDraft?.relation ?? searchParams.get("relation") ?? ""));
  const [recipientName, setRecipientName] = useState(initialDraft?.recipientName ?? initialRecipientName);
  // SEO message-guide deep link: /send?occasion=…&text=… pre-fills the message
  // box. An explicit `text` param expresses fresh intent, so it wins over any
  // saved draft. The re-seed effect below only replaces an EMPTY message, so a
  // pre-filled message is never clobbered by the default-template logic.
  const prefillText = (() => {
    const raw = searchParams.get("text") ?? "";
    return raw.trim().slice(0, 300);
  })();
  const [customMsg, setCustomMsg] = useState(
    isViralReply
      ? "Thank you for this cute gesture!"
      : (prefillText || initialDraft?.customMsg || ""),
  );
  // Template selection is intentionally NOT restored from draft — Envelope is always
  // the predictable default on a fresh load. Selections survive the in-page lifecycle
  // (signin modal, paywall modal) via React state, which is what matters for the flow.
  const [selectedTemplate] = useState<TemplateId>("envelope");

  const [showGenerating, setShowGenerating] = useState(false);
  const [genEmojiIdx, setGenEmojiIdx] = useState(0);
  const [showSignInGate, setShowSignInGate] = useState(false);
  const [signInGateContext, setSignInGateContext] = useState<TemplateId>("envelope");
  const [gateEmail, setGateEmail] = useState("");

  // Paywall state hydrates from localStorage so a refresh, accidental tab
  // close, or jump out to a UPI app doesn't wipe the user's progress.
  const initialPaywall = loadPaywallSnapshot();
  const [showPaywall, setShowPaywall] = useState(initialPaywall?.open ?? false);
  const [paywallStage, setPaywallStage] = useState<PaywallStage>(initialPaywall?.stage ?? "plan");
  const [paywallUtr, setPaywallUtr] = useState(initialPaywall?.utr ?? "");
  const [paywallUtrError, setPaywallUtrError] = useState("");
  const [paywallLoading, setPaywallLoading] = useState(false);
  // Pending card ID used by both paywall and watermark upsell to call PATCH /api/cards/:id
  const [pendingCardId, setPendingCardId] = useState<string | undefined>(undefined);

  // Watermark upsell modal (envelope path after auth)
  const [showWatermarkUpsell, setShowWatermarkUpsell] = useState(false);
  const [watermarkStage, setWatermarkStage] = useState<WatermarkStage>("choose");
  const [watermarkUtrError, setWatermarkUtrError] = useState("");
  const [watermarkUtrLoading, setWatermarkUtrLoading] = useState(false);

  // Multi-photo upload state (up to 4 photos)
  // Each selected photo is an independent slot so uploads run in parallel and a
  // slow/failed one never blocks the others. `uploadedPhotoUrls` (used widely
  // below) and `photoUploading` are derived from it so downstream code is
  // unchanged.
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([]);
  const uploadedPhotoUrls = useMemo(
    () => photoSlots.filter(s => s.url).map(s => s.url!),
    [photoSlots],
  );
  const photoPreviewSrcs = useMemo(() => photoSlots.map(s => s.previewSrc), [photoSlots]);
  const photoUploading = photoSlots.some(s => s.status === "uploading");
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  // Auto background-removed version of the first photo (used as personal picture / sticker in Scene 5)
  const [autoStickerUrl, setAutoStickerUrl] = useState<string | null>(null);
  const autoStickerUrlRef     = useRef<string | null>(null);
  const bgRemoveInProgressRef = useRef(false);


  // Voice note recorder state
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [voiceUploadError, setVoiceUploadError] = useState<string | null>(null);
  const [voiceRecordDuration, setVoiceRecordDuration] = useState(0);
  const [voicePreviewPlaying, setVoicePreviewPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voicePreviewAudioRef = useRef<HTMLAudioElement | null>(null);

  /* ─── Pre-warm the /card chunk once the page is idle ────────────────────
     Almost every Send visitor navigates to /card right after generating.
     Pre-fetching it now eliminates the lazy-load waterfall (~600ms on Indian
     4G) that would otherwise delay the card page after "Generate my card".
     We respect saveData and skip on slow-2g/2g to avoid competing with
     the form's own resources on constrained connections. ──────────────── */
  useEffect(() => {
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const prefetch = () => {
      try {
        const conn = (navigator as unknown as {
          connection?: { saveData?: boolean; effectiveType?: string };
        }).connection;
        if (conn?.saveData) return;
        if (conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g") return;
        void import("@/pages/card");
      } catch { /* non-critical */ }
    };
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(prefetch, { timeout: 3000 });
    } else {
      setTimeout(prefetch, 2000);
    }
  }, []);

  /* ─── Persist draft on every change ─────────────────────────────────── */
  useEffect(() => {
    const meaningful = step > 1 || recipientName.trim().length > 0 || relation.length > 0;
    if (!meaningful) return;
    try {
      const draft: SendDraft = {
        occasion, relation, recipientName, customMsg, selectedTemplate, step,
        savedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch { /* ignore quota */ }
  }, [occasion, relation, recipientName, customMsg, selectedTemplate, step]);

  /* ─── Persist paywall state ─────────────────────────────────────────────
     The user often taps the QR / Copy → switches to their UPI app → makes
     payment → comes back. Browsers may discard the tab on memory pressure
     (especially mobile), so we mirror enough state to localStorage to fully
     reopen the modal. We also save partial UTR text so they don't have to
     retype the reference. */
  useEffect(() => {
    try {
      if (showPaywall && paywallStage !== "done") {
        const snap: PaywallSnapshot = {
          open: true,
          stage: paywallStage,
          utr: paywallUtr,
          savedAt: Date.now(),
        };
        localStorage.setItem(PAYWALL_KEY, JSON.stringify(snap));
      } else {
        // Modal closed (or user finished). Don't keep stale snapshot around.
        clearPaywallSnapshot();
      }
    } catch { /* ignore quota */ }
  }, [showPaywall, paywallStage, paywallUtr]);

  /* ─── Sign-in transition: dismiss the gate and queue the next step ─── */
  const prevSignedIn = useRef<boolean | null>(null);
  const pendingPremiumAfterSignin = useRef<TemplateId | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && prevSignedIn.current === false && showSignInGate) {
      if (isPremiumTemplate(signInGateContext)) {
        pendingPremiumAfterSignin.current = signInGateContext;
      }
      setShowSignInGate(false);
      refetchUsage();
    }
    prevSignedIn.current = isSignedIn ?? false;
  }, [isSignedIn, isLoaded, showSignInGate, signInGateContext, refetchUsage]);

  /* ─── After post-signin refetch: route to paywall for premium templates ─ */
  useEffect(() => {
    if (usageLoading || !usage?.is_signed_in) return;

    const premiumTpl = pendingPremiumAfterSignin.current;
    if (premiumTpl) {
      if (usage.is_superuser || usage.unlocked_templates.includes(premiumTpl)) {
        pendingPremiumAfterSignin.current = null;
        doGenerateCardRef.current();
        return;
      }
      if (templateGate(usage, premiumTpl) === "paywall") {
        pendingPremiumAfterSignin.current = null;
        openPaywall();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usage, usageLoading]);

  const defaultMsg = useMemo(() => {
    if (!occasion || !relation) return "";
    const t = getTemplate(occasion, relation) ?? getFallbackTemplate(occasion);
    return t.final_message;
  }, [occasion, relation]);

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

  const [, startTransition] = useTransition();

  function goTo(nextStep: number, direction: number) {
    startTransition(() => {
      setDir(direction);
      setStep(nextStep);
    });
  }

  function buildCardUrl(
    name: string,
    msg: string,
    senderFlag = false,
    template: TemplateId = "envelope",
    cardId?: string,
    directShare = false,
    personalPictureUrl?: string,
    photoUrls?: string[],
    voiceUrl?: string,
  ) {
    const base = window.location.origin + (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    const p = new URLSearchParams({ to: name, occasion, relation });
    if (msg.trim() && msg.trim() !== defaultMsg) {
      try { p.set("msg", btoa(unescape(encodeURIComponent(msg.trim())))); } catch { /* ignore */ }
    }
    if (senderFlag) p.set("sender", "1");
    if (cardId) p.set("id", cardId);
    if (directShare) p.set("direct_share", "1");
    // The orbs-screen circle (PolaroidFrame) only renders when `personalpicture`
    // is present. Prefer an explicit URL (e.g. the birthday cutout sticker), but
    // fall back to the first uploaded photo so every non-birthday Envelope card
    // still shows the photo in the circle regardless of which finalize path ran.
    const personalPicture = personalPictureUrl ?? photoUrls?.[0];
    if (personalPicture) p.set("personalpicture", personalPicture);
    if (photoUrls && photoUrls.length > 0) {
      p.set("photos", photoUrls.map(u => encodeURIComponent(u)).join(","));
    }
    if (voiceUrl) p.set("voicenote", encodeURIComponent(voiceUrl));
    if (template === "crystal")  return `${base}/crystal.html?${p.toString()}`;
    if (template === "cosmic")   return `${base}/cosmic.html?${p.toString()}`;
    if (template === "vinyl")    return `${base}/vinyl.html?${p.toString()}`;
    if (template === "birthday") return `${base}/birthday.html?${p.toString()}`;
    return `${base}/envelope.html?${p.toString()}`;
  }


  /** Resize + re-encode as JPEG 85% so uploads are 10-20× smaller than raw phone photos. */
  function compressPhoto(file: File): Promise<File> {
    return new Promise(resolve => {
      const MAX_PX = 1200;
      const img = new Image();
      const objUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        const { naturalWidth: w, naturalHeight: h } = img;
        const scale = Math.min(1, MAX_PX / Math.max(w, h));
        const cw = Math.round(w * scale);
        const ch = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        canvas.getContext("2d")!.drawImage(img, 0, 0, cw, ch);
        canvas.toBlob(blob => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        }, "image/jpeg", 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(file); };
      img.src = objUrl;
    });
  }

  async function handlePhotoSelect(file: File, isFirstPhoto: boolean) {
    setPhotoUploadError(null);
    const slotId = crypto.randomUUID();
    const previewSrc = URL.createObjectURL(file);
    // Register the slot immediately so its thumbnail + spinner appear right away.
    // Each slot uploads independently; one slow/failed photo can't block others.
    setPhotoSlots(prev => [...prev, { id: slotId, previewSrc, url: null, status: "uploading" }]);
    const dropSlot = () => {
      setPhotoSlots(prev => prev.filter(s => s.id !== slotId));
      URL.revokeObjectURL(previewSrc);
    };
    try {
      const base = window.location.origin + (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
      const compressed = await compressPhoto(file);
      const fd = new FormData();
      fd.append("photo", compressed);
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), 60000);
      let res: Response;
      try {
        res = await fetch(`${base}/api/upload/photo`, { method: "POST", body: fd, signal: ac.signal });
      } finally {
        clearTimeout(to);
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setPhotoUploadError(d.error ?? "Upload failed. Please try again.");
        dropSlot();
        return;
      }
      const data = await res.json() as { url?: string };
      if (data.url) {
        setPhotoSlots(prev => prev.map(s => s.id === slotId ? { ...s, url: data.url!, status: "done" } : s));
        trackEvent({ event: "photo_added", occasion, clerk_user_id: clerkUserId ?? undefined, email: userEmail ?? undefined, fingerprint: fingerprint ?? undefined, template: selectedTemplate });

        // For birthday cards: auto-remove background of the FIRST photo so it
        // appears as a transparent PNG sticker cutout in Scene 5. Gate on both
        // the first-photo flag (captured at selection time, before any parallel
        // upload finishes) and the ref, so this fires exactly once.
        if (occasion === "birthday" && isFirstPhoto && !autoStickerUrlRef.current) {
          // Predict the sticker URL up-front using a client-generated id, so the
          // card can swap the transparent cutout in as soon as it's ready — even
          // if the user creates the card before background removal finishes (it
          // runs for a few seconds on the server). The original photo is shown
          // immediately and the cutout replaces it once available.
          const photoUrl = data.url!;
          // Reference the photo we JUST uploaded by its storage key so the
          // server can fetch it internally — no re-upload of the image bytes,
          // which would otherwise compete with photos 2 & 3 on a slow uplink.
          const photoKey = photoUrl.split("/api/photos/")[1] ?? "";
          const stickerId = crypto.randomUUID();
          const predictedUrl = `${base}/api/stickers/sticker/${stickerId}.png`;
          setAutoStickerUrl(predictedUrl);
          autoStickerUrlRef.current = predictedUrl;
          bgRemoveInProgressRef.current = true;
          const sfd = new FormData();
          sfd.append("stickerId", stickerId);
          sfd.append("photoKey", photoKey);
          fetch(`${base}/api/upload/sticker`, { method: "POST", body: sfd })
            .then(sr => sr.ok ? sr.json() : null)
            .then((sd: { url?: string } | null) => {
              // On success adopt the server's ACTUAL sticker URL (its stored key
              // can differ from our predicted id in the rare case the storage
              // existence check fails and it falls back to a random key), but
              // force https so it can never be blocked as mixed content on the
              // https card. On failure fall back to the plain photo so the card
              // never polls for a file that the server never produced.
              const finalUrl = sd?.url
                ? sd.url.replace(/^http:\/\//, "https://")
                : photoUrl;
              setAutoStickerUrl(finalUrl);
              autoStickerUrlRef.current = finalUrl;
            })
            .catch(() => {
              setAutoStickerUrl(photoUrl);
              autoStickerUrlRef.current = photoUrl;
            })
            .finally(() => { bgRemoveInProgressRef.current = false; });
        }
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setPhotoUploadError(aborted
        ? "Upload timed out. Check your connection and try again."
        : "Upload failed. Please try again.");
      dropSlot();
    }
  }

  function startRecordingWithStream(stream: MediaStream) {
    const mimeType = (
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
      MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" :
      MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" :
      MediaRecorder.isTypeSupported("audio/ogg;codecs=opus") ? "audio/ogg;codecs=opus" : ""
    );
    let mr: MediaRecorder;
    try {
      mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      mr = new MediaRecorder(stream);
    }
    voiceChunksRef.current = [];
    mr.ondataavailable = e => { if (e.data.size > 0) voiceChunksRef.current.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(voiceChunksRef.current, { type: mimeType || "audio/webm" });
      await uploadVoiceBlob(blob);
    };
    mr.start(200);
    mediaRecorderRef.current = mr;
    setVoiceRecording(true);
    setVoiceRecordDuration(0);
    voiceTimerRef.current = setInterval(() => {
      setVoiceRecordDuration(d => d + 1);
    }, 1000);
  }

  function handleMicError(err: unknown) {
    const name = (err instanceof Error) ? err.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      setVoiceUploadError("Mic blocked — please allow microphone access in your browser settings and try again.");
    } else if (name === "NotFoundError") {
      setVoiceUploadError("No microphone found on this device.");
    } else {
      setVoiceUploadError(`Could not start recording (${name || "unknown error"}). Try again or use a different browser.`);
    }
  }

  function handleStopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    setVoiceRecording(false);
  }

  async function uploadVoiceBlob(blob: Blob) {
    setVoiceUploading(true);
    setVoiceUploadError(null);
    try {
      const base = window.location.origin + (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
      const fd = new FormData();
      fd.append("audio", blob, "voice.webm");
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), 60000);
      let res: Response;
      try {
        res = await fetch(`${base}/api/upload/audio`, { method: "POST", body: fd, signal: ac.signal });
      } finally {
        clearTimeout(to);
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setVoiceUploadError(d.error ?? "Upload failed. Please try again.");
        return;
      }
      const data = await res.json() as { url?: string };
      if (data.url) setVoiceNoteUrl(data.url);
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setVoiceUploadError(aborted
        ? "Upload timed out. Check your connection and try again."
        : "Upload failed. Please try again.");
    } finally {
      setVoiceUploading(false);
    }
  }

  useEffect(() => {
    if (!showGenerating) return;
    const iv = setInterval(() => {
      setGenEmojiIdx(i => (i + 1) % GEN_EMOJIS.length);
    }, 650);
    return () => clearInterval(iv);
  }, [showGenerating]);

  /* ─── Core card-generation logic ───────────────────────────────────── */
  const doGenerateCard = useCallback(async () => {
    const fromCardRef = (() => { try { return localStorage.getItem("hs_from_card") === "1"; } catch { return false; } })();

    // Viral reply: force the next template in the progression regardless of user selection.
    // Birthday occasion always uses the birthday template.
    const effectiveTemplate: TemplateId = isViralReply
      ? (VIRAL_NEXT[receivedTemplate] ?? selectedTemplate)
      : occasion === "birthday"
        ? "birthday"
        : selectedTemplate;

    /* ── Premium templates: redirect immediately for preview + pay-wall ─ */
    /* The card page (crystal/cosmic/vinyl) handles sign-in + paywall.     */
    /* We do NOT create a DB card or increment usage here — that happens   */
    /* in PremiumLockPanel after the ₹49 payment is confirmed.             */
    if (isPremiumTemplate(effectiveTemplate)) {
      /* Generate a client-side tracking ID so card_created and card_viewed
       * events stay linked for premium templates too. No DB card row is
       * created here (that happens on unlock), so without this the analytics
       * "Views" column stays 0 — the recipient's card_viewed id would never
       * match the card_created event. Threading the same id into buildCardUrl
       * also stops the card page from generating its own id. */
      const trackingId = Math.random().toString(36).slice(2, 10);
      trackEvent({
        event: "card_created",
        fingerprint, clerk_user_id: clerkUserId ?? undefined,
        email: userEmail ?? undefined, occasion,
        template: effectiveTemplate,
        has_likes: false,
        used_custom_msg: customMsg.trim() !== defaultMsg.trim(),
        is_free: false,
        from_card_ref: fromCardRef,
        recipient_name: recipientName.trim() || undefined,
        card_id: trackingId,
        has_photo: uploadedPhotoUrls.length > 0,
        has_voice_note: !!voiceNoteUrl,
        photo_count: uploadedPhotoUrls.length,
      });
      clearDraft();
      setShowGenerating(true);
      // No need to block on background removal: the card opens immediately with
      // the original photo and swaps in the transparent cutout the moment it's
      // ready (see Scene 5 in birthday.tsx). autoStickerUrl holds the predicted
      // cutout URL; we fall back to the first photo only if no sticker was started.
      const stickerUrl = autoStickerUrlRef.current ?? uploadedPhotoUrls[0] ?? undefined;
      const url = buildCardUrl(recipientName.trim(), customMsg, true, effectiveTemplate, trackingId, false, stickerUrl, uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : undefined, voiceNoteUrl ?? undefined);
      setTimeout(() => { window.location.href = url; }, 1800);
      return;
    }

    /* ── Envelope (free template) ───────────────────────────────────── */
    await incrementUsage();

    /* Generate a client-side tracking ID so card_created and card_viewed
     * events are always linked — even when the user isn't signed in and
     * no DB card row is created. For signed-in users the server-assigned
     * DB id overrides this below (it's used for SenderPanel API calls). */
    const trackingId = Math.random().toString(36).slice(2, 10);

    let cardId: string | undefined;
    try {
      const token = await getToken();
      if (token) {
        const base = window.location.origin + (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
        const message_b64 = customMsg.trim() && customMsg.trim() !== defaultMsg
          ? (() => { try { return btoa(unescape(encodeURIComponent(customMsg.trim()))); } catch { return null; } })()
          : null;
        const { fbp, fbc } = getMetaCookies();
        const cardRes = await fetch(`${base}/api/cards`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            template: "envelope",
            occasion,
            recipient_name: recipientName.trim() || undefined,
            message_b64,
            photo_url: uploadedPhotoUrls[0] ?? null,
            photo_urls: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : null,
            voice_note_url: voiceNoteUrl ?? null,
            price: getOccasionPrice(occasion),
            fbp,
            fbc,
          }),
        });
        if (cardRes.ok) {
          const data = await cardRes.json() as { id?: string };
          cardId = data.id;
        }
      }
    } catch { /* non-blocking — fall back to no id */ }

    /* Use the DB id for signed-in users (enables SenderPanel API calls);
     * fall back to the client-generated tracking id for everyone else so
     * card_created → card_viewed attribution always works in analytics. */
    const effectiveCardId = cardId ?? trackingId;

    trackEvent({
      event: "card_created",
      fingerprint, clerk_user_id: clerkUserId ?? undefined,
      email: userEmail ?? undefined, occasion,
      template: effectiveTemplate,
      has_likes: false,
      used_custom_msg: customMsg.trim() !== defaultMsg.trim(),
      is_free: true,
      from_card_ref: fromCardRef,
      recipient_name: recipientName.trim() || undefined,
      card_id: effectiveCardId,
      has_photo: uploadedPhotoUrls.length > 0,
      has_voice_note: !!voiceNoteUrl,
      photo_count: uploadedPhotoUrls.length,
    });

    clearDraft();
    const url = buildCardUrl(recipientName.trim(), customMsg, true, effectiveTemplate, effectiveCardId, false, autoStickerUrl ?? undefined, uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : undefined, voiceNoteUrl ?? undefined);
    setShowGenerating(true);
    setTimeout(() => { window.location.href = url; }, 1800);
  }, [
    isViralReply, receivedTemplate, selectedTemplate, customMsg, defaultMsg, occasion, recipientName,
    fingerprint, clerkUserId, userEmail, incrementUsage, getToken, uploadedPhotoUrls, voiceNoteUrl,
  ]);

  /* ─── Paywall: pay ₹49 via Razorpay → unlock all premium templates ──── */
  const handlePaywallPay = useCallback(async () => {
    if (paywallLoading) return;
    setPaywallUtrError("");
    setPaywallLoading(true);
    try {
      const token = await getToken();
      const base = window.location.origin + (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

      // 1. Pay + unlock all 3 templates on the account (verified server-side)
      await payWithRazorpay({ kind: "template", authToken: token });

      trackEvent({ event: "paywall_paid", fingerprint, email: userEmail ?? undefined, occasion });
      if (typeof window !== "undefined" && (window as Window & { fbq?: (...a: unknown[]) => void }).fbq) {
        (window as Window & { fbq?: (...a: unknown[]) => void }).fbq!("track", "Purchase", { value: unlockPricing.price, currency: "INR" });
      }
      await refetchUsage();

      // 2. Create the card row + mark it premium + watermark-free
      let cardId: string | undefined;
      if (token) {
        const message_b64 = customMsg.trim() && customMsg.trim() !== defaultMsg
          ? (() => { try { return btoa(unescape(encodeURIComponent(customMsg.trim()))); } catch { return null; } })()
          : null;
        const cardRes = await fetch(`${base}/api/cards`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            template: selectedTemplate, occasion,
            recipient_name: recipientName.trim() || undefined,
            message_b64,
            photo_url: uploadedPhotoUrls[0] ?? null,
            photo_urls: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : null,
            voice_note_url: voiceNoteUrl ?? null,
            price: getOccasionPrice(occasion),
          }),
        });
        if (cardRes.ok) {
          const cd = await cardRes.json() as { id?: string };
          cardId = cd.id;
          if (cardId) {
            const patchRes = await fetch(`${base}/api/cards/${cardId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ is_watermarked: false, is_premium: true }),
            });
            if (!patchRes.ok) {
              const patchData = await patchRes.json().catch(() => ({})) as { message?: string };
              setPaywallUtrError(patchData.message ?? "Failed to finalize card. Please try again.");
              return;
            }
          }
        }
      }

      setPendingCardId(cardId);
      setPaywallStage("done");
    } catch (err) {
      if (!(err instanceof PaymentCancelled)) {
        setPaywallUtrError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      }
    } finally {
      setPaywallLoading(false);
    }
  }, [paywallLoading, getToken, fingerprint, userEmail, occasion, refetchUsage, unlockPricing.price,
      selectedTemplate, customMsg, defaultMsg, recipientName, uploadedPhotoUrls, voiceNoteUrl]);

  /* ─── Open paywall in a clean state ────────────────────────────────── */
  function openPaywall() {
    setPaywallStage("plan");
    setPaywallUtr("");
    setPaywallUtrError("");
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
    setTimeout(() => {
      setPaywallStage("plan");
      setPaywallUtr("");
      setPaywallUtrError("");
    }, 350);
  }

  /* ─── After paywall payment done: generate and redirect ────────────── */
  function handlePaywallComplete() {
    const cardId = pendingCardId;
    clearDraft();
    clearPaywallSnapshot();
    const url = buildCardUrl(recipientName.trim(), customMsg, true, selectedTemplate, cardId, true, autoStickerUrl ?? undefined, uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : undefined, voiceNoteUrl ?? undefined);
    setShowPaywall(false);
    setShowGenerating(true);
    setTimeout(() => { window.location.href = url; }, 1800);
  }

  /* ─── Watermark upsell: user picks "send free with watermark" ──────── */
  function handleWatermarkFree() {
    setShowWatermarkUpsell(false);
    clearDraft();
    const url = buildCardUrl(recipientName.trim(), customMsg, true, "envelope", pendingCardId, false, autoStickerUrl ?? undefined, uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : undefined, voiceNoteUrl ?? undefined);
    setShowGenerating(true);
    setTimeout(() => { window.location.href = url; }, 1800);
  }

  /* ─── Watermark upsell: pay ₹29 via Razorpay to remove watermark ────── */
  const handleWatermarkPay = useCallback(async () => {
    if (watermarkUtrLoading || !pendingCardId) return;
    setWatermarkUtrError("");
    setWatermarkUtrLoading(true);
    try {
      const token = await getToken();
      await payWithRazorpay({ kind: "watermark", cardId: pendingCardId, authToken: token });
      trackEvent({ event: "watermark_removed", fingerprint, email: userEmail ?? undefined, occasion });
      if (typeof window !== "undefined" && (window as Window & { fbq?: (...a: unknown[]) => void }).fbq) {
        (window as Window & { fbq?: (...a: unknown[]) => void }).fbq!("track", "Purchase", { value: 29, currency: "INR" });
      }
      setWatermarkStage("done");
    } catch (err) {
      if (!(err instanceof PaymentCancelled)) {
        setWatermarkUtrError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      }
    } finally {
      setWatermarkUtrLoading(false);
    }
  }, [watermarkUtrLoading, pendingCardId, getToken, fingerprint, userEmail, occasion]);

  /* ─── Watermark upsell: after payment done — redirect clean ─────────── */
  function handleWatermarkComplete() {
    setShowWatermarkUpsell(false);
    clearDraft();
    const url = buildCardUrl(recipientName.trim(), customMsg, true, "envelope", pendingCardId, true, autoStickerUrl ?? undefined, uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : undefined, voiceNoteUrl ?? undefined);
    setShowGenerating(true);
    setTimeout(() => { window.location.href = url; }, 1800);
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

    // No sign-in wall at generate time — users preview first, then sign in / pay at share time.
    await doGenerateCard();
  }

  /* ─── Sign-in trigger: persist draft + bounce to /sign-in ──────────── */
  function startSignIn(emailAddress?: string) {
    // Persist now (the redirect would skip our debounced effect on some browsers).
    try {
      const draft: SendDraft = {
        occasion, relation, recipientName, customMsg, selectedTemplate, step,
        savedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch { /* ignore */ }
    openSignIn({
      initialValues: emailAddress ? { emailAddress } : undefined,
      fallbackRedirectUrl: window.location.href,
    });
  }

  /* ─── Keep a stable ref to doGenerateCard for the post-signin effect ── */
  const doGenerateCardRef = useRef(doGenerateCard);
  useEffect(() => { doGenerateCardRef.current = doGenerateCard; }, [doGenerateCard]);

  /* ─── Template picker hidden — always envelope ─ */
  const handlePickTemplate = useCallback((_t: TemplateId) => {}, []);

  /* Stable set of locked template IDs — avoids recreating the Set on every
     render; TemplatePicker receives this as a stable prop. */
  const lockedTemplateIds = useMemo<ReadonlySet<TemplateId>>(() => {
    if (usage?.is_superuser) return new Set<TemplateId>();
    const unlocked = usage?.unlocked_templates ?? [];
    return new Set<TemplateId>(
      TEMPLATE_CATALOG
        .filter(t => t.id !== "envelope" && !unlocked.includes(t.id))
        .map(t => t.id)
    );
  }, [usage?.is_superuser, usage?.unlocked_templates]);

  /* ─── UI helpers ────────────────────────────────────────────────────── */

  const stepVariants = {
    initial: { opacity: 0, x: dir * 50 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
    exit: { opacity: 0, x: dir * -50, transition: { duration: 0.2 } },
  };

  const generateButtonLabel = (() => {
    if (uploadedPhotoUrls.length > 0 || voiceNoteUrl || isPremiumTemplate(selectedTemplate)) return "Preview Magic ✨";
    return "Generate my card 💌";
  })();

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
      <div className="w-full flex items-center justify-between px-4 pb-2" style={{ maxWidth: 520, position: "relative", zIndex: 1, paddingTop: "max(16px, env(safe-area-inset-top, 16px))" }}>
        {/* In viral reply mode step 2 is the first visible step — Back goes home, not to the hidden occasion step. */}
        {step > 1 && !(isViralReply && step === 2) ? (
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
          {isViralReply ? "✨ Unlock Your Secret Reply" : "✨ Create 3D Card"}
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
              <div className="flex flex-col gap-3">
                <div>
                  {/* When the name is empty we brighten the label and pulse a
                      gold glow around the input so the user immediately
                      knows this is the first thing to fill in. The cue
                      disappears the moment they start typing. */}
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{
                      color: recipientName.trim()
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(255,215,0,0.85)",
                      transition: "color 0.25s ease",
                    }}
                  >
                    {recipientName.trim() ? "Their name" : "👇 Start here — Their name"}
                  </label>
                  <Input
                    placeholder="e.g. Rahul, Priya, Aditya…"
                    data-clarity-mask="true"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
                    autoFocus
                    className={recipientName.trim() ? undefined : "hs-attention-pulse"}
                    style={{
                      background: recipientName.trim()
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(255,215,0,0.06)",
                      border: recipientName.trim()
                        ? "1.5px solid rgba(255,255,255,0.12)"
                        : "1.5px solid rgba(255,215,0,0.55)",
                      color: "white",
                      fontSize: 16,
                      borderRadius: 12,
                      transition: "background 0.25s ease",
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <label className="block text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                      Message <span style={{ color: "rgba(255,255,255,0.3)" }}>(optional — edit to personalise)</span>
                    </label>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: customMsg.length > 270 ? (customMsg.length >= 300 ? "#ef4444" : "#f59e0b") : "rgba(255,255,255,0.25)",
                    }}>
                      {customMsg.length}/300
                    </span>
                  </div>
                  <textarea
                    value={customMsg}
                    onChange={e => setCustomMsg(e.target.value.slice(0, 300))}
                    data-clarity-mask="true"
                    maxLength={300}
                    rows={3}
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.06)",
                      border: `1.5px solid ${customMsg.length >= 300 ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`,
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

                {/* ── Multi-photo upload ── */}
                <div style={{
                  borderRadius: 14,
                  border: `1.5px solid ${uploadedPhotoUrls.length > 0 ? "rgba(255,215,0,0.35)" : "rgba(255,215,0,0.18)"}`,
                  background: "rgba(255,215,0,0.04)",
                  padding: "12px 14px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,215,0,0.75)" }}>
                      📸 Add photos <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.3)", fontSize: 11 }}>(Upto 3)</span>
                    </label>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                      {uploadedPhotoUrls.length}/3
                      {uploadedPhotoUrls.length === 0 && " · Optional"}
                    </span>
                  </div>

                  {/* Thumbnail row */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {photoSlots.map((slot) => (
                      <div
                        key={slot.id}
                        style={{
                          width: 58, height: 58, borderRadius: 10, position: "relative", flexShrink: 0,
                          overflow: "hidden",
                          border: "1.5px solid rgba(255,215,0,0.3)",
                          opacity: slot.status === "uploading" ? 0.5 : 1,
                        }}
                      >
                        <img src={slot.previewSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%", imageOrientation: "from-image" }} />
                        {slot.status === "done" && (
                          <button
                            type="button"
                            onClick={() => {
                              URL.revokeObjectURL(slot.previewSrc);
                              setPhotoSlots(prev => prev.filter(s => s.id !== slot.id));
                            }}
                            style={{
                              position: "absolute", top: 2, right: 2, width: 18, height: 18,
                              borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none",
                              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 9, color: "white", lineHeight: 1,
                            }}
                          >✕</button>
                        )}
                        {slot.status === "uploading" && (
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Loader2 size={18} style={{ color: "rgba(255,215,0,0.9)", animation: "spin 1s linear infinite" }} />
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add photo button — stays available while other photos upload */}
                    {photoSlots.length < 3 && (
                      <label style={{ cursor: "pointer" }}>
                        <div style={{
                          width: 58, height: 58, borderRadius: 10, flexShrink: 0,
                          background: "rgba(255,255,255,0.04)",
                          border: "1.5px dashed rgba(255,255,255,0.18)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 22,
                        }}>
                          {photoSlots.length === 0 ? "🖼️" : "+"}
                        </div>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          style={{ display: "none" }}
                          onChange={e => {
                            const files = Array.from(e.target.files ?? []);
                            const slotsLeft = Math.max(0, 3 - photoSlots.length);
                            const toProcess = files.slice(0, slotsLeft);
                            e.target.value = "";
                            const startedEmpty = photoSlots.length === 0;
                            // Fire all uploads in parallel — no await — so a slow
                            // photo never blocks the others. The first photo of an
                            // empty set drives the birthday sticker.
                            toProcess.forEach((f, idx) => { void handlePhotoSelect(f, startedEmpty && idx === 0); });
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {photoUploadError && (
                    <p style={{ fontSize: 11, color: "#f87171", marginTop: 6 }}>{photoUploadError}</p>
                  )}
                  {photoPreviewSrcs.length === 0 && !photoUploading && (
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>
                      Up to 3 photos · JPEG · PNG · WebP · max 5 MB each
                    </p>
                  )}
                </div>


                {/* ── Voice note recorder ── */}
                <div style={{
                  borderRadius: 14,
                  border: `1.5px solid ${voiceNoteUrl ? "rgba(255,215,0,0.4)" : "rgba(255,255,255,0.1)"}`,
                  background: voiceNoteUrl ? "rgba(255,215,0,0.04)" : "rgba(255,255,255,0.03)",
                  padding: "12px 14px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: voiceNoteUrl ? "rgba(255,215,0,0.8)" : "rgba(255,255,255,0.55)" }}>
                      🎙️ Add a voice note
                    </label>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "2px 8px" }}>
                      Optional
                    </span>
                  </div>
                  {voiceNoteUrl ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 20 }}>✅</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 12, color: "#4ade80", fontWeight: 600, margin: 0 }}>Voice note ready</p>
                          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: "2px 0 0" }}>Will play for them at the finale</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!voicePreviewAudioRef.current) {
                              voicePreviewAudioRef.current = new Audio(voiceNoteUrl);
                              voicePreviewAudioRef.current.onended = () => setVoicePreviewPlaying(false);
                            }
                            if (voicePreviewPlaying) {
                              voicePreviewAudioRef.current.pause();
                              setVoicePreviewPlaying(false);
                            } else {
                              void voicePreviewAudioRef.current.play().then(() => setVoicePreviewPlaying(true)).catch(() => setVoicePreviewPlaying(false));
                            }
                          }}
                          style={{
                            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            padding: "7px 0", borderRadius: 8, cursor: "pointer",
                            background: voicePreviewPlaying ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.06)",
                            border: `1px solid ${voicePreviewPlaying ? "rgba(255,215,0,0.4)" : "rgba(255,255,255,0.15)"}`,
                            fontSize: 12, fontWeight: 700,
                            color: voicePreviewPlaying ? "rgba(255,215,0,0.9)" : "rgba(255,255,255,0.55)",
                          }}
                        >
                          {voicePreviewPlaying ? "⏸ Pause" : "▶ Preview"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (voicePreviewAudioRef.current) {
                              voicePreviewAudioRef.current.pause();
                              voicePreviewAudioRef.current = null;
                            }
                            setVoicePreviewPlaying(false);
                            setVoiceNoteUrl(null);
                            setVoiceRecordDuration(0);
                          }}
                          style={{
                            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            padding: "7px 0", borderRadius: 8, cursor: "pointer",
                            background: "rgba(248,113,113,0.08)",
                            border: "1px solid rgba(248,113,113,0.25)",
                            fontSize: 12, fontWeight: 700, color: "rgba(248,113,113,0.75)",
                          }}
                        >
                          🔄 Re-record
                        </button>
                      </div>
                    </div>
                  ) : voiceUploading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Loader2 size={18} style={{ color: "rgba(255,215,0,0.7)", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>Uploading voice note…</p>
                    </div>
                  ) : voiceRecording ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <motion.div
                        animate={{ scale: [1, 1.25, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        style={{ width: 12, height: 12, borderRadius: "50%", background: "#f87171", flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontVariantNumeric: "tabular-nums" }}>
                        {Math.floor(voiceRecordDuration / 60).toString().padStart(2, "0")}:{(voiceRecordDuration % 60).toString().padStart(2, "0")}
                      </span>
                      <div style={{ flex: 1 }} />
                      <button
                        type="button"
                        onClick={handleStopRecording}
                        style={{
                          padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                          background: "rgba(248,113,113,0.15)",
                          border: "1px solid rgba(248,113,113,0.4)",
                          fontSize: 12, fontWeight: 700, color: "#f87171",
                        }}
                      >
                        Stop
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setVoiceUploadError(null);
                          if (!navigator.mediaDevices?.getUserMedia) {
                            setVoiceUploadError("Your browser doesn't support recording. Please use Chrome or Safari.");
                            return;
                          }
                          navigator.mediaDevices.getUserMedia({ audio: true })
                            .then(stream => startRecordingWithStream(stream))
                            .catch(handleMicError);
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "7px 16px", borderRadius: 8, cursor: "pointer",
                          background: "rgba(255,215,0,0.08)",
                          border: "1px solid rgba(255,215,0,0.25)",
                          fontSize: 12, fontWeight: 700, color: "rgba(255,215,0,0.75)",
                        }}
                      >
                        <span>🎤</span> Start recording
                      </button>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", margin: 0 }}>Max 60s</p>
                    </div>
                  )}
                  {voiceUploadError && (
                    <div style={{
                      marginTop: 8, padding: "10px 12px", borderRadius: 10,
                      background: "rgba(248,113,113,0.12)",
                      border: "1px solid rgba(248,113,113,0.4)",
                      display: "flex", alignItems: "flex-start", gap: 8,
                    }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>🎙️</span>
                      <p style={{ fontSize: 12, color: "#fca5a5", margin: 0, lineHeight: 1.5 }}>{voiceUploadError}</p>
                    </div>
                  )}
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={!recipientName.trim() || showGenerating}
                  onClick={handleFinish}
                  data-testid="generate-button"
                  style={{
                    padding: "16px",
                    borderRadius: 14,
                    background: !recipientName.trim()
                      ? "rgba(255,255,255,0.08)"
                      : "linear-gradient(135deg, #FFD700, #FFA500)",
                    color: recipientName.trim() ? "#000" : "rgba(255,255,255,0.3)",
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: recipientName.trim() ? "pointer" : "default",
                    border: "none",
                    transition: "all 0.2s",
                  }}
                >
                  {generateButtonLabel}
                </motion.button>

                {/* Template picker hidden — always creates envelope card */}
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
            <div style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                style={{ fontSize: 56, marginBottom: 12 }}
              >
                {signInGateContext === "envelope" ? "💌" : (TEMPLATE_CATALOG.find(t => t.id === signInGateContext)?.emoji ?? "✨")}
              </motion.div>

              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{ fontSize: 21, fontWeight: 800, color: "#fff", marginBottom: 8, lineHeight: 1.3 }}
              >
                Sign in to share your card
              </motion.h2>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 24, lineHeight: 1.55 }}
              >
                Your card is ready — sign in to get your shareable link.
              </motion.p>

              {/* ── Option 1: Email + OTP ── */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35 }}
                style={{ marginBottom: 12 }}
              >
                <form
                  onSubmit={(e) => { e.preventDefault(); startSignIn(gateEmail.trim() || undefined); }}
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={gateEmail}
                    onChange={(e) => setGateEmail(e.target.value)}
                    style={{
                      width: "100%", padding: "13px 16px", borderRadius: 12,
                      background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.15)",
                      color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="submit"
                    data-testid="signin-gate-email"
                    style={{
                      width: "100%", padding: "13px 20px", borderRadius: 12,
                      background: "linear-gradient(135deg, #a855f7, #ec4899)",
                      color: "#fff", fontWeight: 700, fontSize: 14,
                      border: "none", cursor: "pointer",
                    }}
                  >
                    Continue with Email & OTP
                  </button>
                </form>
              </motion.div>

              {/* ── Divider ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}
              >
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              </motion.div>

              {/* ── Option 2: Google ── */}
              <motion.button
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.45 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => startSignIn()}
                data-testid="signin-gate-google"
                style={{
                  width: "100%", padding: "13px 20px", borderRadius: 12,
                  background: "#fff", color: "#1a1a1a",
                  fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  marginBottom: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
                style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}
              >
                Your card draft is saved — we'll bring you right back.
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ PAYWALL (₹49 — all templates) ════ */}
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
                    All 3 premium templates are unlocked — forever. Your card is ready to send!
                  </p>
                  <button
                    onClick={handlePaywallComplete}
                    className="w-full h-12 rounded-xl text-white font-bold text-sm"
                    style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", color: "#000" }}
                    data-testid="paywall-done-continue"
                  >
                    ✨ Generate & Send
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center mb-5">
                    <Sparkles className="w-7 h-7 text-yellow-400 mx-auto mb-2" />
                    <h1 className="text-xl font-bold text-white mb-1 leading-tight">Remove Watermark | Go Premium</h1>
                    <p className="text-white/55 text-sm flex items-center justify-center gap-1.5 flex-wrap">
                      <span className="line-through text-white/25">₹{unlockPricing.anchor}</span>
                      <span className="text-yellow-300/80 font-bold">₹{unlockPricing.price}</span>
                      — yours forever.
                    </p>
                  </div>

                  {/* Single ₹49 plan card */}
                  <div
                    className="mb-4 rounded-2xl px-4 py-3 flex items-center justify-between"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,165,0,0.10))",
                      border: "1.5px solid rgba(255,215,0,0.55)",
                    }}
                  >
                    <div>
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <div className="text-white font-extrabold text-xl leading-tight">₹{unlockPricing.price}</div>
                        <span className="line-through text-white/30 text-sm font-normal">₹{unlockPricing.anchor}</span>
                        <span style={{ background: "rgba(255,80,50,0.18)", border: "1px solid rgba(255,80,50,0.4)", color: "#ff7d5c", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 99, letterSpacing: "0.04em" }}>⚡ Limited Time</span>
                      </div>
                      <div className="text-white/70 text-xs mt-1.5 flex flex-col gap-1">
                        <span>✓ Removes watermark</span>
                        <span>✓ Unlocks premium templates (Cosmic, Crystal, Vinyl)</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
                    <p className="text-center text-xs text-white/45 mb-3 leading-relaxed">
                      Secure payment via UPI, cards, netbanking &amp; wallets — powered by Razorpay.
                    </p>
                    <button
                      onClick={() => { void handlePaywallPay(); }}
                      disabled={paywallLoading}
                      data-testid="paywall-pay"
                      className="w-full h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                      style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", color: "#000" }}
                    >
                      {paywallLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin text-black" /> Opening payment…</>
                        : <>🔓 Pay ₹{unlockPricing.price} &amp; unlock all <ArrowRight className="w-4 h-4" /></>}
                    </button>
                    {paywallUtrError && <p className="text-xs text-destructive text-center mt-2">{paywallUtrError}</p>}
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

      {/* ════ WATERMARK UPSELL MODAL (envelope path) ════ */}
      <AnimatePresence>
        {showWatermarkUpsell && (
          <motion.div
            key="watermark-upsell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[95] backdrop-blur-sm flex flex-col items-center justify-center px-4"
            style={{ background: "rgba(4, 0, 14, 0.88)" }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="w-full max-w-sm rounded-3xl overflow-hidden"
              style={{
                background: "linear-gradient(170deg, #0e0022 0%, #080118 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 -8px 60px rgba(120,60,255,0.18), 0 0 0 1px rgba(255,255,255,0.06) inset",
              }}
            >
              {watermarkStage === "done" ? (
                <div className="p-6 text-center">
                  <div className="text-5xl mb-3">🎉</div>
                  <h2 className="text-xl font-bold text-white mb-2">Watermark removed!</h2>
                  <p className="text-white/60 text-sm mb-6">Your card will open clean — no HeartSync branding.</p>
                  <button
                    onClick={handleWatermarkComplete}
                    className="w-full h-12 rounded-2xl font-bold text-sm text-black"
                    style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)" }}
                    data-testid="watermark-done-send"
                  >
                    ✨ Send clean link
                  </button>
                </div>
              ) : watermarkStage === "upi" ? (
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => setWatermarkStage("choose")}
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <ArrowRight size={14} className="rotate-180 text-white/60" />
                    </button>
                    <div>
                      <div className="text-white font-bold text-base leading-tight">Remove watermark — ₹29</div>
                      <div className="text-white/40 text-xs">Pay once, yours forever</div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3">
                    <p className="text-center text-[11px] text-white/40 mb-3 leading-relaxed">
                      Secure payment via UPI, cards, netbanking & wallets — powered by Razorpay.
                    </p>
                    <button
                      onClick={() => { void handleWatermarkPay(); }}
                      disabled={watermarkUtrLoading}
                      data-testid="watermark-pay"
                      className="w-full h-11 rounded-xl text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)" }}
                    >
                      {watermarkUtrLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening payment…</>
                        : <>Pay ₹29 & remove watermark <ArrowRight className="w-4 h-4" /></>}
                    </button>
                    {watermarkUtrError && <p className="text-xs text-destructive text-center mt-2">{watermarkUtrError}</p>}
                  </div>

                  <button
                    onClick={handleWatermarkFree}
                    className="w-full text-center text-xs text-white/30 hover:text-white/50 py-2"
                    data-testid="watermark-send-free"
                  >
                    Send for free with watermark instead
                  </button>
                </div>
              ) : (
                /* ── "choose" stage ── */
                <div className="p-5">
                  <div className="text-center mb-5">
                    <div className="text-3xl mb-2">💌</div>
                    <h2 className="text-lg font-bold text-white mb-1">Your card is ready to be sent!</h2>
                    <p className="text-white/50 text-sm">How would you like to send it?</p>
                  </div>

                  {/* Primary CTA — Remove watermark & unlock all premium ₹49 */}
                  <button
                    onClick={() => { setShowWatermarkUpsell(false); setShowPaywall(true); }}
                    data-testid="watermark-bundle-cta"
                    className="w-full rounded-2xl px-4 py-4 mb-4 flex items-start gap-3 text-left"
                    style={{
                      background: "linear-gradient(135deg, rgba(168,85,247,0.22), rgba(236,72,153,0.14))",
                      border: "1.5px solid rgba(168,85,247,0.5)",
                      boxShadow: "0 0 18px rgba(168,85,247,0.18)",
                    }}
                  >
                    <div className="mt-0.5 text-lg shrink-0">👑</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm leading-tight">Remove watermark & unlock all premium templates</div>
                      <div className="text-white/50 text-xs mt-1">No badge ever · All 4 templates · Yours forever</div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0 mt-0.5">
                      <div className="flex items-center gap-1">
                        <span className="line-through text-white/25 text-xs">₹{unlockPricing.anchor}</span>
                        <span className="font-extrabold text-sm" style={{ color: "rgba(216,180,254,1)" }}>₹{unlockPricing.price}</span>
                        <ArrowRight size={15} className="text-purple-300/50" />
                      </div>
                      <span style={{ background: "rgba(255,80,50,0.18)", border: "1px solid rgba(255,80,50,0.4)", color: "#ff7d5c", fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 99, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>⚡ Limited Time</span>
                    </div>
                  </button>

                  {/* OR divider */}
                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-white/30 text-xs font-semibold tracking-widest">OR</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  {/* Downgrade — free, plain text link */}
                  <div className="text-center mt-1">
                    <button
                      onClick={handleWatermarkFree}
                      data-testid="watermark-send-free"
                      className="text-white/50 text-xs hover:text-white/70 transition-colors underline underline-offset-2 decoration-white/20"
                    >
                      Continue with watermark
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Public default export.
 *
 * Renders the form shell immediately (no ClerkProvider needed) via SendInner.
 * Concurrently mounts LazyClerkBridge — which loads ClerkAuthLayer + Clerk SDK
 * in the background — and writes the resolved auth state into SendAuthCtx so
 * SendInner re-renders with real sign-in status once Clerk is ready (~1–2 s
 * on a warm cache, without ever blocking the initial paint of the form).
 */
export default function Send() {
  const [authState, setAuthState] = useState(defaultSendAuth);
  const authCtxValue = useMemo(
    () => ({ state: authState, update: setAuthState }),
    [authState],
  );

  return (
    <SendAuthCtx.Provider value={authCtxValue}>
      <SendInner />
      <Suspense fallback={null}>
        <LazyClerkBridge />
      </Suspense>
    </SendAuthCtx.Provider>
  );
}
