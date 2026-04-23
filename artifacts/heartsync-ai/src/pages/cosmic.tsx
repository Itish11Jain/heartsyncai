import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { getCosmicTemplate, getCosmicFallback, type CosmicStar } from "@/lib/card-templates";

/* ─────────────────────────── types ──────────────────────────────────────── */

type CosmicPhase = "hook" | "spawning" | "tapping" | "supernova" | "final";

interface PlottedStar extends CosmicStar {
  id: number;
  x: number;
  y: number;
}

interface ConstellationLine {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface AmbientDot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  opacity: number;
}

interface BurstDot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  opacity: number;
  decay: number;
  hue: number;
}

interface DustDot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
  life: number;
}

/* ─────────────────────────── constants ──────────────────────────────────── */

const SAFE_ZONES = [
  { minX: 0.10, maxX: 0.44, minY: 0.18, maxY: 0.44 },
  { minX: 0.56, maxX: 0.90, minY: 0.18, maxY: 0.44 },
  { minX: 0.10, maxX: 0.44, minY: 0.56, maxY: 0.82 },
  { minX: 0.56, maxX: 0.90, minY: 0.56, maxY: 0.82 },
];

function plotStars(stars: CosmicStar[]): PlottedStar[] {
  const W = window.innerWidth;
  const H = window.innerHeight;
  return stars.slice(0, 4).map((s, i) => {
    const z = SAFE_ZONES[i];
    return {
      ...s,
      id: i,
      x: (z.minX + Math.random() * (z.maxX - z.minX)) * W,
      y: (z.minY + Math.random() * (z.maxY - z.minY)) * H,
    };
  });
}

function useQueryParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
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
  const isPreview = params.get("preview") === "1" || isSender;
  const isRecipient = !isSender && !isPreview;

  const tpl = getCosmicTemplate(occasion, relation) ?? getCosmicFallback(occasion);
  const finalMessage = customMsg ?? tpl.final_message;

  const senderShareUrl = (() => {
    if (typeof window === "undefined") return "";
    const p = new URLSearchParams(window.location.search);
    p.delete("sender");
    return window.location.origin + window.location.pathname + "?" + p.toString();
  })();

  /* ── state ── */
  const [phase, setPhase] = useState<CosmicPhase>(isPreview ? "final" : "hook");
  const [stars, setStars] = useState<PlottedStar[]>([]);
  const [clickedIds, setClickedIds] = useState<number[]>([]);
  const [lines, setLines] = useState<ConstellationLine[]>([]);
  const [tooltip, setTooltip] = useState<{ emoji: string; text: string } | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [senderCopied, setSenderCopied] = useState(false);
  const [senderIgCopied, setSenderIgCopied] = useState(false);

  /* ── canvas refs ── */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ambientRef = useRef<AmbientDot[]>([]);
  const burstRef = useRef<BurstDot[]>([]);
  const dustRef = useRef<DustDot[]>([]);
  const canvasModeRef = useRef<"ambient" | "golden">("ambient");
  const rafRef = useRef<number>(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── canvas setup ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    onResize();
    window.addEventListener("resize", onResize);
    ambientRef.current = Array.from({ length: 200 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.4 + 0.2,
      opacity: Math.random() * 0.55 + 0.1,
    }));
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ── clear native pre-React splash ── */
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

    /* click burst particles */
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
    const placed = plotStars(tpl.stars);
    setStars(placed);
    setPhase("spawning");
    setTimeout(() => setPhase("tapping"), 900);
  }

  /* ── star click ── */
  function handleStarClick(star: PlottedStar) {
    if (phase !== "tapping" || clickedIds.includes(star.id)) return;

    /* burst particles from star position */
    const burst: BurstDot[] = Array.from({ length: 28 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1.2;
      return {
        x: star.x, y: star.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        r: Math.random() * 2 + 0.8,
        opacity: 0.95,
        decay: 0.025 + Math.random() * 0.025,
        hue: 38 + Math.random() * 20,
      };
    });
    burstRef.current.push(...burst);

    /* tooltip */
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setTooltip({ emoji: star.emoji, text: star.text });
    tooltipTimerRef.current = setTimeout(() => setTooltip(null), 2000);

    /* constellation line from last clicked star */
    const newClickedIds = [...clickedIds, star.id];
    if (clickedIds.length > 0) {
      const prevStar = stars.find(s => s.id === clickedIds[clickedIds.length - 1])!;
      setLines(ls => [...ls, { key: `${prevStar.id}-${star.id}`, x1: prevStar.x, y1: prevStar.y, x2: star.x, y2: star.y }]);
    }
    setClickedIds(newClickedIds);

    /* trigger supernova when all stars clicked */
    if (newClickedIds.length === stars.length) {
      setTimeout(() => triggerSupernova(), 1500);
    }
  }

  /* ── supernova sequence ── */
  function triggerSupernova() {
    setShowFlash(true);
    setTimeout(() => { canvasModeRef.current = "golden"; setPhase("supernova"); }, 500);
    setTimeout(() => { setShowFlash(false); setPhase("final"); }, 1100);
  }

  /* ── sender share ── */
  function shareSenderWhatsApp() {
    const text = `💌 Hey ${recipientName}, I made you something special!\n\nYour surprise is waiting 👇\n${senderShareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
  async function copySenderLinkForInstagram() {
    try { await navigator.clipboard.writeText(senderShareUrl); setSenderIgCopied(true); setTimeout(() => setSenderIgCopied(false), 2500); } catch {}
  }
  async function copySenderLink() {
    try { await navigator.clipboard.writeText(senderShareUrl); setSenderCopied(true); setTimeout(() => setSenderCopied(false), 2500); } catch {}
  }

  const totalStars = stars.length || 4;
  const RING_R = 34;
  const RING_CIRC = 2 * Math.PI * RING_R;

  /* ─────────────────────────── render ────────────────────────────────────── */
  return (
    <div style={{
      position: "fixed", inset: 0, overflow: "hidden",
      background: "radial-gradient(ellipse at 50% 50%, #0e0520 0%, #050112 60%, #020108 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Background canvas */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />

      {/* ══ PHASE 1: Hook ══ */}
      <AnimatePresence>
        {phase === "hook" && (
          <motion.div key="hook"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.7 } }}
            style={{ position: "fixed", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            {/* Nebula glow */}
            <div style={{
              position: "absolute", top: "35%", left: "50%", transform: "translate(-50%,-50%)",
              width: "min(360px,75vw)", height: "min(360px,75vw)", borderRadius: "50%",
              background: "radial-gradient(circle, rgba(90,20,160,0.55) 0%, rgba(40,10,80,0.3) 45%, transparent 70%)",
              filter: "blur(50px)", pointerEvents: "none",
            }} />

            {/* Hook text */}
            <motion.div
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.9 }}
              style={{ marginTop: "max(48px, 11vh)", textAlign: "center", padding: "0 28px", zIndex: 2 }}
            >
              <h1 style={{ fontSize: "min(21px,5.4vw)", fontWeight: 700, color: "#FFD700", letterSpacing: "0.04em", marginBottom: 10, lineHeight: 1.35 }}>
                {tpl.hook_title}
              </h1>
              <p style={{ fontSize: "min(14px,3.6vw)", color: "rgba(200,175,255,0.6)", letterSpacing: "0.07em" }}>
                A stellar surprise awaits…
              </p>
            </motion.div>

            {/* Press & hold energy core */}
            <motion.div
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              style={{ position: "absolute", bottom: "max(60px,14vh)", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, zIndex: 2 }}
            >
              <div
                style={{ position: "relative", width: 84, height: 84, cursor: "pointer", touchAction: "none", userSelect: "none" }}
                onPointerDown={startHold}
                onPointerUp={releaseHold}
                onPointerLeave={releaseHold}
                onPointerCancel={releaseHold}
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
                  animate={{ scale: [1, 1.12, 1], boxShadow: ["0 0 18px rgba(120,60,255,0.55)", "0 0 32px rgba(160,100,255,0.85)", "0 0 18px rgba(120,60,255,0.55)"] }}
                  transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    position: "absolute", inset: 12, borderRadius: "50%",
                    background: `radial-gradient(circle at 38% 35%, hsl(260,70%,${55 + holdProgress * 30}%), hsl(270,90%,${28 + holdProgress * 15}%))`,
                  }}
                />
              </div>
              <p style={{ fontSize: 11, color: "rgba(200,175,255,0.45)", letterSpacing: "0.1em" }}>
                PRESS &amp; HOLD TO IGNITE
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ PHASES 2+3: Star map ══ */}
      <AnimatePresence>
        {(phase === "spawning" || phase === "tapping") && (
          <motion.div key="starmap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            style={{ position: "fixed", inset: 0, zIndex: 10 }}
          >
            {/* Progress prompt */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                position: "absolute", bottom: "max(32px,6vh)", left: "50%", transform: "translateX(-50%)",
                fontSize: 13, color: "rgba(200,175,255,0.65)", letterSpacing: "0.1em",
                background: "rgba(255,255,255,0.05)", borderRadius: 999, padding: "8px 22px",
                border: "1px solid rgba(255,255,255,0.07)", whiteSpace: "nowrap",
              }}
            >
              Discover the stars ({clickedIds.length} / {totalStars})
            </motion.div>

            {/* Stars */}
            {stars.map(star => {
              const clicked = clickedIds.includes(star.id);
              return (
                <motion.div key={star.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: star.id * 0.13, duration: 0.5, type: "spring", bounce: 0.5 }}
                  style={{
                    position: "absolute",
                    left: star.x, top: star.y,
                    transform: "translate(-50%,-50%)",
                    zIndex: 12,
                    cursor: phase === "tapping" && !clicked ? "pointer" : "default",
                  }}
                  onClick={() => handleStarClick(star)}
                >
                  <motion.div
                    animate={clicked ? {} : { scale: [1, 1.22, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut", delay: star.id * 0.28 }}
                    style={{
                      width: "min(60px,14.5vw)", height: "min(60px,14.5vw)",
                      borderRadius: "50%",
                      background: clicked
                        ? "radial-gradient(circle, #FFE566 0%, #FFA500 65%, rgba(255,140,0,0.3) 100%)"
                        : "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(180,140,255,0.35) 70%)",
                      boxShadow: clicked
                        ? "0 0 14px #FFD700, 0 0 40px rgba(255,165,0,0.55), 0 0 80px rgba(255,200,0,0.2)"
                        : "0 0 10px rgba(255,255,255,0.5), 0 0 28px rgba(180,140,255,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "min(26px,6.5vw)", transition: "all 0.3s",
                    }}
                  >
                    {clicked ? star.emoji : "✦"}
                  </motion.div>
                </motion.div>
              );
            })}

            {/* SVG constellation lines */}
            <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 11, overflow: "visible" }}>
              {lines.map(line => (
                <motion.path
                  key={line.key}
                  d={`M ${line.x1} ${line.y1} L ${line.x2} ${line.y2}`}
                  stroke="rgba(255,215,0,0.5)"
                  strokeWidth={1.5}
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.85, ease: "easeOut" }}
                  style={{ filter: "drop-shadow(0 0 5px rgba(255,200,0,0.7))" }}
                />
              ))}
            </svg>

            {/* Glassmorphism tooltip */}
            <AnimatePresence>
              {tooltip && (
                <motion.div key={tooltip.text}
                  initial={{ opacity: 0, scale: 0.8, y: 18 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.82, y: -10 }}
                  transition={{ duration: 0.32 }}
                  style={{
                    position: "fixed", top: "50%", left: "50%",
                    transform: "translate(-50%,-50%)",
                    zIndex: 20, pointerEvents: "none",
                    background: "rgba(18,8,38,0.7)",
                    backdropFilter: "blur(18px)",
                    WebkitBackdropFilter: "blur(18px)",
                    borderRadius: 22,
                    border: "1px solid rgba(200,175,255,0.2)",
                    padding: "22px 30px",
                    textAlign: "center",
                    maxWidth: "min(290px,72vw)",
                    boxShadow: "0 8px 40px rgba(70,20,120,0.4), inset 0 1px 0 rgba(255,255,255,0.07)",
                  }}
                >
                  <div style={{ fontSize: 44, marginBottom: 12 }}>{tooltip.emoji}</div>
                  <p style={{ fontSize: "min(15px,3.8vw)", color: "rgba(225,215,255,0.9)", fontWeight: 500, lineHeight: 1.55, margin: 0 }}>
                    {tooltip.text}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Supernova white flash ══ */}
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

      {/* ══ Final card ══ */}
      <AnimatePresence>
        {phase === "final" && (
          <motion.div key="final"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            style={{
              position: "fixed", inset: 0, zIndex: 30,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "0 20px", overflowY: "auto",
            }}
          >
            {/* Floating holographic card */}
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: "min(350px,calc(100vw - 40px))",
                background: "linear-gradient(145deg, rgba(28,10,55,0.97) 0%, rgba(10,4,28,0.99) 100%)",
                borderRadius: 26,
                border: "1px solid rgba(170,130,255,0.22)",
                padding: "36px 28px",
                textAlign: "center",
                boxShadow: "0 0 50px rgba(100,50,200,0.22), 0 0 120px rgba(70,30,150,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
                position: "relative", overflow: "hidden",
              }}
            >
              {/* Inner nebula */}
              <div style={{
                position: "absolute", top: "35%", left: "50%", transform: "translate(-50%,-50%)",
                width: "75%", height: "60%",
                background: "radial-gradient(ellipse, rgba(110,50,210,0.12) 0%, transparent 70%)",
                pointerEvents: "none",
              }} />

              <motion.p
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                style={{ fontSize: 11, color: "rgba(175,155,255,0.5)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8, zIndex: 1, position: "relative" }}
              >
                {tpl.title_prefix}
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                style={{ fontSize: "min(34px,8.5vw)", fontWeight: 800, color: "#FFD700", marginBottom: 22, letterSpacing: "0.02em", zIndex: 1, position: "relative" }}
              >
                {recipientName}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                style={{ fontSize: "min(15px,3.9vw)", color: "rgba(215,205,255,0.82)", lineHeight: 1.72, margin: 0, zIndex: 1, position: "relative" }}
              >
                {finalMessage}
              </motion.p>

              <motion.div
                animate={{ opacity: [0.35, 0.75, 0.35] }}
                transition={{ duration: 2.8, repeat: Infinity }}
                style={{ marginTop: 26, fontSize: 15, color: "rgba(255,215,0,0.45)", letterSpacing: "0.35em", position: "relative", zIndex: 1 }}
              >
                ✦ ✦ ✦
              </motion.div>
            </motion.div>

            {/* ── Sender share panel ── */}
            {isSender && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.5 }}
                style={{ width: "min(350px,calc(100vw - 40px))", marginTop: 20 }}
              >
                <p style={{ fontSize: 12, color: "rgba(190,170,255,0.4)", textAlign: "center", marginBottom: 12, letterSpacing: "0.06em" }}>
                  ✦ Share this card
                </p>
                <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <button onClick={shareSenderWhatsApp} style={{
                    flex: 1, padding: "12px 8px", borderRadius: 12,
                    background: "rgba(37,211,102,0.1)", border: "1.5px solid rgba(37,211,102,0.28)",
                    color: "rgba(37,211,102,0.9)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}>
                    💬 WhatsApp
                  </button>
                  <button onClick={copySenderLinkForInstagram} style={{
                    flex: 1, padding: "12px 8px", borderRadius: 12,
                    background: "rgba(200,100,200,0.1)", border: "1.5px solid rgba(200,100,200,0.28)",
                    color: "rgba(220,140,255,0.9)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}>
                    {senderIgCopied ? "✅ Copied!" : "📸 Instagram"}
                  </button>
                </div>
                <button onClick={copySenderLink} style={{
                  width: "100%", padding: "11px", borderRadius: 12,
                  background: "rgba(255,215,0,0.07)", border: "1.5px solid rgba(255,215,0,0.18)",
                  color: "rgba(255,215,0,0.7)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}>
                  {senderCopied ? "✅ Link Copied!" : "🔗 Copy Link"}
                </button>
                <div style={{ textAlign: "center", marginTop: 14 }}>
                  <Link href="/send">
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", cursor: "pointer" }}>
                      Make another card
                    </span>
                  </Link>
                </div>
              </motion.div>
            )}

            {/* ── Recipient CTA ── */}
            {isRecipient && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2, duration: 0.5 }}
                style={{ width: "min(300px,calc(100vw - 40px))", textAlign: "center", marginTop: 16, paddingBottom: 8 }}
              >
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 12, letterSpacing: "0.02em", fontWeight: 500 }}>
                  Feeling the love? Send one back ✨
                </p>
                <Link href="/send">
                  <button style={{
                    width: "100%", padding: "14px", borderRadius: 14,
                    background: "rgba(120,60,200,0.16)", border: "1.5px solid rgba(180,140,255,0.32)",
                    color: "rgba(200,180,255,0.9)", fontWeight: 700, fontSize: 15, cursor: "pointer", letterSpacing: "0.02em",
                  }}>
                    💫 Create your own card — free!
                  </button>
                </Link>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back link */}
      <Link href="/send">
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
    </div>
  );
}
