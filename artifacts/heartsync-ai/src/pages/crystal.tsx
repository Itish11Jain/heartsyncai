/**
 * HeartSync AI — Crystal Ball card template
 *
 * 4-Phase Universal Architecture:
 *   hook       — misted crystal ball, rub-to-clear interaction
 *   clearing   — 700ms white-flash transition after rub completes
 *   visions    — 4 orbs float out; crystal ball remains in background
 *   revelation — galaxy canvas + holographic final card
 *
 * Canvas: single fixed RAF loop; phaseRef + clearProgressRef prevent stale closures.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PolaroidFrame from "@/components/PolaroidFrame";
import { Link, useSearch } from "wouter";
import { music, crystal as crystalHaptics } from "../lib/audio";
import { getCrystalTemplate, getCrystalFallback } from "../lib/card-templates";
import { trackEvent } from "../lib/trackEvent";
import PremiumLockPanel from "../components/PremiumLockPanel";
import ViralReplyCTA from "@/components/ViralReplyCTA";

function useQueryParams() {
  const search = useSearch();
  return new URLSearchParams(search);
}

const SAFE_ZONES = [
  { cx: 25, cy: 22 },
  { cx: 72, cy: 22 },
  { cx: 25, cy: 68 },
  { cx: 72, cy: 68 },
];

type CrystalPhase = "hook" | "clearing" | "visions" | "revelation";

interface MistDot  { x: number; y: number; vx: number; vy: number; r: number; opacity: number; hue: number; life: number; }
interface SparkDot { x: number; y: number; vx: number; vy: number; r: number; opacity: number; }
interface ShardDot { x: number; y: number; vx: number; vy: number; r: number; opacity: number; decay: number; hue: number; }
interface Star     { x: number; y: number; vx: number; vy: number; r: number; opacity: number; twinkle: number; }
interface Shooter  { x: number; y: number; vx: number; vy: number; len: number; opacity: number; active: boolean; wait: number; }

export default function CrystalCard() {
  const params       = useQueryParams();
  const recipientName = params.get("to")       || "Friend";
  const occasion      = params.get("occasion") || "feel_good";
  const relation      = params.get("relation") || "friend";
  const likesParam    = params.get("likes")    || "";
  const isPreview     = params.get("preview")  === "1";
  const isSender      = params.get("sender")   === "1";
  const personalPictureUrl = (() => {
    const raw = params.get("personalpicture");
    if (!raw) return null;
    try { return decodeURIComponent(raw); } catch { return null; }
  })();
  const isRecipient   = !isSender;

  const tpl = getCrystalTemplate(occasion, relation) ?? getCrystalFallback(occasion);
  const finalMessage = (() => {
    try {
      const raw = params.get("msg");
      if (raw) return decodeURIComponent(escape(atob(raw)));
    } catch { /* */ }
    return tpl.final_message;
  })();
  const likesChips = likesParam ? likesParam.split(",").map(s => s.trim()).filter(Boolean) : [];

  /* Inject the first like into the final orb so it feels personally crafted */
  const orbNodes = (() => {
    if (!likesChips.length) return tpl.nodes;
    const like = likesChips[0];
    const nodes = [...tpl.nodes];
    nodes[nodes.length - 1] = {
      emoji: "✨",
      text: `Your love for ${like} shines bright — the crystal sees the joy it brings you.`,
    };
    return nodes;
  })();

  /* ── Clear native splash screen ── */
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__clearHsSplash) {
      (window as any).__clearHsSplash();
    }
  }, []);

  /* ── Phase ── */
  const [phase, setPhase]   = useState<CrystalPhase>(isPreview ? "visions" : "hook");
  const phaseRef            = useRef<CrystalPhase>(isPreview ? "visions" : "hook");
  function advancePhase(p: CrystalPhase) { phaseRef.current = p; setPhase(p); }

  /* ── Rub mechanic ── */
  const clearProgressRef = useRef(0);
  const [clearDisplay, setClearDisplay] = useState(0);
  const isRubbingRef   = useRef(false);
  const lastPtrRef     = useRef<{ x: number; y: number } | null>(null);
  const totalRubRef    = useRef(0);
  const hapticDistRef  = useRef(0);
  const RUB_TARGET     = 280;
  const HAPTIC_INTERVAL = 60;

  /* ── Orbs ── */
  const [tappedOrbs, setTappedOrbs]   = useState<Set<number>>(new Set());
  const tappedOrbsRef                 = useRef<Set<number>>(new Set());
  const [tooltip, setTooltip]         = useState<{ emoji: string; text: string } | null>(null);
  const tooltipTimer                  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orbsDoneRef                   = useRef(false);

  /* ── Exit animations ── */
  const [orbsExiting, setOrbsExiting] = useState(false);
  const [ballExiting, setBallExiting] = useState(false);

  /* ── Share state ── */
  const [senderCopied,   setSenderCopied]   = useState(false);
  const [senderIgCopied, setSenderIgCopied] = useState(false);
  /* ── Premium unlock ── */
  const [isUnlocked,    setIsUnlocked]    = useState(false);
  const [overrideCardId, setOverrideCardId] = useState<string | undefined>();

  /* ── Canvas ── */
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number>(0);
  const ballRef      = useRef<HTMLDivElement | null>(null);
  const ballBoundsRef = useRef<{ cx: number; cy: number; r: number } | null>(null);

  /* Particle pools */
  const mistRef     = useRef<MistDot[]>([]);
  const sparksRef   = useRef<SparkDot[]>([]);
  const shardsRef   = useRef<ShardDot[]>([]);
  const starsRef    = useRef<Star[]>([]);
  const shootersRef = useRef<Shooter[]>([]);

  /* ── Music + analytics ── */
  useEffect(() => {
    music.start("crystal", occasion);
    if (isRecipient && !isPreview) {
      const cardId = params.get("id") ?? undefined;
      trackEvent({ event: "card_viewed", occasion, template: "crystal", recipient_name: recipientName, card_id: cardId });
    }
    return () => music.stop();
  }, []);

  /* ── clearing → visions ── */
  useEffect(() => {
    if (phase !== "clearing") return;
    const t = setTimeout(() => advancePhase("visions"), 700);
    return () => clearTimeout(t);
  }, [phase]);

  /* ── Ball bounds ── */
  useEffect(() => {
    function updateBounds() {
      const el = ballRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      ballBoundsRef.current = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2 };
    }
    updateBounds();
    window.addEventListener("resize", updateBounds);
    return () => window.removeEventListener("resize", updateBounds);
  }, [phase]);

  /* ── Canvas RAF ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /* Capture non-null locals for use inside all nested functions */
    const cv  = canvas;
    const cx2 = ctx;

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

    function seedSparks(w: number, h: number) {
      sparksRef.current = Array.from({ length: 25 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
        r: 1 + Math.random() * 1.5, opacity: 0.3 + Math.random() * 0.4,
      }));
    }

    function makeShooter(w: number, h: number, randomWait = false): Shooter {
      const startEdge = Math.random() < 0.5 ? "top" : "left";
      const x = startEdge === "top" ? Math.random() * w : 0;
      const y = startEdge === "top" ? 0 : Math.random() * h * 0.5;
      const angle = Math.PI / 6 + Math.random() * (Math.PI / 6);
      const speed = 12 + Math.random() * 8;
      return {
        x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        len: 8 + Math.random() * 6, opacity: 0, active: false,
        wait: randomWait ? Math.floor(Math.random() * 240) : 0,
      };
    }

    function seedGalaxy(w: number, h: number) {
      starsRef.current = Array.from({ length: 180 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12,
        r: 0.5 + Math.random() * 2, opacity: 0.25 + Math.random() * 0.55,
        twinkle: Math.random() * Math.PI * 2,
      }));
      shootersRef.current = Array.from({ length: 6 }, () => makeShooter(w, h, true));
    }

    function resize() {
      cv.width  = window.innerWidth;
      cv.height = window.innerHeight;
      seedSparks(cv.width, cv.height);
      if (phaseRef.current === "revelation") {
        seedGalaxy(cv.width, cv.height);
      }
    }

    resize();
    window.addEventListener("resize", resize);
    seedMist();
    seedSparks(cv.width, cv.height);

    /* Fixed nebula positions */
    const nebulae = [
      { x: 0.25, y: 0.30, r: 0.35, hue: 270 },
      { x: 0.72, y: 0.60, r: 0.28, hue: 290 },
      { x: 0.50, y: 0.15, r: 0.22, hue: 250 },
      { x: 0.40, y: 0.80, r: 0.30, hue: 280 },
    ];

    let t = 0;
    let galaxySeeded = false;

    function draw() {
      const w = cv.width, h = cv.height;
      const p  = phaseRef.current;
      const cp = clearProgressRef.current;
      cx2.clearRect(0, 0, w, h);
      t += 0.014;

      if (p === "revelation") {
        if (!galaxySeeded) { seedGalaxy(w, h); galaxySeeded = true; }

        /* Nebula wash */
        nebulae.forEach(n => {
          const grad = cx2.createRadialGradient(n.x * w, n.y * h, 0, n.x * w, n.y * h, n.r * Math.min(w, h));
          grad.addColorStop(0, `hsla(${n.hue},60%,30%,0.045)`);
          grad.addColorStop(1, `hsla(${n.hue},60%,20%,0)`);
          cx2.fillStyle = grad;
          cx2.beginPath();
          cx2.arc(n.x * w, n.y * h, n.r * Math.min(w, h), 0, Math.PI * 2);
          cx2.fill();
        });

        /* Stars */
        starsRef.current.forEach(s => {
          s.x += s.vx; s.y += s.vy;
          if (s.x < 0) s.x = w; if (s.x > w) s.x = 0;
          if (s.y < 0) s.y = h; if (s.y > h) s.y = 0;
          s.twinkle += 0.028;
          const a = s.opacity * (0.65 + 0.35 * Math.sin(s.twinkle));
          cx2.beginPath();
          cx2.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          cx2.fillStyle = `rgba(210,200,255,${a})`;
          cx2.fill();
        });

        /* Shooting stars */
        shootersRef.current.forEach((s, i) => {
          if (s.wait > 0) { s.wait--; return; }
          if (!s.active) { s.active = true; s.opacity = 0; }
          s.x += s.vx; s.y += s.vy;
          s.opacity = Math.min(1, s.opacity + 0.12);
          const tailX = s.x - s.vx * s.len, tailY = s.y - s.vy * s.len;
          const grad = cx2.createLinearGradient(tailX, tailY, s.x, s.y);
          grad.addColorStop(0, "rgba(255,255,255,0)");
          grad.addColorStop(1, `rgba(255,255,255,${s.opacity * 0.9})`);
          cx2.save();
          cx2.beginPath();
          cx2.moveTo(tailX, tailY);
          cx2.lineTo(s.x, s.y);
          cx2.strokeStyle = grad;
          cx2.lineWidth = 1.5;
          cx2.stroke();
          cx2.restore();
          if (s.x > w + 50 || s.y > h + 50) {
            const fresh = makeShooter(w, h);
            fresh.wait = 60 + Math.floor(Math.random() * 180);
            shootersRef.current[i] = fresh;
          }
        });
      } else {
        /* Ambient mode (hook / clearing / visions) */
        const b = ballBoundsRef.current;

        /* Mist inside ball */
        if (b && (p === "hook" || p === "clearing")) {
          const mistOpacity = Math.max(0, 1 - cp * 1.15);
          cx2.save();
          cx2.beginPath();
          cx2.arc(b.cx, b.cy, b.r * 0.93, 0, Math.PI * 2);
          cx2.clip();
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
            const g = cx2.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4);
            g.addColorStop(0, `hsla(${m.hue},55%,78%,${a})`);
            g.addColorStop(1, `hsla(${m.hue},55%,78%,0)`);
            cx2.beginPath();
            cx2.arc(m.x, m.y, m.r * 4, 0, Math.PI * 2);
            cx2.fillStyle = g;
            cx2.fill();
          });
          cx2.restore();
        }

        /* Ambient full-screen sparkles */
        sparksRef.current.forEach(s => {
          s.x += s.vx; s.y += s.vy;
          if (s.x < 0) s.x = w; if (s.x > w) s.x = 0;
          if (s.y < 0) s.y = h; if (s.y > h) s.y = 0;
          const a = s.opacity * (0.5 + 0.5 * Math.sin(t * 1.5 + s.x));
          cx2.beginPath();
          cx2.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          cx2.fillStyle = `hsla(275,70%,80%,${a})`;
          cx2.fill();
        });
      }

      /* Shards — drawn in all phases */
      shardsRef.current = shardsRef.current.filter(s => s.opacity > 0.01);
      shardsRef.current.forEach(s => {
        s.x += s.vx; s.y += s.vy;
        s.vy += 0.07; s.vx *= 0.97;
        s.opacity -= s.decay;
        if (s.opacity <= 0) return;
        const grd = cx2.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
        grd.addColorStop(0, `hsla(${s.hue},100%,75%,${s.opacity})`);
        grd.addColorStop(1, `hsla(${(s.hue + 60) % 360},100%,80%,0)`);
        cx2.beginPath();
        cx2.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        cx2.fillStyle = grd;
        cx2.fill();
      });

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); };
  }, []);

  /* ── Rub handlers — attached to ball element ── */
  const handleBallPointerDown = useCallback((e: React.PointerEvent) => {
    if (phaseRef.current !== "hook") return;
    isRubbingRef.current = true;
    lastPtrRef.current = { x: e.clientX, y: e.clientY };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* */ }
  }, []);

  const handleBallPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isRubbingRef.current || !lastPtrRef.current) return;
    const dx = e.clientX - lastPtrRef.current.x;
    const dy = e.clientY - lastPtrRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    lastPtrRef.current = { x: e.clientX, y: e.clientY };
    totalRubRef.current  += dist;
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

  const handleBallPointerUp = useCallback(() => { isRubbingRef.current = false; }, []);

  /* ── Orb tap ── */
  const handleOrbPointerDown = useCallback((idx: number, e: React.PointerEvent) => {
    if (phaseRef.current !== "visions") return;
    if (tappedOrbsRef.current.has(idx)) return;
    e.stopPropagation();

    crystalHaptics.visionTap(idx);

    /* 35 prismatic shards on canvas */
    const bx = e.clientX, by = e.clientY;
    const newShards: ShardDot[] = Array.from({ length: 35 }, (_, i) => {
      const angle = (i / 35) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 4 + Math.random() * 6;
      return {
        x: bx, y: by,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        r: 1.5 + Math.random() * 2, opacity: 0.9, decay: 0.022,
        hue: Math.floor((i / 35) * 360),
      };
    });
    shardsRef.current.push(...newShards);

    /* Tooltip */
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip({ emoji: orbNodes[idx].emoji, text: orbNodes[idx].text });
    tooltipTimer.current = setTimeout(() => setTooltip(null), 2200);

    setTappedOrbs(prev => {
      const next = new Set(prev);
      next.add(idx);
      tappedOrbsRef.current = next;

      if (next.size === orbNodes.length && !orbsDoneRef.current) {
        orbsDoneRef.current = true;
        setTimeout(() => {
          crystalHaptics.shatter();
          setOrbsExiting(true);
          setBallExiting(true);
          setTimeout(() => advancePhase("revelation"), 700);
        }, 400);
      }
      return next;
    });
  }, [orbNodes]);

  /* ── Share helpers ── */
  function cardUrl() {
    /* /api/share generates a personalised og:image ("Hey, {name}!") for
       WhatsApp previews, then JS-redirects recipients to /crystal.html */
    const p = new URLSearchParams({ t: "crystal", to: recipientName, occasion, relation });
    const msgP = params.get("msg"); if (msgP) p.set("msg", msgP);
    if (likesParam) p.set("likes", likesParam);
    const refP = params.get("ref"); if (refP) p.set("ref", refP);
    const cardId = overrideCardId ?? params.get("id");
    if (cardId) p.set("id", cardId);
    return `${window.location.origin}/api/share?${p.toString()}`;
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

  /* ── Crystal ball component (reused in hook, clearing, and visions) ── */
  const ballInBackground = phase === "visions";

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background:
          phase === "revelation"
            ? "radial-gradient(ellipse at 50% 35%, rgba(40,8,90,0.92) 0%, rgba(6,2,20,1) 80%)"
            : "radial-gradient(ellipse at 50% 42%, rgba(65,15,130,0.92) 0%, rgba(10,3,30,1) 78%)",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Single full-screen canvas */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />

      {/* ══ Crystal ball — visible in hook, clearing, AND visions (fades/shrinks in bg) ══ */}
      <AnimatePresence>
        {(phase === "hook" || phase === "clearing" || phase === "visions") && (
          <motion.div
            key="ball-container"
            initial={{ opacity: 0 }}
            animate={ballExiting
              ? { scale: [1, 1.4, 0], opacity: [1, 1, 0] }
              : ballInBackground
              ? { opacity: 0.32, scale: 0.55 }
              : { opacity: 1, scale: 1 }
            }
            exit={{ opacity: 0 }}
            transition={ballExiting
              ? { duration: 0.7, ease: "easeInOut" }
              : ballInBackground
              ? { duration: 0.7, ease: "easeOut" }
              : { duration: 0.6 }
            }
            style={{
              position: "fixed",
              top: ballInBackground ? "38%" : "50%",
              left: "50%",
              /* Use Framer Motion's x/y so they compose with scale correctly */
              x: "-50%",
              y: "-50%",
              zIndex: ballInBackground ? 2 : 5,
              display: "flex", flexDirection: "column",
              alignItems: "center",
              width: "min(92vw, 360px)",
              pointerEvents: ballInBackground ? "none" : "auto",
            }}
          >
            {/* Hook title (hidden in visions bg) */}
            {!ballInBackground && (
              <motion.p
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: phase === "clearing" ? 0 : 1, y: 0 }}
                transition={{ duration: 0.55 }}
                style={{
                  fontSize: "clamp(15px, 4.2vw, 18px)", color: "rgba(210,185,255,0.9)",
                  fontWeight: 700, letterSpacing: "0.06em",
                  textAlign: "center", marginBottom: 32,
                  textShadow: "0 0 20px rgba(160,100,255,0.6)",
                  whiteSpace: "normal", lineHeight: 1.35,
                  maxWidth: "min(280px, 80vw)",
                }}
              >
                {tpl.hook_title}
              </motion.p>
            )}

            {/* Ball */}
            <motion.div
              ref={ballRef}
              onPointerDown={handleBallPointerDown}
              onPointerMove={handleBallPointerMove}
              onPointerUp={handleBallPointerUp}
              onPointerCancel={handleBallPointerUp}
              animate={phase === "clearing"
                ? { boxShadow: ["0 0 40px 14px rgba(130,60,240,0.35)", "0 0 120px 50px rgba(240,220,255,0.7)", "0 0 40px 14px rgba(130,60,240,0.35)"] }
                : { boxShadow: ["0 0 40px 14px rgba(130,60,240,0.35)", "0 0 70px 24px rgba(160,90,255,0.55)", "0 0 40px 14px rgba(130,60,240,0.35)"] }
              }
              transition={{ duration: phase === "clearing" ? 0.7 : 3.2, repeat: phase === "clearing" ? 0 : Infinity, ease: "easeInOut" }}
              style={{
                width: BALL_SIZE, height: BALL_SIZE,
                borderRadius: "50%", position: "relative", flexShrink: 0,
                cursor: phase === "hook" ? "grab" : "default",
                touchAction: phase === "hook" ? "none" : "auto",
              }}
            >
              <div style={{
                width: "100%", height: "100%", borderRadius: "50%",
                background: phase === "clearing"
                  ? "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.98) 0%, rgba(240,225,255,0.88) 14%, rgba(200,165,255,0.62) 38%, rgba(110,55,200,0.55) 68%, rgba(18,4,45,0.78) 100%)"
                  : `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.92) 0%, rgba(240,225,255,${0.72 - clearDisplay * 0.18}) 11%, rgba(195,160,255,${0.48 - clearDisplay * 0.12}) 28%, rgba(130,80,225,0.42) 50%, rgba(60,18,115,0.68) 76%, rgba(10,3,35,0.88) 100%)`,
                boxShadow: `0 0 70px rgba(150,90,255,0.5), 0 0 140px rgba(110,55,210,0.25), 0 8px 32px rgba(0,0,0,0.5), inset 0 0 ${48 + clearDisplay * 70}px rgba(190,145,255,${0.18 + clearDisplay * 0.45})`,
                position: "relative", overflow: "hidden",
                transition: "background 0.3s, box-shadow 0.15s",
              }}>
                {/* Primary specular highlight */}
                <div style={{
                  position: "absolute", top: "7%", left: "11%", width: "40%", height: "32%",
                  borderRadius: "50%",
                  background: "radial-gradient(ellipse at 38% 30%, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.28) 38%, transparent 68%)",
                  transform: "rotate(-18deg)", pointerEvents: "none",
                }} />
                {/* Secondary catch-light (bottom-right) */}
                <div style={{
                  position: "absolute", bottom: "16%", right: "15%", width: "18%", height: "13%",
                  borderRadius: "50%",
                  background: "radial-gradient(ellipse, rgba(220,195,255,0.38) 0%, transparent 70%)",
                  pointerEvents: "none",
                }} />
                {/* Iridescent inner rim */}
                <div style={{
                  position: "absolute", inset: "3%", borderRadius: "50%",
                  background: "transparent",
                  boxShadow: "inset 0 0 28px rgba(180,145,255,0.18), inset 0 2px 0 rgba(255,255,255,0.22)",
                  pointerEvents: "none",
                }} />
                {/* Depth inner shadow */}
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "radial-gradient(circle at 62% 70%, rgba(10,3,40,0.35) 0%, transparent 65%)",
                  pointerEvents: "none",
                }} />
                {/* Mist veil */}
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "radial-gradient(circle at 50% 55%, rgba(130,90,210,0.22) 0%, rgba(55,15,120,0.18) 60%, transparent 100%)",
                  opacity: Math.max(0, 1 - clearDisplay * 1.3), transition: "opacity 0.12s",
                  pointerEvents: "none",
                }} />
                {/* Progress arc */}
                {clearDisplay > 0 && clearDisplay < 1 && (
                  <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-90deg)", pointerEvents: "none" }} viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="47" fill="none"
                      stroke="rgba(200,160,255,0.55)" strokeWidth="2.5"
                      strokeDasharray={`${clearDisplay * 295.3} 295.3`} strokeLinecap="round" />
                  </svg>
                )}
              </div>
              {/* Pulse ring (hook only) */}
              {phase === "hook" && (
                <motion.div
                  animate={{ scale: [1, 1.22, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(180,130,255,0.42)", pointerEvents: "none" }}
                />
              )}
            </motion.div>

            {/* Pedestal */}
            {!ballInBackground && (
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: "min(90px, 22vw)", height: 10, background: "linear-gradient(90deg, transparent, rgba(160,120,255,0.38), transparent)", borderRadius: 999 }} />
                <div style={{ width: "min(50px, 13vw)", height: "min(30px, 9vw)", background: "linear-gradient(180deg, rgba(140,100,220,0.28) 0%, rgba(80,40,160,0.16) 100%)", borderRadius: "0 0 10px 10px", marginTop: -2 }} />
                <div style={{ width: "min(80px, 20vw)", height: 8, background: "linear-gradient(90deg, transparent, rgba(160,120,255,0.2), transparent)", borderRadius: 999, marginTop: 1 }} />
              </div>
            )}

            {/* Rub prompt */}
            {phase === "hook" && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: [0, 0.85, 0.85, 0.55] }}
                transition={{ duration: 2.2, times: [0, 0.2, 0.7, 1], repeat: Infinity, delay: 0.6 }}
                style={{
                  marginTop: 28, fontSize: "clamp(12px, 3.4vw, 14px)",
                  color: "rgba(200,170,255,0.72)", letterSpacing: "0.08em",
                  textAlign: "center", pointerEvents: "none",
                  whiteSpace: "normal", lineHeight: 1.4,
                  maxWidth: "min(240px, 72vw)",
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
            {orbNodes.map((node, idx) => {
              const zone  = SAFE_ZONES[idx];
              const tapped = tappedOrbs.has(idx);
              return (
                <motion.button
                  key={idx}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={orbsExiting
                    ? { scale: [tapped ? 0.6 : 1, tapped ? 0.9 : 1.6, 0], opacity: [tapped ? 0.4 : 1, 0.8, 0] }
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
                    /* x/y as Framer Motion props so scale doesn't override centering */
                    x: "-50%", y: "-50%",
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

            {/* Glassmorphism tooltip — centered */}
            <AnimatePresence>
              {tooltip && (
                /* Outer div owns position+centering; anchored at 44% (midpoint
                   between top orbs at 22% and bottom orbs at 68%) so the
                   tooltip never covers either orb row */
                <div
                  key={tooltip.text}
                  style={{
                    position: "fixed",
                    top: "44%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 50, pointerEvents: "none",
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.88, y: 14 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.88, y: -10 }}
                    transition={{ duration: 0.28 }}
                    style={{
                      width: "min(290px, 84vw)",
                      background: "rgba(12,4,30,0.85)",
                      backdropFilter: "blur(18px)",
                      border: "1px solid rgba(180,120,255,0.4)",
                      borderRadius: 18, padding: "18px 24px", textAlign: "center",
                      boxShadow: "0 4px 40px rgba(80,30,160,0.45)",
                    }}
                  >
                    <div style={{ fontSize: 40, marginBottom: 10 }}>{tooltip.emoji}</div>
                    <p style={{
                      fontSize: "min(14px, 3.6vw)", color: "rgba(210,185,255,0.94)",
                      fontWeight: 500, fontStyle: "italic", lineHeight: 1.55, margin: 0,
                    }}>
                      {tooltip.text}
                    </p>
                  </motion.div>
                </div>
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
              alignItems: "center",
              /* flex-start + paddingTop keeps content reachable when it overflows —
                 justifyContent:center clips the top on short phones */
              justifyContent: "flex-start",
              paddingTop: "max(48px, 6vh)",
              paddingBottom: "max(40px, env(safe-area-inset-bottom, 24px))",
              paddingLeft: 20, paddingRight: 20,
              overflowY: "auto",
            }}
          >
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
                  borderRadius: 22, border: "1px solid rgba(180,120,255,0.45)",
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
                <div style={{
                  position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)",
                  width: "75%", height: "60%",
                  background: "radial-gradient(ellipse, rgba(120,50,230,0.11) 0%, transparent 70%)",
                  pointerEvents: "none",
                }} />

                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9, type: "spring" }}
                  style={{ fontSize: "min(44px, 11vw)", marginBottom: 14, position: "relative", zIndex: 1 }}
                >
                  🔮
                </motion.div>

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

                <motion.h1
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.25 }}
                  style={{
                    fontSize: "min(22px, 5.5vw)", fontWeight: 600, color: "#fff",
                    marginBottom: 18, letterSpacing: "0.01em", lineHeight: 1.3,
                    position: "relative", zIndex: 1,
                  }}
                >
                  {tpl.title_prefix}, {recipientName}
                </motion.h1>

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

                <motion.div
                  animate={{ opacity: [0.28, 0.72, 0.28] }} transition={{ duration: 3, repeat: Infinity }}
                  style={{ marginTop: 22, fontSize: 13, color: "rgba(190,150,255,0.5)", letterSpacing: "0.4em", position: "relative", zIndex: 1 }}
                >
                  ✦ ✦ ✦
                </motion.div>

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

            {/* Sender share panel */}
            {isSender && (
              isUnlocked ? (
                <motion.div
                  initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
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
              ) : (
                <PremiumLockPanel
                  template="crystal"
                  occasion={occasion}
                  recipientName={recipientName}
                  locationSearch={window.location.search}
                  onUnlocked={(cardId) => {
                    setOverrideCardId(cardId);
                    setIsUnlocked(true);
                  }}
                />
              )
            )}

            {/* Recipient CTA */}
            {isRecipient && (
              <div style={{ marginTop: 18 }}>
                <ViralReplyCTA template="crystal" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Polaroid photo ══ */}
      <AnimatePresence>
        {personalPictureUrl && (phase === "clearing" || phase === "visions") && (
          <PolaroidFrame key="polaroid-frame" src={personalPictureUrl} isFramed={false} />
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
