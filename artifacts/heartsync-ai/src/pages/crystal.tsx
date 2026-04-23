/**
 * HeartSync AI — Crystal Ball card template
 * 4-Phase Universal Architecture:
 *   hook       — glowing ball visible, rub-to-clear interaction live
 *   clearing   — brief 700 ms flash/completion transition
 *   visions    — 4 vision orbs float in quadrants; tap each to unlock
 *   revelation — galaxy canvas + holographic final card
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearch } from "wouter";
import { music, crystal as crystalHaptics } from "../lib/audio";
import { getCrystalTemplate, getCrystalFallback } from "../lib/card-templates";
import { trackEvent } from "../lib/trackEvent";

function useQueryParams() {
  const search = useSearch();
  return new URLSearchParams(search);
}

/* ── Safe-zone quadrant layout ── */
const SAFE_ZONES = [
  { cx: 25, cy: 22 },
  { cx: 72, cy: 22 },
  { cx: 25, cy: 68 },
  { cx: 72, cy: 68 },
];

type Phase = "hook" | "clearing" | "visions" | "revelation";

/* ══════════════════════════════════════════════════════════════
   CrystalCanvas — ambient mist (hook/clearing) | galaxy (revelation)
   ══════════════════════════════════════════════════════════════ */
function CrystalCanvas({
  mode,
  clearProgress,
  ballRef,
}: {
  mode: "mist" | "galaxy";
  clearProgress: number;
  ballRef: React.RefObject<HTMLDivElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<
    { x: number; y: number; vx: number; vy: number; r: number; alpha: number; hue: number; life: number }[]
  >([]);
  const starsRef = useRef<{ x: number; y: number; r: number; alpha: number; twinkle: number }[]>([]);
  const shootersRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    function seedMist() {
      const ball = ballRef.current;
      if (!ball) return;
      const rect = ball.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const r = rect.width / 2;
      particlesRef.current = Array.from({ length: 55 }, () => {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * r * 0.88;
        return {
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 6 + 2,
          alpha: Math.random() * 0.45 + 0.1,
          hue: 270 + Math.random() * 60,
          life: Math.random(),
        };
      });
    }

    function seedStars() {
      if (!canvas) return;
      starsRef.current = Array.from({ length: 180 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.8 + 0.3,
        alpha: Math.random() * 0.7 + 0.15,
        twinkle: Math.random() * Math.PI * 2,
      }));
    }

    seedMist();
    seedStars();

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mode === "mist") {
        const ball = ballRef.current;
        if (!ball) { rafRef.current = requestAnimationFrame(draw); return; }
        const rect = ball.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const r = rect.width / 2;
        const mistOpacity = Math.max(0, 1 - clearProgress * 1.1);

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.93, 0, Math.PI * 2);
        ctx.clip();

        particlesRef.current.forEach((p) => {
          const angle = Math.atan2(p.y - cy, p.x - cx);
          p.vx += -Math.sin(angle) * 0.0025;
          p.vy += Math.cos(angle) * 0.0025;
          p.vx *= 0.985; p.vy *= 0.985;
          p.x += p.vx; p.y += p.vy;
          const dx = p.x - cx, dy = p.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > r * 0.88) {
            p.x = cx + (dx / dist) * r * 0.85;
            p.y = cy + (dy / dist) * r * 0.85;
            p.vx *= -0.6; p.vy *= -0.6;
          }
          p.life = (p.life + 0.004) % 1;
          const localAlpha = p.alpha * mistOpacity * Math.sin(p.life * Math.PI);
          ctx.beginPath();
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.5);
          grad.addColorStop(0, `hsla(${p.hue},65%,80%,${localAlpha})`);
          grad.addColorStop(1, `hsla(${p.hue},65%,80%,0)`);
          ctx.fillStyle = grad;
          ctx.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      } else {
        /* Galaxy */
        starsRef.current.forEach((s) => {
          s.twinkle += 0.03;
          const a = s.alpha * (0.65 + 0.35 * Math.sin(s.twinkle));
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(220,210,255,${a})`;
          ctx.fill();
        });
        if (Math.random() < 0.015) {
          shootersRef.current.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.5,
            vx: 4 + Math.random() * 3,
            vy: 1.5 + Math.random() * 2,
            life: 0,
            maxLife: 35 + Math.random() * 25,
          });
        }
        shootersRef.current = shootersRef.current.filter(s => s.life < s.maxLife);
        shootersRef.current.forEach((s) => {
          s.x += s.vx; s.y += s.vy; s.life++;
          const prog = s.life / s.maxLife;
          const a = Math.sin(prog * Math.PI) * 0.8;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - s.vx * 8, s.y - s.vy * 8);
          ctx.strokeStyle = `rgba(220,200,255,${a})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.restore();
        });
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); };
  }, [mode, clearProgress, ballRef]);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />;
}

/* ══════════════════════════════════════════════════════════════
   BurstCanvas — 35 prismatic particles at tap coordinates
   ══════════════════════════════════════════════════════════════ */
function BurstCanvas({ bursts }: { bursts: { id: number; x: number; y: number; startTime: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlePoolRef = useRef<
    {
      burstId: number;
      x: number; y: number; vx: number; vy: number;
      hue: number; alpha: number; life: number; maxLife: number; r: number;
    }[]
  >([]);

  /* When a new burst is added, seed its particles */
  const lastBurstCount = useRef(0);
  useEffect(() => {
    const newBursts = bursts.slice(lastBurstCount.current);
    newBursts.forEach((b) => {
      for (let i = 0; i < 35; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.5 + Math.random() * 4;
        particlePoolRef.current.push({
          burstId: b.id,
          x: b.x, y: b.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          hue: Math.floor(Math.random() * 360),
          alpha: 0.9,
          life: 0,
          maxLife: 35 + Math.floor(Math.random() * 20),
          r: 2 + Math.random() * 3,
        });
      }
    });
    lastBurstCount.current = bursts.length;
  }, [bursts]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlePoolRef.current = particlePoolRef.current.filter(p => p.life < p.maxLife);
      particlePoolRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // subtle gravity
        p.vx *= 0.97;
        p.life++;
        p.alpha = (1 - p.life / p.maxLife) * 0.9;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grad.addColorStop(0, `hsla(${p.hue},100%,75%,${p.alpha})`);
        grad.addColorStop(1, `hsla(${(p.hue + 60) % 360},100%,80%,0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });
      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 25 }} />;
}

/* ══════════════════════════════════════════════════════════════
   CrystalCard — main export
   ══════════════════════════════════════════════════════════════ */
export default function CrystalCard() {
  const params = useQueryParams();

  const recipientName = params.get("to") || "Friend";
  const occasion = params.get("occasion") || "feel_good";
  const relation = params.get("relation") || "friend";
  const isPreview = params.get("preview") === "1";
  const isSender = params.get("sender") === "1";
  const isRecipient = !isSender;

  const tpl = getCrystalTemplate(occasion, relation) ?? getCrystalFallback(occasion);
  const finalMessage = (() => {
    try {
      const raw = params.get("msg");
      if (raw) return decodeURIComponent(escape(atob(raw)));
    } catch { /* */ }
    return tpl.final_message;
  })();

  const [phase, setPhase] = useState<Phase>(isPreview ? "visions" : "hook");
  const [tappedOrbs, setTappedOrbs] = useState<Set<number>>(new Set());
  const [tooltip, setTooltip] = useState<{ emoji: string; text: string } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Rub mechanic */
  const clearProgressRef = useRef(0);
  const [clearDisplay, setClearDisplay] = useState(0);
  const isDragging = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const RUB_TARGET = 280;

  /* Canvas bursts */
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number; startTime: number }[]>([]);
  const burstId = useRef(0);

  /* Share state */
  const [senderCopied, setSenderCopied] = useState(false);
  const [senderIgCopied, setSenderIgCopied] = useState(false);

  const ballRef = useRef<HTMLDivElement | null>(null);

  /* Music + analytics */
  useEffect(() => {
    music.start("crystal");
    if (isRecipient && !isPreview) {
      trackEvent({ event: "card_viewed", occasion, template: "crystal" });
    }
    return () => music.stop();
  }, []);

  /* clearing → visions auto-advance after 700ms */
  useEffect(() => {
    if (phase !== "clearing") return;
    const t = setTimeout(() => setPhase("visions"), 700);
    return () => clearTimeout(t);
  }, [phase]);

  /* Rub pointer handlers — active in hook phase */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (phase !== "hook") return;
      isDragging.current = true;
      lastPt.current = { x: e.clientX, y: e.clientY };
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* */ }
    },
    [phase],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current || !lastPt.current) return;
      const dx = e.clientX - lastPt.current.x;
      const dy = e.clientY - lastPt.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      lastPt.current = { x: e.clientX, y: e.clientY };

      clearProgressRef.current = Math.min(1, clearProgressRef.current + dist / RUB_TARGET);
      setClearDisplay(clearProgressRef.current);

      if (dist > 4) crystalHaptics.rubPulse();

      if (clearProgressRef.current >= 1) {
        isDragging.current = false;
        crystalHaptics.reveal();
        setPhase("clearing");
      }
    },
    [],
  );

  const handlePointerUp = useCallback(() => { isDragging.current = false; }, []);

  /* Orb tap — onPointerDown for instant response */
  const handleOrbPointerDown = useCallback(
    (idx: number, e: React.PointerEvent) => {
      if (phase !== "visions") return;
      e.stopPropagation();
      crystalHaptics.visionTap();
      crystalHaptics.shatter();

      setBursts((prev) => [
        ...prev,
        { id: ++burstId.current, x: e.clientX, y: e.clientY, startTime: Date.now() },
      ]);

      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      setTooltip({ emoji: tpl.nodes[idx].emoji, text: tpl.nodes[idx].text });
      tooltipTimer.current = setTimeout(() => setTooltip(null), 2200);

      setTappedOrbs((prev) => {
        const next = new Set(prev);
        next.add(idx);
        if (next.size === tpl.nodes.length) {
          setTimeout(() => setPhase("revelation"), 600);
        }
        return next;
      });
    },
    [phase, tpl.nodes],
  );

  /* Share helpers */
  function cardUrl() {
    const base = window.location.origin + (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    const p = new URLSearchParams({ to: recipientName, occasion, relation, template: "crystal" });
    const msgParam = params.get("msg");
    if (msgParam) p.set("msg", msgParam);
    const ref = params.get("ref");
    if (ref) p.set("ref", ref);
    return `${base}/card?${p.toString()}`;
  }

  function shareSenderWhatsApp() {
    trackEvent({ event: "card_shared", channel: "whatsapp", template: "crystal", occasion });
    const text = `✦ The crystal ball has a message for you, ${recipientName}! Open your vision 🔮\n${cardUrl()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  async function copySenderLinkForInstagram() {
    trackEvent({ event: "card_shared", channel: "instagram", template: "crystal", occasion });
    await navigator.clipboard.writeText(cardUrl()).catch(() => {});
    setSenderIgCopied(true);
    setTimeout(() => setSenderIgCopied(false), 2500);
  }

  async function copySenderLink() {
    trackEvent({ event: "card_shared", channel: "link", template: "crystal", occasion });
    crystalHaptics.copy();
    await navigator.clipboard.writeText(cardUrl()).catch(() => {});
    setSenderCopied(true);
    setTimeout(() => setSenderCopied(false), 2500);
  }

  const BALL_SIZE = "min(250px, 80vw)";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          phase === "revelation"
            ? "radial-gradient(ellipse at 50% 35%, rgba(50,10,110,0.85) 0%, rgba(8,4,28,1) 80%)"
            : "radial-gradient(ellipse at 50% 40%, rgba(70,20,140,0.88) 0%, rgba(12,4,36,1) 75%)",
        overflow: "hidden",
        touchAction: phase === "hook" ? "none" : "auto",
        userSelect: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Nebula glow */}
      <div style={{
        position: "fixed", inset: 0,
        background: "radial-gradient(ellipse 80% 60% at 50% 55%, rgba(100,40,200,0.12) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Ambient canvas */}
      {(phase === "hook" || phase === "clearing" || phase === "visions" || phase === "revelation") && (
        <CrystalCanvas
          mode={phase === "revelation" ? "galaxy" : "mist"}
          clearProgress={clearDisplay}
          ballRef={ballRef}
        />
      )}

      {/* Prismatic burst canvas */}
      <BurstCanvas bursts={bursts} />

      {/* ══ Hook + Clearing phase — crystal ball visible ══ */}
      <AnimatePresence>
        {(phase === "hook" || phase === "clearing") && (
          <motion.div
            key="hook-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "clearing" ? [1, 1, 0] : 1 }}
            transition={phase === "clearing" ? { duration: 0.7, times: [0, 0.5, 1] } : { duration: 0.6 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 5,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "0 24px",
            }}
          >
            {/* Hook title */}
            <motion.p
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              style={{
                fontSize: "min(18px, 4.5vw)",
                color: "rgba(220,190,255,0.88)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textAlign: "center",
                marginBottom: 28,
                textShadow: "0 0 18px rgba(160,100,255,0.55)",
              }}
            >
              {tpl.hook_title}
            </motion.p>

            {/* Crystal ball sphere */}
            <motion.div
              ref={ballRef}
              animate={{
                boxShadow: [
                  "0 0 40px 14px rgba(130,60,240,0.35)",
                  "0 0 70px 24px rgba(160,90,255,0.55)",
                  "0 0 40px 14px rgba(130,60,240,0.35)",
                ],
              }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: BALL_SIZE,
                height: BALL_SIZE,
                borderRadius: "50%",
                flexShrink: 0,
                position: "relative",
                cursor: phase === "hook" ? "grab" : "default",
              }}
            >
              <div style={{
                width: "100%", height: "100%",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 38% 32%, rgba(200,170,255,0.25) 0%, rgba(100,40,200,0.65) 40%, rgba(30,8,80,0.92) 75%, rgba(15,4,48,0.98) 100%)",
                border: "1.5px solid rgba(180,140,255,0.35)",
                position: "relative",
                overflow: "hidden",
              }}>
                {/* Shimmer highlight */}
                <div style={{
                  position: "absolute", top: "10%", left: "15%", width: "35%", height: "28%",
                  borderRadius: "50%",
                  background: "radial-gradient(ellipse, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 100%)",
                  transform: "rotate(-20deg)",
                }} />
                {/* Centre glow */}
                <motion.div
                  animate={{ opacity: [0.35, 0.75, 0.35] }}
                  transition={{ duration: 2.6, repeat: Infinity }}
                  style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%,-50%)",
                    width: "50%", height: "50%",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(180,120,255,0.45) 0%, transparent 70%)",
                  }}
                />
                {/* Mist veil fades as cleared */}
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "radial-gradient(circle at 50% 55%, rgba(140,100,220,0.22) 0%, rgba(60,20,120,0.18) 60%, transparent 100%)",
                  opacity: Math.max(0, 1 - clearDisplay * 1.3),
                  transition: "opacity 0.15s",
                  pointerEvents: "none",
                }} />
                {/* Progress ring */}
                {clearDisplay > 0 && (
                  <svg style={{
                    position: "absolute", inset: 0, width: "100%", height: "100%",
                    transform: "rotate(-90deg)", pointerEvents: "none",
                  }} viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r="47"
                      fill="none"
                      stroke="rgba(200,160,255,0.55)"
                      strokeWidth="2.5"
                      strokeDasharray={`${clearDisplay * 295.3} 295.3`}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>

              {/* Pulse ring */}
              {phase === "hook" && (
                <motion.div
                  animate={{ scale: [1, 1.22, 1], opacity: [0.42, 0, 0.42] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    border: "1.5px solid rgba(180,130,255,0.42)",
                    pointerEvents: "none",
                  }}
                />
              )}
            </motion.div>

            {/* Pedestal */}
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: "min(90px, 22vw)", height: 10,
                background: "linear-gradient(90deg, transparent, rgba(160,120,255,0.35), transparent)",
                borderRadius: 999,
              }} />
              <div style={{
                width: "min(50px, 13vw)", height: 18,
                background: "linear-gradient(180deg, rgba(140,100,220,0.28) 0%, rgba(80,40,160,0.18) 100%)",
                borderRadius: "0 0 8px 8px", marginTop: -2,
              }} />
              <div style={{
                width: "min(80px, 20vw)", height: 8,
                background: "linear-gradient(90deg, transparent, rgba(160,120,255,0.22), transparent)",
                borderRadius: 999, marginTop: 1,
              }} />
            </div>

            {/* Instruction */}
            {phase === "hook" && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: [0, 0.85, 0.85, 0.55] }}
                transition={{ duration: 2.2, times: [0, 0.2, 0.7, 1], repeat: Infinity, delay: 0.5 }}
                style={{
                  marginTop: 28,
                  fontSize: "min(14px, 3.6vw)",
                  color: "rgba(200,170,255,0.7)",
                  letterSpacing: "0.1em",
                  textAlign: "center",
                  pointerEvents: "none",
                }}
              >
                ✦ rub to clear the mist ✦
              </motion.p>
            )}

            {/* Clearing flash overlay */}
            {phase === "clearing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.55, 0] }}
                transition={{ duration: 0.7 }}
                style={{
                  position: "fixed", inset: 0,
                  background: "radial-gradient(ellipse at 50% 45%, rgba(200,160,255,0.55) 0%, rgba(100,50,200,0.18) 60%, transparent 85%)",
                  pointerEvents: "none", zIndex: 20,
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Visions phase — 4 floating orbs ══ */}
      <AnimatePresence>
        {phase === "visions" && (
          <motion.div
            key="visions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            style={{
              position: "fixed", inset: 0, zIndex: 8,
              background: "radial-gradient(ellipse at 50% 45%, rgba(90,30,160,0.75) 0%, rgba(20,6,50,0.98) 70%)",
            }}
          >
            {/* Hint */}
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 0.55 }} transition={{ delay: 0.8 }}
              style={{
                position: "absolute",
                bottom: "max(28px, env(safe-area-inset-bottom, 28px))",
                left: 0, right: 0, textAlign: "center",
                fontSize: "min(12px, 3vw)",
                color: "rgba(200,170,255,0.7)",
                letterSpacing: "0.14em",
                pointerEvents: "none", zIndex: 2,
              }}
            >
              {tappedOrbs.size === tpl.nodes.length
                ? "✦ all visions revealed ✦"
                : `✦ tap each vision orb — ${tappedOrbs.size} / ${tpl.nodes.length} ✦`}
            </motion.p>

            {/* Orbs */}
            {tpl.nodes.map((node, idx) => {
              const zone = SAFE_ZONES[idx];
              const tapped = tappedOrbs.has(idx);
              const ORB_SIZE = "min(68px, 17vw)";
              return (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + idx * 0.18, type: "spring", stiffness: 180, damping: 16 }}
                  onPointerDown={(e) => handleOrbPointerDown(idx, e)}
                  style={{
                    position: "absolute",
                    left: `${zone.cx}%`, top: `${zone.cy}%`,
                    transform: "translate(-50%,-50%)",
                    width: ORB_SIZE, height: ORB_SIZE,
                    borderRadius: "50%",
                    border: tapped ? "2px solid rgba(220,200,255,0.65)" : "1.5px solid rgba(180,140,255,0.4)",
                    background: tapped
                      ? "linear-gradient(135deg, rgba(160,100,255,0.45), rgba(80,30,180,0.65))"
                      : "linear-gradient(135deg, rgba(100,50,200,0.35), rgba(40,10,100,0.55))",
                    boxShadow: tapped
                      ? "0 0 22px rgba(180,130,255,0.55), inset 0 0 12px rgba(255,255,255,0.08)"
                      : "0 0 10px rgba(130,80,220,0.3)",
                    backdropFilter: "blur(8px)",
                    cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    zIndex: 10, padding: 0, transition: "background 0.3s, box-shadow 0.3s",
                  }}
                >
                  <motion.div
                    animate={!tapped ? { y: [0, -6, 0], opacity: [0.75, 1, 0.75] } : { y: 0, opacity: 1 }}
                    transition={!tapped ? { duration: 2.8 + idx * 0.4, repeat: Infinity, ease: "easeInOut", delay: idx * 0.35 } : {}}
                    style={{ fontSize: "min(26px, 6.5vw)" }}
                  >
                    {tapped ? node.emoji : "🔮"}
                  </motion.div>
                  {tapped && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                      style={{ fontSize: "min(9px, 2.2vw)", color: "rgba(220,200,255,0.9)", marginTop: 4, fontWeight: 600 }}
                    >
                      ✦
                    </motion.div>
                  )}
                </motion.button>
              );
            })}

            {/* Glassmorphism tooltip */}
            <AnimatePresence>
              {tooltip && (
                <motion.div
                  key={tooltip.text}
                  initial={{ opacity: 0, scale: 0.82, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.82, y: -10 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    position: "fixed",
                    bottom: "max(80px, env(safe-area-inset-bottom, 80px))",
                    left: 16, right: 16, zIndex: 20, pointerEvents: "none",
                    background: "rgba(14,6,36,0.6)",
                    borderRadius: 18,
                    border: "1px solid rgba(180,140,255,0.25)",
                    padding: "16px 22px", textAlign: "center",
                    boxShadow: "0 4px 30px rgba(80,30,150,0.35)",
                    backdropFilter: "blur(16px)",
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 10 }}>{tooltip.emoji}</div>
                  <p style={{ fontSize: "min(14px, 3.8vw)", color: "rgba(220,210,255,0.92)", fontWeight: 500, lineHeight: 1.55, margin: 0 }}>
                    {tooltip.text}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Revelation — final card ══ */}
      <AnimatePresence>
        {phase === "revelation" && (
          <motion.div
            key="revelation"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9 }}
            style={{
              position: "fixed", inset: 0, zIndex: 30,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "0 20px", overflowY: "auto",
            }}
          >
            {/* Floating holographic card */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: "min(340px, calc(100vw - 40px))",
                background: "linear-gradient(145deg, rgba(42,12,80,0.98) 0%, rgba(16,4,44,0.99) 100%)",
                borderRadius: 26,
                border: "1.5px solid rgba(190,150,255,0.45)",
                padding: "38px 30px", textAlign: "center",
                boxShadow: "0 0 60px rgba(130,60,240,0.38), 0 0 140px rgba(100,40,200,0.18), inset 0 1px 0 rgba(255,255,255,0.1)",
                position: "relative", overflow: "hidden",
              }}
            >
              {/* Iridescent shimmer sweep */}
              <motion.div
                animate={{ x: ["-120%", "120%"] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
                style={{
                  position: "absolute", top: 0, left: 0, width: "60%", height: "100%",
                  background: "linear-gradient(105deg, transparent, rgba(200,160,255,0.06), rgba(255,220,200,0.04), transparent)",
                  pointerEvents: "none",
                }}
              />
              {/* Nebula glow */}
              <div style={{
                position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)",
                width: "75%", height: "60%",
                background: "radial-gradient(ellipse, rgba(120,50,230,0.12) 0%, transparent 70%)",
                pointerEvents: "none",
              }} />

              <motion.div
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                style={{ fontSize: 36, marginBottom: 14, position: "relative", zIndex: 1 }}
              >
                🔮
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                style={{ fontSize: 11, color: "rgba(210,185,255,0.78)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8, zIndex: 1, position: "relative" }}
              >
                {tpl.title_prefix}
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}
                style={{
                  fontSize: "min(34px, 8.5vw)", fontWeight: 800, color: "#e2d0ff",
                  marginBottom: 22, letterSpacing: "0.02em", zIndex: 1, position: "relative",
                  textShadow: "0 0 20px rgba(160,100,255,0.45)",
                }}
              >
                {recipientName}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                style={{ fontSize: "min(15px, 3.9vw)", color: "rgba(232,220,255,0.94)", lineHeight: 1.75, margin: 0, zIndex: 1, position: "relative" }}
              >
                {finalMessage}
              </motion.p>

              <motion.div
                animate={{ opacity: [0.3, 0.75, 0.3] }} transition={{ duration: 3, repeat: Infinity }}
                style={{ marginTop: 24, fontSize: 14, color: "rgba(200,170,255,0.5)", letterSpacing: "0.35em", position: "relative", zIndex: 1 }}
              >
                ✦ ✦ ✦
              </motion.div>

              {isRecipient && (
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 0.38 }} transition={{ delay: 1.4 }}
                  style={{ marginTop: 18, fontSize: 10, color: "rgba(200,170,255,0.5)", letterSpacing: "0.1em", position: "relative", zIndex: 1 }}
                >
                  ✦ sent with HeartSync AI ✦
                </motion.p>
              )}
            </motion.div>

            {/* ── Sender share panel ── */}
            {isSender && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.5 }}
                style={{ width: "min(340px, calc(100vw - 40px))", marginTop: 20 }}
              >
                <p style={{ fontSize: 12, color: "rgba(190,160,255,0.38)", textAlign: "center", marginBottom: 12, letterSpacing: "0.08em" }}>
                  ✦ share this card
                </p>
                <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <button onClick={shareSenderWhatsApp} style={{
                    flex: 1, padding: "12px 8px", borderRadius: 12,
                    background: "rgba(37,211,102,0.09)", border: "1.5px solid rgba(37,211,102,0.26)",
                    color: "rgba(37,211,102,0.88)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}>💬 WhatsApp</button>
                  <button onClick={copySenderLinkForInstagram} style={{
                    flex: 1, padding: "12px 8px", borderRadius: 12,
                    background: "rgba(200,100,200,0.09)", border: "1.5px solid rgba(200,100,200,0.26)",
                    color: "rgba(220,140,255,0.88)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}>{senderIgCopied ? "✅ Copied!" : "📸 Instagram"}</button>
                </div>
                <button onClick={copySenderLink} style={{
                  width: "100%", padding: "11px", borderRadius: 12,
                  background: "rgba(180,130,255,0.08)", border: "1.5px solid rgba(180,130,255,0.22)",
                  color: "rgba(200,170,255,0.75)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}>{senderCopied ? "✅ Link Copied!" : "🔗 Copy Link"}</button>
                <div style={{ textAlign: "center", marginTop: 14 }}>
                  <Link href="/send?ref=card">
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
                style={{ width: "min(300px, calc(100vw - 40px))", textAlign: "center", marginTop: 18, paddingBottom: 8 }}
              >
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.48)", marginBottom: 12, letterSpacing: "0.02em", fontWeight: 500 }}>
                  Feeling the magic? Send one back ✦
                </p>
                <Link href="/send?ref=card">
                  <button style={{
                    width: "100%", padding: "14px", borderRadius: 14,
                    background: "rgba(120,60,200,0.14)", border: "1.5px solid rgba(180,130,255,0.3)",
                    color: "rgba(210,185,255,0.9)", fontWeight: 700, fontSize: 15, cursor: "pointer", letterSpacing: "0.02em",
                  }}>🔮 Create your own card — free!</button>
                </Link>
              </motion.div>
            )}
          </motion.div>
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
    </div>
  );
}
