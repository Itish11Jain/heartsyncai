import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useAuth, useClerk, useSignIn } from "@clerk/react";
import { useCardUsage } from "@/lib/usage";
import { trackEvent } from "@/lib/trackEvent";
import { envelope } from "@/lib/audio";
import WatermarkBadge from "@/components/WatermarkBadge";
import WatermarkPaywallModal from "@/components/WatermarkPaywallModal";
import ClerkAuthLayer from "@/components/ClerkAuthLayer";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

type Phase = "envelope" | "opening" | "orbs" | "finale";
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
  const { signIn } = useSignIn();
  const { usage } = useCardUsage();
  const isPremiumUser = !!(usage?.is_superuser || (usage?.unlocked_templates?.length ?? 0) > 0);
  const [watermarkRemoved, setWatermarkRemoved] = useState(false);
  const [wmLoading, setWmLoading] = useState(false);
  const [wmError, setWmError] = useState<string | null>(null);
  const [waCopied, setWaCopied] = useState(false);
  const [igCopied, setIgCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Photo paywall state
  const [showPhotoPaywall, setShowPhotoPaywall] = useState(false);
  const [showBundlePaywall, setShowBundlePaywall] = useState(false);
  const pendingShareTypeRef = useRef<ShareType | null>(null);

  // Inline sign-in state
  type SignInStep = "email" | "otp";
  type SignInAction = "paywall" | "watermark";
  const [showSignIn, setShowSignIn] = useState(false);
  const [signInStep, setSignInStep] = useState<SignInStep>("email");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInOtp, setSignInOtp] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const pendingSignInActionRef = useRef<SignInAction | null>(null);

  // Detect if the card URL has a personal picture param
  const hasPhoto = (() => {
    try { return new URLSearchParams(window.location.search).has("personalpicture"); } catch { return false; }
  })();

  // Share URL with personalpicture stripped (for "share without photo" option)
  const shareUrlWithoutPhoto = (() => {
    try {
      const u = new URL(senderShareUrl);
      u.searchParams.delete("personalpicture");
      return u.toString();
    } catch { return senderShareUrl; }
  })();

  /* On mount: fetch the card's actual watermark status. */
  useEffect(() => {
    if (!cardId) return;
    fetch(`${BASE}/api/cards/${cardId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && data.is_watermarked === false) setWatermarkRemoved(true); })
      .catch(() => { /* ignore */ });
  }, [cardId]);

  /* Call the free-removal API — no payment needed, just auth. */
  const removeWatermarkFree = useCallback(async () => {
    if (!cardId) return;
    setWmLoading(true);
    setWmError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BASE}/api/cards/${cardId}/free-watermark-removal`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setWatermarkRemoved(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setWmError((data as { message?: string })?.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setWmError("Network error. Please try again.");
    } finally {
      setWmLoading(false);
    }
  }, [cardId, getToken]);

  /* Auto-remove watermark for any signed-in user. */
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !cardId || watermarkRemoved) return;
    removeWatermarkFree();
  }, [isLoaded, isSignedIn, cardId, watermarkRemoved, removeWatermarkFree]);

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
      const stored = sessionStorage.getItem("hs_pending_share");
      if (stored) {
        pendingShareTypeRef.current = stored as ShareType;
        sessionStorage.removeItem("hs_pending_share");
      }
      setShowBundlePaywall(true);
    }
  }, [isLoaded, isSignedIn]);

  function openSignInModal(action: "paywall" | "watermark") {
    pendingSignInActionRef.current = action;
    setSignInStep("email");
    setSignInEmail("");
    setSignInOtp("");
    setSignInError(null);
    setShowSignIn(true);
  }

  async function handleSignInEmailSubmit() {
    if (!signIn) return;
    setSignInLoading(true);
    setSignInError(null);
    try {
      const { error } = await signIn.emailCode.sendCode({ emailAddress: signInEmail.trim() });
      if (error) {
        setSignInError(error.longMessage ?? error.message ?? "Couldn't send code. Check email and retry.");
        return;
      }
      setSignInStep("otp");
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ longMessage?: string; message: string }> };
      setSignInError(e.errors?.[0]?.longMessage ?? e.errors?.[0]?.message ?? "Couldn't send code. Check email and retry.");
    } finally {
      setSignInLoading(false);
    }
  }

  async function handleSignInOtpSubmit() {
    if (!signIn) return;
    setSignInLoading(true);
    setSignInError(null);
    try {
      const { error } = await signIn.emailCode.verifyCode({ code: signInOtp.trim() });
      if (error) {
        setSignInError(error.longMessage ?? error.message ?? "Wrong code — please try again.");
        return;
      }
      if (signIn.status === "complete" && signIn.createdSessionId) {
        await (clerk.setActive as (params: { session: string }) => Promise<void>)({ session: signIn.createdSessionId });
        setShowSignIn(false);
        const action = pendingSignInActionRef.current;
        pendingSignInActionRef.current = null;
        if (action === "paywall") {
          setShowBundlePaywall(true);
        } else if (action === "watermark") {
          void removeWatermarkFree();
        }
      }
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ longMessage?: string; message: string }> };
      setSignInError(e.errors?.[0]?.longMessage ?? e.errors?.[0]?.message ?? "Wrong code — please try again.");
    } finally {
      setSignInLoading(false);
    }
  }

  function handleGoogleSignIn() {
    if (!signIn) return;
    const returnUrl = new URL(window.location.href);
    if (pendingSignInActionRef.current === "paywall") {
      sessionStorage.setItem("hs_pending_share", pendingShareTypeRef.current ?? "link");
      returnUrl.searchParams.set("open_paywall", "1");
    } else if (pendingSignInActionRef.current === "watermark") {
      returnUrl.searchParams.set("open_watermark", "1");
    }
    void (signIn.sso as unknown as (params: { strategy: string; redirectUrl: string; redirectUrlComplete: string }) => Promise<void>)({
      strategy: "oauth_google",
      redirectUrl: returnUrl.toString(),
      redirectUrlComplete: returnUrl.toString(),
    });
  }

  function handleRemoveWatermarkClick() {
    if (isLoaded && isSignedIn) {
      removeWatermarkFree();
      return;
    }
    openSignInModal("watermark");
  }

  /**
   * Intercepts a share action to check for the photo gate.
   * If photo is present and user hasn't paid → show photo paywall.
   * Otherwise execute the action immediately.
   */
  function gatedShare(type: ShareType, action: () => void) {
    if (hasPhoto && !isPremiumUser) {
      pendingShareTypeRef.current = type;
      setShowPhotoPaywall(true);
      return;
    }
    action();
  }

  function shareSenderWhatsApp(url: string = senderShareUrl) {
    envelope.copy();
    trackEvent({ event: "card_shared", channel: "whatsapp", occasion, template: "envelope" });
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

  function shareInstagram(url: string = senderShareUrl) {
    envelope.copy();
    trackEvent({ event: "card_shared", channel: "instagram", occasion, template: "envelope" });
    // Show feedback immediately — don't wait for clipboard permission
    setIgCopied(true);
    setTimeout(() => setIgCopied(false), 2500);
    copyToClipboard(url);
    setTimeout(() => window.open("https://www.instagram.com", "_blank"), 300);
  }

  function copySenderLink(url: string = senderShareUrl) {
    envelope.copy();
    trackEvent({ event: "card_shared", channel: "link", occasion, template: "envelope" });
    // Show feedback immediately — don't gate it on clipboard permission
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
    copyToClipboard(url);
  }

  /* Dispatch the "share without photo" action */
  function executeShareWithoutPhoto() {
    const type = pendingShareTypeRef.current;
    pendingShareTypeRef.current = null;
    setShowPhotoPaywall(false);
    if (type === "whatsapp") shareSenderWhatsApp(shareUrlWithoutPhoto);
    else if (type === "instagram") void shareInstagram(shareUrlWithoutPhoto);
    else void copySenderLink(shareUrlWithoutPhoto);
  }

  /* After bundle payment succeeds: navigate to the share finale so all CTAs are visible. */
  function handleBundlePaywallSuccess() {
    setShowBundlePaywall(false);
    pendingShareTypeRef.current = null;
    const u = new URL(window.location.href);
    u.searchParams.set("direct_share", "1");
    u.searchParams.delete("open_paywall");
    window.location.href = u.toString();
  }

  return (
    <>
      {/* Watermark badge */}
      <WatermarkBadge
        id={cardId || undefined}
        showRemoveCta={false}
        prominent={false}
        hidden={isPremiumUser || watermarkRemoved}
      />

      {/* ── Sender share panel (finale only) ── */}
      {phase === "finale" && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.55 }}
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
          <p style={{ fontSize: 12, color: "rgba(255,215,0,0.55)", textAlign: "center", marginBottom: 14, fontWeight: 600, letterSpacing: "0.04em" }}>
            ✨ Your card is ready — share it now!
          </p>

          {/* Icon share row */}
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

          {/* Remove watermark CTA */}
          {!isPremiumUser && !watermarkRemoved && (
            <div style={{ marginTop: 14, textAlign: "center" }}>
              {wmError && (
                <p style={{ fontSize: 12, color: "#f87171", marginBottom: 6 }}>{wmError}</p>
              )}
              <button
                onClick={handleRemoveWatermarkClick}
                disabled={wmLoading}
                style={{
                  background: "none", border: "none", padding: 0,
                  cursor: wmLoading ? "default" : "pointer",
                  fontSize: 13, fontWeight: 700,
                  color: wmLoading ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.8)",
                  textDecoration: "underline",
                  textDecorationColor: "rgba(168,85,247,0.6)",
                  textUnderlineOffset: 3,
                  letterSpacing: "0.02em",
                }}
              >
                {wmLoading ? "Removing…" : "Remove watermark →"}
              </button>
            </div>
          )}

          {watermarkRemoved && (
            <div style={{ marginTop: 14, textAlign: "center", fontSize: 13, color: "#4ade80", fontWeight: 600 }}>
              ✓ Watermark removed!
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

      {/* ── Photo paywall intercept modal ── */}
      <AnimatePresence>
        {showPhotoPaywall && (
          <motion.div
            key="photo-paywall-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: "fixed", inset: 0, zIndex: 10001,
              background: "rgba(0,0,0,0.85)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 20px",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowPhotoPaywall(false); pendingShareTypeRef.current = null; } }}
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
                padding: "28px 22px 24px",
                fontFamily: "'Segoe UI', system-ui, sans-serif",
              }}
            >
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 22 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📸</div>
                <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 16, lineHeight: 1.3 }}>
                  Share with the photo included
                </h2>

                {/* Benefits */}
                <div style={{
                  background: "rgba(168,85,247,0.08)",
                  border: "1px solid rgba(168,85,247,0.2)",
                  borderRadius: 14, padding: "14px 16px", marginBottom: 6,
                  textAlign: "left",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(168,85,247,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                    What you get
                  </div>
                  {[
                    "📸 Picture of them inside the card",
                    "🚫 No watermark on your card",
                    "✨ Cosmic, Crystal & Vinyl unlocked",
                    "♾️ All future cards — forever",
                  ].map((line) => (
                    <div key={line} style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 7, display: "flex", alignItems: "flex-start", gap: 6 }}>
                      {line}
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: "rgba(255,215,0,0.55)", fontWeight: 700, marginTop: 10 }}>
                    All for ₹49 — one-time payment
                  </div>
                </div>
              </div>

              {/* Primary CTA */}
              <button
                onClick={() => {
                  if (isSignedIn) {
                    setShowPhotoPaywall(false);
                    setShowBundlePaywall(true);
                  } else {
                    setShowPhotoPaywall(false);
                    openSignInModal("paywall");
                  }
                }}
                style={{
                  width: "100%", padding: "15px 16px", borderRadius: 14,
                  background: "linear-gradient(135deg, #a855f7, #ec4899)",
                  border: "none", color: "#fff",
                  fontWeight: 800, fontSize: 15, cursor: "pointer",
                  marginBottom: 10,
                  boxShadow: "0 4px 24px rgba(168,85,247,0.4)",
                }}
              >
                {isSignedIn ? "Unlock Premium — ₹49" : "Sign up & Unlock Premium — ₹49"}
              </button>

              {/* Secondary: share without photo */}
              <button
                onClick={executeShareWithoutPhoto}
                style={{
                  width: "100%", padding: "12px", borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.5)", fontWeight: 600, fontSize: 13, cursor: "pointer",
                  marginBottom: 10,
                }}
              >
                Share without photo
              </button>

              <button
                onClick={() => { setShowPhotoPaywall(false); pendingShareTypeRef.current = null; }}
                style={{ display: "block", width: "100%", textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", background: "none", border: "none", cursor: "pointer" }}
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Inline sign-in modal ── */}
      <AnimatePresence>
        {showSignIn && (
          <motion.div
            key="signin-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed", inset: 0, zIndex: 10002,
              background: "rgba(0,0,0,0.88)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 20px",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowSignIn(false); }}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              style={{
                width: "100%", maxWidth: 360,
                background: "radial-gradient(ellipse at 50% 0%, #0d0030 0%, #050015 80%)",
                border: "1px solid rgba(168,85,247,0.3)",
                borderRadius: 24,
                padding: "28px 24px 24px",
                fontFamily: "'Segoe UI', system-ui, sans-serif",
              }}
            >
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>💌</div>
                <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 19, margin: 0, lineHeight: 1.3 }}>
                  {signInStep === "email" ? "Sign in to continue" : "Check your inbox"}
                </h2>
                {signInStep === "otp" && (
                  <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 8, marginBottom: 0 }}>
                    We sent a 6-digit code to<br />
                    <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>{signInEmail}</span>
                  </p>
                )}
              </div>

              {signInStep === "email" ? (
                <>
                  {/* Email input */}
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleSignInEmailSubmit(); }}
                    autoFocus
                    style={{
                      width: "100%", padding: "13px 16px",
                      borderRadius: 12, border: "1px solid rgba(168,85,247,0.35)",
                      background: "rgba(255,255,255,0.05)", color: "#fff",
                      fontSize: 15, outline: "none", boxSizing: "border-box",
                      marginBottom: 10,
                    }}
                  />
                  <button
                    onClick={() => void handleSignInEmailSubmit()}
                    disabled={signInLoading || !signInEmail.trim()}
                    style={{
                      width: "100%", padding: "14px",
                      borderRadius: 12,
                      background: signInLoading || !signInEmail.trim()
                        ? "rgba(168,85,247,0.3)"
                        : "linear-gradient(135deg,#a855f7,#ec4899)",
                      border: "none", color: "#fff",
                      fontWeight: 800, fontSize: 15, cursor: signInLoading || !signInEmail.trim() ? "default" : "pointer",
                      marginBottom: 16,
                      transition: "background 0.2s",
                    }}
                  >
                    {signInLoading ? "Sending…" : "Send code →"}
                  </button>

                  {/* Divider */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>OR</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                  </div>

                  {/* Google */}
                  <button
                    onClick={handleGoogleSignIn}
                    style={{
                      width: "100%", padding: "13px",
                      borderRadius: 12,
                      background: "#fff",
                      border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      fontWeight: 700, fontSize: 14, color: "#1f2937",
                      marginBottom: 12,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>
                </>
              ) : (
                <>
                  {/* OTP input */}
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter 6-digit code"
                    value={signInOtp}
                    onChange={(e) => setSignInOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleSignInOtpSubmit(); }}
                    autoFocus
                    style={{
                      width: "100%", padding: "14px 16px",
                      borderRadius: 12, border: "1px solid rgba(168,85,247,0.35)",
                      background: "rgba(255,255,255,0.05)", color: "#fff",
                      fontSize: 22, fontWeight: 700, letterSpacing: "0.25em",
                      textAlign: "center", outline: "none", boxSizing: "border-box",
                      marginBottom: 10,
                    }}
                  />
                  <button
                    onClick={() => void handleSignInOtpSubmit()}
                    disabled={signInLoading || signInOtp.length < 6}
                    style={{
                      width: "100%", padding: "14px",
                      borderRadius: 12,
                      background: signInLoading || signInOtp.length < 6
                        ? "rgba(168,85,247,0.3)"
                        : "linear-gradient(135deg,#a855f7,#ec4899)",
                      border: "none", color: "#fff",
                      fontWeight: 800, fontSize: 15, cursor: signInLoading || signInOtp.length < 6 ? "default" : "pointer",
                      marginBottom: 12,
                    }}
                  >
                    {signInLoading ? "Verifying…" : "Verify & Continue →"}
                  </button>
                  <button
                    onClick={() => { setSignInStep("email"); setSignInOtp(""); setSignInError(null); }}
                    style={{ display: "block", width: "100%", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.35)", padding: "4px 0" }}
                  >
                    ← Use a different email
                  </button>
                </>
              )}

              {/* Error */}
              {signInError && (
                <p style={{ fontSize: 12, color: "#f87171", textAlign: "center", marginTop: 8, marginBottom: 0 }}>
                  {signInError}
                </p>
              )}

              {/* Cancel */}
              <button
                onClick={() => setShowSignIn(false)}
                style={{ display: "block", width: "100%", textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.18)", background: "none", border: "none", cursor: "pointer", marginTop: 14 }}
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bundle paywall modal ── */}
      <AnimatePresence>
        {showBundlePaywall && (
          <WatermarkPaywallModal
            cardId={cardId}
            onClose={() => { setShowBundlePaywall(false); pendingShareTypeRef.current = null; }}
            onSuccess={handleBundlePaywallSuccess}
          />
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
