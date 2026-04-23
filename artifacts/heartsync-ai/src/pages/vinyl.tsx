import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { getVinylTemplate, getVinylFallback, type VinylTrack } from "@/lib/card-templates";

/* ─────────────────────────── types ───────────────────────────────────── */

type VinylPhase = "hook" | "dropping" | "playing" | "sleeve";

interface Note {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  size: number;
  char: string;
  rotation: number;
  spin: number;
}

interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  opacity: number;
  hue: number;
}

/* ─────────────────────────── helpers ─────────────────────────────────── */

function useQueryParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

const NOTES = ["♪", "♫", "♩", "♬", "𝄞"];
let noteId = 0;

/* ─────────────────────────── VinylRecord ────────────────────────────── */

function VinylRecord({ spinning, size = 220 }: { spinning: boolean; size?: number }) {
  const s = size;
  return (
    <div style={{ width: s, height: s, position: "relative", flexShrink: 0 }}>
      {/* Outer glow */}
      <div style={{
        position: "absolute", inset: -8,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(184,118,42,0.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      {/* Spinning record */}
      <motion.div
        animate={{ rotate: spinning ? 360 : 0 }}
        transition={spinning
          ? { duration: 2.8, repeat: Infinity, ease: "linear" }
          : { duration: 0.6, ease: "easeOut" }
        }
        style={{
          width: s, height: s,
          borderRadius: "50%",
          background: "radial-gradient(circle at 50% 50%, #2A2018 0%, #1A1410 35%, #120E0A 55%, #0D0A07 75%, #1A1410 88%, #2A2018 100%)",
          position: "relative",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.04)",
          overflow: "hidden",
        }}
      >
        {/* Groove rings */}
        {[0.32, 0.42, 0.52, 0.62, 0.72, 0.82, 0.90].map((r, i) => (
          <div key={i} style={{
            position: "absolute",
            top: `${50 - r * 50}%`, left: `${50 - r * 50}%`,
            right: `${50 - r * 50}%`, bottom: `${50 - r * 50}%`,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.04)",
            pointerEvents: "none",
          }} />
        ))}
        {/* Shine */}
        <div style={{
          position: "absolute", top: "8%", left: "18%",
          width: "28%", height: "14%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(255,255,255,0.07) 0%, transparent 100%)",
          transform: "rotate(-30deg)",
          pointerEvents: "none",
        }} />
        {/* Center label */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: s * 0.28, height: s * 0.28,
          borderRadius: "50%",
          background: "radial-gradient(circle at 38% 32%, #D4924A 0%, #B8762A 45%, #8A5515 80%, #6B3F0D 100%)",
          boxShadow: "inset 0 1px 4px rgba(255,200,100,0.25), inset 0 -1px 3px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: s * 0.06, height: s * 0.06,
            borderRadius: "50%",
            background: "#1A1410",
            boxShadow: "0 1px 3px rgba(0,0,0,0.8)",
          }} />
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────── Tonearm ────────────────────────────────── */

function Tonearm({ down }: { down: boolean }) {
  return (
    <motion.svg
      width={90} height={110}
      viewBox="0 0 90 110"
      style={{ position: "absolute", top: -18, right: -12, zIndex: 4 }}
      animate={{ rotate: down ? 22 : 0 }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
      transformOrigin="72px 18px"
    >
      {/* Pivot base */}
      <circle cx={72} cy={18} r={7} fill="#C8832E" stroke="#A06010" strokeWidth={1.5} />
      <circle cx={72} cy={18} r={3.5} fill="#8A5515" />
      {/* Arm */}
      <path
        d="M 70 22 Q 52 55, 28 90 L 22 98 L 18 94 L 24 86 Q 48 51 66 18"
        fill="none"
        stroke="url(#armGrad)"
        strokeWidth={4}
        strokeLinecap="round"
      />
      {/* Headshell */}
      <rect x={14} y={90} width={16} height={7} rx={2} fill="#B8762A" stroke="#8A5515" strokeWidth={1} />
      {/* Stylus needle */}
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

/* ─────────────────────────── EQBars ─────────────────────────────────── */

function EQBars({ active }: { active: boolean }) {
  const barCount = 7;
  const heights = [0.45, 0.75, 0.55, 0.9, 0.65, 0.8, 0.5];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 32 }}>
      {Array.from({ length: barCount }, (_, i) => (
        <motion.div
          key={i}
          animate={active ? {
            height: [
              `${heights[i] * 32}px`,
              `${(0.2 + Math.random() * 0.8) * 32}px`,
              `${heights[(i + 2) % barCount] * 32}px`,
              `${heights[i] * 32}px`,
            ],
          } : { height: "4px" }}
          transition={active ? {
            duration: 0.5 + i * 0.07,
            repeat: Infinity,
            ease: "easeInOut",
          } : { duration: 0.4 }}
          style={{
            width: 5,
            borderRadius: 3,
            background: active
              ? `linear-gradient(to top, #B8762A, #D4A050, #E8C070)`
              : "rgba(184,118,42,0.25)",
            minHeight: 4,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────── TrackRow ───────────────────────────────── */

function TrackRow({
  track, index, played, active, onPlay,
}: {
  track: VinylTrack;
  index: number;
  played: boolean;
  active: boolean;
  onPlay: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      onClick={onPlay}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        borderRadius: 14,
        background: active
          ? "rgba(184,118,42,0.18)"
          : played
          ? "rgba(184,118,42,0.08)"
          : "rgba(74,60,49,0.08)",
        border: `1.5px solid ${active ? "rgba(184,118,42,0.5)" : played ? "rgba(184,118,42,0.25)" : "rgba(74,60,49,0.12)"}`,
        cursor: "pointer",
        transition: "all 0.25s",
        userSelect: "none",
      }}
    >
      {/* Track number */}
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: played ? "rgba(184,118,42,0.25)" : "rgba(74,60,49,0.1)",
        border: `1.5px solid ${played ? "rgba(184,118,42,0.5)" : "rgba(74,60,49,0.2)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, fontSize: 13, fontWeight: 700,
        color: played ? "#B8762A" : "#8A7060",
        fontFamily: "Georgia, serif",
      }}>
        {played ? (active ? "▶" : "✓") : String(index + 1).padStart(2, "0")}
      </div>

      {/* Title + text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: played ? "#4A3C31" : "#8A7060",
          fontFamily: "Georgia, serif",
          letterSpacing: "0.01em",
        }}>
          {track.title}
        </div>
        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{
                marginTop: 4,
                fontSize: 13,
                color: "#6B5040",
                fontFamily: "'Segoe UI', system-ui, sans-serif",
                lineHeight: 1.5,
                fontStyle: "italic",
              }}>
                {track.text}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Emoji badge */}
      <div style={{
        fontSize: 20, flexShrink: 0,
        opacity: played ? 1 : 0.35,
        transition: "opacity 0.3s",
      }}>
        {track.emoji}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────── VinylCard (main) ───────────────────────── */

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
  const finalMessage = customMsg ?? tpl.final_message;

  const senderShareUrl = (() => {
    if (typeof window === "undefined") return "";
    const p = new URLSearchParams(window.location.search);
    p.delete("sender");
    return window.location.origin + window.location.pathname + "?" + p.toString();
  })();

  /* ── state ── */
  const [phase, setPhase] = useState<VinylPhase>(isPreview ? "sleeve" : "hook");
  const [spinning, setSpinning] = useState(false);
  const [tonearmDown, setTonearmDown] = useState(false);
  const [playedTracks, setPlayedTracks] = useState<number[]>([]);
  const [activeTrack, setActiveTrack] = useState<number | null>(null);
  const [allPlayed, setAllPlayed] = useState(false);
  const [sleeveReady, setSleeveReady] = useState(false);
  const [senderCopied, setSenderCopied] = useState(false);
  const [senderIgCopied, setSenderIgCopied] = useState(false);
  const [recipCopied, setRecipCopied] = useState(false);

  /* ── canvas ── */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const notesRef = useRef<Note[]>([]);
  const dustRef = useRef<Dust[]>([]);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<VinylPhase>(isPreview ? "sleeve" : "hook");

  /* keep phaseRef in sync */
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  /* set sleeveReady when phase hits sleeve (covers preview + normal flows) */
  useEffect(() => {
    if (phase === "sleeve") {
      const t = setTimeout(() => setSleeveReady(true), 650);
      return () => clearTimeout(t);
    }
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
    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ── canvas draw loop ── */
  const drawLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const active = phaseRef.current === "playing" || phaseRef.current === "sleeve";

    /* spawn new notes */
    if (Math.random() < (active ? 0.06 : 0.025)) {
      notesRef.current.push({
        id: noteId++,
        x: Math.random() * W,
        y: H + 10,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(0.6 + Math.random() * 1.2),
        opacity: 0.55 + Math.random() * 0.35,
        size: 12 + Math.random() * 14,
        char: NOTES[Math.floor(Math.random() * NOTES.length)],
        rotation: (Math.random() - 0.5) * 0.6,
        spin: (Math.random() - 0.5) * 0.025,
      });
    }

    /* draw & update notes */
    for (let i = notesRef.current.length - 1; i >= 0; i--) {
      const n = notesRef.current[i];
      n.x += n.vx; n.y += n.vy;
      n.opacity -= 0.003;
      n.rotation += n.spin;
      if (n.opacity <= 0 || n.y < -20) { notesRef.current.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.rotate(n.rotation);
      ctx.globalAlpha = n.opacity;
      ctx.fillStyle = active ? "#C8832E" : "#A07048";
      ctx.font = `${n.size}px Georgia, serif`;
      ctx.textAlign = "center";
      ctx.fillText(n.char, 0, 0);
      ctx.restore();
    }

    /* spawn dust on playing/sleeve */
    if (active && Math.random() < 0.18) {
      dustRef.current.push({
        x: Math.random() * W,
        y: H + 5,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(0.3 + Math.random() * 0.8),
        r: 1 + Math.random() * 1.5,
        opacity: 0.5 + Math.random() * 0.4,
        hue: 28 + Math.random() * 20,
      });
    }
    for (let i = dustRef.current.length - 1; i >= 0; i--) {
      const d = dustRef.current[i];
      d.x += d.vx; d.y += d.vy;
      d.opacity -= 0.006;
      if (d.opacity <= 0 || d.y < -10) { dustRef.current.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${d.hue}, 65%, 55%, ${d.opacity})`;
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(drawLoop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawLoop]);

  /* ── drop needle ── */
  function dropNeedle() {
    if (phase !== "hook") return;
    setPhase("dropping");
    setTonearmDown(true);
    setTimeout(() => {
      setSpinning(true);
      setPhase("playing");
    }, 900);
  }

  /* ── play track ── */
  function handleTrack(idx: number) {
    if (allPlayed && !playedTracks.includes(idx)) return;
    if (activeTrack === idx) {
      setActiveTrack(null);
      return;
    }
    setActiveTrack(idx);
    if (!playedTracks.includes(idx)) {
      const next = [...playedTracks, idx];
      setPlayedTracks(next);
      if (next.length === tpl.tracks.length) {
        setAllPlayed(true);
        setTimeout(() => triggerSleeve(), 1800);
      }
    }
  }

  /* ── sleeve finale ── */
  function triggerSleeve() {
    setSpinning(false);
    setTonearmDown(false);
    setTimeout(() => {
      setPhase("sleeve");
      setTimeout(() => setSleeveReady(true), 600);
    }, 700);
  }

  /* ── share ── */
  function shareWhatsApp() {
    const text = `💌 Hey ${recipientName}, I made you a special vinyl card!\n\nYour surprise is waiting 👇\n${senderShareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
  async function copyForInstagram() {
    try { await navigator.clipboard.writeText(senderShareUrl); setSenderIgCopied(true); setTimeout(() => setSenderIgCopied(false), 2500); } catch {}
  }
  async function copySenderLink() {
    try { await navigator.clipboard.writeText(senderShareUrl); setSenderCopied(true); setTimeout(() => setSenderCopied(false), 2500); } catch {}
  }
  async function copyRecipLink() {
    const recipUrl = senderShareUrl;
    try { await navigator.clipboard.writeText(recipUrl); setRecipCopied(true); setTimeout(() => setRecipCopied(false), 2500); } catch {}
  }

  /* ─────────────────────────── render ──────────────────────────────── */
  return (
    <div
      style={{
        position: "fixed", inset: 0, overflow: "hidden",
        background: "linear-gradient(160deg, #F4ECE1 0%, #EDE0CC 40%, #E5D5B8 60%, #DDD0B0 100%)",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        userSelect: "none", WebkitUserSelect: "none",
      } as React.CSSProperties}
    >
      {/* Canvas */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />

      {/* ══ PHASE 1: Hook ══ */}
      <AnimatePresence>
        {(phase === "hook" || phase === "dropping") && (
          <motion.div key="hook"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            style={{
              position: "fixed", inset: 0, zIndex: 10,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "0 24px",
            }}
          >
            {/* Top label */}
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              style={{ textAlign: "center", marginBottom: 32 }}
            >
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
                color: "#B8762A", textTransform: "uppercase", marginBottom: 8,
              }}>
                ♪ A Mixtape for
              </div>
              <h1 style={{
                fontSize: "min(32px, 8vw)", fontWeight: 800,
                color: "#4A3C31", fontFamily: "Georgia, serif",
                letterSpacing: "-0.01em", lineHeight: 1.1, margin: 0,
              }}>
                {recipientName}
              </h1>
              <div style={{
                marginTop: 8, fontSize: 13, color: "#8A7060", fontStyle: "italic",
              }}>
                {tpl.album_title}
              </div>
            </motion.div>

            {/* Record player */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.6, type: "spring", bounce: 0.3 }}
              style={{
                position: "relative",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {/* Cabinet */}
              <div style={{
                width: "min(280px, 75vw)", height: "min(280px, 75vw)",
                borderRadius: 20,
                background: "linear-gradient(145deg, #F0E8D8 0%, #E8DCC8 40%, #D8CCB0 100%)",
                boxShadow: "0 16px 48px rgba(74,60,49,0.22), 0 4px 12px rgba(74,60,49,0.14), inset 0 1px 2px rgba(255,255,255,0.7), inset 0 -2px 4px rgba(74,60,49,0.08)",
                border: "1.5px solid rgba(184,118,42,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}>
                {/* Platter ring */}
                <div style={{
                  width: "min(240px, 64vw)", height: "min(240px, 64vw)",
                  borderRadius: "50%",
                  background: "linear-gradient(145deg, #3A2E24, #2A2018)",
                  boxShadow: "inset 0 4px 16px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                }}>
                  <VinylRecord spinning={spinning} size={Math.min(window.innerWidth * 0.55, 210)} />
                </div>
                {/* Tonearm */}
                <Tonearm down={tonearmDown} />
              </div>
            </motion.div>

            {/* Drop needle CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              style={{ marginTop: 36, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
            >
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={dropNeedle}
                disabled={phase === "dropping"}
                style={{
                  padding: "14px 36px",
                  borderRadius: 50,
                  background: phase === "dropping"
                    ? "rgba(184,118,42,0.3)"
                    : "linear-gradient(135deg, #C8832E, #B8762A)",
                  color: "#F4ECE1",
                  fontWeight: 700, fontSize: 16,
                  border: "none", cursor: phase === "dropping" ? "default" : "pointer",
                  boxShadow: phase === "dropping"
                    ? "none"
                    : "0 4px 16px rgba(184,118,42,0.4), 0 2px 6px rgba(0,0,0,0.15)",
                  letterSpacing: "0.03em",
                  transition: "all 0.3s",
                  fontFamily: "Georgia, serif",
                }}
              >
                {phase === "dropping" ? "Dropping the needle…" : "▶  Drop the Needle"}
              </motion.button>
              <p style={{ fontSize: 12, color: "#A09080", letterSpacing: "0.06em" }}>
                Tap to play your mixtape
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ PHASE 2+3: Playing ══ */}
      <AnimatePresence>
        {phase === "playing" && (
          <motion.div key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            style={{
              position: "fixed", inset: 0, zIndex: 10,
              display: "flex", flexDirection: "column",
              overflowY: "auto",
            }}
          >
            {/* Progress pill */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                position: "fixed", top: "max(18px, env(safe-area-inset-top, 18px))",
                left: 0, right: 0,
                display: "flex", justifyContent: "center", padding: "0 20px",
                zIndex: 15, pointerEvents: "none",
              }}
            >
              <span style={{
                display: "inline-block",
                fontSize: 13, color: "#6B5040",
                letterSpacing: "0.06em", fontWeight: 600,
                background: "rgba(244,236,225,0.88)",
                borderRadius: 999, padding: "8px 20px",
                border: "1px solid rgba(184,118,42,0.3)",
                backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                whiteSpace: "nowrap",
                boxShadow: "0 2px 12px rgba(74,60,49,0.1)",
              }}>
                ♪ Now Playing — {playedTracks.length} / {tpl.tracks.length} tracks
              </span>
            </motion.div>

            {/* Scrollable content */}
            <div style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              padding: "72px 20px 32px",
              maxWidth: 480, margin: "0 auto", width: "100%",
            }}>
              {/* Mini record + EQ row */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{
                  display: "flex", alignItems: "center", gap: 20,
                  marginBottom: 24, width: "100%",
                }}
              >
                <VinylRecord spinning={spinning} size={72} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, letterSpacing: "0.12em",
                    color: "#B8762A", textTransform: "uppercase", marginBottom: 2,
                  }}>
                    {tpl.side_label}
                  </div>
                  <div style={{
                    fontSize: 16, fontWeight: 800, color: "#4A3C31",
                    fontFamily: "Georgia, serif", marginBottom: 8,
                  }}>
                    {tpl.album_title}
                  </div>
                  <EQBars active={spinning && playedTracks.length < tpl.tracks.length} />
                </div>
              </motion.div>

              {/* Track list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                {tpl.tracks.map((track, i) => (
                  <TrackRow
                    key={i}
                    track={track}
                    index={i}
                    played={playedTracks.includes(i)}
                    active={activeTrack === i}
                    onPlay={() => handleTrack(i)}
                  />
                ))}
              </div>

              {/* Hint */}
              {!allPlayed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  style={{
                    marginTop: 20, fontSize: 12, color: "#A09080",
                    textAlign: "center", fontStyle: "italic", letterSpacing: "0.04em",
                  }}
                >
                  Tap each track to play it ♪
                </motion.p>
              )}

              {/* All played message */}
              {allPlayed && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginTop: 20, fontSize: 13, color: "#B8762A",
                    textAlign: "center", fontWeight: 600, letterSpacing: "0.04em",
                  }}
                >
                  ✦ Side A complete — revealing your sleeve…
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ PHASE 4: Sleeve ══ */}
      <AnimatePresence>
        {phase === "sleeve" && (
          <motion.div key="sleeve"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 10,
              overflowY: "auto",
              display: "flex", flexDirection: "column", alignItems: "center",
            }}
          >
            {/* Warm light haze */}
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, height: "45%",
              background: "radial-gradient(ellipse at 50% 0%, rgba(184,118,42,0.12) 0%, transparent 70%)",
              pointerEvents: "none", zIndex: 0,
            }} />

            <div style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              padding: "48px 24px 40px",
              maxWidth: 480, margin: "0 auto", width: "100%",
              position: "relative", zIndex: 1,
            }}>
              {/* Platinum Sleeve badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.2, type: "spring", bounce: 0.4 }}
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

              {/* Album cover card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.7 }}
                style={{
                  width: "100%",
                  padding: "32px 28px",
                  borderRadius: 20,
                  background: "linear-gradient(145deg, #FEFAF4 0%, #F8F0E0 50%, #F0E6CC 100%)",
                  boxShadow: "0 20px 60px rgba(74,60,49,0.18), 0 4px 16px rgba(74,60,49,0.1), inset 0 1px 1px rgba(255,255,255,0.9)",
                  border: "1.5px solid rgba(184,118,42,0.2)",
                  position: "relative", overflow: "hidden",
                  marginBottom: 24,
                }}
              >
                {/* Decorative groove lines */}
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    position: "absolute", top: 0, bottom: 0, left: `${20 + i * 30}%`,
                    width: 1, background: "rgba(184,118,42,0.06)",
                    pointerEvents: "none",
                  }} />
                ))}

                {/* Album title */}
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
                  color: "#B8762A", textTransform: "uppercase", marginBottom: 6,
                }}>
                  {tpl.side_label}
                </div>
                <div style={{
                  fontSize: "min(22px, 5.5vw)", fontWeight: 800,
                  color: "#4A3C31", fontFamily: "Georgia, serif",
                  letterSpacing: "-0.01em", marginBottom: 20,
                }}>
                  {tpl.album_title}
                </div>

                {/* Divider */}
                <div style={{
                  height: 1,
                  background: "linear-gradient(90deg, transparent, rgba(184,118,42,0.3), transparent)",
                  marginBottom: 20,
                }} />

                {/* Final message */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.65, duration: 0.8 }}
                  style={{
                    fontSize: "min(17px, 4.3vw)",
                    color: "#4A3C31",
                    fontFamily: "Georgia, serif",
                    lineHeight: 1.7,
                    fontStyle: "italic",
                    margin: 0,
                    marginBottom: 20,
                  }}
                >
                  "{finalMessage}"
                </motion.p>

                {/* Mini record decoration */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <VinylRecord spinning={false} size={48} />
                </div>

                {/* Gold foil shine overlay */}
                <div style={{
                  position: "absolute", top: 0, left: "-60%", right: "-60%", height: "2px",
                  background: "linear-gradient(90deg, transparent, rgba(184,118,42,0.4), rgba(212,160,80,0.6), rgba(184,118,42,0.4), transparent)",
                  pointerEvents: "none",
                }} />
              </motion.div>

              {/* ── Sender view: share ── */}
              {isSender && sleeveReady && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <p style={{
                    textAlign: "center", fontSize: 13, color: "#8A7060",
                    marginBottom: 4, fontStyle: "italic",
                  }}>
                    Share this mixtape with {recipientName} ♪
                  </p>

                  {/* WhatsApp */}
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

                  {/* Copy link */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={copySenderLink}
                    style={{
                      padding: "13px", borderRadius: 14,
                      background: senderCopied ? "rgba(184,118,42,0.15)" : "rgba(74,60,49,0.07)",
                      color: senderCopied ? "#B8762A" : "#4A3C31", fontWeight: 600, fontSize: 14,
                      border: `1.5px solid ${senderCopied ? "rgba(184,118,42,0.4)" : "rgba(74,60,49,0.15)"}`,
                      cursor: "pointer", transition: "all 0.3s",
                    }}
                  >
                    {senderCopied ? "✓ Link Copied!" : "🔗 Copy Link"}
                  </motion.button>

                  {/* Instagram */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={copyForInstagram}
                    style={{
                      padding: "13px", borderRadius: 14,
                      background: senderIgCopied ? "rgba(184,118,42,0.12)" : "rgba(74,60,49,0.05)",
                      color: senderIgCopied ? "#B8762A" : "#8A7060", fontWeight: 600, fontSize: 14,
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

              {/* ── Recipient view ── */}
              {!isSender && !isPreview && sleeveReady && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
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
                    {recipCopied ? "✓ Link Copied!" : "🔗 Save this card"}
                  </motion.button>

                  <Link href="/">
                    <button style={{
                      width: "100%", padding: "11px", borderRadius: 14,
                      background: "linear-gradient(135deg, #C8832E, #B8762A)",
                      color: "#F4ECE1", fontWeight: 600, fontSize: 14,
                      border: "none", cursor: "pointer",
                    }}>
                      ♪ Make your own mixtape card
                    </button>
                  </Link>
                </motion.div>
              )}

              {/* Preview mode: back link */}
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

    </div>
  );
}
