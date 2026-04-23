/**
 * HeartSync AI — Crystal Ball card template
 *
 * 4-Phase Universal Architecture:
 *   hook       — misted crystal ball, rub-to-clear interaction
 *   clearing   — 700ms white-flash transition after rub completes
 *   visions    — 4 orbs float out to quadrants; tap each to reveal
 *   revelation — galaxy canvas + holographic final card
 *
 * Canvas: single fixed RAF loop; phaseRef + clearProgressRef prevent stale closures.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearch } from "wouter";
import { music, crystal as crystalHaptics } from "../lib/audio";
import { getCrystalTemplate, getCrystalFallback } from "../lib/card-templates";
import { trackEvent } from "../lib/trackEvent";

/* ── helpers ── */
function useQueryParams() {
  const search = useSearch();
  return new URLSearchParams(search);
}

/* ── SAFE_ZONES — 4 quadrant positions (% of viewport) ── */
const SAFE_ZONES = [
  { cx: 25, cy: 22 },
  { cx: 72, cy: 22 },
  { cx: 25, cy: 68 },
  { cx: 72, cy: 68 },
];

type CrystalPhase = "hook" | "clearing" | "visions" | "revelation";

/* ────────────────────────────────────────────────────────────────
   CrystalCard — main export
   ──────────────────────────────────────────────────────────────── */
export default function CrystalCard() {
  const params = useQueryParams();
  const recipientName = params.get("to") || "Friend";
  const occasion     = params.get("occasion") || "feel_good";
  const relation     = params.get("relation") || "friend";
  const likesParam   = params.get("likes") || "";
  const isPreview    = params.get("preview") === "1";
  const isSender     = params.get("sender") === "1";
  const isRecipient  = !isSender;

  const tpl = getCrystalTemplate(occasion, relation) ?? getCrystalFallback(occasion);
  const finalMessage = (() => {
    try {
      const raw = params.get("msg");
      if (raw) return decodeURIComponent(escape(atob(raw)));
    } catch { /* */ }
    return tpl.final_message;
  })();
  const likesChips = likesParam ? likesParam.split(",").map(s => s.trim()).filter(Boolean) : [];

  /* ── Phase state ── */
  const [phase, setPhase] = useState<CrystalPhase>(isPreview ? "visions" : "hook");
  const phaseRef = useRef<CrystalPhase>(isPreview ? "visions" : "hook");
  function advancePhase(p: CrystalPhase) { phaseRef.current = p; setPhase(p); }

  /* ── Rub mechanic ── */
  const clearProgressRef = useRef(0);
  const [clearDisplay, setClearDisplay] = useState(0);
  const isRubbingRef    = useRef(false);
  const lastPtrRef      = useRef<{ x: number; y: number } | null>(null);
  const totalRubRef     = useRef(0);
  const hapticDistRef   = useRef(0); // tracks distance since last haptic pulse
  const RUB_TARGET      = 280;
  const HAPTIC_INTERVAL = 60;

  /* ── Orb state ── */
  const [tappedOrbs, setTappedOrbs]   = useState<Set<number>>(new Set());
  const tappedOrbsRef = useRef<Set<number>>(new Set());
  const [tooltip, setTooltip]         = useState<{ emoji: string; text: string } | null>(null);
  const tooltipTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orbsDoneRef   = useRef(false);

  /* ── Orb + ball exit animation state ── */
  const [orbsExiting, setOrbsExiting] = useState(false);
  const [ballExiting, setBallExiting] = useState(false);

  /* ── Share state ── */
  const [senderCopied,   setSenderCopied]   = useState(false);
  const [senderIgCopied, setSenderIgCopied] = useState(false);

  /* ── Canvas ── */
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number>(0);
  const ballBoundsRef = useRef<{ cx: number; cy: number; r: number } | null>(null);

  /* Particle pools */
  interface MistDot { x: number; y: number; vx: number; vy: number; r: number; opacity: number; hue: number; life: number; }
  interface SparkDot { x: number; y: number; vx: number; vy: number; r: number; opacity: number; }
  interface ShardDot { x: number; y: number; vx: number; vy: number; r: number; opacity: number; decay: number; hue: number; }
  interface Star     { x: number; y: number; vx: number; vy: number; r: number; opacity: number; twinkle: number; }
  interface Shooter  { x: number; y: number; vx: number; vy: number; len: number; opacity: number; active: boolean; wait: number; }

  const mistRef   = useRef<MistDot[]>([]);
  const sparksRef = useRef<SparkDot[]>([]);
  const shardsRef = useRef<ShardDot[]>([]);
  const starsRef  = useRef<Star[]>([]);
  const shootersRef = useRef<Shooter[]>([]);

  /* ── Music + analytics on mount ── */
  useEffect(() => {
    music.start("crystal");
    if (isRecipient && !isPreview) {
      trackEvent({ event: "card_viewed", occasion, template: "crystal" });
    }
    return () => music.stop();
  }, []);

  /* ── clearing → visions auto-advance after 700ms ── */
  useEffect(() => {
    if (phase !== "clearing") return;
    const t = setTimeout(() => advancePhase("visions"), 700);
    return () => clearTimeout(t);
  }, [phase]);

  /* ── Canvas RAF ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = () => canvas.width;
    const H = () => canvas.height;

    /* Seed functions */
    function seedMist() {
      const b = ballBoundsRef.current;
      if (!b) return;
      mistRef.current = Array.from({ length: 50 }, () => {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * b.r * 0.82;
        return {
          x: b.cx + Math.cos(a) * d, y: b.cy + Math.sin(a) * d,
          vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
          r: 2 + Math.random() * 3, opacity: 0.3 + Math.random() * 0.3,
          hue: 220 + Math.random() * 60, life: Math.random() * Math.PI * 2,
        };
      });
    }

    function seedSparks() {
      sparksRef.current = Array.from({ length: 25 }, () => ({
        x: Math.random() * W(), y: Math.random() * H(),
        vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
        r: 1 + Math.random() * 1.5, opacity: 0.3 + Math.random() * 0.4,
      }));
    }

    function seedGalaxy(w: number, h: number) {
      starsRef.current = Array.from({ length: 180 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12,
        r: 0.5 + Math.random() * 2, opacity: 0.25 + Math.random() * 0.55,
        twinkle: Math.random() * Math.PI * 2,
      }));
      /* 6 shooting stars with staggered waits */
      shootersRef.current = Array.from({ length: 6 }, () => makeShooter(w, h, true));
    }

    function makeShooter(w: number, h: number, randomWait = false): Shooter {
      const startEdge = Math.random() < 0.5 ? "top" : "left";
      const x = startEdge === "top" ? Math.random() * w : 0;
      const y = startEdge === "top" ? 0 : Math.random() * h * 0.5;
      const angle = (Math.PI / 6) + Math.random() * (Math.PI / 6);
      const speed = 12 + Math.random() * 8;
      return {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        len: 8 + Math.random() * 6,
        opacity: 0,
        active: false,
        wait: randomWait ? Math.random() * 240 : 0,
      };
    }

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      seedSparks();
      if (phaseRef.current === "revelation") {
        seedGalaxy(canvas.width, canvas.height);
      }
    }
    resize();
    window.addEventListener("resize", resize);
    seedMist();

    /* Nebula positions (fixed) */
    const nebulae = [
      { x: 0.25, y: 0.3,  r: 0.35, hue: 270 },
      { x: 0.72, y: 0.6,  r: 0.28, hue: 290 },
      { x: 0.5,  y: 0.15, r: 0.22, hue: 250 },
      { x: 0.4,  y: 0.8,  r: 0.3,  hue: 280 },
    ];

    let t = 0;
    let galaxySeeded = false;

    function draw() {
      if (!canvas || !ctx) return;
      const p = phaseRef.current;
      const cp = clearProgressRef.current;
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);
      t += 0.014;

      if (p === "revelation") {
        /* ── Galaxy mode ── */
        if (!galaxySeeded) { seedGalaxy(w, h); galaxySeeded = true; }

        /* 1. Nebula wash */
        nebulae.forEach(n => {
          const grad = ctx.createRadialGradient(n.x * w, n.y * h, 0, n.x * w, n.y * h, n.r * Math.min(w, h));
          grad.addColorStop(0, `hsla(${n.hue},60%,30%,0.045)`);
          grad.addColorStop(1, `hsla(${n.hue},60%,20%,0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(n.x * w, n.y * h, n.r * Math.min(w, h), 0, Math.PI * 2);
          ctx.fill();
        });

        /* 2. Star field */
        starsRef.current.forEach(s => {
          s.x += s.vx; s.y += s.vy;
          if (s.x < 0) s.x = w; if (s.x > w) s.x = 0;
          if (s.y < 0) s.y = h; if (s.y > h) s.y = 0;
          s.twinkle += 0.028;
          const a = s.opacity * (0.65 + 0.35 * Math.sin(s.twinkle));
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(210,200,255,${a})`;
          ctx.fill();
        });

        /* 3. Shooting stars */
        shootersRef.current.forEach((s, i) => {
          if (s.wait > 0) { s.wait--; return; }
          if (!s.active) { s.active = true; s.opacity = 0; }
          s.x += s.vx; s.y += s.vy;
          s.opacity = Math.min(1, s.opacity + 0.12);

          /* Draw streak */
          ctx.save();
          const tailX = s.x - s.vx * s.len;
          const tailY = s.y - s.vy * s.len;
          const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
          grad.addColorStop(0, `rgba(255,255,255,0)`);
          grad.addColorStop(1, `rgba(255,255,255,${s.opacity * 0.9})`);
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(s.x, s.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();

          /* Reset when off-screen */
          if (s.x > w + 50 || s.y > h + 50) {
            const fresh = makeShooter(w, h);
            fresh.wait = 60 + Math.floor(Math.random() * 180); // 1-4s at 60fps
            shootersRef.current[i] = fresh;
          }
        });

        /* Shards on top */
        shardsRef.current = shardsRef.current.filter(s => s.opacity > 0.01);
        shardsRef.current.forEach(s => {
          s.x += s.vx; s.y += s.vy;
          s.vy += 0.07;
          s.vx *= 0.97;
          s.opacity -= s.decay;
          if (s.opacity <= 0) return;
          const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
          grad.addColorStop(0, `hsla(${s.hue},100%,75%,${s.opacity})`);
          grad.addColorStop(1, `hsla(${(s.hue + 60) % 360},100%,80%,0)`);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        });

      } else {
        /* ── Ambient mode (hook / clearing / visions) ── */
        const b = ballBoundsRef.current;
        const mistOpacity = Math.max(0, 1 - cp * 1.15);

        /* Mist inside ball (only during hook/clearing) */
        if (b && (p === "hook" || p === "clearing")) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(b.cx, b.cy, b.r * 0.93, 0, Math.PI * 2);
          ctx.clip();

          mistRef.current.forEach(m => {
            const angle = Math.atan2(m.y - b.cy, m.x - b.cx);
            m.vx += -Math.sin(angle) * 0.003 + (Math.random() - 0.5) * 0.008;
            m.vy += Math.cos(angle) * 0.003 + (Math.random() - 0.5) * 0.008;
            m.vx *= 0.982; m.vy *= 0.982;
            m.x += m.vx; m.y += m.vy;
            const dx = m.x - b.cx, dy = m.y - b.cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > b.r * 0.88) {
              m.x = b.cx + (dx / dist) * b.r * 0.83;
              m.y = b.cy + (dy / dist) * b.r * 0.83;
              m.vx *= -0.5; m.vy *= -0.5;
            }
            m.life += 0.006;
            const sinLife = Math.sin(m.life * Math.PI);
            const a = m.opacity * mistOpacity * Math.max(0, sinLife);
            if (a <= 0.005) { m.life = 0; return; }
            const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4);
            g.addColorStop(0, `hsla(${m.hue},55%,78%,${a})`);
            g.addColorStop(1, `hsla(${m.hue},55%,78%,0)`);
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r * 4, 0, Math.PI * 2);
            ctx.fillStyle = g;
            ctx.fill();
          });
          ctx.restore();
        }

        /* Ambient full-screen sparkles */
        sparksRef.current.forEach(s => {
          s.x += s.vx; s.y += s.vy;
          if (s.x < 0) s.x = w; if (s.x > w) s.x = 0;
          if (s.y < 0) s.y = h; if (s.y > h) s.y = 0;
          const a = s.opacity * (0.5 + 0.5 * Math.sin(t * 1.5 + s.x));
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(275,70%,80%,${a})`;
          ctx.fill();
        });

        /* Shards (carry over briefly into visions) */
        shardsRef.current = shardsRef.current.filter(s => s.opacity > 0.01);
        shardsRef.current.forEach(s => {
          s.x += s.vx; s.y += s.vy;
          s.vy += 0.07;
          s.vx *= 0.97;
          s.opacity -= s.decay;
          if (s.opacity <= 0) return;
          const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
          grad.addColorStop(0, `hsla(${s.hue},100%,75%,${s.opacity})`);
          grad.addColorStop(1, `hsla(${(s.hue + 60) % 360},100%,80%,0)`);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        });
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); };
  }, []);

  /* ── Compute ball bounds on render ── */
  const ballRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function updateBounds() {
      const el = ballRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      ballBoundsRef.current = { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, r: rect.width / 2 };
    }
    updateBounds();
    window.addEventListener("resize", updateBounds);
    return () => window.removeEventListener("resize", updateBounds);
  }, [phase]);

  /* ── Rub pointer handlers (active in hook phase only) ── */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (phaseRef.current !== "hook") return;
    isRubbingRef.current = true;
    lastPtrRef.current = { x: e.clientX, y: e.clientY };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* */ }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isRubbingRef.current || !lastPtrRef.current) return;
    const dx = e.clientX - lastPtrRef.current.x;
    const dy = e.clientY - lastPtrRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    lastPtrRef.current = { x: e.clientX, y: e.clientY };
    totalRubRef.current += dist;
    hapticDistRef.current += dist;

    if (hapticDistRef.current >= HAPTIC_INTERVAL) {
      crystalHaptics.rubPulse();
      hapticDistRef.current -= HAPTIC_INTERVAL;
    }

    const cp = Math.min(1, totalRubRef.current / RUB_TARGET);
    clearProgressRef.current = cp;
    setClearDisplay(cp);

    if (cp >= 1) {
      isRubbingRef.current = false;
      crystalHaptics.reveal();
      advancePhase("clearing");
    }
  }, []);

  const handlePointerUp = useCallback(() => { isRubbingRef.current = false; }, []);

  /* ── Orb tap — onPointerDown ── */
  const handleOrbPointerDown = useCallback((idx: number, e: React.PointerEvent) => {
    if (phaseRef.current !== "visions") return;
    if (tappedOrbsRef.current.has(idx)) return; // already tapped, ignore
    e.stopPropagation();

    crystalHaptics.visionTap(idx);

    /* Spawn 35 prismatic shards */
    const bx = e.clientX, by = e.clientY;
    const newShards: typeof shardsRef.current = Array.from({ length: 35 }, (_, i) => {
      const angle = (i / 35) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 4 + Math.random() * 6;
      return {
        x: bx, y: by,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        r: 1.5 + Math.random() * 2,
        opacity: 0.9,
        decay: 0.022,
        hue: Math.floor((i / 35) * 360),
      };
    });
    shardsRef.current.push(...newShards);

    /* Tooltip */
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip({ emoji: tpl.nodes[idx].emoji, text: tpl.nodes[idx].text });
    tooltipTimer.current = setTimeout(() => setTooltip(null), 2200);

    setTappedOrbs(prev => {
      const next = new Set(prev);
      next.add(idx);
      tappedOrbsRef.current = next;

      if (next.size === tpl.nodes.length && !orbsDoneRef.current) {
        orbsDoneRef.current = true;
        /* Exit animation: orbs + ball dissolve, then revelation */
        setTimeout(() => {
          crystalHaptics.shatter();
          setOrbsExiting(true);
          setBallExiting(true);
          setTimeout(() => advancePhase("revelation"), 700);
        }, 400);
      }
      return next;
    });
  }, [tpl.nodes]);

  /* ── Share helpers ── */
  function cardUrl() {
    const base = window.location.origin + (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    const p = new URLSearchParams({ to: recipientName, occasion, relation, template: "crystal" });
    const msgParam = params.get("msg");
    if (msgParam) p.set("msg", msgParam);
    if (likesParam) p.set("likes", likesParam);
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
  const ORB_SIZE  = "min(68px, 17vw)";

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background:
          phase === "revelation"
            ? "radial-gradient(ellipse at 50% 35%, rgba(40,8,90,0.92) 0%, rgba(6,2,20,1) 80%)"
            : "radial-gradient(ellipse at 50% 42%, rgba(65,15,130,0.92) 0%, rgba(10,3,30,1) 78%)",
        overflow: "hidden",
        touchAction: phase === "hook" ? "none" : "auto",
        userSelect: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Single RAF canvas — fixed, full-screen, pointer-events: none */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />

      {/* ══ Hook + Clearing — crystal ball phase ══ */}
      <AnimatePresence>
        {(phase === "hook" || phase === "clearing") && (
          <motion.div
            key="hook-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            transition={{ duration: 0.6 }}
            style={{
              position: "fixed", inset: 0, zIndex: 5,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "0 24px",
            }}
          >
            {/* Hook title */}
            <motion.p
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
              style={{
                fontSize: "min(18px, 4.5vw)", color: "rgba(210,185,255,0.9)",
                fontWeight: 700, letterSpacing: "0.07em",
                textAlign: "center", marginBottom: 32,
                textShadow: "0 0 20px rgba(160,100,255,0.6)",
              }}
            >
              {tpl.hook_title}
            </motion.p>

            {/* Crystal ball */}
            <motion.div
              ref={ballRef}
              animate={ballExiting
                ? { scale: [1, 1.4, 0], opacity: [1, 1, 0] }
                : { scale: 1, opacity: 1 }
              }
              transition={ballExiting ? { duration: 0.7, ease: "easeInOut" } : {}}
              style={{
                width: BALL_SIZE, height: BALL_SIZE,
                borderRadius: "50%", position: "relative",
                cursor: phase === "hook" ? "grab" : "default",
                flexShrink: 0,
              }}
            >
              {/* Outer glow ring */}
              <motion.div
                animate={{
                  boxShadow: phase === "clearing"
                    ? ["0 0 80px 30px rgba(230,210,255,0.7)", "0 0 120px 50px rgba(255,255,255,0.55)", "0 0 40px 14px rgba(140,80,255,0.35)"]
                    : [
                      "0 0 40px 14px rgba(130,60,240,0.35)",
                      "0 0 70px 24px rgba(160,90,255,0.55)",
                      "0 0 40px 14px rgba(130,60,240,0.35)",
                    ],
                }}
                transition={{ duration: phase === "clearing" ? 0.7 : 3.2, repeat: phase === "clearing" ? 0 : Infinity, ease: "easeInOut" }}
                style={{ position: "absolute", inset: -4, borderRadius: "50%" }}
              />

              {/* Sphere */}
              <div style={{
                width: "100%", height: "100%",
                borderRadius: "50%",
                background: phase === "clearing"
                  ? `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95) 0%, rgba(230,210,255,0.8) 20%, rgba(180,140,255,0.5) 55%, rgba(80,30,160,0.6) 85%, rgba(20,5,50,0.7) 100%)`
                  : `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.75) 0%, rgba(210,190,255,${0.5 - clearDisplay * 0.15}) 18%, rgba(140,90,220,0.35) 50%, rgba(60,20,110,0.6) 80%, rgba(20,5,50,0.8) 100%)`,
                boxShadow: `0 0 60px rgba(140,80,255,0.4), 0 0 120px rgba(100,50,200,0.2), inset 0 0 ${40 + clearDisplay * 60}px rgba(180,130,255,${0.15 + clearDisplay * 0.4})`,
                position: "relative", overflow: "hidden",
                transition: "background 0.3s, box-shadow 0.15s",
              }}>
                {/* Glass shimmer highlight */}
                <div style={{
                  position: "absolute", top: "8%", left: "12%", width: "38%", height: "30%",
                  borderRadius: "50%",
                  background: "radial-gradient(ellipse at 38% 25%, rgba(255,255,255,0.55) 0%, transparent 55%)",
                  transform: "rotate(-15deg)",
                  pointerEvents: "none",
                }} />
                {/* Mist veil div (fades with clearProgress) */}
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "radial-gradient(circle at 50% 55%, rgba(130,90,210,0.20) 0%, rgba(55,15,120,0.16) 60%, transparent 100%)",
                  opacity: Math.max(0, 1 - clearDisplay * 1.3),
                  transition: "opacity 0.12s",
                  pointerEvents: "none",
                }} />
                {/* Progress arc */}
                {clearDisplay > 0 && clearDisplay < 1 && (
                  <svg style={{
                    position: "absolute", inset: 0, width: "100%", height: "100%",
                    transform: "rotate(-90deg)", pointerEvents: "none",
                  }} viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="47" fill="none"
                      stroke="rgba(200,160,255,0.55)" strokeWidth="2.5"
                      strokeDasharray={`${clearDisplay * 295.3} 295.3`} strokeLinecap="round" />
                  </svg>
                )}
              </div>

              {/* Outer pulse ring (hook only) */}
              {phase === "hook" && (
                <motion.div
                  animate={{ scale: [1, 1.22, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(180,130,255,0.42)", pointerEvents: "none" }}
                />
              )}
            </motion.div>

            {/* Pedestal */}
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: "min(90px, 22vw)", height: 10, background: "linear-gradient(90deg, transparent, rgba(160,120,255,0.38), transparent)", borderRadius: 999 }} />
              <div style={{ width: "min(50px, 13vw)", height: "min(30px, 9vw)", background: "linear-gradient(180deg, rgba(140,100,220,0.28) 0%, rgba(80,40,160,0.16) 100%)", borderRadius: "0 0 10px 10px", marginTop: -2 }} />
              <div style={{ width: "min(80px, 20vw)", height: 8, background: "linear-gradient(90deg, transparent, rgba(160,120,255,0.2), transparent)", borderRadius: 999, marginTop: 1 }} />
            </div>

            {/* Rub prompt */}
            {phase === "hook" && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: [0, 0.85, 0.85, 0.55] }}
                transition={{ duration: 2.2, times: [0, 0.2, 0.7, 1], repeat: Infinity, delay: 0.6 }}
                style={{
                  marginTop: 28, fontSize: "min(14px, 3.6vw)",
                  color: "rgba(200,170,255,0.72)", letterSpacing: "0.1em",
                  textAlign: "center", pointerEvents: "none",
                }}
              >
                Rub the crystal ball to reveal your vision
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Visions phase — 4 orbs ══ */}
      <AnimatePresence>
        {phase === "visions" && (
          <motion.div
            key="visions"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            style={{ position: "fixed", inset: 0, zIndex: 8 }}
          >
            {/* Progress hint */}
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 0.65 }} transition={{ delay: 0.9 }}
              style={{
                position: "absolute", bottom: "max(28px, env(safe-area-inset-bottom, 28px))",
                left: 0, right: 0, textAlign: "center",
                fontSize: "min(14px, 3.5vw)", color: "rgba(200,175,255,0.72)",
                letterSpacing: "0.1em", pointerEvents: "none", zIndex: 2,
              }}
            >
              {tappedOrbs.size === tpl.nodes.length
                ? "✦ All visions revealed ✦"
                : `✦ ${tappedOrbs.size} / 4 visions revealed ✦`}
            </motion.p>

            {/* Orbs */}
            {tpl.nodes.map((node, idx) => {
              const zone = SAFE_ZONES[idx];
              const tapped = tappedOrbs.has(idx);
              return (
                <motion.button
                  key={idx}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={orbsExiting
                    ? { scale: [tapped ? 0.6 : 1, tapped ? 0.9 : 1.6, 0], opacity: [tapped ? 0.4 : 1, tapped ? 0.8 : 0.8, 0] }
                    : tapped
                    ? { scale: 0.6, opacity: 0.4 }
                    : { scale: 1, opacity: 1 }
                  }
                  transition={orbsExiting
                    ? { duration: 0.55, delay: idx * 0.07, ease: "easeInOut" }
                    : { type: "spring", stiffness: 200, damping: 18, delay: 0.25 + idx * 0.15 }
                  }
                  onPointerDown={(e) => handleOrbPointerDown(idx, e)}
                  style={{
                    position: "absolute",
                    left: `${zone.cx}%`, top: `${zone.cy}%`,
                    transform: "translate(-50%,-50%)",
                    width: ORB_SIZE, height: ORB_SIZE,
                    borderRadius: "50%",
                    background: tapped
                      ? "radial-gradient(circle at 35% 30%, rgba(160,120,220,0.55), rgba(80,30,160,0.4))"
                      : "radial-gradient(circle at 35% 30%, rgba(220,180,255,0.9), rgba(120,60,200,0.8))",
                    boxShadow: tapped
                      ? "0 0 10px rgba(140,90,200,0.2)"
                      : "0 0 20px rgba(180,120,255,0.6), 0 0 40px rgba(140,80,255,0.3)",
                    cursor: tapped ? "default" : "pointer",
                    pointerEvents: tapped ? "none" : "auto",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    border: "none", zIndex: 10, padding: 0,
                  }}
                >
                  <motion.div
                    animate={!tapped ? { y: [0, -5, 0], opacity: [0.85, 1, 0.85] } : {}}
                    transition={!tapped ? { duration: 2.6 + idx * 0.4, repeat: Infinity, ease: "easeInOut", delay: idx * 0.3 } : {}}
                    style={{ fontSize: "min(26px, 6.5vw)" }}
                  >
                    {tapped ? node.emoji : "🔮"}
                  </motion.div>
                </motion.button>
              );
            })}

            {/* Glassmorphism tooltip */}
            <AnimatePresence>
              {tooltip && (
                <motion.div
                  key={tooltip.text}
                  initial={{ opacity: 0, scale: 0.88, y: 18 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.88, y: -12 }}
                  transition={{ duration: 0.28 }}
                  style={{
                    position: "fixed",
                    top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 50, pointerEvents: "none",
                    width: "min(310px, 88vw)",
                    background: "rgba(12,4,30,0.82)",
                    backdropFilter: "blur(18px)",
                    border: "1px solid rgba(180,120,255,0.4)",
                    borderRadius: 18,
                    padding: "28px 36px",
                    textAlign: "center",
                    boxShadow: "0 4px 40px rgba(80,30,160,0.45)",
                  }}
                >
                  <div style={{ fontSize: 52, marginBottom: 14 }}>{tooltip.emoji}</div>
                  <p style={{
                    fontSize: "min(15px, 3.8vw)", color: "rgba(210,185,255,0.94)",
                    fontWeight: 500, fontStyle: "italic", lineHeight: 1.6, margin: 0,
                  }}>
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
            style={{
              position: "fixed", inset: 0, zIndex: 30,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "0 20px", overflowY: "auto",
            }}
          >
            {/* Holographic card */}
            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.7, ease: "easeOut" }}
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                style={{
                  width: "min(340px, 90vw)",
                  background: "linear-gradient(135deg, #0D0520 0%, #1A0535 50%, #0D0820 100%)",
                  borderRadius: 22,
                  border: "1px solid rgba(180,120,255,0.45)",
                  padding: "36px 28px", textAlign: "center",
                  boxShadow: "0 0 80px rgba(140,80,255,0.18), 0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.7)",
                  position: "relative", overflow: "hidden",
                }}
              >
                {/* Iridescent shimmer sweep */}
                <motion.div
                  animate={{ x: ["-120%", "120%"] }}
                  transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 3.5 }}
                  style={{
                    position: "absolute", top: 0, left: 0, width: "60%", height: "100%",
                    background: "linear-gradient(105deg, transparent, rgba(200,160,255,0.055), rgba(255,220,200,0.035), transparent)",
                    pointerEvents: "none",
                  }}
                />
                {/* Inner nebula glow */}
                <div style={{
                  position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)",
                  width: "75%", height: "60%",
                  background: "radial-gradient(ellipse, rgba(120,50,230,0.11) 0%, transparent 70%)",
                  pointerEvents: "none",
                }} />

                {/* 🔮 emoji */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9, type: "spring" }}
                  style={{ fontSize: "min(44px, 11vw)", marginBottom: 14, position: "relative", zIndex: 1 }}
                >
                  🔮
                </motion.div>

                {/* hook_title */}
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 0.72 }} transition={{ delay: 1.1 }}
                  style={{
                    fontSize: "min(10px, 2.6vw)", color: "rgba(180,140,255,0.72)",
                    letterSpacing: "0.2em", textTransform: "uppercase",
                    marginBottom: 10, position: "relative", zIndex: 1,
                  }}
                >
                  {tpl.hook_title}
                </motion.p>

                {/* "{title_prefix}, {recipientName}" */}
                <motion.h1
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.25 }}
                  style={{
                    fontSize: "min(22px, 5.5vw)", fontWeight: 600, color: "#fff",
                    marginBottom: 18, letterSpacing: "0.01em",
                    position: "relative", zIndex: 1, lineHeight: 1.3,
                  }}
                >
                  {tpl.title_prefix}, {recipientName}
                </motion.h1>

                {/* Final message */}
                <motion.p
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}
                  style={{
                    fontSize: "min(15px, 3.8vw)", color: "rgba(222,210,255,0.92)",
                    fontStyle: "italic", lineHeight: 1.72, margin: 0,
                    position: "relative", zIndex: 1,
                  }}
                >
                  {finalMessage}
                </motion.p>

                {/* Thin divider */}
                {likesChips.length > 0 && (
                  <div style={{ width: "60%", height: 1, background: "rgba(160,100,255,0.25)", margin: "18px auto 14px" }} />
                )}

                {/* Likes chips */}
                {likesChips.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}
                    style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", position: "relative", zIndex: 1 }}
                  >
                    {likesChips.map((chip, i) => (
                      <span key={i} style={{
                        fontSize: "min(12px, 3vw)", color: "rgba(200,170,255,0.88)",
                        background: "rgba(140,80,255,0.2)", border: "1px solid rgba(180,120,255,0.3)",
                        borderRadius: 999, padding: "4px 12px",
                      }}>{chip}</span>
                    ))}
                  </motion.div>
                )}

                {/* Divider + decorative stars */}
                <motion.div
                  animate={{ opacity: [0.28, 0.72, 0.28] }} transition={{ duration: 3, repeat: Infinity }}
                  style={{ marginTop: 22, fontSize: 13, color: "rgba(190,150,255,0.5)", letterSpacing: "0.4em", position: "relative", zIndex: 1 }}
                >
                  ✦ ✦ ✦
                </motion.div>

                {/* Sender credit for recipient */}
                {isRecipient && (
                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 0.42 }} transition={{ delay: 2 }}
                    style={{ marginTop: 16, fontSize: 11, color: "rgba(190,155,255,0.5)", letterSpacing: "0.08em", position: "relative", zIndex: 1 }}
                  >
                    Sent with love 🔮
                  </motion.p>
                )}
              </motion.div>
            </motion.div>

            {/* ── Sender share panel ── */}
            {isSender && (
              <motion.div
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: 0.5 }}
                style={{ width: "min(340px, 90vw)", marginTop: 22 }}
              >
                <p style={{ fontSize: 12, color: "rgba(190,160,255,0.35)", textAlign: "center", marginBottom: 12, letterSpacing: "0.08em" }}>
                  ✦ share this card
                </p>
                <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <button onClick={shareSenderWhatsApp} style={{
                    flex: 1, padding: "12px 8px", borderRadius: 12,
                    background: "rgba(37,211,102,0.08)", border: "1.5px solid rgba(37,211,102,0.24)",
                    color: "rgba(37,211,102,0.86)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}>💬 WhatsApp</button>
                  <button onClick={copySenderLinkForInstagram} style={{
                    flex: 1, padding: "12px 8px", borderRadius: 12,
                    background: "rgba(200,100,200,0.08)", border: "1.5px solid rgba(200,100,200,0.24)",
                    color: "rgba(220,140,255,0.86)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}>{senderIgCopied ? "✅ Copied!" : "📸 Instagram"}</button>
                </div>
                <button onClick={copySenderLink} style={{
                  width: "100%", padding: "11px", borderRadius: 12,
                  background: "rgba(180,130,255,0.07)", border: "1.5px solid rgba(180,130,255,0.2)",
                  color: "rgba(200,170,255,0.72)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}>{senderCopied ? "✅ Link Copied!" : "🔗 Copy Link"}</button>
                <div style={{ textAlign: "center", marginTop: 14 }}>
                  <Link href="/send?ref=card">
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.16)", cursor: "pointer" }}>
                      Make another card
                    </span>
                  </Link>
                </div>
              </motion.div>
            )}

            {/* ── Recipient CTA ── */}
            {isRecipient && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2, duration: 0.5 }}
                style={{ width: "min(300px, calc(100vw - 40px))", textAlign: "center", marginTop: 18, paddingBottom: 8 }}
              >
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.46)", marginBottom: 12, letterSpacing: "0.02em", fontWeight: 500 }}>
                  Feeling the magic? Send one back ✦
                </p>
                <Link href="/send?ref=card">
                  <button style={{
                    width: "100%", padding: "14px", borderRadius: 14,
                    background: "rgba(120,60,200,0.13)", border: "1.5px solid rgba(180,120,255,0.28)",
                    color: "rgba(210,185,255,0.9)", fontWeight: 700, fontSize: 15, cursor: "pointer", letterSpacing: "0.02em",
                  }}>🔮 Create your own card — free!</button>
                </Link>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ← make your own card */}
      <Link href="/send?ref=card">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          style={{
            position: "fixed", top: 16, left: 16, fontSize: 12,
            color: "rgba(255,255,255,0.17)", cursor: "pointer", zIndex: 60,
            padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.04)",
          }}
        >
          ← make your own card
        </motion.div>
      </Link>
    </div>
  );
}
