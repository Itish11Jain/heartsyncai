import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { getTemplate, getFallbackTemplate, type OrbData } from "@/lib/card-templates";
import { envelope, music } from "@/lib/audio";
import { trackEvent } from "@/lib/trackEvent";
import WatermarkBadge from "@/components/WatermarkBadge";

/* Premium templates and sender auth features lazy-load only when needed.
 * Recipients of the default envelope card never download these chunks. */
const CosmicCard = lazy(() => import("@/pages/cosmic"));
const VinylCard = lazy(() => import("@/pages/vinyl"));
const CrystalCard = lazy(() => import("@/pages/crystal"));
const SenderPanel = lazy(() => import("@/components/SenderPanel"));

/* ─────────────────────────── helpers ──────────────────────────── */

function useQueryParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function decodeMsg(encoded: string | null): string | null {
  if (!encoded) return null;
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return null;
  }
}

/* ─────────────────────────── personalisation ──────────────────── */

function personalizeOrb(likes: string, occasion: string): OrbData | null {
  if (!likes.trim()) return null;
  const l = likes.toLowerCase();

  const MAP: Array<{ keys: string[]; emoji: string; by: Record<string, string> }> = [
    {
      keys: ["travel", "trip", "trips", "flight", "flights", "adventure", "explore", "wander", "abroad", "tourist"],
      emoji: "✈️",
      by: { birthday: "So many more trips this year!", thank_you: "For being the best travel buddy", sorry: "Let's plan a trip to make up for it", default: "Adventures are better with you" },
    },
    {
      keys: ["panda", "pandas"],
      emoji: "🐼",
      by: { birthday: "Panda-sized birthday hugs!", thank_you: "So many panda hugs for you", sorry: "Panda cuddles to say sorry", default: "All the panda love for you" },
    },
    {
      keys: ["pink"],
      emoji: "🌸",
      by: { birthday: "All the pink everything today!", thank_you: "You make everything rosy", sorry: "Pink roses, because I'm sorry", default: "All things pink, just for you" },
    },
    {
      keys: ["dog", "dogs", "puppy", "puppies", "doggo"],
      emoji: "🐶",
      by: { birthday: "All the puppy birthday kisses!", thank_you: "Doggo-level loyalty — that's you", sorry: "Puppy eyes and a big sorry", default: "So much puppy love" },
    },
    {
      keys: ["cat", "cats", "kitten", "kitty", "kittens"],
      emoji: "🐱",
      by: { birthday: "Purr-fect birthday vibes!", thank_you: "Purr-fect, just like you", sorry: "Kitty hugs — I'm sorry", default: "All the cat energy" },
    },
    {
      keys: ["music", "song", "songs", "playlist", "singer", "guitar"],
      emoji: "🎵",
      by: { birthday: "A birthday playlist, just for you!", thank_you: "You're my favourite song", sorry: "Music heals everything between us", default: "The world sounds better with you" },
    },
    {
      keys: ["movie", "movies", "film", "films", "cinema", "netflix", "series"],
      emoji: "🎬",
      by: { birthday: "All the movie marathons ahead!", thank_you: "Best watch party partner", sorry: "Movie night to make it up to you", default: "Every scene is better with you" },
    },
    {
      keys: ["food", "foodie", "eat", "eating", "pizza", "biryani", "burger", "cook", "cooking"],
      emoji: "🍕",
      by: { birthday: "All the cake (and more) today!", thank_you: "Best foodie partner ever", sorry: "Treat's completely on me", default: "Good food, better company" },
    },
    {
      keys: ["coffee", "chai", "tea", "cafe", "latte"],
      emoji: "☕",
      by: { birthday: "Birthday chai is on me!", thank_you: "For every coffee and conversation", sorry: "Coffee and a long chat to fix it all", default: "Every cup is better with you" },
    },
    {
      keys: ["game", "games", "gaming", "gamer", "playstation", "xbox"],
      emoji: "🎮",
      by: { birthday: "Level up, big time!", thank_you: "Best co-op player in my life", sorry: "Game night — let's call it even", default: "Player 1 always" },
    },
    {
      keys: ["book", "books", "reading", "reader", "novel", "library"],
      emoji: "📚",
      by: { birthday: "A whole new chapter begins!", thank_you: "You're my favourite story", sorry: "Every great story has a comeback", default: "Writing the best chapters together" },
    },
    {
      keys: ["beach", "ocean", "sea", "waves", "surf", "goa"],
      emoji: "🌊",
      by: { birthday: "All the beach days ahead!", thank_you: "Ocean-deep gratitude", sorry: "Fresh start, like the sea", default: "Waves of love for you" },
    },
    {
      keys: ["mountain", "mountains", "hiking", "hike", "trek", "trekking"],
      emoji: "🏔️",
      by: { birthday: "New year, new peaks!", thank_you: "You lift me higher every day", sorry: "Let's climb back together", default: "Mountain-high love" },
    },
    {
      keys: ["star", "stars", "space", "sky", "astronomy", "universe"],
      emoji: "🌟",
      by: { birthday: "You're a supernova today!", thank_you: "My brightest star, always", sorry: "Stargazing together to start fresh", default: "Made of stardust, just like you" },
    },
    {
      keys: ["dance", "dancing", "dancer"],
      emoji: "💃",
      by: { birthday: "Dance like the whole day is yours!", thank_you: "Life's a dance with you in it", sorry: "Let's dance it out", default: "Moving through life together" },
    },
    {
      keys: ["art", "painting", "draw", "drawing", "sketch", "design"],
      emoji: "🎨",
      by: { birthday: "Paint this year your favourite colour!", thank_you: "You are a masterpiece", sorry: "Blank canvas — let's start fresh", default: "You are a work of art" },
    },
    {
      keys: ["cricket", "football", "sports", "sport", "gym", "fitness", "workout", "run", "running"],
      emoji: "🏆",
      by: { birthday: "Champion energy all year!", thank_you: "MVP in my life, always", sorry: "Back in the game, together", default: "You play life and win" },
    },
    {
      keys: ["flower", "flowers", "rose", "roses", "garden"],
      emoji: "🌺",
      by: { birthday: "In full bloom today!", thank_you: "You make everything bloom", sorry: "Flowers to say I'm sorry", default: "Beautiful, just like you" },
    },
  ];

  for (const m of MAP) {
    if (m.keys.some((k) => l.includes(k))) {
      return { emoji: m.emoji, text: m.by[occasion] ?? m.by["default"] };
    }
  }
  return null;
}

/* ─────────────────────────── particle engine ──────────────────── */

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  alpha: number;
  size: number;
  content: string;
  isEmoji: boolean;
  color?: string;
  width?: number;
  height?: number;
  rotation: number;
  spin: number;
}

function getConfettiColors(likes: string): string[] {
  const l = likes.toLowerCase();
  if (l.includes("pink")) return ["#FF69B4", "#FF1493", "#FFB6C1", "#FF69B4", "#FFC0CB", "#FFFFFF", "#FFD700"];
  if (l.includes("blue")) return ["#60A5FA", "#3B82F6", "#93C5FD", "#BFDBFE", "#FFFFFF", "#FFD700"];
  return ["#FFD700", "#FFC200", "#C0C0C0", "#FFFFFF", "#FFF8DC", "#FFE066", "#E8AA00"];
}

function createEmojiParticles(cx: number, cy: number, emoji: string): Particle[] {
  return Array.from({ length: 22 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 9;
    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      alpha: 1,
      size: 20 + Math.random() * 14,
      content: emoji,
      isEmoji: true,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
    };
  });
}

function createConfettiParticles(canvasW: number, colors: string[]): Particle[] {
  return Array.from({ length: 130 }, () => ({
    x: Math.random() * canvasW,
    y: -10 - Math.random() * 120,
    vx: (Math.random() - 0.5) * 3.5,
    vy: 2.5 + Math.random() * 4,
    alpha: 1,
    size: 0,
    content: "",
    isEmoji: false,
    color: colors[Math.floor(Math.random() * colors.length)],
    width: 7 + Math.random() * 6,
    height: 13 + Math.random() * 9,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.18,
  }));
}

/* ─────────────────────────── SlideToUnlock ────────────────────── */

function SlideToUnlock({ onUnlock }: { onUnlock: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumbX, setThumbX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const thumbSize = 52;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (unlocked) return;
    envelope.slideStart();
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !trackRef.current || unlocked) return;
    const rect = trackRef.current.getBoundingClientRect();
    const maxX = rect.width - thumbSize - 4;
    const newX = Math.max(0, Math.min(maxX, e.clientX - rect.left - thumbSize / 2));
    setThumbX(newX);
    if (newX / maxX > 0.82) {
      setUnlocked(true);
      setThumbX(maxX);
      setTimeout(onUnlock, 300);
    }
  }, [dragging, unlocked, onUnlock]);

  const handlePointerUp = useCallback(() => {
    if (unlocked) return;
    setDragging(false);
    setThumbX(0);
  }, [unlocked]);

  const trackWidth = "min(320px, 80vw)";
  const progress = trackRef.current
    ? thumbX / (trackRef.current.offsetWidth - thumbSize - 4)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}
    >
      <div
        ref={trackRef}
        style={{
          width: trackWidth,
          height: thumbSize + 8,
          borderRadius: 999,
          background: "rgba(255,255,255,0.07)",
          border: "1.5px solid rgba(255,215,0,0.25)",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 0 30px rgba(255,215,0,0.08)",
          userSelect: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0, top: 0, bottom: 0,
            width: `${(thumbX + thumbSize / 2)}px`,
            background: "linear-gradient(90deg, rgba(255,215,0,0.18), rgba(255,165,0,0.1))",
            transition: dragging ? "none" : "all 0.3s",
          }}
        />
        <div
          style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 500,
            color: `rgba(255,255,255,${0.45 - progress * 0.45})`,
            letterSpacing: "0.04em",
            pointerEvents: "none",
            paddingLeft: thumbSize + 16,
          }}
        >
          {unlocked ? "✓" : "Slide to unlock →"}
        </div>
        <motion.div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          animate={{
            x: thumbX + 4,
            boxShadow: unlocked
              ? "0 0 0 4px rgba(255,215,0,0.35), 0 0 24px rgba(255,215,0,0.6)"
              : dragging
              ? "0 0 0 3px rgba(255,215,0,0.25), 0 0 16px rgba(255,215,0,0.4)"
              : "0 0 0 2px rgba(255,215,0,0.15), 0 4px 12px rgba(0,0,0,0.4)",
          }}
          transition={{ duration: dragging ? 0 : 0.3, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: 4,
            width: thumbSize,
            height: thumbSize,
            borderRadius: "50%",
            background: unlocked
              ? "linear-gradient(135deg, #22c55e, #16a34a)"
              : "linear-gradient(135deg, #FFD700, #FFA500)",
            cursor: unlocked ? "default" : "grab",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
            touchAction: "none",
          }}
        >
          {unlocked ? "✓" : "→"}
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────── Golden Envelope ──────────────────── */

function GoldenEnvelope({
  recipientName,
  opening,
}: {
  recipientName: string;
  opening: boolean;
}) {
  const envW = "min(340px, 88vw)";
  const envH = "min(210px, 53vw)";

  return (
    <div
      style={{
        width: envW,
        height: envH,
        position: "relative",
        perspective: 800,
        filter: "drop-shadow(0 24px 48px rgba(255,165,0,0.35)) drop-shadow(0 0 80px rgba(255,215,0,0.15))",
      }}
    >
      {/* Envelope body */}
      <div
        style={{
          position: "absolute", inset: 0,
          borderRadius: 10,
          background: "linear-gradient(145deg, #F5C518 0%, #FFD700 28%, #FFBC00 55%, #E8AA00 80%, #D4960A 100%)",
          boxShadow: "inset 0 2px 8px rgba(255,255,255,0.25), inset 0 -2px 8px rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}
      >
        {/* Left fold */}
        <div
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to right, #C49000, transparent 42%)",
            clipPath: "polygon(0 100%, 44% 52%, 0 4%)",
            opacity: 0.55,
          }}
        />
        {/* Right fold */}
        <div
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to left, #C49000, transparent 42%)",
            clipPath: "polygon(100% 100%, 56% 52%, 100% 4%)",
            opacity: 0.55,
          }}
        />
        {/* Bottom fold */}
        <div
          style={{
            position: "absolute", inset: 0,
            background: "#B8870A",
            clipPath: "polygon(0 100%, 44% 52%, 56% 52%, 100% 100%)",
            opacity: 0.6,
          }}
        />
        {/* Inner light */}
        <div
          style={{
            position: "absolute", top: "5%", left: "30%", right: "30%", bottom: "30%",
            background: "linear-gradient(to bottom, rgba(255,250,220,0.25), rgba(255,255,200,0.05))",
          }}
        />

        {/* To label — centered at bottom, prominent */}
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "Georgia, serif",
            fontSize: "min(15px, 3.8vw)",
            color: "rgba(80,40,0,0.65)",
            fontStyle: "italic",
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          To:{" "}
          <span style={{ fontWeight: 800, fontSize: "min(18px, 4.6vw)", color: "rgba(45,18,0,0.9)" }}>
            {recipientName}
          </span>
        </div>

        {/* Star decoration */}
        <div
          style={{
            position: "absolute", top: 10, right: 14,
            fontSize: "min(11px, 3vw)",
            color: "rgba(200,130,0,0.7)",
            letterSpacing: 2,
          }}
        >
          ✦ ✦ ✦
        </div>
      </div>

      {/* Wax seal — real seal centered exactly at fold intersection */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 5,
        }}
      >
        <motion.div
          initial={{ scale: 1, opacity: 1 }}
          animate={opening ? { scale: 0, opacity: 0 } : {}}
          transition={{ duration: 0.3 }}
          style={{
            width: "min(54px, 13.5vw)",
            height: "min(54px, 13.5vw)",
            borderRadius: "50%",
            background: "radial-gradient(circle at 38% 33%, #A82020, #7A0A0A 58%, #4A0000 92%)",
            boxShadow: "0 4px 16px rgba(80,0,0,0.65), inset 0 1px 4px rgba(255,140,140,0.22), inset 0 -2px 5px rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Outer decorative ring */}
          <div style={{
            position: "absolute",
            inset: "10%",
            borderRadius: "50%",
            border: "1.5px solid rgba(255,160,160,0.22)",
          }} />
          {/* Inner ring */}
          <div style={{
            position: "absolute",
            inset: "22%",
            borderRadius: "50%",
            border: "1px solid rgba(255,160,160,0.14)",
          }} />
          {/* Subtle highlight dot instead of monogram */}
          <div style={{
            position: "absolute",
            width: "28%", height: "28%",
            top: "22%", left: "28%",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,200,200,0.28), transparent 70%)",
            zIndex: 2,
          }} />
        </motion.div>
      </div>

      {/* The flap (animates open) */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: "56%",
          perspective: 700,
          perspectiveOrigin: "50% 0%",
          zIndex: 10,
        }}
      >
        <motion.div
          initial={{ rotateX: 0 }}
          animate={opening ? { rotateX: -175 } : { rotateX: 0 }}
          transition={{ type: "spring", damping: 10, stiffness: 100, delay: opening ? 0.1 : 0 }}
          style={{
            width: "100%", height: "100%",
            transformOrigin: "50% 0%",
            transformStyle: "preserve-3d",
            position: "relative",
          }}
        >
          {/* Outside of flap (gold) */}
          <div
            style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(172deg, #E8B800 0%, #D4A000 45%, #C49000 100%)",
              clipPath: "polygon(0 0, 100% 0, 50% 88%)",
              borderRadius: "10px 10px 0 0",
              backfaceVisibility: "hidden",
              boxShadow: "inset 0 -2px 8px rgba(0,0,0,0.1)",
            }}
          />
          {/* Inside of flap (lighter gold) */}
          <div
            style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to bottom, #FFE566 0%, #FFCC00 100%)",
              clipPath: "polygon(0 0, 100% 0, 50% 88%)",
              transform: "rotateX(180deg)",
              backfaceVisibility: "hidden",
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Orb ───────────────────────────────── */

function Orb({
  orb,
  index,
  x,
  y,
  clicked,
  onClick,
}: {
  orb: OrbData;
  index: number;
  x: number;
  y: number;
  clicked: boolean;
  onClick: (idx: number, rect: DOMRect) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const orbSize = "min(72px, 18vw)";

  const handleClick = () => {
    if (clicked || !ref.current) return;
    onClick(index, ref.current.getBoundingClientRect());
  };

  return (
    <motion.div
      ref={ref}
      initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
      animate={
        clicked
          ? { x, y, scale: 0.7, opacity: 0.3, filter: "grayscale(100%)" }
          : { x, y, scale: 1, opacity: 1, filter: "grayscale(0%)" }
      }
      transition={
        clicked
          ? { duration: 0.3, ease: "easeOut" }
          : {
              x: { type: "spring", damping: 16, stiffness: 200, delay: index * 0.1 },
              y: { type: "spring", damping: 16, stiffness: 200, delay: index * 0.1 },
              scale: { type: "spring", damping: 14, stiffness: 220, delay: index * 0.1 },
              opacity: { duration: 0.3, delay: index * 0.1 },
            }
      }
      onClick={handleClick}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: orbSize,
        height: orbSize,
        marginTop: `calc(${orbSize} / -2)`,
        marginLeft: `calc(${orbSize} / -2)`,
        borderRadius: "50%",
        background: clicked
          ? "rgba(80,80,80,0.3)"
          : "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.08))",
        border: `2px solid ${clicked ? "rgba(100,100,100,0.3)" : "rgba(255,215,0,0.4)"}`,
        backdropFilter: "blur(8px)",
        boxShadow: clicked
          ? "none"
          : "0 8px 32px rgba(255,165,0,0.2), inset 0 1px 2px rgba(255,255,255,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "min(32px, 8vw)",
        cursor: clicked ? "default" : "pointer",
        zIndex: 25,
        userSelect: "none",
      }}
    >
      {!clicked && (
        <motion.span
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 2.5 + index * 0.3, repeat: Infinity, ease: "easeInOut" }}
          style={{ display: "block" }}
        >
          {orb.emoji}
        </motion.span>
      )}
      {clicked && <span>{orb.emoji}</span>}
    </motion.div>
  );
}

/* ─────────────────────────── OrbTooltip ───────────────────────── */

function OrbTooltip({ orb, tooltipKey }: { orb: OrbData; tooltipKey: number }) {
  return (
    /* Pinned below the status bar — well above the orb ring which lives near vertical centre */
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        padding: "56px 24px 0",
        pointerEvents: "none",
        zIndex: 35,
      }}
    >
      <motion.div
        key={tooltipKey}
        initial={{ scale: 0.8, opacity: 0, y: -12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: -8 }}
        transition={{ type: "spring", damping: 18, stiffness: 300 }}
        style={{
          width: "min(300px, calc(100vw - 48px))",
          padding: "16px 20px",
          borderRadius: 20,
          background: "rgba(10, 6, 20, 0.92)",
          border: "1.5px solid rgba(255,215,0,0.35)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 16px 50px rgba(0,0,0,0.55), 0 0 30px rgba(255,215,0,0.1)",
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <span style={{ fontSize: 32, flexShrink: 0 }}>{orb.emoji}</span>
        <p
          style={{
            color: "rgba(255,255,255,0.92)",
            fontSize: 14,
            lineHeight: 1.55,
            fontWeight: 500,
            fontStyle: "italic",
            textAlign: "left",
            margin: 0,
          }}
        >
          "{orb.text}"
        </p>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────── FinalCard ────────────────────────── */

function FinalCard({
  recipientName,
  titlePrefix,
  finalMessage,
}: {
  recipientName: string;
  titlePrefix: string;
  finalMessage: string;
}) {
  return (
    <motion.div
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 14, stiffness: 160 }}
      style={{
        width: "min(380px, 92vw)",
        borderRadius: 28,
        padding: "32px 24px 24px",
        background: "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,215,0,0.05) 50%, rgba(255,255,255,0.04) 100%)",
        border: "1.5px solid rgba(255,215,0,0.3)",
        backdropFilter: "blur(24px)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(255,215,0,0.12), inset 0 1px 1px rgba(255,255,255,0.12)",
        textAlign: "center",
        zIndex: 30,
        position: "relative",
      }}
    >
      {/* Gold shimmer line */}
      <div
        style={{
          position: "absolute", top: 0, left: "15%", right: "15%",
          height: 2,
          background: "linear-gradient(90deg, transparent, #FFD700, transparent)",
          borderRadius: 99,
        }}
      />

      <p
        style={{
          fontSize: 13,
          color: "rgba(255,215,0,0.7)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 8,
          fontWeight: 600,
        }}
      >
        {titlePrefix}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
          style={{
            fontSize: "min(44px, 11vw)",
            fontWeight: 800,
            color: "white",
            fontFamily: "Georgia, serif",
            lineHeight: 1.1,
          }}
        >
          {recipientName}
        </motion.h1>
        <motion.span
          animate={{ scale: [1, 1.4, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.8, delay: 0.4, repeat: 3, repeatDelay: 1 }}
          style={{ fontSize: "min(44px, 11vw)" }}
        >
          🎉
        </motion.span>
      </div>

      <div
        style={{
          width: "100%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.25), transparent)",
          marginBottom: 18,
        }}
      />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        style={{
          color: "rgba(255,255,255,0.85)",
          fontSize: "min(16px, 4vw)",
          lineHeight: 1.75,
          fontStyle: "italic",
          fontFamily: "Georgia, serif",
          marginBottom: 22,
        }}
      >
        {finalMessage}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.6 }}
        style={{
          marginTop: 8,
          fontSize: 10,
          color: "rgba(255,215,0,0.25)",
          letterSpacing: "0.08em",
        }}
      >
        ✦ Made with HeartSync AI ✦
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────── Main Page ────────────────────────── */

type Phase = "envelope" | "opening" | "orbs" | "finale";

export default function Card() {
  const params = useQueryParams();

  /* Route to Cosmic template if requested — lazy chunk, only loads for cosmic senders */
  if (params.get("template") === "cosmic") return <Suspense fallback={null}><CosmicCard /></Suspense>;
  /* Route to Vinyl template if requested — lazy chunk, only loads for vinyl senders */
  if (params.get("template") === "vinyl") return <Suspense fallback={null}><VinylCard /></Suspense>;
  /* Route to Crystal Ball template if requested — lazy chunk, only loads for crystal senders */
  if (params.get("template") === "crystal") return <Suspense fallback={null}><CrystalCard /></Suspense>;

  const recipientName = params.get("to") || "Friend";
  const occasion = params.get("occasion") || "thank_you";
  const relation = params.get("relation") || "friend";
  const likes = params.get("likes") || "";
  const customMsg = decodeMsg(params.get("msg"));
  const isSender = params.get("sender") === "1";
  const isPreview = params.get("preview") === "1" || isSender;
  const isRecipient = !isSender && !isPreview;
  const directShare = params.get("direct_share") === "1";

  /* Share URL — /api/share generates a personalised og:image for WhatsApp,
     then JS-redirects recipients to /envelope.html */
  const senderShareUrl = (() => {
    if (typeof window === "undefined") return "";
    const p = new URLSearchParams(window.location.search);
    p.delete("sender");
    p.set("t", "envelope");
    return window.location.origin + "/api/share?" + p.toString();
  })();

  const template =
    getTemplate(occasion, relation) ?? getFallbackTemplate(occasion);
  const finalMessage = customMsg ?? template.final_message;

  /* Inject personalized orb if `likes` is provided */
  const personalizedOrb = personalizeOrb(likes, occasion);
  const orbs: OrbData[] = personalizedOrb
    ? [...template.orbs.slice(0, 3), personalizedOrb]
    : template.orbs;

  const confettiColors = getConfettiColors(likes);

  const skipToFinale = directShare && isSender;
  const [phase, setPhase] = useState<Phase>(skipToFinale ? "finale" : "envelope");
  const [clickedOrbs, setClickedOrbs] = useState<Set<number>>(() =>
    skipToFinale ? new Set(orbs.map((_, i) => i)) : new Set()
  );
  const [activeTooltip, setActiveTooltip] = useState<{ orb: OrbData; key: number } | null>(null);
  const [tooltipKeyCounter, setTooltipKeyCounter] = useState(0);
  const [orbRadius, setOrbRadius] = useState(130);
  const [showSplash, setShowSplash] = useState(isRecipient);
  const [splashEmojiIdx, setSplashEmojiIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const confettiRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  /* ── background music ── */
  useEffect(() => {
    if (isRecipient) {
      const cardId = params.get("id") ?? undefined;
      trackEvent({ event: "card_viewed", occasion, template: "envelope", recipient_name: recipientName, card_id: cardId });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    music.start("envelope", occasion);
    return () => { music.stop(); };
  }, []);

  useEffect(() => {
    const update = () => {
      setOrbRadius(Math.min(115, window.innerWidth * 0.27));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /* Remove native pre-React splash once React has mounted */
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__clearHsSplash) {
      (window as any).__clearHsSplash();
    }
  }, []);

  /* Auto-hide recipient splash after 2.2s */
  useEffect(() => {
    if (!showSplash) return;
    const t = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(t);
  }, []);

  /* Cycle splash emoji one at a time */
  const SPLASH_EMOJIS = ["🎁", "✨", "💌", "🎀", "💛", "🌟", "🥰", "🎊", "💖"];
  useEffect(() => {
    if (!showSplash) return;
    const iv = setInterval(() => {
      setSplashEmojiIdx(i => (i + 1) % SPLASH_EMOJIS.length);
    }, 650);
    return () => clearInterval(iv);
  }, [showSplash]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const drawLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current = particlesRef.current.filter(p => p.alpha > 0.02);
    for (const p of particlesRef.current) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.alpha -= 0.022; p.rotation += p.spin;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.font = `${p.size}px serif`;
      ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
      ctx.fillText(p.content, -p.size / 2, p.size / 2);
      ctx.restore();
    }

    confettiRef.current = confettiRef.current.filter(p => p.alpha > 0.02 && p.y < canvas.height + 20);
    for (const p of confettiRef.current) {
      p.x += p.vx; p.y += p.vy; p.alpha -= 0.004; p.rotation += p.spin;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
      ctx.fillStyle = p.color ?? "#FFD700";
      ctx.fillRect(-(p.width ?? 8) / 2, -(p.height ?? 14) / 2, p.width ?? 8, p.height ?? 14);
      ctx.restore();
    }

    ctx.globalAlpha = 1;

    if (particlesRef.current.length > 0 || confettiRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(drawLoop);
    } else {
      rafRef.current = 0;
    }
  }, []);

  const startRaf = useCallback(() => {
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(drawLoop);
    }
  }, [drawLoop]);

  const fireEmojiParticles = useCallback((cx: number, cy: number, emoji: string) => {
    particlesRef.current.push(...createEmojiParticles(cx, cy, emoji));
    startRaf();
  }, [startRaf]);

  const fireConfetti = useCallback(() => {
    const canvas = canvasRef.current;
    const w = canvas?.width ?? window.innerWidth;
    confettiRef.current.push(...createConfettiParticles(w, confettiColors));
    startRaf();
  }, [startRaf, confettiColors]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function handleUnlock() {
    envelope.open();
    setPhase("opening");
    setTimeout(() => { setPhase("orbs"); }, 1200);
  }

  function handleOrbClick(idx: number, rect: DOMRect) {
    const orb = orbs[idx];
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    envelope.orbTap();
    fireEmojiParticles(cx, cy, orb.emoji);

    const newKey = tooltipKeyCounter + 1;
    setTooltipKeyCounter(newKey);
    setActiveTooltip({ orb, key: newKey });

    const newClicked = new Set(clickedOrbs).add(idx);
    setClickedOrbs(newClicked);

    if (newClicked.size === orbs.length) {
      setTimeout(() => {
        envelope.finale();
        setPhase("finale");
        setTimeout(fireConfetti, 800);
      }, 1500);
    }
  }

  const orbPositions = orbs.map((_, i) => {
    const angle = (i / orbs.length) * 2 * Math.PI - Math.PI / 2;
    return { x: orbRadius * Math.cos(angle), y: orbRadius * Math.sin(angle), angle };
  });

  const clickedCount = clickedOrbs.size;
  const allClicked = clickedCount === orbs.length;

  function getFinaleOffset(angle: number) {
    const dist = Math.max(window.innerWidth, window.innerHeight) * 1.4;
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "radial-gradient(ellipse at 50% 40%, #1a0a2e 0%, #0d0618 55%, #050210 100%)",
        overflow: "hidden",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <AmbientStars />

      {/* ════ RECIPIENT LOADING SPLASH ════ */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="recipient-splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
            style={{
              position: "fixed", inset: 0, zIndex: 60,
              background: "radial-gradient(ellipse at 50% 40%, #1a0a2e 0%, #0d0618 55%, #050210 100%)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20,
            }}
          >
            {/* Single cycling emoji — one at a time */}
            <AnimatePresence mode="wait">
              <motion.div
                key={splashEmojiIdx}
                initial={{ opacity: 0, scale: 0.65, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.65, y: -12 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                style={{ fontSize: 76 }}
              >
                {["🎁", "✨", "💌", "🎀", "💛", "🌟", "🥰", "🎊", "💖"][splashEmojiIdx]}
              </motion.div>
            </AnimatePresence>
            <motion.p
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{ fontSize: 20, fontWeight: 700, color: "#FFD700", letterSpacing: "0.04em", textAlign: "center", margin: 0 }}
            >
              Your surprise is loading…
            </motion.p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", margin: 0 }}>
              Something special was made just for you ✨
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ PHASE 1+2: Envelope ════ */}
      <AnimatePresence>
        {(phase === "envelope" || phase === "opening") && (
          <motion.div
            key="envelope-scene"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: "100vh", transition: { duration: 0.55, ease: "easeIn", delay: 0.55 } }}
            style={{
              position: "fixed", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "min(32px, 6vw)",
            }}
          >
            <AnimatePresence>
              {phase === "envelope" && (
                <motion.div
                  key="headline"
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.p
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      fontSize: "min(18px, 4.5vw)",
                      fontWeight: 700,
                      color: "#FFD700",
                      letterSpacing: "0.05em",
                      textAlign: "center",
                      textShadow: "0 0 30px rgba(255,215,0,0.6)",
                    }}
                  >
                    ✨ A Surprise For You! ✨
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            <GoldenEnvelope recipientName={recipientName} opening={phase === "opening"} />

            <AnimatePresence>
              {phase === "envelope" && (
                <motion.div key="slider" exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.25 }}>
                  <SlideToUnlock onUnlock={handleUnlock} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ PHASE 3: Orbs ════ */}
      <AnimatePresence>
        {(phase === "orbs" || phase === "finale") && (
          <motion.div
            key="orbs-scene"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ position: "fixed", inset: 0 }}
          >
            <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {orbs.map((orb, i) => {
                const pos = orbPositions[i];
                const finaleOffset = getFinaleOffset(pos.angle);
                return (
                  <Orb
                    key={i}
                    orb={orb}
                    index={i}
                    x={phase === "finale" && allClicked ? finaleOffset.x : pos.x}
                    y={phase === "finale" && allClicked ? finaleOffset.y : pos.y}
                    clicked={clickedOrbs.has(i)}
                    onClick={phase === "orbs" ? handleOrbClick : () => {}}
                  />
                );
              })}
            </div>

            <AnimatePresence>
              {phase === "orbs" && !allClicked && (
                <motion.div
                  key="counter"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  style={{
                    position: "fixed", bottom: "8vh", left: 0, right: 0,
                    textAlign: "center",
                    fontSize: 14, fontWeight: 600,
                    color: "rgba(255,255,255,0.5)",
                    letterSpacing: "0.04em",
                  }}
                >
                  Tap the orbs! ({clickedCount} / {orbs.length})
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {activeTooltip && phase === "orbs" && (
                <OrbTooltip key={activeTooltip.key} orb={activeTooltip.orb} tooltipKey={activeTooltip.key} />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ PHASE 4: Final Card ════ */}
      <AnimatePresence>
        {phase === "finale" && (
          <motion.div
            key="final-scene"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            style={{
              position: "fixed", inset: 0,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              zIndex: 30,
              padding: "16px",
              overflowY: "auto",
              gap: 16,
            }}
          >
            <FinalCard
              recipientName={recipientName}
              titlePrefix={template.title_prefix}
              finalMessage={finalMessage}
            />

            {/* ── Recipient CTA ── */}
            {isRecipient && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2, duration: 0.5 }}
                style={{ width: "min(300px, calc(100vw - 32px))", textAlign: "center", paddingBottom: 8 }}
              >
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginBottom: 12, letterSpacing: "0.02em", fontWeight: 500 }}>
                  Feeling the love? Send one back ✨
                </p>
                <Link href="/send?ref=card">
                  <button
                    onClick={() => {
                      // Fires when a recipient taps the "Create your own
                      // card" CTA on the end of their received card. Lets
                      // us measure the recipient → creator conversion that
                      // drives our viral loop. Conversion to an actual
                      // card_created is computed server-side by joining on
                      // fingerprint.
                      trackEvent({ event: "create_own_clicked" });
                    }}
                    style={{
                      width: "100%", padding: "14px",
                      borderRadius: 14,
                      background: "rgba(255,215,0,0.12)",
                      border: "1.5px solid rgba(255,215,0,0.35)",
                      color: "rgba(255,215,0,0.95)",
                      fontWeight: 700, fontSize: 15, cursor: "pointer", letterSpacing: "0.02em",
                    }}
                  >
                    💛 Create your own card — free!
                  </button>
                </Link>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas overlay */}
      <canvas
        ref={canvasRef}
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50 }}
      />

      {/* Back link */}
      <Link href="/send?ref=card">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          style={{
            position: "fixed", top: 16, left: 16,
            fontSize: 12,
            color: "rgba(255,255,255,0.2)",
            cursor: "pointer",
            zIndex: 60,
            padding: "4px 10px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.04)",
          }}
        >
          ← make your own
        </motion.div>
      </Link>

      {/* WatermarkBadge for recipients — no auth needed, hidden in finale */}
      {!isSender && (
        <WatermarkBadge
          id={params.get("id")}
          showRemoveCta={false}
          prominent={false}
          hidden={phase === "finale"}
        />
      )}

      {/* SenderPanel: lazy-loads Clerk + share gate + badge + paywall — only for senders */}
      {isSender && (
        <Suspense fallback={null}>
          <SenderPanel
            senderShareUrl={senderShareUrl}
            recipientName={recipientName}
            occasion={occasion}
            cardId={params.get("id") ?? ""}
            phase={phase}
          />
        </Suspense>
      )}
    </div>
  );
}

/* ─────────────────────────── Ambient Stars ────────────────────── */

const STARS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: 1 + Math.random() * 2,
  delay: Math.random() * 4,
  duration: 2 + Math.random() * 3,
}));

function AmbientStars() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1 }}>
      {STARS.map(s => (
        <motion.div
          key={s.id}
          animate={{ opacity: [0.15, 0.7, 0.15] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "white",
          }}
        />
      ))}
    </div>
  );
}
