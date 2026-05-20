import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { getCosmicTemplate, getCosmicFallback } from "@/lib/card-templates";
import { cosmic as cosmicAudio, music } from "@/lib/audio";
import { trackEvent } from "@/lib/trackEvent";
import ViralReplyCTA from "@/components/ViralReplyCTA";

const UnlockModal = lazy(() => import("@/components/UnlockModal"));
const WatermarkPaywallModal = lazy(() => import("@/components/WatermarkPaywallModal"));

/* ─────────────────────────── types ──────────────────────────────────────── */

type Phase = "hook" | "spawning" | "tapping" | "supernova" | "final";

interface QueueItem {
  type: "text" | "photo" | "audio";
  text?: string;
  emoji?: string;
  photoUrl?: string;
  audioUrl?: string;
}

interface ConstellationLine {
  key: string;
  x1: number; y1: number;
  x2: number; y2: number;
}

interface AmbientDot {
  x: number; y: number;
  vx: number; vy: number;
  r: number; opacity: number;
}

interface BurstDot {
  x: number; y: number;
  vx: number; vy: number;
  r: number; opacity: number; decay: number; hue: number;
}

interface DustDot {
  x: number; y: number;
  vx: number; vy: number;
  r: number; hue: number; life: number;
}

/* ─────────────────────────── constants ──────────────────────────────────── */

/* PRD-specified thumb-zone positions (normalized 0-1 within the 400px container) */
const THUMB_STARS = [
  { id: 0, leftPct: 0.14, topPct: 0.16 },
  { id: 1, leftPct: 0.86, topPct: 0.16 },
  { id: 2, leftPct: 0.14, topPct: 0.80 },
  { id: 3, leftPct: 0.86, topPct: 0.80 },
] as const;

const RING_R = 34;
const RING_CIRC = 2 * Math.PI * RING_R;

/* ─────────────────────────── helpers ────────────────────────────────────── */

function useQueryParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function buildSmartQueue(
  starTexts: Array<{ emoji: string; text: string }>,
  photoUrls: string[],
  voiceUrl: string | null,
): QueueItem[] {
  const photos = photoUrls.slice(0, 3);
  const mediaCount = photos.length + (voiceUrl ? 1 : 0);
  const paddingNeeded = Math.max(0, 4 - mediaCount);

  const textItems: QueueItem[] = starTexts
    .slice(0, paddingNeeded)
    .map(s => ({ type: "text" as const, text: s.text, emoji: s.emoji }));

  const photoItems: QueueItem[] = photos.map((url, i) => ({
    type: "photo" as const,
    photoUrl: url,
    text: starTexts[paddingNeeded + i]?.text,
    emoji: starTexts[paddingNeeded + i]?.emoji,
  }));

  const audioItem: QueueItem[] = voiceUrl
    ? [{ type: "audio" as const, audioUrl: voiceUrl }]
    : [];

  return [...textItems, ...photoItems, ...audioItem].slice(0, 4);
}

/* ─────────────────────────── AudioPlayer ────────────────────────────────── */

function AudioPlayer({ audioUrl }: { audioUrl: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch((err) => { console.warn("Audio play failed:", err); setIsPlaying(false); });
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () =>
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    const onEnded = () => { setIsPlaying(false); setProgress(0); };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const cx = 60, cy = 60, trackR = 44, circ = 2 * Math.PI * trackR;
  const barInner = 26, BARS = 24;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <p style={{ fontSize: 13, color: "rgba(200,180,255,0.75)", margin: 0, letterSpacing: "0.06em" }}>
        🎤 Voice note
      </p>
      <div
        style={{ position: "relative", width: 120, height: 120, cursor: "pointer" }}
        onClick={togglePlay}
      >
        {/* Expanding pulse rings (only while playing) */}
        {isPlaying && [0, 1, 2].map(i => (
          <div key={i} style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: "1.5px solid rgba(180,140,255,0.55)",
            animation: "ringPulse 1.8s ease-out infinite",
            animationDelay: `${i * 0.6}s`,
            pointerEvents: "none",
          }} />
        ))}

        <svg width={120} height={120} viewBox="0 0 120 120" style={{ position: "absolute", inset: 0 }}>
          {/* Track ring */}
          <circle cx={cx} cy={cy} r={trackR} fill="none" stroke="rgba(100,60,160,0.35)" strokeWidth={3.5} />

          {/* Progress arc */}
          {progress > 0 && (
            <circle
              cx={cx} cy={cy} r={trackR}
              fill="none" stroke="rgba(190,150,255,0.85)" strokeWidth={3.5}
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - progress)}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          )}

          {/* Circular waveform bars */}
          {Array.from({ length: BARS }, (_, i) => {
            const angle = (i / BARS) * Math.PI * 2 - Math.PI / 2;
            const barLen = isPlaying
              ? 6 + Math.abs(Math.sin(i * 1.3)) * 8
              : 3;
            const x1 = cx + barInner * Math.cos(angle);
            const y1 = cy + barInner * Math.sin(angle);
            const x2 = cx + (barInner + barLen) * Math.cos(angle);
            const y2 = cy + (barInner + barLen) * Math.sin(angle);
            return (
              <line key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={`rgba(170,130,255,${isPlaying ? 0.85 : 0.3})`}
                strokeWidth={2.2} strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Play/pause center button */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: 44, height: 44, borderRadius: "50%",
          background: "radial-gradient(circle at 38% 35%, rgba(130,70,230,0.95), rgba(60,20,140,0.95))",
          border: "1.5px solid rgba(200,160,255,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: isPlaying ? 15 : 17,
          boxShadow: isPlaying ? "0 0 22px rgba(160,100,255,0.65)" : "none",
          transition: "box-shadow 0.3s",
          userSelect: "none",
        }}>
          {isPlaying ? "⏸" : "▶"}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── SilverTypewriter ───────────────────────────── */

function SilverTypewriter({ text, emoji, variant = "silver" }: { text: string; emoji?: string; variant?: "silver" | "ink" }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const iv = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(iv);
      }
    }, 35);
    return () => clearInterval(iv);
  }, [text]);

  if (variant === "ink") {
    const inkSparkles = [
      { x: -14, y: 15, d: 1.4, delay: 0.0 }, { x: 112, y: 10, d: 1.7, delay: 0.5 },
      { x: -10, y: 60, d: 1.3, delay: 0.9 }, { x: 114, y: 65, d: 1.6, delay: 0.3 },
      { x: 25,  y: -14, d: 1.5, delay: 0.7 }, { x: 75,  y: 112, d: 1.4, delay: 0.2 },
      { x: 55,  y: -12, d: 1.6, delay: 1.0 }, { x: -12, y: 88,  d: 1.8, delay: 0.6 },
    ];
    return (
      <div style={{ position: "relative", width: "100%", textAlign: "center" }}>
        {inkSparkles.map((s, i) => (
          <span key={i} style={{
            position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
            fontSize: i % 2 === 0 ? "7px" : "5px",
            color: i % 3 === 0 ? "#ffd700" : i % 3 === 1 ? "#daa520" : "#fffbe6",
            animation: `sparkleGold ${s.d}s ease-in-out ${s.delay}s infinite`,
            opacity: 0, pointerEvents: "none",
          }}>✦</span>
        ))}
        <p style={{
          fontSize: 13, fontWeight: 500, lineHeight: 1.6,
          color: "#08031a", margin: 0, textAlign: "center",
          fontFamily: "'Palatino Linotype', Palatino, Georgia, serif",
          fontStyle: "italic", letterSpacing: "0.02em",
          minHeight: "2.8em", position: "relative", zIndex: 0,
        }}>
          {displayed}
          <span style={{ opacity: displayed.length < text.length ? 0.5 : 0, color: "#b8860b" }}>|</span>
        </p>
      </div>
    );
  }

  if (variant === "cosmic") {
    const cosmicSparkles = [
      { x: -16, y: 5,   d: 1.5, delay: 0.0 }, { x: 115, y: 10,  d: 1.8, delay: 0.4 },
      { x: -14, y: 40,  d: 1.3, delay: 0.8 }, { x: 113, y: 45,  d: 1.6, delay: 0.2 },
      { x: -12, y: 75,  d: 1.7, delay: 0.6 }, { x: 114, y: 80,  d: 1.4, delay: 1.0 },
      { x: 20,  y: -16, d: 1.4, delay: 0.3 }, { x: 60,  y: -14, d: 1.9, delay: 0.9 },
      { x: 80,  y: -12, d: 1.3, delay: 0.1 }, { x: 10,  y: 110, d: 1.6, delay: 0.7 },
      { x: 50,  y: 112, d: 1.5, delay: 0.5 }, { x: 88,  y: 108, d: 1.8, delay: 1.1 },
    ];
    return (
      <div style={{ textAlign: "center" }}>
        {emoji && <div style={{ fontSize: 54, marginBottom: 18, lineHeight: 1 }}>{emoji}</div>}
        <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
          {cosmicSparkles.map((s, i) => (
            <span key={i} style={{
              position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
              fontSize: i % 3 === 0 ? "9px" : i % 3 === 1 ? "7px" : "6px",
              color: i % 3 === 0 ? "#ffd700" : i % 3 === 1 ? "#fffbe6" : "#daa520",
              animation: `sparkleGold ${s.d}s ease-in-out ${s.delay}s infinite`,
              opacity: 0, pointerEvents: "none",
            }}>✦</span>
          ))}
          <p style={{
            fontSize: "clamp(15px, 4.2vw, 17px)",
            fontWeight: 700,
            lineHeight: 1.7,
            minHeight: "4.5em",
            margin: 0,
            background: "linear-gradient(90deg, #b8860b 0%, #ffd700 22%, #fffbe6 50%, #ffd700 78%, #b8860b 100%)",
            backgroundSize: "300% auto",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "goldShimmer 2.5s linear infinite",
            filter: "drop-shadow(0 0 6px rgba(255,200,50,0.55))",
          } as React.CSSProperties}>
            {displayed}
            <span style={{ opacity: displayed.length < text.length ? 0.6 : 0, WebkitTextFillColor: "rgba(255,200,80,0.7)" as any }}>▌</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      {emoji && (
        <div style={{ fontSize: 54, marginBottom: 18, lineHeight: 1 }}>{emoji}</div>
      )}
      <p style={{
        fontSize: "clamp(15px, 4.2vw, 17px)",
        fontWeight: 600,
        lineHeight: 1.7,
        minHeight: "4.5em",
        margin: 0,
        background: "linear-gradient(90deg, rgba(170,150,255,0.7) 0%, rgba(255,255,255,1) 22%, rgba(210,190,255,0.85) 45%, rgba(150,120,255,0.9) 65%, rgba(255,255,255,1) 82%, rgba(170,150,255,0.7) 100%)",
        backgroundSize: "200% auto",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        animation: "silverShine 2.5s linear infinite",
      } as React.CSSProperties}>
        {displayed}
        <span style={{ opacity: displayed.length < text.length ? 0.6 : 0, WebkitTextFillColor: "rgba(200,180,255,0.6)" as any }}>▌</span>
      </p>
    </div>
  );
}

/* ─────────────────────────── CosmicCard ────────────────────────────────── */

export default function CosmicCard() {
  const params = useQueryParams();
  const recipientName = params.get("to") || "Friend";
  const occasion = params.get("occasion") || "birthday";
  const relation = params.get("relation") || "friend";
  const customMsg = (() => {
    const m = params.get("msg");
    if (!m) return null;
    try { return decodeURIComponent(escape(atob(m))); } catch { return null; }
  })();
  const isSender = params.get("sender") === "1";
  const isPreview = params.get("preview") === "1";
  const isRecipient = !isSender && !isPreview;

  /* Parse multi-photo URLs — supports "photos" (multi) or legacy "personalpicture" */
  const photoUrls = (() => {
    const raw = params.get("photos");
    if (raw) {
      return raw.split(",")
        .map(s => { try { return decodeURIComponent(s); } catch { return s; } })
        .filter(Boolean);
    }
    const single = params.get("personalpicture");
    if (single) {
      try { return [decodeURIComponent(single)]; } catch { return [single]; }
    }
    return [] as string[];
  })();

  /* Parse voice note URL */
  const voiceUrl = (() => {
    const raw = params.get("voicenote");
    if (!raw) return null;
    try { return decodeURIComponent(raw); } catch { return raw; }
  })();

  const tpl = getCosmicTemplate(occasion, relation) ?? getCosmicFallback(occasion);
  const finalMessage = customMsg ?? tpl.final_message;

  /* Build smart queue once from URL params (stable) */
  const smartQueue = useRef<QueueItem[]>(
    buildSmartQueue(tpl.stars.slice(0, 4), photoUrls, voiceUrl)
  ).current;

  /* ── state ── */
  const [phase, setPhase] = useState<Phase>(isPreview ? "final" : "hook");
  const [clickedStarIds, setClickedStarIds] = useState<number[]>([]);
  const [lines, setLines] = useState<ConstellationLine[]>([]);
  const [activeMemory, setActiveMemory] = useState<QueueItem | null>(null);
  const [memoriesShownCount, setMemoriesShownCount] = useState(0);
  const [showFinaleCTA, setShowFinaleCTA] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [senderCopied, setSenderCopied] = useState(false);
  const [senderIgCopied, setSenderIgCopied] = useState(false);

  /* Premium unlock */
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showDesktopPaywall, setShowDesktopPaywall] = useState(false);
  const localCardId = useRef(`hs${Math.random().toString(36).slice(2, 9)}`).current;

  const buildShareUrl = (cardId?: string) => {
    if (typeof window === "undefined") return "";
    const p = new URLSearchParams(window.location.search);
    p.delete("sender");
    p.set("t", "cosmic");
    if (cardId) p.set("id", cardId);
    return window.location.origin + "/api/share?" + p.toString();
  };
  const [senderShareUrl] = useState(() => buildShareUrl(localCardId));

  /* ── refs ── */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ambientRef = useRef<AmbientDot[]>([]);
  const burstRef = useRef<BurstDot[]>([]);
  const dustRef = useRef<DustDot[]>([]);
  const canvasModeRef = useRef<"ambient" | "golden">("ambient");
  const rafRef = useRef<number>(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);
  const queueIndexRef = useRef(0);

  /* ── tracking ── */
  useEffect(() => {
    if (isRecipient) {
      const cardId = params.get("id") ?? undefined;
      trackEvent({ event: "card_viewed", occasion, template: "cosmic", recipient_name: recipientName, card_id: cardId });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── background music ── */
  useEffect(() => {
    music.start("cosmic", occasion);
    return () => { music.stop(); };
  }, []);

  /* ── canvas setup ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    onResize();
    window.addEventListener("resize", onResize);
    ambientRef.current = Array.from({ length: 200 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 2.2 + 0.5,
      opacity: Math.random() * 0.72 + 0.25,
    }));
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ── clear pre-React splash ── */
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__clearHsSplash) {
      (window as any).__clearHsSplash();
    }
  }, []);

  /* ── canvas draw loop ── */
  const drawLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    /* ambient drifting stars */
    for (const d of ambientRef.current) {
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${d.opacity})`;
      ctx.fill();
    }

    /* burst particles */
    for (let i = burstRef.current.length - 1; i >= 0; i--) {
      const b = burstRef.current[i];
      b.x += b.vx; b.y += b.vy; b.vy += 0.06;
      b.opacity -= b.decay;
      if (b.opacity <= 0) { burstRef.current.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${b.hue},90%,65%,${b.opacity})`;
      ctx.fill();
    }

    /* golden falling dust (phase 4) */
    if (canvasModeRef.current === "golden") {
      for (let i = 0; i < 5; i++) {
        dustRef.current.push({
          x: Math.random() * W, y: -8,
          vx: (Math.random() - 0.5) * 0.5, vy: Math.random() * 1.2 + 0.5,
          r: Math.random() * 2 + 0.5,
          hue: 38 + Math.random() * 20,
          life: 1,
        });
      }
      if (dustRef.current.length > 500) dustRef.current.splice(0, dustRef.current.length - 500);
      for (let i = dustRef.current.length - 1; i >= 0; i--) {
        const d = dustRef.current[i];
        d.x += d.vx; d.y += d.vy;
        d.life = Math.max(0, 1 - d.y / H);
        if (d.y > H + 10) { dustRef.current.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${d.hue},85%,62%,${d.life * 0.75})`;
        ctx.fill();
      }
    }

    rafRef.current = requestAnimationFrame(drawLoop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawLoop]);

  /* ── press & hold ── */
  function startHold(e: React.PointerEvent) {
    e.preventDefault();
    if (phase !== "hook") return;
    cosmicAudio.holdPulse();
    holdStartRef.current = Date.now();
    holdTimerRef.current = setInterval(() => {
      const p = Math.min((Date.now() - holdStartRef.current) / 1500, 1);
      setHoldProgress(p);
      if (p >= 1) { releaseHold(); launchStarMap(); }
    }, 16);
  }

  function releaseHold() {
    if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
    setHoldProgress(0);
  }

  function launchStarMap() {
    cosmicAudio.launch();
    setPhase("spawning");
    setTimeout(() => setPhase("tapping"), 900);
  }

  /* ── star tap → memory reveal ── */
  function handleStarClick(starId: number) {
    if (phase !== "tapping") return;
    if (clickedStarIds.includes(starId)) return;

    const star = THUMB_STARS[starId];
    cosmicAudio.starClick(clickedStarIds.length);
    trackEvent({ event: "memory_unlocked", template: "cosmic", index: clickedStarIds.length });

    /* Burst particles — compute screen-space pixel position from container */
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const px = rect.left + star.leftPct * rect.width;
      const py = rect.top + star.topPct * rect.height;

      burstRef.current.push(
        ...Array.from({ length: 32 }, () => {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 4.5 + 1.5;
          return {
            x: px, y: py,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r: Math.random() * 2.5 + 0.8,
            opacity: 0.95,
            decay: 0.02 + Math.random() * 0.02,
            hue: 38 + Math.random() * 22,
          } as BurstDot;
        })
      );

      const newClickedIds = [...clickedStarIds, starId];
      setClickedStarIds(newClickedIds);
    } else {
      setClickedStarIds(prev => [...prev, starId]);
    }

    /* Pop next item from smart queue */
    const item = smartQueue[queueIndexRef.current] ?? null;
    queueIndexRef.current += 1;
    setActiveMemory(item);

    /* After all 4 stars are tapped, go straight to supernova */
    if (clickedStarIds.length + 1 >= 4) {
      setTimeout(() => {
        setActiveMemory(null);
        triggerSupernova();
      }, 2500);
    }
  }

  /* ── dismiss memory modal ── */
  function dismissMemory() {
    setActiveMemory(null);
    const newCount = memoriesShownCount + 1;
    setMemoriesShownCount(newCount);
    if (newCount >= 4) {
      setShowFinaleCTA(true);
    }
  }

  /* ── finale CTA → supernova ── */
  function handleFinaleCTA() {
    trackEvent({ event: "finale_revealed", template: "cosmic" });
    setShowFinaleCTA(false);
    triggerSupernova();
  }

  /* ── supernova sequence ── */
  function triggerSupernova() {
    cosmicAudio.supernova();
    setShowFlash(true);
    setTimeout(() => { canvasModeRef.current = "golden"; setPhase("supernova"); }, 500);
    setTimeout(() => { setShowFlash(false); setPhase("final"); }, 1100);
  }

  /* ── sender share ── */
  function shareSenderWhatsApp() {
    cosmicAudio.copy();
    trackEvent({ event: "card_shared", channel: "whatsapp", occasion, template: "cosmic" });
    const text = `💌 Hey ${recipientName}, I made you something special!\n\nYour surprise is waiting 👇\n${senderShareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
  async function copySenderLinkForInstagram() {
    cosmicAudio.copy();
    trackEvent({ event: "card_shared", channel: "instagram", occasion, template: "cosmic" });
    try { await navigator.clipboard.writeText(senderShareUrl); setSenderIgCopied(true); setTimeout(() => setSenderIgCopied(false), 2500); } catch {}
  }
  async function copySenderLink() {
    cosmicAudio.copy();
    trackEvent({ event: "card_shared", channel: "link", occasion, template: "cosmic" });
    try { await navigator.clipboard.writeText(senderShareUrl); setSenderCopied(true); setTimeout(() => setSenderCopied(false), 2500); } catch {}
  }

  const showStarMap = (phase === "spawning" || phase === "tapping") && !showFlash;

  /* ─────────────────────────── render ────────────────────────────────────── */
  return (
    <div style={{
      position: "fixed", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 50% 50%, #0e0520 0%, #050112 60%, #020108 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      userSelect: "none", WebkitUserSelect: "none",
    } as React.CSSProperties}>

      {/* ── CSS keyframes ── */}
      <style>{`
        @keyframes silverShine {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes goldShimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes sparkleGold {
          0%, 100% { opacity: 0;   transform: scale(0.4) rotate(0deg);   }
          40%       { opacity: 1;   transform: scale(1.4) rotate(18deg);  }
          65%       { opacity: 0.7; transform: scale(1.1) rotate(-12deg); }
        }
        @keyframes ringPulse {
          0%   { transform: scale(0.75); opacity: 0.75; }
          100% { transform: scale(1.65); opacity: 0; }
        }
        @keyframes starPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.85; }
          50%       { transform: translate(-50%, -50%) scale(1.25); opacity: 1; }
        }
        @keyframes finaleGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.45), 0 0 50px rgba(255,165,0,0.25); }
          50%       { box-shadow: 0 0 35px rgba(255,215,0,0.9),  0 0 80px rgba(255,165,0,0.55); }
        }
        @keyframes nebulaBreath {
          0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: 0.75; transform: translate(-50%, -50%) scale(1.08); }
        }
      `}</style>

      {/* ── Full-screen background canvas ── */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />

      {/* ── max-w-400 centered container (mobile-first) ── */}
      <div style={{
        position: "fixed", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center",
        zIndex: 10,
      }}>
        <div
          ref={containerRef}
          style={{
            width: "100%", maxWidth: 400,
            height: "100%",
            position: "relative",
          }}
        >

          {/* ══ PHASE 1: Hook ══ */}
          <AnimatePresence>
            {phase === "hook" && (
              <motion.div key="hook"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.7 } }}
                style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                {/* Nebula glow */}
                <div style={{
                  position: "absolute", top: "35%", left: "50%",
                  width: "min(300px, 78vw)", height: "min(300px, 78vw)",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(90,20,160,0.55) 0%, rgba(40,10,80,0.3) 45%, transparent 70%)",
                  filter: "blur(52px)", pointerEvents: "none",
                  animation: "nebulaBreath 4s ease-in-out infinite",
                }} />

                {/* Hook title */}
                <motion.div
                  initial={{ opacity: 0, y: -18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.9 }}
                  style={{ marginTop: "max(52px, 11vh)", textAlign: "center", padding: "0 28px", zIndex: 2 }}
                >
                  <h1 style={{
                    fontSize: "clamp(19px, 5.4vw, 22px)",
                    fontWeight: 700, color: "#FFD700",
                    letterSpacing: "0.04em", marginBottom: 10, lineHeight: 1.35,
                  }}>
                    {tpl.hook_title}
                  </h1>
                  <p style={{ fontSize: "clamp(12px, 3.5vw, 14px)", color: "rgba(200,175,255,0.6)", letterSpacing: "0.07em" }}>
                    A stellar surprise awaits…
                  </p>
                </motion.div>

                {/* Press & hold energy core */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.75 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                  style={{
                    position: "absolute", bottom: "max(64px, 13vh)",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 14, zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      position: "relative", width: 84, height: 84, cursor: "pointer",
                      touchAction: "none", userSelect: "none",
                      WebkitUserSelect: "none", WebkitTouchCallout: "none",
                    } as React.CSSProperties}
                    onPointerDown={startHold}
                    onPointerUp={releaseHold}
                    onPointerLeave={releaseHold}
                    onPointerCancel={releaseHold}
                    onContextMenu={e => e.preventDefault()}
                  >
                    {/* Charging ring */}
                    <svg width={84} height={84} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
                      <circle cx={42} cy={42} r={RING_R} fill="none" stroke="rgba(150,100,255,0.14)" strokeWidth={3.5} />
                      <circle cx={42} cy={42} r={RING_R}
                        fill="none" stroke="rgba(255,215,0,0.92)" strokeWidth={3.5}
                        strokeDasharray={RING_CIRC}
                        strokeDashoffset={RING_CIRC * (1 - holdProgress)}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset 0.05s linear", filter: "drop-shadow(0 0 6px rgba(255,215,0,0.85))" }}
                      />
                    </svg>
                    {/* Core orb */}
                    <motion.div
                      animate={{
                        scale: [1, 1.12, 1],
                        boxShadow: ["0 0 18px rgba(120,60,255,0.55)", "0 0 32px rgba(160,100,255,0.85)", "0 0 18px rgba(120,60,255,0.55)"],
                      }}
                      transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
                      style={{
                        position: "absolute", inset: 12, borderRadius: "50%",
                        background: `radial-gradient(circle at 38% 35%, hsl(260,70%,${55 + holdProgress * 30}%), hsl(270,90%,${28 + holdProgress * 15}%))`,
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(240,225,255,0.78)", letterSpacing: "0.12em", fontWeight: 600 }}>
                    PRESS &amp; HOLD TO IGNITE
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══ PHASES 2+3: Star map ══ */}
          <AnimatePresence>
            {showStarMap && (
              <motion.div key="starmap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.5 } }}
                style={{ position: "absolute", inset: 0 }}
              >
                {/* Discover counter */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{
                    position: "absolute",
                    top: "max(18px, env(safe-area-inset-top, 18px))",
                    left: 0, right: 0,
                    display: "flex", justifyContent: "center", padding: "0 20px",
                    zIndex: 5, pointerEvents: "none",
                  }}
                >
                  <span style={{
                    display: "inline-block",
                    fontSize: 13, color: "rgba(220,200,255,0.9)",
                    letterSpacing: "0.06em", fontWeight: 600,
                    background: "rgba(30,12,65,0.8)", borderRadius: 999, padding: "8px 22px",
                    border: "1px solid rgba(180,150,255,0.25)",
                    backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                    whiteSpace: "nowrap",
                  }}>
                    Discover ({clickedStarIds.length} / 4)
                  </span>
                </motion.div>

                {/* Fixed thumb-zone stars */}
                {THUMB_STARS.map(star => {
                  const clicked = clickedStarIds.includes(star.id);
                  const canTap = phase === "tapping" && !clicked;
                  return (
                    <motion.div
                      key={star.id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={clicked
                        ? { opacity: 0, scale: 0, transition: { duration: 0.25 } }
                        : { opacity: 1, scale: 1, transition: { delay: star.id * 0.14, duration: 0.5, type: "spring", bounce: 0.48 } }
                      }
                      style={{
                        position: "absolute",
                        left: `${star.leftPct * 100}%`,
                        top: `${star.topPct * 100}%`,
                        transform: "translate(-50%, -50%)",
                        zIndex: 4,
                        cursor: canTap ? "pointer" : "default",
                        pointerEvents: canTap ? "auto" : "none",
                      }}
                      onClick={() => handleStarClick(star.id)}
                    >
                      <motion.div
                        animate={!clicked ? {
                          scale: [1, 1.24, 1],
                          opacity: [0.82, 1, 0.82],
                        } : {}}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: star.id * 0.32 }}
                        style={{
                          width: 40, height: 40, borderRadius: "50%",
                          background: "radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(210,170,255,0.45) 55%, transparent 100%)",
                          boxShadow: "0 0 10px rgba(255,255,255,0.65), 0 0 24px rgba(200,160,255,0.45)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 18,
                        }}
                      >
                        ✦
                      </motion.div>
                    </motion.div>
                  );
                })}

              </motion.div>
            )}
          </AnimatePresence>

          {/* ══ Reveal Finale CTA — removed ══ */}
          <AnimatePresence>
            {false && !showFlash && (
              <motion.div
                key="finale-cta"
                style={{ display: "none" }}
              >
                {/* Golden nebula glow */}
                <div style={{
                  position: "absolute", top: "50%", left: "50%",
                  width: 280, height: 280, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255,215,0,0.14) 0%, transparent 70%)",
                  filter: "blur(28px)", pointerEvents: "none",
                  transform: "translate(-50%, -50%)",
                }} />

                <p style={{
                  fontSize: 12, color: "rgba(255,215,0,0.65)",
                  letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600,
                  position: "relative", zIndex: 1,
                }}>
                  All stars discovered ✦
                </p>

                <motion.button
                  onClick={handleFinaleCTA}
                  whileTap={{ scale: 0.94 }}
                  style={{
                    padding: "18px 40px", borderRadius: 50,
                    background: "linear-gradient(135deg, #FFD700 0%, #FFAB00 55%, #FF8C00 100%)",
                    color: "#1a0800", fontWeight: 800, fontSize: 18,
                    border: "none", cursor: "pointer",
                    letterSpacing: "0.04em",
                    animation: "finaleGlow 2s ease-in-out infinite",
                    position: "relative", zIndex: 1,
                  }}
                >
                  Reveal Finale ✨
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══ Final card ══ */}
          <AnimatePresence>
            {phase === "final" && (
              <motion.div key="final"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "20px", overflowY: "auto",
                }}
              >
                {/* Final message — no card, text directly on the golden starfield */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  style={{ fontSize: 11, color: "rgba(210,190,255,0.82)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8, textAlign: "center" }}
                >
                  {tpl.title_prefix}
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                  style={{ fontSize: "clamp(28px, 8.5vw, 34px)", fontWeight: 800, color: "#FFD700", marginBottom: 22, letterSpacing: "0.02em", textAlign: "center" }}
                >
                  {recipientName}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                  style={{ fontSize: "clamp(14px, 3.9vw, 15px)", color: "rgba(238,228,255,0.96)", lineHeight: 1.72, margin: 0, textAlign: "center" }}
                >
                  {finalMessage}
                </motion.p>

                <motion.div
                  animate={{ opacity: [0.35, 0.75, 0.35] }}
                  transition={{ duration: 2.8, repeat: Infinity }}
                  style={{ marginTop: 26, fontSize: 15, color: "rgba(255,215,0,0.45)", letterSpacing: "0.35em", textAlign: "center" }}
                >
                  ✦ ✦ ✦
                </motion.div>

                {/* Sender share panel */}
                {isSender && (
                  isUnlocked ? (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                      style={{ width: "100%", marginTop: 20 }}
                    >
                      <p style={{ fontSize: 12, color: "rgba(190,170,255,0.4)", textAlign: "center", marginBottom: 12, letterSpacing: "0.06em" }}>
                        ✦ Share this card
                      </p>
                      <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                        <button onClick={shareSenderWhatsApp} style={{
                          flex: 1, padding: "12px 8px", borderRadius: 12,
                          background: "rgba(37,211,102,0.1)", border: "1.5px solid rgba(37,211,102,0.28)",
                          color: "rgba(37,211,102,0.9)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                        }}>💬 WhatsApp</button>
                        <button onClick={copySenderLinkForInstagram} style={{
                          flex: 1, padding: "12px 8px", borderRadius: 12,
                          background: "rgba(200,100,200,0.1)", border: "1.5px solid rgba(200,100,200,0.28)",
                          color: "rgba(220,140,255,0.9)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                        }}>{senderIgCopied ? "✅ Copied!" : "📸 Instagram"}</button>
                      </div>
                      <button onClick={copySenderLink} style={{
                        width: "100%", padding: "11px", borderRadius: 12,
                        background: "rgba(255,215,0,0.07)", border: "1.5px solid rgba(255,215,0,0.18)",
                        color: "rgba(255,215,0,0.7)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}>{senderCopied ? "✅ Link Copied!" : "🔗 Copy Link"}</button>
                      <div style={{ textAlign: "center", marginTop: 14 }}>
                        <Link href="/send">
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", cursor: "pointer" }}>
                            Make another card
                          </span>
                        </Link>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                      style={{ width: "100%", marginTop: 22 }}
                    >
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;
                          if (isMobile) setShowUnlockModal(true);
                          else setShowDesktopPaywall(true);
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
                        🔓 Unlock &amp; Share the card
                      </motion.button>
                      <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 10 }}>
                        ₹99 one-time · No sign-in required
                      </p>
                    </motion.div>
                  )
                )}

                {/* Recipient viral CTA */}
                {isRecipient && (
                  <div style={{ marginTop: 16, width: "100%" }}>
                    <ViralReplyCTA template="cosmic" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>{/* /inner 400px container */}
      </div>{/* /outer centering wrapper */}

      {/* ══ Memory modal — full-screen glassmorphism overlay ══ */}
      <AnimatePresence>
        {activeMemory && (
          <motion.div
            key="memory-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{
              position: "absolute", inset: 0, zIndex: 40,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "20px",
              pointerEvents: "none",
            }}
          >
            {/* Memory text — no box, rendered directly on the starfield */}
            <motion.div
              key={`mem-${clickedStarIds.length}`}
              initial={{ opacity: 0, scale: 0.84, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: -10 }}
              transition={{ duration: 0.35, type: "spring", bounce: 0.28 }}
              style={{
                width: "100%", maxWidth: 320,
                padding: "0 24px",
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              {/* Memory number indicator */}
              <p style={{
                fontSize: 10, color: "rgba(180,150,255,0.45)",
                letterSpacing: "0.14em", textTransform: "uppercase",
                marginBottom: 18, marginTop: 0,
              }}>
                Memory {clickedStarIds.length} of 4
              </p>

              {activeMemory.type === "text" && (
                <SilverTypewriter text={activeMemory.text ?? ""} emoji={activeMemory.emoji} variant="cosmic" />
              )}

              {activeMemory.type === "photo" && activeMemory.photoUrl && (
                <div style={{
                  display: "inline-block",
                  background: "#fff",
                  padding: "8px 8px 0 8px",
                  borderRadius: 2,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.55), 0 2px 10px rgba(0,0,0,0.35)",
                  maxWidth: 210,
                }}>
                  <div style={{
                    width: 194, height: 180,
                    overflow: "hidden",
                    background: "#111",
                  }}>
                    <img
                      src={activeMemory.photoUrl}
                      alt="Memory"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      draggable={false}
                    />
                  </div>
                  <div style={{
                    padding: "10px 8px 14px",
                    minHeight: 54,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "#fff",
                  }}>
                    {activeMemory.text && (
                      <SilverTypewriter text={activeMemory.text} variant="ink" />
                    )}
                  </div>
                </div>
              )}

              {activeMemory.type === "audio" && activeMemory.audioUrl && (
                <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <p style={{
                    margin: 0, fontSize: 15, fontWeight: 600,
                    letterSpacing: "0.08em",
                    color: "rgba(220,200,255,0.92)",
                  }}>
                    🎙 Listen to this:
                  </p>
                  <AudioPlayer audioUrl={activeMemory.audioUrl} />
                </div>
              )}

              {/* Hint to tap another star */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0.3, 0.5] }}
                transition={{ delay: 1.2, duration: 2.4, repeat: Infinity }}
                style={{
                  marginTop: 18, marginBottom: 0, fontSize: 11,
                  color: "rgba(180,150,255,0.45)",
                  letterSpacing: "0.08em",
                }}
              >
                tap another star ✦
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Supernova white-out flash ══ */}
      <AnimatePresence>
        {showFlash && (
          <motion.div key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.1, times: [0, 0.28, 0.6, 1], ease: "easeInOut" }}
            style={{ position: "fixed", inset: 0, background: "white", zIndex: 50, pointerEvents: "none" }}
          />
        )}
      </AnimatePresence>

      {/* Back link */}
      <Link href="/send?ref=card">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          style={{
            position: "fixed", top: 16, left: 16, fontSize: 12,
            color: "rgba(255,255,255,0.18)", cursor: "pointer", zIndex: 60,
            padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.04)",
          }}
        >
          ← make your own
        </motion.div>
      </Link>

      {/* ── Payment modals ── */}
      <AnimatePresence>
        {showUnlockModal && (
          <Suspense fallback={null}>
            <UnlockModal
              cardId={localCardId}
              recipientName={recipientName}
              occasion={occasion}
              senderShareUrl={senderShareUrl}
              onClose={() => setShowUnlockModal(false)}
              onSuccess={() => { setIsUnlocked(true); setShowUnlockModal(false); }}
            />
          </Suspense>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDesktopPaywall && (
          <Suspense fallback={null}>
            <WatermarkPaywallModal
              mode="photo"
              cardId={localCardId}
              onClose={() => setShowDesktopPaywall(false)}
              onSuccess={() => { setShowDesktopPaywall(false); setIsUnlocked(true); }}
            />
          </Suspense>
        )}
      </AnimatePresence>

    </div>
  );
}
