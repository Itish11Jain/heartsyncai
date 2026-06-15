import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { trackEvent } from "@/lib/trackEvent";
import { music, resumeAudio, isAudioSuspended } from "@/lib/audio";
import { scaleCount } from "@/lib/deviceCapability";
import ViralReplyCTA from "@/components/ViralReplyCTA";
import { getCampaignByOccasion, type OccasionCampaign } from "@/lib/occasion-campaigns";

/* Reuse the exact card scene art — envelope, slider, floating 3D bouquet,
 * falling petals, photo/voice collage. No new 3D/bouquet logic authored here. */
import {
  GoldenEnvelope,
  SlideToUnlock,
  FloatingBouquet,
  PetalRain,
  MemoryCollage,
  GoldenShineButton,
} from "@/pages/card";

/* The same flower sprites the bouquet/envelope use, for the opening bloom. */
import rosePinkImg from "@assets/flowers/rose_pink.webp";
import cosmosPinkImg from "@assets/flowers/cosmos_pink.webp";

const UnlockModal = lazy(() => import("@/components/UnlockModal"));
const WatermarkPaywallModal = lazy(() => import("@/components/WatermarkPaywallModal"));

/* ─── URL helpers ─────────────────────────────────────────────────────────── */
function getParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}
function decodeMsg(b64: string): string {
  try { return decodeURIComponent(escape(atob(b64))); } catch { return ""; }
}
function parsePhotoUrls(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map(s => { try { return decodeURIComponent(s); } catch { return s; } }).filter(Boolean);
}

/* Fallback campaign so /occasion never renders empty if the occasion param is
 * missing or unknown — defaults to the Father's Day campaign copy/theme. */
const FALLBACK_CAMPAIGN = getCampaignByOccasion("fathers_day")!;

/* ─── Ambient twinkle backdrop (lightweight) ──────────────────────────────── */
const TWINKLES = Array.from({ length: 26 }, (_, i) => ({
  top: `${(i * 53) % 100}%`,
  left: `${(i * 37 + 11) % 100}%`,
  size: 6 + (i % 4) * 3,
  delay: (i % 7) * 0.5,
  dur: 2.4 + (i % 5) * 0.6,
}));
function TwinkleBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {TWINKLES.map((t, i) => (
        <motion.span
          key={i}
          style={{ position: "absolute", top: t.top, left: t.left, fontSize: t.size, color: "rgba(212,175,55,0.6)", lineHeight: 1 }}
          animate={{ scale: [0, 1.1, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: t.dur, repeat: Infinity, repeatDelay: 1.6, delay: t.delay, ease: "easeInOut" }}
        >✦</motion.span>
      ))}
    </div>
  );
}

/* ─── Scene 1: tappable bloom (mirrors the reply flow's SpinningFlower) ─────── */
const BURST_PETALS = [rosePinkImg, rosePinkImg, rosePinkImg, cosmosPinkImg];
function SpinningFlower({ exploding, onTap }: { exploding: boolean; onTap: () => void }) {
  const shards = useMemo(() => {
    const n = scaleCount(34);
    const vw = typeof window !== "undefined" ? window.innerWidth : 400;
    const vh = typeof window !== "undefined" ? window.innerHeight : 720;
    return Array.from({ length: n }).map((_, i) => ({
      img: BURST_PETALS[i % BURST_PETALS.length],
      x: (Math.random() - 0.5) * vw * 1.15,
      y: (Math.random() - 0.5) * vh * 1.15,
      size: 30 + Math.random() * 50,
      rot: (Math.random() - 0.5) * 560,
      delay: Math.random() * 0.16,
      dur: 1.4 + Math.random() * 0.7,
    }));
  }, []);

  return (
    <div style={{ position: "relative", width: "min(248px, 64vw)", height: "min(248px, 64vw)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <motion.div
        animate={{ opacity: exploding ? [0.6, 1, 0] : [0.3, 0.5, 0.3], scale: exploding ? [1, 2.2, 3] : [1, 1.08, 1] }}
        transition={{ duration: exploding ? 0.95 : 5, repeat: exploding ? 0 : Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", inset: "8%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,150,190,0.55), transparent 70%)", filter: "blur(10px)", pointerEvents: "none" }}
      />
      {exploding && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40, pointerEvents: "none", overflow: "hidden" }}>
          {shards.map((s, i) => (
            <motion.img
              key={i} src={s.img} alt="" aria-hidden draggable={false}
              initial={{ x: 0, y: 0, scale: 0.3, opacity: 0, rotate: 0 }}
              animate={{ x: s.x, y: s.y, scale: [0.5, 1.15, 0.95], opacity: [1, 1, 0], rotate: s.rot }}
              transition={{ duration: s.dur, delay: s.delay, ease: "easeOut" }}
              style={{ position: "absolute", left: "50%", top: "50%", width: s.size, height: s.size, marginLeft: -s.size / 2, marginTop: -s.size / 2, objectFit: "contain", filter: "drop-shadow(0 4px 8px rgba(120,40,70,0.4))", willChange: "transform" }}
            />
          ))}
        </div>
      )}
      <motion.img
        src={rosePinkImg} alt="Tap to open" draggable={false}
        onClick={() => { if (!exploding) onTap(); }}
        animate={exploding ? { scale: [1, 1.3, 0], opacity: [1, 1, 0], rotate: 60 } : { rotate: 360, scale: [1, 1.05, 1] }}
        transition={exploding ? { duration: 0.8, ease: "easeIn" } : { rotate: { duration: 11, repeat: Infinity, ease: "linear" }, scale: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
        style={{ position: "relative", zIndex: 2, width: "100%", height: "100%", objectFit: "contain", cursor: exploding ? "default" : "pointer", filter: "drop-shadow(0 12px 26px rgba(150,40,90,0.5))", touchAction: "manipulation" }}
      />
    </div>
  );
}

function Scene1({ heading, onNext, autoplay }: { heading: string; onNext: () => void; autoplay: boolean }) {
  const [exploding, setExploding] = useState(false);
  function handleTap() {
    if (exploding) return;
    setExploding(true);
    setTimeout(onNext, 900);
  }
  /* In autoplay (modal preview) bloom shatters on its own; the parent's scene
     timer drives the actual advance so we don't double-fire. */
  useEffect(() => {
    if (!autoplay) return;
    const t = setTimeout(() => setExploding(true), 2600);
    return () => clearTimeout(t);
  }, [autoplay]);

  return (
    <motion.div key="s1" style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30, padding: "40px 24px" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
      <TwinkleBackground />
      {!exploding && (
        <motion.h1
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          style={{ position: "relative", zIndex: 2, margin: 0, fontFamily: "'Dancing Script', cursive", fontSize: "min(34px, 8.4vw)", fontWeight: 700, color: "#F5C44E", textAlign: "center", textShadow: "0 2px 14px rgba(245,196,78,0.4)", lineHeight: 1.25 }}
        >
          {heading}
        </motion.h1>
      )}
      <SpinningFlower exploding={exploding} onTap={handleTap} />
      {!exploding && !autoplay && (
        <GoldenShineButton label="Click here" onClick={handleTap} delay={0.4} />
      )}
    </motion.div>
  );
}

/* ─── Scene 2: bouquet + message ──────────────────────────────────────────── */
function Scene2({ message, onNext, autoplay }: { message: string; onNext: () => void; autoplay: boolean }) {
  return (
    <motion.div key="s2" style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px 110px" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
      <TwinkleBackground />
      <PetalRain count={10} />
      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 340, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <FloatingBouquet />
      </div>
      <motion.p
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.7 }}
        style={{ position: "relative", zIndex: 2, marginTop: 24, fontFamily: "'Dancing Script', cursive", fontSize: "min(26px, 6.4vw)", fontWeight: 700, color: "#F5C44E", textAlign: "center", textShadow: "0 2px 12px rgba(245,196,78,0.35)", lineHeight: 1.4 }}
      >
        {message}
      </motion.p>
      {!autoplay && (
        <div style={{ position: "relative", zIndex: 2, marginTop: 30 }}>
          <GoldenShineButton label="Continue" onClick={onNext} delay={1.6} />
        </div>
      )}
    </motion.div>
  );
}

/* ─── Scene 4: golden envelope + slide to open ────────────────────────────── */
function Scene4({ name, onNext, autoplay }: { name: string; onNext: () => void; autoplay: boolean }) {
  const [opening, setOpening] = useState(false);
  function handleUnlock() {
    if (opening) return;
    setOpening(true);
    setTimeout(onNext, 1200);
  }
  useEffect(() => {
    if (!autoplay) return;
    const t = setTimeout(() => setOpening(true), 2800);
    return () => clearTimeout(t);
  }, [autoplay]);

  return (
    <motion.div key="s4" style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40, padding: "40px 24px" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
      <TwinkleBackground />
      {!opening && (
        <motion.h2
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          style={{ position: "relative", zIndex: 2, margin: 0, fontFamily: "'Dancing Script', cursive", fontSize: "min(28px, 7vw)", fontWeight: 700, color: "#F5C44E", textAlign: "center", textShadow: "0 2px 14px rgba(245,196,78,0.4)", lineHeight: 1.3 }}
        >
          Open this to read more...
        </motion.h2>
      )}
      <div style={{ position: "relative", zIndex: 2 }}>
        <GoldenEnvelope recipientName={name} opening={opening} isSorry />
      </div>
      {!opening && !autoplay && (
        <div style={{ position: "relative", zIndex: 2, width: "min(320px, 86vw)" }}>
          <SlideToUnlock onUnlock={handleUnlock} isSorry />
        </div>
      )}
    </motion.div>
  );
}

/* ─── Scene 5: typewriter final message + share / paywall ─────────────────── */
function useTypewriter(text: string, speed = 42, startDelay = 500) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setOut(""); setDone(false);
    let i = 0;
    let interval: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setOut(text.slice(0, i));
        if (i >= text.length) { clearInterval(interval); setDone(true); }
      }, speed);
    }, startDelay);
    return () => { clearTimeout(start); clearInterval(interval); };
  }, [text, speed, startDelay]);
  return { out, done };
}

function Scene5({
  name, finalHeader, finalMessage, accent, cornerEmojis,
  isSender, isRecipient, isUnlocked, occasion,
  showPaywallCta, onOpenPaywall, onTypingDone,
  senderCopied, senderIgCopied, onShareWhatsApp, onCopyLink, onCopyForInstagram,
}: {
  name: string;
  finalHeader: string;
  finalMessage: string;
  accent: string;
  cornerEmojis: [string, string, string, string];
  isSender: boolean;
  isRecipient: boolean;
  isUnlocked: boolean;
  occasion: string;
  showPaywallCta: boolean;
  onOpenPaywall: () => void;
  onTypingDone: () => void;
  senderCopied: boolean;
  senderIgCopied: boolean;
  onShareWhatsApp: () => void;
  onCopyLink: () => void;
  onCopyForInstagram: () => void;
}) {
  const { out, done } = useTypewriter(finalMessage);
  const firedRef = useRef(false);
  useEffect(() => {
    if (done && !firedRef.current) { firedRef.current = true; onTypingDone(); }
  }, [done, onTypingDone]);

  return (
    <motion.div key="s5" style={{ position: "absolute", inset: 0, zIndex: 12, overflowY: "auto" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <TwinkleBackground />
      <div style={{ position: "relative", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", minHeight: "100%", padding: "56px 24px 40px" }}>
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.2, type: "spring", bounce: 0.28 }}
          style={{ width: "100%", maxWidth: 340, background: "linear-gradient(145deg,rgba(28,10,6,0.96),rgba(18,6,3,0.94))", border: `1.5px solid ${accent}55`, borderRadius: 22, padding: "30px 24px 26px", boxShadow: `0 0 40px ${accent}30, 0 0 80px rgba(180,60,20,0.22)`, position: "relative", overflow: "visible" }}
        >
          <span style={{ position: "absolute", top: 10, left: 13, fontSize: 16, opacity: 0.82 }}>{cornerEmojis[0]}</span>
          <span style={{ position: "absolute", top: 10, right: 13, fontSize: 16, opacity: 0.82 }}>{cornerEmojis[1]}</span>
          <span style={{ position: "absolute", bottom: 10, left: 13, fontSize: 16, opacity: 0.82 }}>{cornerEmojis[2]}</span>
          <span style={{ position: "absolute", bottom: 10, right: 13, fontSize: 16, opacity: 0.82 }}>{cornerEmojis[3]}</span>

          <div style={{ width: 44, height: 1, margin: "0 auto 16px", background: `linear-gradient(90deg,transparent,${accent}cc,transparent)` }} />
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            style={{ fontFamily: "'Great Vibes','Dancing Script',cursive", fontSize: 32, fontWeight: 400, color: accent, margin: "0 0 6px", textAlign: "center", textShadow: `0 0 18px ${accent}66` }}>
            {finalHeader}
          </motion.h1>
          <p style={{ fontFamily: "'Dancing Script',cursive", fontSize: 20, color: accent, opacity: 0.85, margin: "0 0 14px", textAlign: "center" }}>
            Dear {name},
          </p>
          <div style={{ width: 60, height: 1, margin: "0 auto 16px", background: `linear-gradient(90deg,transparent,${accent}88,transparent)` }} />
          <p style={{ fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: 15, color: "rgba(255,241,220,0.96)", lineHeight: 1.72, margin: 0, textAlign: "center", minHeight: 80 }}>
            {out}
            {!done && <span style={{ opacity: 0.6 }}>▍</span>}
          </p>
          <div style={{ width: 44, height: 1, margin: "16px auto 0", background: `linear-gradient(90deg,transparent,${accent}88,transparent)` }} />
        </motion.div>

        {/* Sender panel */}
        {isSender && (
          <motion.div style={{ width: "100%", maxWidth: 320, marginTop: 32 }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            {isUnlocked ? (
              <>
                <p style={{ fontSize: 12, color: `${accent}80`, textAlign: "center", marginBottom: 12, letterSpacing: "0.06em" }}>✦ Share this card</p>
                <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <button onClick={onShareWhatsApp} style={{ flex: 1, padding: "12px 8px", borderRadius: 12, background: "rgba(37,211,102,0.1)", border: "1.5px solid rgba(37,211,102,0.28)", color: "rgba(37,211,102,0.9)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>💬 WhatsApp</button>
                  <button onClick={onCopyForInstagram} style={{ flex: 1, padding: "12px 8px", borderRadius: 12, background: "rgba(200,100,200,0.1)", border: "1.5px solid rgba(200,100,200,0.28)", color: "rgba(220,140,255,0.9)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{senderIgCopied ? "✅ Copied!" : "📸 Instagram"}</button>
                </div>
                <button onClick={onCopyLink} style={{ width: "100%", padding: "11px", borderRadius: 12, background: `${accent}12`, border: `1.5px solid ${accent}30`, color: `${accent}b3`, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{senderCopied ? "✅ Link Copied!" : "🔗 Copy Link"}</button>
                <div style={{ textAlign: "center", marginTop: 14 }}>
                  <Link href="/send"><span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", cursor: "pointer" }}>Make another card →</span></Link>
                </div>
              </>
            ) : showPaywallCta ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <div style={{ textAlign: "center", marginBottom: 14 }}>
                  <p style={{ fontSize: 12, color: accent, fontWeight: 600, margin: "0 0 4px" }}>You've created a stunning card! ✨</p>
                  <p style={{ fontSize: 17, color: accent, fontWeight: 800, margin: 0 }}>Don't leave it now.</p>
                </div>
                <motion.button onClick={onOpenPaywall} whileTap={{ scale: 0.97 }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 56, borderRadius: 16, background: "linear-gradient(135deg,#FFD700 0%,#FFAA00 100%)", border: "none", cursor: "pointer", color: "#000", fontWeight: 800, fontSize: 17, boxShadow: "0 6px 28px rgba(255,165,0,0.45)" }}>
                  Make {name} smile. Send now. ❤️
                </motion.button>
                <div style={{ marginTop: 10, textAlign: "center" }}>
                  <Link href="/send"><span style={{ fontSize: 11, color: `${accent}4d`, cursor: "pointer" }}>Make another card</span></Link>
                </div>
              </motion.div>
            ) : null}
          </motion.div>
        )}

        {/* Recipient panel */}
        {isRecipient && (
          <motion.div style={{ width: "100%", maxWidth: 320, marginTop: 20 }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <ViralReplyCTA template="occasion" occasion={occasion} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function OccasionCard() {
  useEffect(() => {
    const w = window as unknown as { __clearHsSplash?: () => void };
    if (w.__clearHsSplash) w.__clearHsSplash();
  }, []);

  const params = getParams();
  const name = params.get("to") || "Friend";
  const occasion = params.get("occasion") || FALLBACK_CAMPAIGN.occasion;
  const campaign: OccasionCampaign = getCampaignByOccasion(occasion) ?? FALLBACK_CAMPAIGN;

  const msgRaw = params.get("msg");
  const finalMessage = (msgRaw ? decodeMsg(msgRaw) : "") || campaign.defaultMessage;

  const isSender = params.get("sender") === "1";
  const isPreview = params.get("preview") === "1";
  const isAutoplay = params.get("autoplay") === "1";
  const previewSpeed = Math.max(1, Number(params.get("speed")) || 1);
  const isRecipient = !isSender;

  const photoUrls = parsePhotoUrls(params.get("photos"));
  const personalPicUrl = params.get("personalpicture") ? decodeURIComponent(params.get("personalpicture")!) : "";
  const voiceUrl = params.get("voicenote") ? decodeURIComponent(params.get("voicenote")!) : "";
  const collagePhotos = useMemo(() => {
    const merged = [personalPicUrl, ...photoUrls].filter(Boolean);
    return Array.from(new Set(merged)).slice(0, 4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get("photos"), personalPicUrl]);

  /* ── Background music ── */
  const [musicMuted, setMusicMuted] = useState(false);
  useEffect(() => {
    if (isPreview) return;
    music.start("envelope", occasion);
    function onFirstGesture() {
      const wasSuspended = isAudioSuspended();
      resumeAudio();
      if (wasSuspended) { music.stop(); music.start("envelope", occasion); }
    }
    document.addEventListener("touchstart", onFirstGesture, { once: true });
    document.addEventListener("click", onFirstGesture, { once: true });
    return () => {
      music.stop();
      document.removeEventListener("touchstart", onFirstGesture);
      document.removeEventListener("click", onFirstGesture);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview]);
  function toggleMute() {
    const next = !musicMuted;
    setMusicMuted(next);
    music.setVolume(next ? 0 : 1);
  }

  const [scene, setScene] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [paywallDismissed, setPaywallDismissed] = useState(false);
  const [cardId, setCardId] = useState<string>(() => params.get("id") ?? "");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showDesktopPaywall, setShowDesktopPaywall] = useState(false);
  const [senderCopied, setSenderCopied] = useState(false);
  const [senderIgCopied, setSenderIgCopied] = useState(false);
  const autoOpenFiredRef = useRef(false);

  /* view tracking — fire once when a recipient opens the card */
  useEffect(() => {
    if (isRecipient && !isAutoplay) {
      trackEvent({ event: "card_viewed", occasion, template: "occasion", recipient_name: name, card_id: params.get("id") ?? undefined });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Eagerly preload media so collage/photos are ready when shown */
  useEffect(() => {
    collagePhotos.forEach(url => { const i = new Image(); i.src = url; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Generate a card ID for sender sessions so UnlockModal can call the
     auto-unlock / pay-unlock endpoints (INSERT … ON CONFLICT creates the row). */
  useEffect(() => {
    if (!isSender || cardId) return;
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    const id = Array.from(arr, b => chars[b % chars.length]).join("");
    setCardId(id);
    const p = new URLSearchParams(window.location.search);
    p.set("id", id);
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Reflect the real unlock state from the DB on mount */
  useEffect(() => {
    if (!cardId) return;
    const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    fetch(`${base}/api/cards/${cardId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { is_premium?: boolean } | null) => { if (data?.is_premium) setIsUnlocked(true); })
      .catch(() => { /* ignore — modal still works */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  /* Share URL — /api/share renders a personalised og:image then redirects. */
  const senderShareUrl = (() => {
    const p = new URLSearchParams(window.location.search);
    p.delete("sender");
    p.set("t", "occasion");
    if (cardId) p.set("id", cardId);
    return window.location.origin + "/api/share?" + p.toString();
  })();

  /* Autoplay (modal preview): advance through scenes and loop */
  useEffect(() => {
    if (!isAutoplay) return;
    const speed = (isPreview ? 0.5 : 1) / previewSpeed;
    const SCENE_DURATIONS: Record<number, number> = { 1: 4500 * speed, 2: 5000 * speed, 3: 5000 * speed, 4: 4500 * speed, 5: 6000 * speed };
    const NEXT_SCENE: Record<number, 1 | 2 | 3 | 4 | 5> = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 1 };
    const t = setTimeout(() => setScene(NEXT_SCENE[scene]), SCENE_DURATIONS[scene] ?? 5000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoplay, scene]);

  function openPaywallNow() {
    const isMobile = window.innerWidth < 768;
    if (isMobile) setShowUnlockModal(true);
    else setShowDesktopPaywall(true);
  }

  /* Auto-open the paywall ~2s after the final message finishes typing */
  function handleTypingDone() {
    if (scene !== 5 || !isSender || isUnlocked || autoOpenFiredRef.current || isPreview) return;
    autoOpenFiredRef.current = true;
    setTimeout(openPaywallNow, 2000);
  }

  function shareSenderWhatsApp() {
    const text = encodeURIComponent(`${campaign.campaignEmoji} I made you a surprise — open it! ${senderShareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    trackEvent({ event: "card_shared_whatsapp", occasion, template: "occasion" });
  }
  function copySenderLink() {
    navigator.clipboard.writeText(senderShareUrl).then(() => { setSenderCopied(true); setTimeout(() => setSenderCopied(false), 2500); }).catch(() => {});
  }
  function copySenderLinkForInstagram() {
    navigator.clipboard.writeText(senderShareUrl).then(() => { setSenderIgCopied(true); setTimeout(() => setSenderIgCopied(false), 2500); }).catch(() => {});
  }

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", overscrollBehavior: "none", background: "linear-gradient(175deg,#0e0502 0%,#1c0a06 40%,#0e0402 100%)", fontFamily: "Georgia,'Times New Roman',serif", userSelect: "none" }}>
      <AnimatePresence mode="wait">
        {scene === 1 && <Scene1 key="s1" heading={`${campaign.finalHeader}, ${name}`} autoplay={isAutoplay} onNext={() => setScene(2)} />}
        {scene === 2 && <Scene2 key="s2" message={campaign.bouquetMessage.replace(/\{name\}/g, name)} autoplay={isAutoplay} onNext={() => setScene(3)} />}
        {scene === 3 && (
          <motion.div key="s3" style={{ position: "absolute", inset: 0, zIndex: 11 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
            <TwinkleBackground />
            <MemoryCollage photoUrls={collagePhotos} voiceNoteUrl={voiceUrl || null} headline={campaign.polaroidNote.replace(/\{name\}/g, name)} goldenCta ctaLabel="Next" onContinue={() => setScene(4)} />
          </motion.div>
        )}
        {scene === 4 && <Scene4 key="s4" name={name} autoplay={isAutoplay} onNext={() => setScene(5)} />}
        {scene === 5 && (
          <Scene5 key="s5"
            name={name}
            finalHeader={campaign.finalHeader}
            finalMessage={finalMessage}
            accent={campaign.accent}
            cornerEmojis={campaign.cornerEmojis}
            isSender={isSender}
            isRecipient={isRecipient}
            isUnlocked={isUnlocked}
            occasion={occasion}
            showPaywallCta={paywallDismissed}
            onOpenPaywall={openPaywallNow}
            onTypingDone={handleTypingDone}
            senderCopied={senderCopied}
            senderIgCopied={senderIgCopied}
            onShareWhatsApp={shareSenderWhatsApp}
            onCopyLink={copySenderLink}
            onCopyForInstagram={copySenderLinkForInstagram}
          />
        )}
      </AnimatePresence>

      {/* Payment modals */}
      <AnimatePresence>
        {showUnlockModal && (
          <Suspense fallback={null}>
            <UnlockModal
              cardId={cardId}
              recipientName={name}
              occasion={occasion}
              senderShareUrl={senderShareUrl}
              onClose={() => { setShowUnlockModal(false); setPaywallDismissed(true); }}
              onSuccess={() => { setIsUnlocked(true); setShowUnlockModal(false); setPaywallDismissed(true); }}
            />
          </Suspense>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDesktopPaywall && (
          <Suspense fallback={null}>
            <WatermarkPaywallModal
              mode="photo"
              cardId={cardId}
              occasion={occasion}
              onClose={() => { setShowDesktopPaywall(false); setPaywallDismissed(true); }}
              onSuccess={() => { setShowDesktopPaywall(false); setIsUnlocked(true); setPaywallDismissed(true); }}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Music toggle */}
      {!isPreview && (
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          onClick={toggleMute}
          style={{ position: "fixed", top: "max(14px, env(safe-area-inset-top, 14px))", right: 14, zIndex: 60, width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, lineHeight: 1 }}
          whileTap={{ scale: 0.88 }}
          aria-label={musicMuted ? "Unmute music" : "Mute music"}
        >
          {musicMuted ? "🔇" : "🎵"}
        </motion.button>
      )}

      {/* Back link */}
      <Link href="/send?ref=card">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
          style={{ position: "fixed", top: "max(14px, env(safe-area-inset-top, 14px))", left: 14, fontSize: 11, color: "rgba(255,255,255,0.14)", cursor: "pointer", zIndex: 60, padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.04)" }}>
          ← make your own
        </motion.div>
      </Link>
    </div>
  );
}
