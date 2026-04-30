import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  getVinylTemplate, getVinylFallback,
} from "@/lib/card-templates";
import { vinyl, music } from "@/lib/audio";
import { trackEvent } from "@/lib/trackEvent";
import WatermarkBadge from "@/components/WatermarkBadge";

/* ─────────────────────────── types ──────────────────────────── */

type VinylPhase = "hook" | "dropping" | "playing" | "sleeve";

interface EQRing { r: number; opacity: number; intensity: number; }
interface BurstDot { x: number; y: number; vx: number; vy: number; r: number; opacity: number; decay: number; hue: number; }
interface DustDot { x: number; y: number; vx: number; vy: number; r: number; opacity: number; hue: number; }

/* ─────────────────────────── helpers ────────────────────────── */

function useQueryParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

const NOTE_CHARS = ["🎸", "🎹", "🎺", "🎻"];

/* ─────────────────────────── VinylRecord ────────────────────── */

function VinylRecord({ spinning, hyperSpin = false, size = 220 }: { spinning: boolean; hyperSpin?: boolean; size?: number }) {
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <div style={{
        position: "absolute", inset: -8, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(184,118,42,0.15) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <motion.div
        animate={{ rotate: spinning ? 360 : 0 }}
        transition={spinning
          ? { duration: hyperSpin ? 0.3 : 2.8, repeat: Infinity, ease: "linear" }
          : { duration: 0.6, ease: "easeOut" }}
        style={{
          width: size, height: size, borderRadius: "50%",
          background: "radial-gradient(circle at 50% 50%, #2A2018 0%, #1A1410 35%, #120E0A 55%, #0D0A07 75%, #1A1410 88%, #2A2018 100%)",
          position: "relative",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.04)",
          overflow: "hidden",
        }}
      >
        {[0.32, 0.44, 0.56, 0.68, 0.78, 0.88].map((r, i) => (
          <div key={i} style={{
            position: "absolute",
            top: `${50 - r * 50}%`, left: `${50 - r * 50}%`,
            right: `${50 - r * 50}%`, bottom: `${50 - r * 50}%`,
            borderRadius: "50%", border: "1px solid rgba(255,255,255,0.04)",
            pointerEvents: "none",
          }} />
        ))}
        <div style={{
          position: "absolute", top: "9%", left: "20%",
          width: "26%", height: "12%", borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(255,255,255,0.07) 0%, transparent 100%)",
          transform: "rotate(-30deg)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: size * 0.27, height: size * 0.27, borderRadius: "50%",
          background: "radial-gradient(circle at 38% 32%, #D4924A 0%, #B8762A 45%, #8A5515 80%, #6B3F0D 100%)",
          boxShadow: "inset 0 1px 4px rgba(255,200,100,0.22), inset 0 -1px 3px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: size * 0.06, height: size * 0.06, borderRadius: "50%",
            background: "#1A1410", boxShadow: "0 1px 3px rgba(0,0,0,0.8)",
          }} />
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────── Tonearm ────────────────────────── */

function Tonearm({ down }: { down: boolean }) {
  return (
    <motion.svg
      width={90} height={110}
      viewBox="0 0 90 110"
      style={{
        position: "absolute", top: -18, right: -12, zIndex: 4,
        transformOrigin: "72px 18px",
      }}
      animate={{ rotate: down ? 22 : 0 }}
      transition={{ duration: 0.75, ease: "easeInOut" }}
    >
      <circle cx={72} cy={18} r={7} fill="#C8832E" stroke="#A06010" strokeWidth={1.5} />
      <circle cx={72} cy={18} r={3.5} fill="#8A5515" />
      <path
        d="M 70 22 Q 52 55, 28 90 L 22 98 L 18 94 L 24 86 Q 48 51 66 18"
        fill="none" stroke="url(#armGrad)" strokeWidth={4} strokeLinecap="round"
      />
      <rect x={14} y={90} width={16} height={7} rx={2} fill="#B8762A" stroke="#8A5515" strokeWidth={1} />
      <line x1={20} y1={97} x2={20} y2={104} stroke="#4A3C31" strokeWidth={1.5} strokeLinecap="round" />
      <defs>
        <linearGradient id="armGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#D4924A" />
          <stop offset="50%" stopColor="#C8832E" />
          <stop offset="100%" stopColor="#A06010" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

/* ─────────────────────────── VinylCard ─────────────────────── */

export default function VinylCard() {
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

  const tpl = getVinylTemplate(occasion, relation) ?? getVinylFallback(occasion);
  const titlePrefix = tpl.title_prefix;
  const finalMessage = customMsg ?? tpl.final_message;

  /* Share URL — /api/share generates a personalised og:image for WhatsApp,
     then JS-redirects recipients to /vinyl.html */
  const senderShareUrl = (() => {
    if (typeof window === "undefined") return "";
    const p = new URLSearchParams(window.location.search);
    p.delete("sender");
    p.set("t", "vinyl");
    return window.location.origin + "/api/share?" + p.toString();
  })();

  /* ── state ── */
  const [phase, setPhase] = useState<VinylPhase>(isPreview ? "sleeve" : "hook");
  const [spinning, setSpinning] = useState(false);
  const [hyperSpin, setHyperSpin] = useState(false);
  const [tonearmDown, setTonearmDown] = useState(false);
  const [tappedNotes, setTappedNotes] = useState<number[]>([]);
  const [tooltip, setTooltip] = useState<{ emoji: string; text: string } | null>(null);
  const [eqIntensity, setEqIntensity] = useState(1);
  const [playerExiting, setPlayerExiting] = useState(false);
  const [sleeveVisible, setSleeveVisible] = useState(isPreview);
  const [sleeveReady, setSleeveReady] = useState(false);
  const [senderCopied, setSenderCopied] = useState(false);
  const [senderIgCopied, setSenderIgCopied] = useState(false);
  const [recipCopied, setRecipCopied] = useState(false);

  /* ── canvas ── */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eqRingsRef = useRef<EQRing[]>([]);
  const burstRef = useRef<BurstDot[]>([]);
  const dustRef = useRef<DustDot[]>([]);
  const canvasModeRef = useRef<"ambient" | "golden">("ambient");
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<VinylPhase>(isPreview ? "sleeve" : "hook");
  const eqIntensityRef = useRef(1);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eqRingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── background music ── */
  useEffect(() => {
    if (!isSender && !isPreview) {
      const cardId = params.get("cid") ?? undefined;
      trackEvent({ event: "card_viewed", occasion, template: "vinyl", recipient_name: recipientName, card_id: cardId });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    music.start("vinyl", occasion);
    return () => { music.stop(); };
  }, []);

  /* ── sync refs ── */
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { eqIntensityRef.current = eqIntensity; }, [eqIntensity]);

  /* ── sleeve ready when phase hits sleeve ── */
  useEffect(() => {
    if (phase !== "sleeve") return;
    const t = setTimeout(() => setSleeveReady(true), 700);
    return () => clearTimeout(t);
  }, [phase]);

  /* ── clear native splash ── */
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__clearHsSplash) {
      (window as any).__clearHsSplash();
    }
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
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ── EQ ring spawner ── */
  useEffect(() => {
    if (phase !== "playing") {
      if (eqRingTimerRef.current) { clearInterval(eqRingTimerRef.current); eqRingTimerRef.current = null; }
      return;
    }
    eqRingTimerRef.current = setInterval(() => {
      const intensity = eqIntensityRef.current;
      for (let i = 0; i < intensity; i++) {
        eqRingsRef.current.push({ r: 50 + i * 12, opacity: 0.7, intensity });
      }
    }, 480);
    return () => {
      if (eqRingTimerRef.current) clearInterval(eqRingTimerRef.current);
    };
  }, [phase]);

  /* ── canvas draw loop ── */
  const drawLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    /* EQ rings radiating from record center */
    const cx = W / 2, cy = H * 0.42;
    for (let i = eqRingsRef.current.length - 1; i >= 0; i--) {
      const ring = eqRingsRef.current[i];
      ring.r += 2.2;
      ring.opacity -= 0.012;
      if (ring.opacity <= 0 || ring.r > 220) { eqRingsRef.current.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(184, 118, 42, ${ring.opacity})`;
      ctx.lineWidth = 1.5 + ring.intensity * 0.4;
      ctx.stroke();
    }

    /* burst particles from note taps */
    for (let i = burstRef.current.length - 1; i >= 0; i--) {
      const b = burstRef.current[i];
      b.x += b.vx; b.y += b.vy; b.vy += 0.05;
      b.opacity -= b.decay;
      if (b.opacity <= 0) { burstRef.current.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${b.hue}, 75%, 58%, ${b.opacity})`;
      ctx.fill();
    }

    /* golden falling dust on sleeve phase */
    if (canvasModeRef.current === "golden") {
      for (let i = 0; i < 6; i++) {
        dustRef.current.push({
          x: Math.random() * W, y: -8,
          vx: (Math.random() - 0.5) * 0.6, vy: 0.8 + Math.random() * 1.4,
          r: 1 + Math.random() * 2, opacity: 0.6 + Math.random() * 0.35,
          hue: 28 + Math.random() * 22,
        });
      }
      if (dustRef.current.length > 400) dustRef.current.splice(0, dustRef.current.length - 400);
    }
    for (let i = dustRef.current.length - 1; i >= 0; i--) {
      const d = dustRef.current[i];
      d.x += d.vx; d.y += d.vy; d.opacity -= 0.005;
      if (d.opacity <= 0 || d.y > H + 10) { dustRef.current.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${d.hue}, 78%, 58%, ${d.opacity})`;
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(drawLoop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawLoop]);

  /* ── press to play ── */
  function dropNeedle() {
    if (phase !== "hook") return;
    vinyl.pressToPlay();
    setPhase("dropping");
    setTonearmDown(true);
    setTimeout(() => {
      setSpinning(true);
      setPhase("playing");
    }, 950);
  }

  /* ── tap note ── */
  function handleNoteTap(idx: number, e: React.PointerEvent) {
    if (phase !== "playing" || tappedNotes.includes(idx)) return;
    e.stopPropagation();
    vinyl.noteTap(idx);

    /* burst from tap point */
    const bx = e.clientX, by = e.clientY;
    const burst: BurstDot[] = Array.from({ length: 24 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      return {
        x: bx, y: by,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        r: 1.5 + Math.random() * 2, opacity: 0.9,
        decay: 0.025 + Math.random() * 0.025,
        hue: 28 + Math.random() * 22,
      };
    });
    burstRef.current.push(...burst);

    /* tooltip */
    const track = tpl.tracks[idx];
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setTooltip({ emoji: track.emoji, text: track.text });
    tooltipTimerRef.current = setTimeout(() => setTooltip(null), 2200);

    const next = [...tappedNotes, idx];
    setTappedNotes(next);
    setEqIntensity(1 + next.length);

    if (next.length === tpl.tracks.length) {
      setTimeout(() => triggerSleeve(), 1600);
    }
  }

  /* ── sleeve finale ── */
  function triggerSleeve() {
    vinyl.spinUp();
    setHyperSpin(true);
    setTimeout(() => {
      setHyperSpin(false);
      setSpinning(false);
      setTonearmDown(false);
      setPlayerExiting(true);
      setTimeout(() => {
        canvasModeRef.current = "golden";
        setPhase("sleeve");
        setTimeout(() => {
          setSleeveVisible(true);
          vinyl.sleeveReveal();
        }, 300);
      }, 800);
    }, 500);
  }

  /* ── share ── */
  function shareWhatsApp() {
    vinyl.copy();
    trackEvent({ event: "card_shared", channel: "whatsapp", occasion, template: "vinyl" });
    const text = `💌 Hey ${recipientName}, I made you a special vinyl card!\n\nYour surprise is waiting 👇\n${senderShareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
  async function copyForInstagram() {
    vinyl.copy();
    trackEvent({ event: "card_shared", channel: "instagram", occasion, template: "vinyl" });
    try { await navigator.clipboard.writeText(senderShareUrl); setSenderIgCopied(true); setTimeout(() => setSenderIgCopied(false), 2500); } catch { /* ignore */ }
  }
  async function copySenderLink() {
    vinyl.copy();
    trackEvent({ event: "card_shared", channel: "link", occasion, template: "vinyl" });
    try { await navigator.clipboard.writeText(senderShareUrl); setSenderCopied(true); setTimeout(() => setSenderCopied(false), 2500); } catch { /* ignore */ }
  }
  async function copyRecipLink() {
    vinyl.copy();
    try { await navigator.clipboard.writeText(senderShareUrl); setRecipCopied(true); setTimeout(() => setRecipCopied(false), 2500); } catch { /* ignore */ }
  }

  const totalNotes = tpl.tracks.length;

  /* ─────────────────────────── render ─────────────────────── */
  return (
    <div
      style={{
        position: "fixed", inset: 0, overflow: "hidden",
        background: "linear-gradient(160deg, #F4ECE1 0%, #EDE0CC 40%, #E5D5B8 65%, #DDD0B0 100%)",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        userSelect: "none", WebkitUserSelect: "none",
      } as React.CSSProperties}
    >
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />

      {/* ══ PHASE 1 + 2: Hook & Dropping ══ */}
      <AnimatePresence>
        {(phase === "hook" || phase === "dropping") && (
          <motion.div
            key="hook"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            style={{
              position: "fixed", inset: 0, zIndex: 10,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "0 24px",
            }}
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.7 }}
              style={{ textAlign: "center", marginBottom: 28 }}
            >
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
                color: "#B8762A", textTransform: "uppercase", marginBottom: 6,
              }}>
                ♪ A Mixtape for
              </div>
              <h1 style={{
                fontSize: "min(30px, 7.5vw)", fontWeight: 800,
                color: "#4A3C31", fontFamily: "Georgia, serif",
                letterSpacing: "-0.01em", lineHeight: 1.15, margin: 0,
              }}>
                {recipientName}
              </h1>
              <div style={{ marginTop: 6, fontSize: 13, color: "#8A7060", fontStyle: "italic" }}>
                {tpl.album_title}
              </div>
            </motion.div>

            {/* Record player cabinet */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, duration: 0.6, type: "spring", bounce: 0.3 }}
              style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <div style={{
                width: "min(268px, 72vw)", height: "min(268px, 72vw)",
                borderRadius: 20,
                background: "linear-gradient(145deg, #F0E8D8 0%, #E8DCC8 40%, #D8CCB0 100%)",
                boxShadow: "0 16px 48px rgba(74,60,49,0.22), 0 4px 12px rgba(74,60,49,0.14), inset 0 1px 2px rgba(255,255,255,0.7), inset 0 -2px 4px rgba(74,60,49,0.08)",
                border: "1.5px solid rgba(184,118,42,0.22)",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}>
                <div style={{
                  width: "min(230px, 62vw)", height: "min(230px, 62vw)",
                  borderRadius: "50%",
                  background: "linear-gradient(145deg, #3A2E24, #2A2018)",
                  boxShadow: "inset 0 4px 16px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <VinylRecord spinning={spinning} hyperSpin={hyperSpin} size={Math.min(window.innerWidth * 0.52, 200)} />
                </div>
                <Tonearm down={tonearmDown} />
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.6 }}
              style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}
            >
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={dropNeedle}
                disabled={phase === "dropping"}
                style={{
                  padding: "14px 36px", borderRadius: 50,
                  background: phase === "dropping"
                    ? "rgba(184,118,42,0.3)"
                    : "linear-gradient(135deg, #C8832E, #B8762A)",
                  color: "#F4ECE1",
                  fontWeight: 700, fontSize: 16, border: "none",
                  cursor: phase === "dropping" ? "default" : "pointer",
                  boxShadow: phase === "dropping"
                    ? "none"
                    : "0 4px 16px rgba(184,118,42,0.4), 0 2px 6px rgba(0,0,0,0.15)",
                  letterSpacing: "0.03em",
                  transition: "all 0.3s",
                  fontFamily: "Georgia, serif",
                }}
              >
                {phase === "dropping" ? (
                  "Dropping the needle…"
                ) : (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="9" cy="9" r="8.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
                      <polygon points="7,5.5 14,9 7,12.5" fill="white" />
                    </svg>
                    PRESS TO PLAY
                  </span>
                )}
              </motion.button>
              <p style={{ fontSize: 12, color: "#A09080", letterSpacing: "0.06em" }}>
                Tap to start your mixtape
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ PHASE 3: Playing / Groove ══ */}
      <AnimatePresence>
        {phase === "playing" && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            style={{ position: "fixed", inset: 0, zIndex: 10 }}
          >
            {/* Progress pill — full-width flex, never overflows */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                position: "fixed",
                top: "max(18px, env(safe-area-inset-top, 18px))",
                left: 0, right: 0,
                display: "flex", justifyContent: "center", padding: "0 20px",
                zIndex: 15, pointerEvents: "none",
              }}
            >
              <span style={{
                display: "inline-block",
                fontSize: 13, color: "#6B5040", letterSpacing: "0.06em", fontWeight: 600,
                background: "rgba(244,236,225,0.9)",
                borderRadius: 999, padding: "8px 20px",
                border: "1px solid rgba(184,118,42,0.3)",
                backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                whiteSpace: "nowrap",
                boxShadow: "0 2px 12px rgba(74,60,49,0.1)",
              }}>
                PLAYING TRACKS ({tappedNotes.length} / {totalNotes})
              </span>
            </motion.div>

            {/* Record player — centered slightly above middle */}
            <div style={{
              position: "fixed", left: "50%", top: "42%",
              transform: "translate(-50%, -50%)",
              zIndex: 11,
            }}>
              <motion.div
                animate={playerExiting ? { y: 340, opacity: 0 } : { y: 0, opacity: 1 }}
                transition={{ duration: 0.75, ease: "easeIn" }}
                style={{ position: "relative" }}
              >
                <div style={{
                  width: "min(230px, 60vw)", height: "min(230px, 60vw)",
                  borderRadius: 18,
                  background: "linear-gradient(145deg, #F0E8D8 0%, #E8DCC8 40%, #D8CCB0 100%)",
                  boxShadow: "0 12px 40px rgba(74,60,49,0.2), 0 4px 10px rgba(74,60,49,0.12), inset 0 1px 2px rgba(255,255,255,0.7)",
                  border: "1.5px solid rgba(184,118,42,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                }}>
                  <div style={{
                    width: "min(198px, 52vw)", height: "min(198px, 52vw)",
                    borderRadius: "50%",
                    background: "linear-gradient(145deg, #3A2E24, #2A2018)",
                    boxShadow: "inset 0 4px 16px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <VinylRecord spinning={spinning} hyperSpin={hyperSpin} size={Math.min(window.innerWidth * 0.44, 170)} />
                  </div>
                  <Tonearm down={tonearmDown} />
                </div>
              </motion.div>
            </div>

            {/* Floating note buttons */}
            {tpl.tracks.map((track, i) => {
              const tapped = tappedNotes.includes(i);
              /* fixed positions around the record player */
              const positions: React.CSSProperties[] = [
                { top: "17%", left: "9%" },
                { top: "17%", right: "9%" },
                { bottom: "22%", left: "9%" },
                { bottom: "22%", right: "9%" },
              ];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.12 + 0.1, type: "spring", bounce: 0.5 }}
                  style={{
                    position: "fixed",
                    zIndex: 12,
                    cursor: tapped ? "default" : "pointer",
                    ...positions[i],
                  }}
                  onPointerDown={(e) => handleNoteTap(i, e)}
                >
                  <motion.div
                    animate={tapped
                      ? { scale: 1.35, rotate: 0 }
                      : {
                        y: [0, -10, 0, -6, 0],
                        rotate: [-4, 4, -3, 3, -4],
                      }}
                    transition={tapped
                      ? { duration: 0.3, type: "spring", bounce: 0.4 }
                      : { duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                    style={{
                      width: "min(60px, 14.5vw)", height: "min(60px, 14.5vw)",
                      borderRadius: "50%",
                      background: tapped
                        ? "radial-gradient(circle, #FFE566 0%, #FFA500 65%, rgba(255,140,0,0.3) 100%)"
                        : "radial-gradient(circle, rgba(244,236,225,0.95) 0%, rgba(232,216,192,0.8) 70%)",
                      boxShadow: tapped
                        ? "0 0 14px #D4924A, 0 0 36px rgba(184,118,42,0.55), 0 0 72px rgba(200,140,0,0.2)"
                        : "0 4px 16px rgba(74,60,49,0.2), 0 0 0 1px rgba(184,118,42,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "min(26px, 6.5vw)",
                      transition: "background 0.3s, box-shadow 0.3s",
                    }}
                  >
                    {tapped ? track.emoji : NOTE_CHARS[i]}
                  </motion.div>
                </motion.div>
              );
            })}

            {/* Glassmorphism cassette tooltip pinned at bottom */}
            <AnimatePresence>
              {tooltip && (
                <motion.div
                  key={tooltip.text}
                  initial={{ opacity: 0, scale: 0.88, y: 18 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.88, y: 10 }}
                  transition={{ duration: 0.32 }}
                  style={{
                    position: "fixed",
                    bottom: "max(24px, env(safe-area-inset-bottom, 24px))",
                    left: 16, right: 16,
                    zIndex: 20, pointerEvents: "none",
                    background: "rgba(244,236,225,0.72)",
                    borderRadius: 18,
                    border: "1px solid rgba(184,118,42,0.28)",
                    padding: "16px 22px",
                    textAlign: "center",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    boxShadow: "0 8px 32px rgba(74,60,49,0.15)",
                  } as React.CSSProperties}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{tooltip.emoji}</div>
                  <p style={{
                    margin: 0, fontSize: 15, fontWeight: 600,
                    color: "#4A3C31", fontFamily: "Georgia, serif",
                    fontStyle: "italic", lineHeight: 1.5,
                  }}>
                    {tooltip.text}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ PHASE 4: Platinum Sleeve ══ */}
      <AnimatePresence>
        {phase === "sleeve" && sleeveVisible && (
          <motion.div
            key="sleeve"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: "fixed", inset: 0, zIndex: 10,
              overflowY: "auto",
              display: "flex", flexDirection: "column", alignItems: "center",
            }}
          >
            {/* Warm glow */}
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, height: "50%",
              background: "radial-gradient(ellipse at 50% 0%, rgba(184,118,42,0.13) 0%, transparent 65%)",
              pointerEvents: "none", zIndex: 0,
            }} />

            <div style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              padding: "48px 24px 40px",
              maxWidth: 480, margin: "0 auto", width: "100%",
              position: "relative", zIndex: 1,
            }}>
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.15, type: "spring", bounce: 0.4 }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.16em",
                  color: "#B8762A", textTransform: "uppercase",
                  padding: "6px 16px", borderRadius: 999,
                  background: "rgba(184,118,42,0.1)",
                  border: "1px solid rgba(184,118,42,0.35)",
                  marginBottom: 24,
                }}
              >
                <span>✦</span>
                <span>Platinum Sleeve Edition</span>
                <span>✦</span>
              </motion.div>

              {/* Sleeve card */}
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.7, type: "spring", bounce: 0.2 }}
                style={{
                  width: "100%", padding: "32px 28px 28px",
                  borderRadius: 20,
                  background: "linear-gradient(145deg, #FEFAF4 0%, #F8F0E0 50%, #F0E6CC 100%)",
                  boxShadow: "0 20px 60px rgba(74,60,49,0.18), 0 4px 16px rgba(74,60,49,0.1), inset 0 1px 1px rgba(255,255,255,0.9)",
                  border: "1.5px solid rgba(184,118,42,0.2)",
                  position: "relative", overflow: "hidden",
                  marginBottom: 24,
                }}
              >
                {/* Gold foil shimmer top line */}
                <div style={{
                  position: "absolute", top: 0, left: "-40%", right: "-40%", height: 2,
                  background: "linear-gradient(90deg, transparent, rgba(184,118,42,0.4), rgba(212,160,80,0.6), rgba(184,118,42,0.4), transparent)",
                  pointerEvents: "none",
                }} />
                {/* Decorative groove lines */}
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    position: "absolute", top: 0, bottom: 0, left: `${18 + i * 32}%`,
                    width: 1, background: "rgba(184,118,42,0.05)", pointerEvents: "none",
                  }} />
                ))}

                {/* Side label */}
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
                  color: "#B8762A", textTransform: "uppercase", marginBottom: 8,
                }}>
                  {tpl.side_label}
                </div>

                {/* Title prefix */}
                <div style={{
                  fontSize: "min(14px, 3.5vw)", color: "#8A7060",
                  fontFamily: "Georgia, serif", fontStyle: "italic",
                  marginBottom: 4,
                }}>
                  {titlePrefix}
                </div>

                {/* Recipient name — gold foil */}
                <div style={{
                  fontSize: "min(28px, 7vw)", fontWeight: 800,
                  fontFamily: "Georgia, serif",
                  background: "linear-gradient(135deg, #C8832E, #D4924A, #B8762A)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.15,
                  marginBottom: 18,
                }}>
                  {recipientName}
                </div>

                {/* Divider */}
                <div style={{
                  height: 1, marginBottom: 18,
                  background: "linear-gradient(90deg, transparent, rgba(184,118,42,0.3), transparent)",
                }} />

                {/* Final message */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  style={{
                    fontSize: "min(16px, 4.2vw)", color: "#4A3C31",
                    fontFamily: "Georgia, serif", lineHeight: 1.7,
                    fontStyle: "italic", margin: 0, marginBottom: 18,
                  }}
                >
                  "{finalMessage}"
                </motion.p>

                {/* Mini vinyl decoration */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <VinylRecord spinning={false} size={44} />
                </div>
              </motion.div>

              {/* Sender share */}
              {isSender && sleeveReady && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <p style={{
                    textAlign: "center", fontSize: 13, color: "#8A7060",
                    marginBottom: 4, fontStyle: "italic",
                  }}>
                    Share this mixtape with {recipientName} ♪
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={shareWhatsApp}
                    style={{
                      padding: "14px", borderRadius: 14,
                      background: "linear-gradient(135deg, #25D366, #128C7E)",
                      color: "#fff", fontWeight: 700, fontSize: 15,
                      border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>📱</span> Send on WhatsApp
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={copySenderLink}
                    style={{
                      padding: "13px", borderRadius: 14,
                      background: senderCopied ? "rgba(184,118,42,0.15)" : "rgba(74,60,49,0.07)",
                      color: senderCopied ? "#B8762A" : "#4A3C31",
                      fontWeight: 600, fontSize: 14,
                      border: `1.5px solid ${senderCopied ? "rgba(184,118,42,0.4)" : "rgba(74,60,49,0.15)"}`,
                      cursor: "pointer", transition: "all 0.3s",
                    }}
                  >
                    {senderCopied ? "✓ Link Copied!" : "🔗 Copy Link"}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={copyForInstagram}
                    style={{
                      padding: "13px", borderRadius: 14,
                      background: senderIgCopied ? "rgba(184,118,42,0.12)" : "rgba(74,60,49,0.05)",
                      color: senderIgCopied ? "#B8762A" : "#8A7060",
                      fontWeight: 600, fontSize: 14,
                      border: `1.5px solid ${senderIgCopied ? "rgba(184,118,42,0.3)" : "rgba(74,60,49,0.1)"}`,
                      cursor: "pointer", transition: "all 0.3s",
                    }}
                  >
                    {senderIgCopied ? "✓ Copied for Instagram!" : "📸 Copy for Instagram / DM"}
                  </motion.button>
                  <Link href="/">
                    <button style={{
                      width: "100%", padding: "11px", borderRadius: 14,
                      background: "transparent",
                      color: "#A09080", fontWeight: 500, fontSize: 13,
                      border: "1px solid rgba(74,60,49,0.1)",
                      cursor: "pointer", marginTop: 4,
                    }}>
                      ← Make another card
                    </button>
                  </Link>
                </motion.div>
              )}

              {/* Recipient CTA */}
              {!isSender && !isPreview && sleeveReady && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={copyRecipLink}
                    style={{
                      padding: "13px", borderRadius: 14,
                      background: recipCopied ? "rgba(184,118,42,0.15)" : "rgba(74,60,49,0.07)",
                      color: recipCopied ? "#B8762A" : "#4A3C31",
                      fontWeight: 600, fontSize: 14,
                      border: `1.5px solid ${recipCopied ? "rgba(184,118,42,0.4)" : "rgba(74,60,49,0.15)"}`,
                      cursor: "pointer", transition: "all 0.3s",
                    }}
                  >
                    {recipCopied ? "✓ Link Saved!" : "🔗 Save this card"}
                  </motion.button>
                  <Link href="/send?ref=card">
                    <button style={{
                      width: "100%", padding: "11px", borderRadius: 14,
                      background: "linear-gradient(135deg, #C8832E, #B8762A)",
                      color: "#F4ECE1", fontWeight: 600, fontSize: 14,
                      border: "none", cursor: "pointer",
                    }}>
                      🎵 Create your own card — free!
                    </button>
                  </Link>
                </motion.div>
              )}

              {/* Preview: back */}
              {isPreview && (
                <Link href="/">
                  <button style={{
                    padding: "11px 28px", borderRadius: 14,
                    background: "rgba(74,60,49,0.07)",
                    color: "#8A7060", fontWeight: 500, fontSize: 13,
                    border: "1px solid rgba(74,60,49,0.1)",
                    cursor: "pointer",
                  }}>
                    ← Back to home
                  </button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isSender && !isPreview && <WatermarkBadge cid={params.get("cid")} />}
    </div>
  );
}
