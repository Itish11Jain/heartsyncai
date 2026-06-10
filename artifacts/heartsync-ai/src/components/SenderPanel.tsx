import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

import { useAuth, useClerk } from "@clerk/react";
import { useCardUsage } from "@/lib/usage";
import { trackEvent } from "@/lib/trackEvent";
import { envelope } from "@/lib/audio";

import WatermarkPaywallModal from "@/components/WatermarkPaywallModal";
import UnlockModal from "@/components/UnlockModal";
import ClerkAuthLayer from "@/components/ClerkAuthLayer";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

type Phase = "envelope" | "opening" | "orbs" | "collage" | "finale";
type ShareType = "whatsapp" | "instagram" | "link";

interface SenderPanelProps {
  senderShareUrl: string;
  recipientName: string;
  occasion: string;
  cardId: string;
  phase: Phase;
}

function SenderPanelInner({ senderShareUrl, recipientName, occasion, cardId, phase }: SenderPanelProps) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const clerk = useClerk();
  const { usage } = useCardUsage();
  const isPremiumUser = !!(usage?.is_superuser || (usage?.unlocked_templates?.length ?? 0) > 0);
  const [watermarkRemoved, setWatermarkRemoved] = useState(false);
  const [wmLoading, setWmLoading] = useState(false);
  const [wmError, setWmError] = useState<string | null>(null);
  const [waCopied, setWaCopied] = useState(false);
  const [igCopied, setIgCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Unlock modal state
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockModalSlowOpen, setUnlockModalSlowOpen] = useState(false);

  const [showBundlePaywall, setShowBundlePaywall] = useState(false);

  // Bundle credit state — read from localStorage (set when visiting /my-cards/:token)
  const [bundleToken, setBundleToken] = useState<string | null>(null);
  const [bundleCredits, setBundleCredits] = useState<number>(0);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleError, setBundleError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Prefer bundle_token from URL params (set by /my-cards create link), fallback to localStorage
      const urlToken = new URLSearchParams(window.location.search).get("bundle_token");
      const stored = localStorage.getItem("hs_bundle_token");
      const token = (urlToken && /^[0-9a-f-]{36}$/.test(urlToken)) ? urlToken : stored;
      if (!token || !/^[0-9a-f-]{36}$/.test(token)) return;
      // Persist whichever token we resolved so later visits work
      try { localStorage.setItem("hs_bundle_token", token); } catch { /* ignore */ }
      setBundleToken(token);
      // Fetch current credit balance
      fetch(`${BASE}/api/bundles/${token}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data: { cards_remaining?: number } | null) => {
          if (data && typeof data.cards_remaining === "number") {
            setBundleCredits(data.cards_remaining);
          }
        })
        .catch(() => { /* ignore */ });
    } catch { /* ignore */ }
  }, []);

  // Auto-open bottom sheet once per card/session
  // Auto-apply bundle credit: when credits arrive and card is locked, unlock immediately
  const autoUnlockDoneRef = useRef(false);
  const [bundleCreditToast, setBundleCreditToast] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (phase !== "finale") return;  // only consume credits at finale, not earlier
    if (autoUnlockDoneRef.current) return;
    if (!bundleToken || bundleCredits <= 0) return;
    if (isPremiumUser || watermarkRemoved) return;
    if (!cardId || !/^[a-z0-9]{4,20}$/.test(cardId)) return;

    autoUnlockDoneRef.current = true;
    setBundleLoading(true);

    fetch(`${BASE}/api/bundles/${bundleToken}/use-credit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: cardId }),
    })
      .then((r) => r.json() as Promise<{ ok?: boolean; cards_remaining?: number; error?: string }>)
      .then((data) => {
        if (data.ok || data.error === "already_unlocked" || data.error === "already_used") {
          if (typeof data.cards_remaining === "number") setBundleCredits(data.cards_remaining);
          setWatermarkRemoved(true);
          setBundleCreditToast(true);
          setTimeout(() => setBundleCreditToast(false), 3500);
          trackEvent({ event: "bundle_credit_auto_used", card_id: cardId, occasion });
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => setBundleLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, phase, bundleToken, bundleCredits, isPremiumUser, watermarkRemoved]);

  const autoOpenKey = cardId ? `hs_ao_${cardId}` : null;
  const [hasAutoOpened, setHasAutoOpened] = useState(() => {
    if (!autoOpenKey) return true;
    try { return !!sessionStorage.getItem(autoOpenKey); } catch { return false; }
  });

  // Inline sign-in state
  type SignInAction = "paywall" | "watermark";
  const [showSignIn, setShowSignIn] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const pendingSignInActionRef = useRef<SignInAction | null>(null);
  const pendingReturnUrlRef = useRef<string>("");


  // Detect if the card URL has a personal picture param
  const hasPhoto = (() => {
    try { return new URLSearchParams(window.location.search).has("personalpicture"); } catch { return false; }
  })();


  /* On mount: fetch the card's actual watermark status. */
  useEffect(() => {
    if (!cardId) return;
    fetch(`${BASE}/api/cards/${cardId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && data.is_watermarked === false) setWatermarkRemoved(true); })
      .catch(() => { /* ignore */ });
  }, [cardId]);

  /* Auto-open the bottom sheet once per card/session when finale starts. */
  useEffect(() => {
    if (phase !== "finale") return;
    if (isPremiumUser || watermarkRemoved) return;
    if (hasAutoOpened) return;
    if (!autoOpenKey) return;
    const delay = 4000; // 4 seconds
    const timer = setTimeout(() => {
      try { sessionStorage.setItem(autoOpenKey, "1"); } catch { /* ignore */ }
      setHasAutoOpened(true);
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;
      if (isMobile) {
        trackEvent({ event: "bundle_paywall_shown", occasion, card_id: cardId });
        setUnlockModalSlowOpen(true);
        setShowUnlockModal(true);
      } else {
        trackEvent({ event: "bundle_paywall_shown", occasion, card_id: cardId });
        setShowBundlePaywall(true);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [phase, isPremiumUser, watermarkRemoved, hasAutoOpened, autoOpenKey, occasion, cardId]);

  /* Call the free-removal API — no payment needed, just auth.
   * For anonymous cards (no DB row), we send the card's metadata in the
   * request body so the server can create the row and claim it for this user. */
  const removeWatermarkFree = useCallback(async () => {
    if (!cardId) return;
    setWmLoading(true);
    setWmError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BASE}/api/cards/${cardId}/free-watermark-removal`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_name: recipientName, occasion, template: "envelope" }),
      });
      if (res.ok) {
        setWatermarkRemoved(true);
      } else if (res.status === 401 || res.status === 403) {
        // Not the card owner — silently do nothing, no error shown
      } else {
        const data = await res.json().catch(() => ({}));
        setWmError((data as { message?: string })?.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setWmError("Network error. Please try again.");
    } finally {
      setWmLoading(false);
    }
  }, [cardId, getToken, recipientName, occasion]);

  /* Auto-remove watermark for premium (already-paid) users only. */
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !cardId || watermarkRemoved || !isPremiumUser) return;
    removeWatermarkFree();
  }, [isLoaded, isSignedIn, cardId, watermarkRemoved, isPremiumUser, removeWatermarkFree]);

  /* After Clerk redirect with ?open_watermark=1, clean the URL. */
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("open_watermark") === "1") {
      p.delete("open_watermark");
      const clean = window.location.pathname + (p.toString() ? "?" + p.toString() : "");
      window.history.replaceState(null, "", clean);
    }
  }, [isLoaded, isSignedIn]);

  /* After Clerk redirect with ?open_paywall=1: restore pending share type, open bundle paywall. */
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("open_paywall") === "1") {
      p.delete("open_paywall");
      const clean = window.location.pathname + (p.toString() ? "?" + p.toString() : "");
      window.history.replaceState(null, "", clean);
      sessionStorage.removeItem("hs_pending_share");
      trackEvent({ event: "bundle_paywall_shown", occasion, card_id: cardId });
      setShowBundlePaywall(true);
    }
  }, [isLoaded, isSignedIn, occasion, cardId]);

  function openSignInModal(action: "paywall" | "watermark") {
    pendingSignInActionRef.current = action;
    const returnUrl = new URL(window.location.href);
    if (action === "paywall") {
      returnUrl.searchParams.set("open_paywall", "1");
    } else {
      returnUrl.searchParams.set("open_watermark", "1");
    }
    pendingReturnUrlRef.current = returnUrl.toString();
    setShowSignIn(true);
  }

  async function handleGoogleSignIn() {
    if (googleLoading) return;
    trackEvent({ event: "continue_to_signin_clicked", occasion, card_id: cardId });
    setGoogleLoading(true);
    const returnUrl = pendingReturnUrlRef.current || window.location.href;
    // Persist the target URL so new-user sign-up flow (which loses the URL
    // param when Clerk routes through /sign-up) can still redirect correctly.
    try { sessionStorage.setItem("hs_post_auth_redirect", returnUrl); } catch { /* ignore */ }
    const fallback = `${window.location.origin}${BASE}/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`;
    try {
      const res = await fetch(`${BASE}/api/__clerk/v1/client/sign_ins`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        credentials: "include",
        body: new URLSearchParams({
          strategy: "oauth_google",
          redirect_url: `${window.location.origin}${BASE}/sign-in/sso-callback`,
          action_complete_redirect_url: returnUrl,
        }),
      });
      const data = await res.json() as { response?: { first_factor_verification?: { external_verification_redirect_url?: string } } };
      const googleUrl = data?.response?.first_factor_verification?.external_verification_redirect_url;
      if (googleUrl) {
        window.location.href = googleUrl;
        return;
      }
    } catch { /* fall through */ }
    window.location.href = fallback;
    // Reset only if navigation somehow doesn't happen
    setTimeout(() => setGoogleLoading(false), 3000);
  }

  function completeAuth() {
    setShowSignIn(false);
    const action = pendingSignInActionRef.current;
    pendingSignInActionRef.current = null;
    if (action === "paywall") {
      trackEvent({ event: "google_signin_completed", occasion, card_id: cardId });
      trackEvent({ event: "bundle_paywall_shown", occasion, card_id: cardId });
      setShowBundlePaywall(true);
    } else if (action === "watermark") {
      void removeWatermarkFree();
    }
  }

  /* Safety net: when Clerk marks the user as signed-in while the modal is
     open, close the modal and execute the pending action. */
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !showSignIn) return;
    completeAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, showSignIn]);

  async function handleBundleUnlock() {
    if (!bundleToken || bundleCredits <= 0 || bundleLoading) return;
    setBundleLoading(true);
    setBundleError(null);
    try {
      const res = await fetch(`${BASE}/api/bundles/${bundleToken}/use-credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId }),
      });
      const data = await res.json() as { ok?: boolean; cards_remaining?: number; error?: string; message?: string };
      if (res.ok && data.ok) {
        setBundleCredits(data.cards_remaining ?? 0);
        setWatermarkRemoved(true);
        trackEvent({ event: "bundle_credit_used", card_id: cardId, occasion });
      } else if (data.error === "already_unlocked" || data.error === "already_used") {
        setWatermarkRemoved(true);
      } else {
        setBundleError(data.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setBundleError("Network error. Please try again.");
    } finally {
      setBundleLoading(false);
    }
  }

  function handleRemoveWatermarkClick() {
    if (isLoaded && isSignedIn) {
      removeWatermarkFree();
      return;
    }
    openSignInModal("watermark");
  }

  function gatedShare(_type: ShareType, action: () => void) {
    action();
  }

  function shareSenderWhatsApp(url: string = senderShareUrl, overrideHasPhoto?: boolean) {
    envelope.copy();
    trackEvent({ event: "card_shared", channel: "whatsapp", occasion, template: "envelope", card_id: cardId, has_photo: overrideHasPhoto ?? hasPhoto });
    setWaCopied(true);
    setTimeout(() => setWaCopied(false), 2500);
    const text = `💌 Hey ${recipientName}, I made you something special!\n\nYour surprise is waiting 👇\n${url}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    // Use anchor click — more reliable than window.open for deep links on mobile
    const a = document.createElement("a");
    a.href = waUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function copyToClipboard(text: string): void {
    // Try modern API first; fall back to execCommand for older/restricted contexts
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        _execCommandCopy(text);
      });
    } else {
      _execCommandCopy(text);
    }
  }

  function _execCommandCopy(text: string): void {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0;top:0;left:0;";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch { /* ignore */ }
  }

  function shareInstagram(url: string = senderShareUrl, overrideHasPhoto?: boolean) {
    envelope.copy();
    trackEvent({ event: "card_shared", channel: "instagram", occasion, template: "envelope", card_id: cardId, has_photo: overrideHasPhoto ?? hasPhoto });
    // Show feedback immediately — don't wait for clipboard permission
    setIgCopied(true);
    setTimeout(() => setIgCopied(false), 2500);
    copyToClipboard(url);
    setTimeout(() => window.open("https://www.instagram.com", "_blank"), 300);
  }

  function copySenderLink(url: string = senderShareUrl, overrideHasPhoto?: boolean) {
    envelope.copy();
    trackEvent({ event: "card_shared", channel: "link", occasion, template: "envelope", card_id: cardId, has_photo: overrideHasPhoto ?? hasPhoto });
    // Show feedback immediately — don't gate it on clipboard permission
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
    copyToClipboard(url);
  }

  function handlePhotoPaywallDismiss() {
    setShowBundlePaywall(false);
  }

  /* After bundle payment succeeds: navigate to the share finale so all CTAs are visible. */
  function handleBundlePaywallSuccess() {
    setShowBundlePaywall(false);
    const u = new URL(window.location.href);
    u.searchParams.set("direct_share", "1");
    u.searchParams.delete("open_paywall");
    window.location.href = u.toString();
  }

  return (
    <>
      {/* ── Bundle credit used toast ── */}
      {bundleCreditToast && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          style={{
            position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
            background: "rgba(34,197,94,0.92)", backdropFilter: "blur(8px)",
            borderRadius: 99, padding: "10px 22px", zIndex: 999,
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 4px 20px rgba(34,197,94,0.4)",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 16 }}>✓</span>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>1 card credit used</span>
        </motion.div>
      )}

      {/* ── Sender share panel (finale only) ── */}
      {phase === "finale" && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isPremiumUser || watermarkRemoved ? 1.6 : 0, duration: 0.55 }}
          style={{
            position: "fixed",
            bottom: "max(96px, calc(env(safe-area-inset-bottom, 16px) + 76px))",
            left: 0,
            right: 0,
            width: "min(320px, calc(100vw - 32px))",
            marginLeft: "auto",
            marginRight: "auto",
            paddingBottom: 8,
            zIndex: 50,
          }}
        >
          <AnimatePresence mode="wait">

            {/* ── LOCKED: Unlock & Share CTA — only shown after auto-open has fired ── */}
            {!isPremiumUser && !watermarkRemoved && hasAutoOpened && (
              <motion.div
                key="pay-cta"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                {/* Bundle credit unlock — shown when user has a bundle token */}
                {bundleToken && bundleCredits > 0 ? (
                  <>
                    <div style={{ textAlign: "center", marginBottom: 12 }}>
                      <p style={{ fontSize: 12, color: "#4ade80", fontWeight: 700, marginBottom: 2 }}>
                        💌 You have {bundleCredits} bundle credit{bundleCredits !== 1 ? "s" : ""} left
                      </p>
                      <p style={{ fontSize: 15, color: "#fff", fontWeight: 700 }}>
                        Unlock this card for free!
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => void handleBundleUnlock()}
                      disabled={bundleLoading}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        width: "100%", height: 56, borderRadius: 16,
                        background: bundleLoading ? "rgba(74,222,128,0.2)" : "linear-gradient(135deg,#22c55e,#16a34a)",
                        color: "#fff", fontWeight: 800, fontSize: 17,
                        border: "none", cursor: bundleLoading ? "default" : "pointer",
                        boxShadow: "0 6px 28px rgba(34,197,94,0.4)",
                      }}
                    >
                      {bundleLoading ? "Unlocking…" : "✓ Use Bundle Credit — Free"}
                    </motion.button>
                    {bundleError && (
                      <p style={{ fontSize: 12, color: "#f87171", textAlign: "center", marginTop: 8, fontWeight: 600 }}>
                        {bundleError}
                      </p>
                    )}
                    <div style={{ marginTop: 10, textAlign: "center" }}>
                      <button
                        onClick={() => {
                          const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;
                          if (isMobile) { setUnlockModalSlowOpen(false); setShowUnlockModal(true); }
                          else { trackEvent({ event: "bundle_paywall_shown", occasion, card_id: cardId }); setShowBundlePaywall(true); }
                        }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "rgba(255,255,255,0.2)" }}
                      >
                        Pay ₹49 instead
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ textAlign: "center", marginBottom: 14 }}>
                      <p style={{ fontSize: 12, color: "#FFD700", fontWeight: 600, letterSpacing: "0.01em", marginBottom: 4 }}>
                        You've created a stunning card! ✨
                      </p>
                      <p style={{ fontSize: 17, color: "#FFD700", fontWeight: 800, letterSpacing: "0.01em" }}>
                        Don't leave it now.
                      </p>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;
                        if (isMobile) {
                          setUnlockModalSlowOpen(false);
                          setShowUnlockModal(true);
                        } else {
                          trackEvent({ event: "bundle_paywall_shown", occasion, card_id: cardId });
                          setShowBundlePaywall(true);
                        }
                      }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        width: "100%", height: 56, borderRadius: 16,
                        background: "linear-gradient(135deg, #FFD700 0%, #FFAA00 100%)",
                        color: "#000", fontWeight: 800, fontSize: 17,
                        border: "none", cursor: "pointer",
                        boxShadow: "0 6px 28px rgba(255,165,0,0.45)",
                      }}
                    >
                      Make {recipientName} smile. Send now. ❤️
                    </motion.button>

                    <div style={{ marginTop: 10, textAlign: "center" }}>
                      <Link href="/send">
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", cursor: "pointer" }}>
                          Make another card
                        </span>
                      </Link>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ── UNLOCKED: Share buttons ── */}
            {(isPremiumUser || watermarkRemoved) && (
              <motion.div
                key="share-panel"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <p style={{ fontSize: 12, color: "rgba(255,215,0,0.55)", textAlign: "center", marginBottom: 14, fontWeight: 600, letterSpacing: "0.04em" }}>
                  ✨ Card unlocked — share it now!
                </p>

                <div style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "18px 20px 20px",
                  backdropFilter: "blur(12px)",
                }}>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center", marginBottom: 18 }}>
                    Share via
                  </p>

                  <div style={{ display: "flex", justifyContent: "center", gap: 32 }}>

                    {/* WhatsApp */}
                    <motion.button
                      whileTap={{ scale: 0.90 }}
                      onClick={() => gatedShare("whatsapp", () => shareSenderWhatsApp())}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 0 }}
                    >
                      <div style={{
                        width: 58, height: 58, borderRadius: "50%",
                        background: waCopied ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#25D366,#128C7E)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 4px 20px rgba(37,211,102,0.4)",
                        transition: "background 0.25s",
                      }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: 11, color: waCopied ? "#4ade80" : "rgba(255,255,255,0.55)", fontWeight: 600, transition: "color 0.25s" }}>
                        {waCopied ? "Sent!" : "WhatsApp"}
                      </span>
                    </motion.button>

                    {/* Instagram */}
                    <motion.button
                      whileTap={{ scale: 0.90 }}
                      onClick={() => gatedShare("instagram", () => void shareInstagram())}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 0 }}
                    >
                      <div style={{
                        width: 58, height: 58, borderRadius: "50%",
                        background: igCopied ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 4px 20px rgba(220,39,67,0.4)",
                        transition: "background 0.25s",
                      }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: 11, color: igCopied ? "#4ade80" : "rgba(255,255,255,0.55)", fontWeight: 600, transition: "color 0.25s" }}>
                        {igCopied ? "Copied!" : "Instagram"}
                      </span>
                    </motion.button>

                    {/* Copy Link */}
                    <motion.button
                      whileTap={{ scale: 0.90 }}
                      onClick={() => gatedShare("link", () => void copySenderLink())}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 0 }}
                    >
                      <div style={{
                        width: 58, height: 58, borderRadius: "50%",
                        background: linkCopied ? "linear-gradient(135deg,#22c55e,#16a34a)" : "rgba(255,215,0,0.1)",
                        border: linkCopied ? "none" : "1.5px solid rgba(255,215,0,0.28)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: linkCopied ? "0 4px 20px rgba(34,197,94,0.35)" : "0 2px 12px rgba(255,215,0,0.08)",
                        transition: "background 0.25s, border 0.25s, box-shadow 0.25s",
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                          stroke={linkCopied ? "white" : "rgba(255,215,0,0.85)"}
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: 11, color: linkCopied ? "#4ade80" : "rgba(255,215,0,0.65)", fontWeight: 600, transition: "color 0.25s" }}>
                        {linkCopied ? "Copied!" : "Copy Link"}
                      </span>
                    </motion.button>

                  </div>
                </div>

                {/* Bundle upsell — shown when no bundle token OR credits exhausted */}
                {(!bundleToken || bundleCredits === 0) && (
                  <div style={{ marginTop: 12 }}>
                    <Link href="/bundle">
                      <div
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "11px 16px", borderRadius: 14,
                          background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.15)",
                          cursor: "pointer",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#FFD700", marginBottom: 1 }}>
                            💌 2 cards for ₹49
                          </div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                            Next card is on us — get a bundle
                          </div>
                        </div>
                        <span style={{ color: "rgba(255,215,0,0.6)", fontSize: 14 }}>→</span>
                      </div>
                    </Link>
                  </div>
                )}

                <div style={{ marginTop: 10, textAlign: "center" }}>
                  <Link href="/send">
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", cursor: "pointer" }}>
                      Make another card
                    </span>
                  </Link>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Unlock & Share modal (mobile UPI flow) ── */}
      <AnimatePresence>
        {showUnlockModal && (
          <UnlockModal
            cardId={cardId}
            recipientName={recipientName}
            occasion={occasion}
            senderShareUrl={senderShareUrl}
            slowOpen={unlockModalSlowOpen}
            onClose={() => setShowUnlockModal(false)}
            onSuccess={() => {
              setWatermarkRemoved(true);
              setShowUnlockModal(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Bundle paywall modal (desktop QR flow) ── */}
      <AnimatePresence>
        {showBundlePaywall && (
          <WatermarkPaywallModal
            mode="photo"
            cardId={cardId}
            occasion={occasion}
            onClose={handlePhotoPaywallDismiss}
            onSuccess={handleBundlePaywallSuccess}
          />
        )}
      </AnimatePresence>

      {/* ── Google-only sign-in modal ── */}
      <AnimatePresence>
        {showSignIn && (
          <motion.div
            key="google-signin-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{
              position: "fixed", inset: 0, zIndex: 10004,
              background: "rgba(0,0,0,0.88)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 20px",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowSignIn(false); } }}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              style={{
                width: "100%", maxWidth: 360,
                background: "radial-gradient(ellipse at 50% 0%, #1e0044 0%, #080010 70%)",
                border: "1px solid rgba(168,85,247,0.35)",
                borderRadius: 24,
                padding: "32px 24px 28px",
                fontFamily: "'Segoe UI', system-ui, sans-serif",
                textAlign: "center",
              }}
            >
              {/* Logo */}
              <div style={{ fontSize: 42, marginBottom: 14 }}>💌</div>
              <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 22, margin: "0 0 8px" }}>
                Sign in to HeartSync
              </h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 28px", lineHeight: 1.55 }}>
                One click and your card is ready to share
              </p>

              {/* Big Google button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                style={{
                  width: "100%", padding: "16px 20px",
                  background: googleLoading ? "#f0f0f0" : "#fff",
                  border: "none", borderRadius: 14,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                  cursor: googleLoading ? "default" : "pointer",
                  boxShadow: "0 4px 20px rgba(255,255,255,0.12)",
                  transition: "background 0.15s, transform 0.1s",
                  transform: googleLoading ? "scale(0.98)" : "scale(1)",
                }}
              >
                {googleLoading ? (
                  <>
                    <svg style={{ width: 20, height: 20, flexShrink: 0, animation: "spin 0.9s linear infinite" }} viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#ccc" strokeWidth="3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="#4285F4" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#888" }}>
                      Opening Google…
                    </span>
                  </>
                ) : (
                  <>
                    <svg style={{ width: 22, height: 22, flexShrink: 0 }} viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>
                      Continue with Google
                    </span>
                  </>
                )}
              </button>

              <button
                onClick={() => { setShowSignIn(false); }}
                style={{ display: "block", width: "100%", textAlign: "center", marginTop: 18, fontSize: 12, color: "rgba(255,255,255,0.2)", background: "none", border: "none", cursor: "pointer" }}
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}

export default function SenderPanel(props: SenderPanelProps) {
  return (
    <ClerkAuthLayer>
      <SenderPanelInner {...props} />
    </ClerkAuthLayer>
  );
}
