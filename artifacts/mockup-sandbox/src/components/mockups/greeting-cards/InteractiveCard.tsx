/**
 * InteractiveCard — Full 4-Phase 3D Greeting Card Prototype
 *
 * Phase 1: Sealed 3D envelope + drag-to-unlock slider
 * Phase 2: Envelope opens, card slides up, emoji orbs orbit
 * Phase 3: Click orbs → tooltip + HTML5 Canvas particle burst
 * Phase 4: "Reveal Message" → orbs explode, card glows, confetti, gold final message
 *
 * URL params: ?to=Rahul&occasion=thank_you&rel=friend
 */
import {
  motion,
  useAnimation,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { resolveTemplate, TEMPLATES, type CardTemplate } from "./cardTemplates";

/* ─────────────────────────────────────────────────────────
   URL param helpers
───────────────────────────────────────────────────────── */
function getParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    to: p.get("to") ?? "You",
    occasion: p.get("occasion") ?? "feel_good",
    rel: p.get("rel") ?? "generic",
  };
}

/* ─────────────────────────────────────────────────────────
   Particle burst — HTML5 Canvas, fires once per orb click
───────────────────────────────────────────────────────── */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  emoji: string;
  rotation: number;
  rotationSpeed: number;
}

function fireParticleBurst(
  canvas: HTMLCanvasElement,
  cx: number,
  cy: number,
  emoji: string,
  color: string,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const PARTICLE_COUNT = 18;
  const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 4;
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      alpha: 1,
      size: 14 + Math.random() * 10,
      emoji,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.25,
    };
  });

  // Also fire some colored dots
  const dots: Array<{
    x: number; y: number; vx: number; vy: number;
    alpha: number; r: number; color: string;
  }> = Array.from({ length: 12 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 5;
    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      alpha: 1,
      r: 3 + Math.random() * 4,
      color,
    };
  });

  let rafId: number;
  function draw() {
    // Don't clear the whole canvas — use a fade technique so we don't
    // clear other bursts that are still active
    ctx!.save();
    ctx!.globalCompositeOperation = "destination-out";
    ctx!.fillStyle = "rgba(0,0,0,0.12)";
    ctx!.fillRect(0, 0, canvas.width, canvas.height);
    ctx!.restore();

    let anyAlive = false;

    for (const p of particles) {
      if (p.alpha <= 0) continue;
      anyAlive = true;
      ctx!.save();
      ctx!.globalAlpha = p.alpha;
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rotation);
      ctx!.font = `${p.size}px serif`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      ctx!.fillText(p.emoji, 0, 0);
      ctx!.restore();
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.alpha -= 0.022;
      p.rotation += p.rotationSpeed;
    }

    for (const d of dots) {
      if (d.alpha <= 0) continue;
      anyAlive = true;
      ctx!.save();
      ctx!.globalAlpha = d.alpha;
      ctx!.fillStyle = d.color;
      ctx!.beginPath();
      ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();
      d.x += d.vx;
      d.y += d.vy;
      d.vy += 0.18;
      d.alpha -= 0.025;
    }

    if (anyAlive) {
      rafId = requestAnimationFrame(draw);
    }
  }
  rafId = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(rafId);
}

/* ─────────────────────────────────────────────────────────
   Full-screen confetti — Phase 4
───────────────────────────────────────────────────────── */
function fireConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const COLORS = [
    "#fbbf24", "#f43f5e", "#a78bfa", "#34d399",
    "#60a5fa", "#f472b6", "#fb923c", "#4ade80",
  ];
  const EMOJIS = ["✨", "🎉", "⭐", "💫", "🌟"];

  interface Confetto {
    x: number; y: number; vx: number; vy: number;
    alpha: number; w: number; h: number;
    color: string; angle: number; aSpeed: number;
    isEmoji?: boolean; emoji?: string; size?: number;
  }

  const confetti: Confetto[] = Array.from({ length: 120 }, (_, i) => ({
    x: Math.random() * W,
    y: -20 - Math.random() * H * 0.4,
    vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 4,
    alpha: 1,
    w: 6 + Math.random() * 10,
    h: 4 + Math.random() * 6,
    color: COLORS[i % COLORS.length],
    angle: Math.random() * Math.PI * 2,
    aSpeed: (Math.random() - 0.5) * 0.15,
    isEmoji: i % 8 === 0,
    emoji: EMOJIS[i % EMOJIS.length],
    size: 18 + Math.random() * 12,
  }));

  let rafId: number;
  let frame = 0;
  function draw() {
    ctx!.clearRect(0, 0, W, H);
    let anyAlive = false;
    for (const c of confetti) {
      if (c.alpha <= 0) continue;
      anyAlive = true;
      ctx!.save();
      ctx!.globalAlpha = c.alpha;
      ctx!.translate(c.x, c.y);
      ctx!.rotate(c.angle);
      if (c.isEmoji) {
        ctx!.font = `${c.size}px serif`;
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText(c.emoji!, 0, 0);
      } else {
        ctx!.fillStyle = c.color;
        ctx!.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      }
      ctx!.restore();
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.08;
      c.vx += (Math.random() - 0.5) * 0.1;
      c.angle += c.aSpeed;
      if (frame > 90) c.alpha -= 0.008;
    }
    frame++;
    if (anyAlive) {
      rafId = requestAnimationFrame(draw);
    }
  }
  rafId = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(rafId);
}

/* ─────────────────────────────────────────────────────────
   Drag-to-unlock slider
───────────────────────────────────────────────────────── */
const SLIDER_W = 280;
const THUMB_SIZE = 46;
const TRACK_INNER = SLIDER_W - THUMB_SIZE;

function DragSlider({ onUnlock }: { onUnlock: () => void }) {
  const x = useMotionValue(0);
  const trackFill = useTransform(x, [0, TRACK_INNER], ["0%", "100%"]);
  const thumbOpacity = useTransform(x, [TRACK_INNER - 20, TRACK_INNER], [1, 0]);
  const [unlocked, setUnlocked] = useState(false);

  const handleDragEnd = useCallback(() => {
    if (x.get() >= TRACK_INNER - 8) {
      setUnlocked(true);
      animate(x, TRACK_INNER, { duration: 0.15 });
      setTimeout(onUnlock, 300);
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 28 });
    }
  }, [x, onUnlock]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      <motion.span
        style={{
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
          fontFamily: "Georgia, serif",
        }}
        animate={{ opacity: unlocked ? 0 : [0.45, 0.9, 0.45] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      >
        slide to open ›
      </motion.span>

      {/* Track */}
      <div
        style={{
          width: SLIDER_W,
          height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          position: "relative",
          overflow: "hidden",
          backdropFilter: "blur(4px)",
        }}
      >
        {/* Fill */}
        <motion.div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: trackFill,
            background:
              "linear-gradient(90deg, rgba(255,200,100,0.25), rgba(255,180,80,0.5))",
            borderRadius: THUMB_SIZE / 2,
          }}
        />

        {/* Shimmer hint arrow */}
        {!unlocked && (
          <motion.div
            style={{
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 18,
              color: "rgba(255,255,255,0.3)",
              pointerEvents: "none",
            }}
            animate={{ x: [0, 6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            ›
          </motion.div>
        )}

        {/* Thumb */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: TRACK_INNER }}
          dragElastic={0}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          style={{
            x,
            position: "absolute",
            left: 0,
            top: 0,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: unlocked ? "default" : "grab",
            boxShadow: "0 4px 20px rgba(251,191,36,0.5), 0 2px 8px rgba(0,0,0,0.4)",
            zIndex: 2,
            opacity: thumbOpacity,
            fontSize: 22,
          }}
          whileTap={{ scale: 0.95 }}
        >
          {unlocked ? "✓" : "📩"}
        </motion.div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Orb component — one clickable emoji orb
───────────────────────────────────────────────────────── */
interface OrbProps {
  emoji: string;
  compliment: string;
  color: string;
  x: number;
  y: number;
  cardCenterX: number;
  cardCenterY: number;
  index: number;
  total: number;
  clicked: boolean;
  onClick: (x: number, y: number) => void;
  finaleStarted: boolean;
}

function Orb({
  emoji,
  compliment,
  color,
  x,
  y,
  cardCenterX,
  cardCenterY,
  index,
  clicked,
  onClick,
  finaleStarted,
}: OrbProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const orbRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (clicked || finaleStarted) return;
    const rect = orbRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : x;
    const cy = rect ? rect.top + rect.height / 2 : y;
    onClick(cx, cy);
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 2400);
  };

  const explodeAngle = Math.atan2(y - cardCenterY, x - cardCenterX);
  const explodeDist = 600;

  return (
    <motion.div
      ref={orbRef}
      initial={{ scale: 0, opacity: 0 }}
      animate={
        finaleStarted
          ? {
              x: [0, Math.cos(explodeAngle) * explodeDist],
              y: [0, Math.sin(explodeAngle) * explodeDist],
              scale: [1, 0.3],
              opacity: [1, 0],
            }
          : { scale: 1, opacity: 1 }
      }
      transition={
        finaleStarted
          ? { duration: 0.6, ease: [0.4, 0, 1, 1], delay: index * 0.06 }
          : {
              type: "spring",
              stiffness: 260,
              damping: 18,
              delay: 0.15 + index * 0.12,
            }
      }
      style={{
        position: "absolute",
        left: x - 28,
        top: y - 28,
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: clicked
          ? `radial-gradient(circle at 35% 35%, ${color}ff, ${color}99)`
          : `radial-gradient(circle at 35% 35%, ${color}cc, ${color}55)`,
        border: `2px solid ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 24,
        cursor: clicked ? "default" : "pointer",
        boxShadow: clicked
          ? `0 0 20px ${color}88, 0 0 40px ${color}44, inset 0 0 12px ${color}33`
          : `0 0 12px ${color}55, 0 4px 16px rgba(0,0,0,0.4)`,
        zIndex: 30,
        userSelect: "none",
      }}
      whileHover={clicked || finaleStarted ? {} : { scale: 1.15, boxShadow: `0 0 28px ${color}bb` }}
      whileTap={clicked || finaleStarted ? {} : { scale: 0.9 }}
      onClick={handleClick}
    >
      {emoji}

      {/* Checkmark overlay when clicked */}
      {clicked && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            position: "absolute",
            bottom: -4,
            right: -4,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#22c55e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            color: "white",
            fontWeight: "bold",
          }}
        >
          ✓
        </motion.div>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "absolute",
            bottom: "calc(100% + 12px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15,10,30,0.95)",
            border: `1px solid ${color}66`,
            borderRadius: 12,
            padding: "8px 14px",
            whiteSpace: "normal",
            fontSize: 12,
            color: "#f0e8ff",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            maxWidth: 200,
            lineHeight: 1.4,
            textAlign: "center",
            boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${color}33`,
            zIndex: 50,
            pointerEvents: "none",
          }}
        >
          {compliment}
          <div
            style={{
              position: "absolute",
              bottom: -6,
              left: "50%",
              transform: "translateX(-50%)",
              width: 10,
              height: 10,
              background: "rgba(15,10,30,0.95)",
              border: `1px solid ${color}66`,
              borderTop: "none",
              borderLeft: "none",
              rotate: "45deg",
            }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   Template dev overlay
───────────────────────────────────────────────────────── */
const OCCASION_LABELS: Record<string, string> = {
  thank_you: "Thank You",
  sorry: "Sorry",
  feel_good: "Feel Good",
};

function TemplateSwitcher({
  current,
  onChange,
}: {
  current: CardTemplate;
  onChange: (t: CardTemplate) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 200,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "rgba(0,0,0,0.7)",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "white",
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: 12,
          cursor: "pointer",
          backdropFilter: "blur(8px)",
        }}
      >
        🔄 Try another template
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "rgba(10,8,20,0.95)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: 8,
            width: 210,
            boxShadow: "0 16px 48px rgba(0,0,0,0.8)",
            backdropFilter: "blur(12px)",
          }}
        >
          {TEMPLATES.map((t, i) => (
            <button
              key={i}
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background:
                  t === current ? "rgba(255,255,255,0.1)" : "transparent",
                border: "none",
                color: "rgba(255,255,255,0.85)",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 12,
                cursor: "pointer",
                marginBottom: 2,
              }}
            >
              <span style={{ opacity: 0.6 }}>
                {OCCASION_LABELS[t.occasion]}
              </span>{" "}
              · {t.relationship}
              {t === current && (
                <span style={{ marginLeft: 6, color: "#fbbf24" }}>✓</span>
              )}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
type Phase = "sealed" | "opening" | "orbiting" | "finale" | "complete";

export function InteractiveCard() {
  const params = getParams();
  const [template, setTemplate] = useState<CardTemplate>(() =>
    resolveTemplate(params.occasion, params.rel),
  );
  const [phase, setPhase] = useState<Phase>("sealed");
  const [clickedOrbs, setClickedOrbs] = useState<Set<number>>(new Set());
  const [finaleStarted, setFinaleStarted] = useState(false);
  const [key, setKey] = useState(0); // reset key for template switches

  const cardRef = useRef<HTMLDivElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafCancelersRef = useRef<Array<() => void>>([]);
  const sequenceIdRef = useRef(0);
  const [orbPositions, setOrbPositions] = useState<
    Array<{ x: number; y: number }>
  >([]);
  const [cardCenter, setCardCenter] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const flapCtrl = useAnimation();
  const cardCtrl = useAnimation();
  const envelopeCtrl = useAnimation();
  const messageCtrl = useAnimation();

  const { palette, orbs, titlePrefix, finalMessage } = template;
  const recipientName = params.to;
  const allOrbsClicked = clickedOrbs.size === orbs.length;

  /* ── Calculate orb positions around card ── */
  useLayoutEffect(() => {
    if (phase !== "orbiting") return;

    function calc() {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const containerRect = card.parentElement!.getBoundingClientRect();
      const cx = rect.left - containerRect.left + rect.width / 2;
      const cy = rect.top - containerRect.top + rect.height / 2;
      const r = Math.min(rect.width * 0.82, rect.height * 0.82, 180);
      const angleOffset = -Math.PI / 2;

      const positions = orbs.map((_, i) => {
        const angle = angleOffset + (i / orbs.length) * Math.PI * 2;
        return {
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        };
      });
      setOrbPositions(positions);
      setCardCenter({ x: cx, y: cy });
    }

    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [phase, orbs]);

  /* ── Resize particle canvas ── */
  useEffect(() => {
    function resize() {
      const pc = particleCanvasRef.current;
      const cc = confettiCanvasRef.current;
      if (pc) { pc.width = window.innerWidth; pc.height = window.innerHeight; }
      if (cc) { cc.width = window.innerWidth; cc.height = window.innerHeight; }
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  /* ── Cancel any active RAF loops on unmount ── */
  useEffect(() => {
    return () => {
      rafCancelersRef.current.forEach((cancel) => cancel());
      rafCancelersRef.current = [];
    };
  }, []);

  /* ── Envelope open sequence ── */
  const handleUnlock = useCallback(async () => {
    const seqId = sequenceIdRef.current;
    setPhase("opening");

    // Flap opens
    await flapCtrl.start({
      rotateX: -178,
      transition: { type: "spring", damping: 10, stiffness: 90 },
    });
    if (sequenceIdRef.current !== seqId) return;

    // Card slides up
    await cardCtrl.start({
      y: 0,
      opacity: 1,
      scale: 1,
      transition: { type: "spring", damping: 18, stiffness: 120, delay: 0.2 },
    });
    if (sequenceIdRef.current !== seqId) return;

    // Envelope fades
    await envelopeCtrl.start({
      opacity: 0,
      scale: 0.94,
      y: 20,
      transition: { duration: 0.45, ease: "easeIn", delay: 0.3 },
    });
    if (sequenceIdRef.current !== seqId) return;

    setPhase("orbiting");
  }, [flapCtrl, cardCtrl, envelopeCtrl]);

  /* ── Orb click handler ── */
  const handleOrbClick = useCallback(
    (orbIndex: number, screenX: number, screenY: number) => {
      if (finaleStarted) return;
      setClickedOrbs((prev) => new Set([...prev, orbIndex]));
      const canvas = particleCanvasRef.current;
      if (canvas) {
        const cancel = fireParticleBurst(canvas, screenX, screenY, orbs[orbIndex].emoji, orbs[orbIndex].color);
        if (cancel) rafCancelersRef.current.push(cancel);
      }
    },
    [finaleStarted, orbs],
  );

  /* ── Finale ── */
  const triggerFinale = useCallback(async () => {
    if (finaleStarted) return;
    const seqId = sequenceIdRef.current;
    setFinaleStarted(true);

    // Fire confetti
    const cc = confettiCanvasRef.current;
    if (cc) {
      const cancel = fireConfetti(cc);
      if (cancel) rafCancelersRef.current.push(cancel);
    }

    // Glow card then reveal message
    await new Promise((r) => setTimeout(r, 600));
    if (sequenceIdRef.current !== seqId) return;
    setPhase("complete");

    await messageCtrl.start({
      opacity: 1,
      scale: 1,
      transition: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] },
    });
  }, [finaleStarted, messageCtrl]);

  /* ── Template switcher resets everything ── */
  const handleTemplateChange = (t: CardTemplate) => {
    sequenceIdRef.current += 1;
    rafCancelersRef.current.forEach((cancel) => cancel());
    rafCancelersRef.current = [];
    setTemplate(t);
    setPhase("sealed");
    setClickedOrbs(new Set());
    setFinaleStarted(false);
    setKey((k) => k + 1);
    flapCtrl.set({ rotateX: 0 });
    cardCtrl.set({ y: 80, opacity: 0, scale: 0.9 });
    envelopeCtrl.set({ opacity: 1, scale: 1, y: 0 });
    messageCtrl.set({ opacity: 0, scale: 0.8 });
    // Clear canvases
    const pc = particleCanvasRef.current;
    const cc = confettiCanvasRef.current;
    if (pc) pc.getContext("2d")?.clearRect(0, 0, pc.width, pc.height);
    if (cc) cc.getContext("2d")?.clearRect(0, 0, cc.width, cc.height);
  };

  const showRevealButton = allOrbsClicked && phase === "orbiting" && !finaleStarted;
  const showOrbs = phase === "orbiting" || (phase === "complete" && finaleStarted);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: palette.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Georgia, serif",
      }}
    >
      {/* Particle burst canvas — full screen, pointer-events none */}
      <canvas
        ref={particleCanvasRef}
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 100,
        }}
      />

      {/* Confetti canvas — full screen, pointer-events none */}
      <canvas
        ref={confettiCanvasRef}
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 101,
        }}
      />

      {/* Template switcher overlay */}
      <TemplateSwitcher current={template} onChange={handleTemplateChange} />

      {/* URL param display */}
      <div
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 200,
          fontSize: 11,
          color: "rgba(255,255,255,0.35)",
          fontFamily: "system-ui",
          letterSpacing: "0.04em",
        }}
      >
        ?to={recipientName}&occasion={template.occasion}&rel={template.relationship}
      </div>

      {/* ── Scene container ── */}
      <div
        key={key}
        style={{
          position: "relative",
          width: 340,
          height: 520,
        }}
      >
        {/* ══ PHASE 1: Sealed Envelope ══ */}
        <motion.div
          animate={envelopeCtrl}
          initial={{ opacity: 1, scale: 1, y: 0 }}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: phase === "sealed" || phase === "opening" ? 20 : 0,
            perspective: 800,
            perspectiveOrigin: "50% 50%",
            pointerEvents:
              phase === "sealed" || phase === "opening" ? "auto" : "none",
          }}
        >
          {/* Envelope body */}
          <div
            style={{
              position: "absolute",
              bottom: 100,
              left: "50%",
              transform: "translateX(-50%)",
              width: 300,
              height: 190,
            }}
          >
            {/* Shadow */}
            <div
              style={{
                position: "absolute",
                bottom: -12,
                left: "5%",
                right: "5%",
                height: 24,
                background: "rgba(0,0,0,0.5)",
                filter: "blur(16px)",
                borderRadius: "50%",
              }}
            />

            {/* Envelope parchment */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 6,
                background: palette.envelopeBody,
                boxShadow:
                  "0 18px 55px rgba(0,0,0,0.6), 0 6px 18px rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.15)",
                overflow: "hidden",
              }}
            >
              {/* Left fold */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.12)",
                  clipPath: "polygon(0 0, 46% 52%, 0 100%)",
                }}
              />
              {/* Right fold */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.12)",
                  clipPath: "polygon(100% 0, 54% 52%, 100% 100%)",
                }}
              />
              {/* Bottom fold */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.08)",
                  clipPath: "polygon(0 100%, 46% 52%, 54% 52%, 100% 100%)",
                }}
              />

              {/* To: address */}
              <div
                style={{
                  position: "absolute",
                  bottom: 22,
                  left: 20,
                  fontSize: 13,
                  fontStyle: "italic",
                  color: "rgba(80,50,40,0.75)",
                  letterSpacing: "0.04em",
                }}
              >
                To: {recipientName} ♡
              </div>

              {/* Seal dot */}
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 4px rgba(251,191,36,0.4)",
                    "0 0 16px rgba(251,191,36,0.9)",
                    "0 0 4px rgba(251,191,36,0.4)",
                  ],
                }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{
                  position: "absolute",
                  top: "48%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 35% 35%, #fde68a, #f59e0b)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  zIndex: 5,
                }}
              >
                ✦
              </motion.div>
            </div>

            {/* Envelope flap — 3D CSS */}
            <div
              style={{
                perspective: 700,
                perspectiveOrigin: "50% 0%",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "56%",
                zIndex: 12,
              }}
            >
              <motion.div
                animate={flapCtrl}
                initial={{ rotateX: 0 }}
                style={{
                  width: "100%",
                  height: "100%",
                  transformOrigin: "50% 0%",
                  transformStyle: "preserve-3d",
                  position: "relative",
                }}
              >
                {/* Outside of flap */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: palette.envelopeFlap,
                    clipPath: "polygon(0 0, 100% 0, 50% 88%)",
                    borderRadius: "5px 5px 0 0",
                    backfaceVisibility: "hidden",
                    boxShadow: "inset 0 -3px 12px rgba(0,0,0,0.1)",
                  }}
                />
                {/* Inside of flap */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to bottom, #fff8f0, #f5ede0)",
                    clipPath: "polygon(0 0, 100% 0, 50% 88%)",
                    transform: "rotateX(180deg)",
                    backfaceVisibility: "hidden",
                  }}
                />
              </motion.div>
            </div>
          </div>

          {/* Drag-to-unlock slider */}
          {phase === "sealed" && <DragSlider onUnlock={handleUnlock} />}
        </motion.div>

        {/* ══ PHASE 2+: Central card ══ */}
        <motion.div
          ref={cardRef}
          animate={cardCtrl}
          initial={{ y: 80, opacity: 0, scale: 0.9 }}
          style={{
            position: "absolute",
            top: 50,
            left: "50%",
            marginLeft: -155,
            width: 310,
            height: 400,
            borderRadius: 20,
            background: palette.cardBg,
            border: `1px solid ${palette.accent}44`,
            boxShadow:
              phase === "complete"
                ? `0 0 60px ${palette.accent}88, 0 0 120px ${palette.accent}44, 0 24px 80px rgba(0,0,0,0.8)`
                : "0 24px 80px rgba(0,0,0,0.7)",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "28px 24px",
            overflow: "hidden",
          }}
        >
          {/* Card glow animation during finale */}
          {phase === "complete" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(ellipse at 50% 30%, ${palette.accent}44, transparent 70%)`,
                borderRadius: 20,
                pointerEvents: "none",
              }}
            />
          )}

          {/* Phase 2+3: Orb phase card content */}
          {phase !== "complete" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === "orbiting" ? 1 : 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{ textAlign: "center", zIndex: 2 }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: palette.accent + "bb",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {titlePrefix}
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: palette.cardText,
                  letterSpacing: "0.02em",
                  marginBottom: 16,
                }}
              >
                {recipientName}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: palette.accent + "99",
                  fontStyle: "italic",
                  lineHeight: 1.6,
                }}
              >
                {allOrbsClicked
                  ? "✨ You've discovered them all!"
                  : `Tap each orb to reveal your message`}
              </div>

              {/* Progress dots */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  justifyContent: "center",
                  marginTop: 16,
                }}
              >
                {orbs.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      background: clickedOrbs.has(i)
                        ? palette.accent
                        : "rgba(255,255,255,0.15)",
                      scale: clickedOrbs.has(i) ? 1.3 : 1,
                    }}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Phase 4: Final message */}
          {phase === "complete" && (
            <motion.div
              animate={messageCtrl}
              initial={{ opacity: 0, scale: 0.8 }}
              style={{ textAlign: "center", zIndex: 2, padding: "0 8px" }}
            >
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.7 }}
                style={{
                  fontSize: 13,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                  background: `linear-gradient(90deg, #fbbf24, #fde68a, #f59e0b, #fbbf24)`,
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                ✦ {titlePrefix} {recipientName} ✦
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
                style={{
                  fontSize: 15,
                  fontStyle: "italic",
                  lineHeight: 1.75,
                  background: `linear-gradient(135deg, #fde68a 0%, #fbbf24 30%, #fff8e0 60%, #f59e0b 80%, #fde68a 100%)`,
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 8px rgba(251,191,36,0.4))",
                }}
              >
                <GoldFoilText text={finalMessage} />
              </motion.p>

              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, type: "spring" }}
                style={{
                  marginTop: 20,
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  color: "rgba(251,191,36,0.5)",
                }}
              >
                ✦ HeartSync AI ✦
              </motion.div>
            </motion.div>
          )}
        </motion.div>

        {/* ══ PHASE 2+3: Emoji orbs in orbit ══ */}
        {showOrbs &&
          orbPositions.length === orbs.length && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 25,
                pointerEvents: finaleStarted ? "none" : "auto",
              }}
            >
              {orbs.map((orb, i) => (
                <Orb
                  key={i}
                  index={i}
                  total={orbs.length}
                  emoji={orb.emoji}
                  compliment={orb.compliment}
                  color={orb.color}
                  x={orbPositions[i].x}
                  y={orbPositions[i].y}
                  cardCenterX={cardCenter.x}
                  cardCenterY={cardCenter.y}
                  clicked={clickedOrbs.has(i)}
                  finaleStarted={finaleStarted}
                  onClick={(sx, sy) => handleOrbClick(i, sx, sy)}
                />
              ))}
            </div>
          )}

        {/* ══ Reveal Message button ══ */}
        {showRevealButton && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={triggerFinale}
            style={{
              position: "absolute",
              bottom: 18,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 50,
              background: `linear-gradient(135deg, ${palette.accent}, ${palette.accent}cc)`,
              border: "none",
              borderRadius: 999,
              padding: "14px 32px",
              fontSize: 15,
              fontFamily: "Georgia, serif",
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
              boxShadow: `0 8px 32px ${palette.accent}66, 0 4px 16px rgba(0,0,0,0.4)`,
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
          >
            ✨ Reveal Message
          </motion.button>
        )}
      </div>

      {/* Ambient background glow */}
      <motion.div
        animate={{
          opacity: phase === "complete" ? [0.3, 0.6, 0.3] : 0.2,
        }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{
          position: "fixed",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, ${palette.accent}33, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Gold foil text — word-by-word stagger animation
───────────────────────────────────────────────────────── */
function GoldFoilText({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.06, duration: 0.4 }}
          style={{ display: "inline" }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </>
  );
}
