import { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { getTemplate, getFallbackTemplate, type OrbData } from "@/lib/card-templates";
import { envelope, music } from "@/lib/audio";
import { trackEvent } from "@/lib/trackEvent";

import PolaroidFrame from "@/components/PolaroidFrame";
import ViralReplyCTA from "@/components/ViralReplyCTA";
import rosePinkImg from "@assets/flowers/rose_pink.webp";
import rosePeachImg from "@assets/flowers/rose_peach.webp";
import daisyWhiteImg from "@assets/flowers/daisy_white.webp";
import anemonePurpleImg from "@assets/flowers/anemone_purple.webp";
import ranunculusYellowImg from "@assets/flowers/ranunculus_yellow.webp";
import hydrangeaBlueImg from "@assets/flowers/hydrangea_blue.webp";
import eucalyptusImg from "@assets/flowers/eucalyptus.webp";
import fernImg from "@assets/flowers/fern.webp";
import delphiniumBlueImg from "@assets/flowers/delphinium_blue.webp";
import cosmosPinkImg from "@assets/flowers/cosmos_pink.webp";
import wrapConeImg from "@assets/flowers/wrap_cone.webp";

/* Premium templates and sender auth features lazy-load only when needed.
 * Recipients of the default envelope card never download these chunks. */
const CosmicCard = lazy(() => import("@/pages/cosmic"));
const VinylCard = lazy(() => import("@/pages/vinyl"));
const CrystalCard = lazy(() => import("@/pages/crystal"));
const SenderPanel = lazy(() => import("@/components/SenderPanel"));
/* ClerkAuthLayer is lazy so recipients of premium templates never load the Clerk SDK.
 * It is only mounted when isSender=true (the paywall / PremiumLockPanel needs Clerk). */
const ClerkAuthLayer = lazy(() => import("@/components/ClerkAuthLayer"));

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

export function SlideToUnlock({ onUnlock, isSorry = false, label }: { onUnlock: () => void; isSorry?: boolean; label?: string }) {
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
          height: thumbSize + (isSorry ? 24 : 8),
          borderRadius: 999,
          background: "rgba(255,255,255,0.07)",
          border: "1.5px solid rgba(255,215,0,0.25)",
          position: "relative",
          overflow: isSorry ? "visible" : "hidden",
          boxShadow: "0 0 30px rgba(255,215,0,0.08)",
          userSelect: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0, top: 0, bottom: 0,
            width: isSorry ? `${thumbX}px` : `${(thumbX + thumbSize / 2)}px`,
            borderRadius: 999,
            background: isSorry
              ? "linear-gradient(90deg, rgba(245,196,78,0.16), rgba(220,150,90,0.08))"
              : "linear-gradient(90deg, rgba(255,215,0,0.18), rgba(255,165,0,0.1))",
            opacity: isSorry && thumbX < 2 ? 0 : 1,
            transition: dragging ? "none" : "all 0.3s",
          }}
        />
        <div
          style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: isSorry ? 19 : 13,
            fontWeight: isSorry ? 600 : 500,
            color: isSorry
              ? `rgba(245,196,78,${0.85 - progress * 0.85})`
              : `rgba(255,255,255,${0.45 - progress * 0.45})`,
            fontFamily: isSorry ? "'Dancing Script', cursive" : undefined,
            letterSpacing: "0.04em",
            pointerEvents: "none",
            paddingLeft: thumbSize + 16,
            textShadow: isSorry ? "0 1px 8px rgba(245,196,78,0.35)" : undefined,
          }}
        >
          {unlocked ? "✓" : label ?? (isSorry ? "Slide the rose to open →" : "Slide to unlock →")}
        </div>
        <motion.div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          animate={{
            x: thumbX + 4,
            boxShadow: isSorry
              ? "none"
              : unlocked
              ? "0 0 0 4px rgba(255,215,0,0.35), 0 0 24px rgba(255,215,0,0.6)"
              : dragging
              ? "0 0 0 3px rgba(255,215,0,0.25), 0 0 16px rgba(255,215,0,0.4)"
              : "0 0 0 2px rgba(255,215,0,0.15), 0 4px 12px rgba(0,0,0,0.4)",
          }}
          transition={{ duration: dragging ? 0 : 0.3, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: isSorry ? 12 : 4,
            width: thumbSize,
            height: thumbSize,
            borderRadius: "50%",
            background: isSorry
              ? "transparent"
              : unlocked
              ? "linear-gradient(135deg, #22c55e, #16a34a)"
              : "linear-gradient(135deg, #FFD700, #FFA500)",
            cursor: unlocked ? "default" : "grab",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
            touchAction: "none",
          }}
        >
          {isSorry ? (
            <>
              {/* soft glow behind the draggable rose */}
              <motion.div
                animate={{
                  opacity: unlocked ? [0.55, 0.85, 0.55] : dragging ? 0.7 : [0.35, 0.55, 0.35],
                  scale: unlocked ? [1, 1.18, 1] : 1,
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  inset: -7,
                  borderRadius: "50%",
                  background: unlocked
                    ? "radial-gradient(circle, rgba(130,235,160,0.65), transparent 70%)"
                    : "radial-gradient(circle, rgba(255,215,0,0.55), transparent 70%)",
                  filter: "blur(2px)",
                  pointerEvents: "none",
                }}
              />
              {/* the 3D rose the user drags */}
              <motion.img
                src={rosePinkImg}
                alt=""
                aria-hidden
                draggable={false}
                animate={dragging ? { rotate: 0, y: 0 } : { rotate: [-7, 7, -7], y: [0, -1.5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "relative",
                  width: thumbSize * 1.4,
                  height: thumbSize * 1.4,
                  objectFit: "contain",
                  transformOrigin: "bottom center",
                  filter: "drop-shadow(0 4px 8px rgba(80,30,60,0.5))",
                  pointerEvents: "none",
                }}
              />
            </>
          ) : (
            unlocked ? "✓" : "→"
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────── Golden Envelope ──────────────────── */

/* Scattered sparkle positions for the golden envelope — spread all over the
   surface, each twinkling on its own rhythm. */
const GOLD_SPARKLES = [
  { left: "9%",  top: "15%", size: 11, dur: 2.4, delay: 0.0 },
  { left: "23%", top: "60%", size: 7,  dur: 2.0, delay: 0.5 },
  { left: "15%", top: "83%", size: 9,  dur: 2.8, delay: 1.1 },
  { left: "35%", top: "26%", size: 6,  dur: 2.2, delay: 0.3 },
  { left: "45%", top: "72%", size: 12, dur: 3.0, delay: 0.8 },
  { left: "55%", top: "18%", size: 8,  dur: 2.5, delay: 1.4 },
  { left: "65%", top: "56%", size: 7,  dur: 2.1, delay: 0.2 },
  { left: "77%", top: "29%", size: 10, dur: 2.7, delay: 0.9 },
  { left: "85%", top: "70%", size: 8,  dur: 2.3, delay: 0.4 },
  { left: "91%", top: "16%", size: 6,  dur: 2.0, delay: 1.2 },
  { left: "30%", top: "46%", size: 5,  dur: 1.8, delay: 0.6 },
  { left: "71%", top: "84%", size: 9,  dur: 2.9, delay: 1.5 },
  { left: "50%", top: "42%", size: 6,  dur: 2.2, delay: 1.0 },
  { left: "12%", top: "42%", size: 7,  dur: 2.6, delay: 0.7 },
] as const;

const SPARKLE_STAR =
  "polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)";

export function GoldenEnvelope({
  recipientName,
  opening,
  isSorry = false,
}: {
  recipientName: string;
  opening: boolean;
  isSorry?: boolean;
}) {
  const envW = "min(340px, 88vw)";
  const envH = "min(210px, 53vw)";

  /* Soft blush-cream "stationery paper" palette for the sorry template — warmer
     and more romantic than the bright gold, tuned to the bouquet aesthetic. */
  const pal = isSorry
    ? {
        body: "linear-gradient(145deg, #FBEFE7 0%, #F4DDD0 30%, #ECCBBA 58%, #DFB6A3 82%, #D0A28E 100%)",
        toLabel: "rgba(120,62,55,0.62)",
        toName: "rgba(78,34,30,0.92)",
        deco: "rgba(190,118,118,0.6)",
        flapOuter: "linear-gradient(172deg, #EFD7C9 0%, #E1BEAD 45%, #D2A48F 100%)",
        flapInner: "linear-gradient(to bottom, #FBEFE7 0%, #EBC9B7 100%)",
      }
    : {
        body: "linear-gradient(145deg, #F5C518 0%, #FFD700 28%, #FFBC00 55%, #E8AA00 80%, #D4960A 100%)",
        toLabel: "rgba(80,40,0,0.65)",
        toName: "rgba(45,18,0,0.9)",
        deco: "rgba(200,130,0,0.7)",
        flapOuter: "linear-gradient(172deg, #E8B800 0%, #D4A000 45%, #C49000 100%)",
        flapInner: "linear-gradient(to bottom, #FFE566 0%, #FFCC00 100%)",
      };

  /* Lightweight procedural paper grain (SVG fractal noise as a data URI) +
     subtle woven fibers, layered over the paper for tactile realism. */
  const paperGrain =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

  return (
    <div
      style={{
        width: envW,
        height: envH,
        position: "relative",
        perspective: 800,
        filter: isSorry
          ? "drop-shadow(0 22px 36px rgba(90,52,55,0.4)) drop-shadow(0 8px 16px rgba(90,52,55,0.24))"
          : "drop-shadow(0 30px 52px rgba(120,75,0,0.5)) drop-shadow(0 12px 22px rgba(120,80,0,0.42)) drop-shadow(0 0 80px rgba(255,215,0,0.15))",
      }}
    >
      {/* Continuous gentle 3D float (sorry template only) — gives the envelope
          the same lifelike depth as the flower bouquet. */}
      <motion.div
        animate={
          isSorry && !opening
            ? { y: [-5, 5, -5], rotateY: [-6, 6, -6], rotateX: [2.5, -2.5, 2.5], rotateZ: [-1, 1, -1] }
            : { y: 0, rotateY: 0, rotateX: 0, rotateZ: 0 }
        }
        transition={
          isSorry && !opening
            ? { duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }
            : { duration: 0.4 }
        }
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          willChange: isSorry ? "transform" : undefined,
        }}
      >
      {/* Envelope body */}
      <div
        style={{
          position: "absolute", inset: 0,
          borderRadius: 10,
          background: pal.body,
          boxShadow: isSorry
            ? "inset 0 2px 10px rgba(255,255,255,0.4), inset 0 -3px 12px rgba(120,70,55,0.22)"
            : "inset 0 3px 12px rgba(255,255,255,0.42), inset 0 -6px 16px rgba(90,55,0,0.32), inset -5px 0 14px rgba(90,55,0,0.18)",
          overflow: "hidden",
        }}
      >
        {/* Soft, smooth body shading — a gentle top-light sheen and a subtle
            bottom-pocket darkening give the envelope quiet depth without any
            hard fold lines or seams. */}
        <div
          style={{
            position: "absolute", inset: 0,
            background: isSorry
              ? "radial-gradient(130% 80% at 50% -12%, rgba(255,255,255,0.22), transparent 58%), radial-gradient(140% 60% at 50% 122%, rgba(0,0,0,0.16), transparent 62%)"
              : "radial-gradient(120% 75% at 38% -10%, rgba(255,255,255,0.5), transparent 52%), radial-gradient(150% 70% at 50% 128%, rgba(90,55,0,0.42), transparent 60%), linear-gradient(105deg, rgba(255,255,255,0.18) 0%, transparent 26%, transparent 72%, rgba(80,50,0,0.34) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Paper texture: multi-scale grain + woven fibers + mottled blotches +
            a soft top-light sheen (sorry template only) for tactile, realistic
            handmade stationery. */}
        {isSorry && (
          <>
            {/* coarse grain */}
            <div
              style={{
                position: "absolute", inset: 0,
                backgroundImage: paperGrain,
                backgroundSize: "180px 180px",
                opacity: 0.72,
                mixBlendMode: "multiply",
                pointerEvents: "none",
              }}
            />
            {/* fine speckle for tooth */}
            <div
              style={{
                position: "absolute", inset: 0,
                backgroundImage: paperGrain,
                backgroundSize: "70px 70px",
                opacity: 0.42,
                mixBlendMode: "multiply",
                pointerEvents: "none",
              }}
            />
            {/* woven fibers (warp + weft) */}
            <div
              style={{
                position: "absolute", inset: 0,
                backgroundImage:
                  "repeating-linear-gradient(115deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(25deg, rgba(120,70,55,0.08) 0px, rgba(120,70,55,0.08) 1px, transparent 1px, transparent 5px)",
                pointerEvents: "none",
              }}
            />
            {/* faint mottled blotches (handmade paper unevenness) */}
            <div
              style={{
                position: "absolute", inset: 0,
                backgroundImage:
                  "radial-gradient(circle at 22% 30%, rgba(120,70,55,0.07), transparent 18%), radial-gradient(circle at 72% 24%, rgba(255,250,246,0.12), transparent 16%), radial-gradient(circle at 60% 72%, rgba(120,70,55,0.06), transparent 22%), radial-gradient(circle at 34% 78%, rgba(255,250,246,0.1), transparent 20%)",
                mixBlendMode: "multiply",
                pointerEvents: "none",
              }}
            />
            {/* soft top-light sheen + faint bottom shading */}
            <div
              style={{
                position: "absolute", inset: 0,
                background:
                  "radial-gradient(120% 80% at 50% -10%, rgba(255,252,248,0.45), transparent 55%), radial-gradient(120% 70% at 50% 120%, rgba(120,70,55,0.1), transparent 65%)",
                pointerEvents: "none",
              }}
            />
          </>
        )}

        {/* To label — centered at bottom, prominent */}
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: isSorry ? "'Dancing Script', cursive" : "Georgia, serif",
            fontSize: isSorry ? "min(18px, 4.6vw)" : "min(15px, 3.8vw)",
            color: pal.toLabel,
            fontStyle: isSorry ? "normal" : "italic",
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          To:{" "}
          <span style={{ fontWeight: 800, fontSize: isSorry ? "min(22px, 5.6vw)" : "min(18px, 4.6vw)", color: pal.toName }}>
            {recipientName}
          </span>
        </div>

        {/* Corner decoration */}
        <div
          style={{
            position: "absolute", top: 10, right: 14,
            fontSize: "min(11px, 3vw)",
            color: pal.deco,
            letterSpacing: 2,
          }}
        >
          {isSorry ? "❀ ❀ ❀" : "✦ ✦ ✦"}
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
          {/* Outside of flap — lifted off the body with a soft cast shadow under
              its V edge and a gentle top sheen so it reads as raised, not flat. */}
          <div
            style={{
              position: "absolute", inset: 0,
              background: pal.flapOuter,
              backgroundImage: isSorry
                ? `linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 32%), ${paperGrain}, ${pal.flapOuter}`
                : `linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 34%), ${pal.flapOuter}`,
              backgroundSize: isSorry ? "cover, 140px 140px, cover" : undefined,
              backgroundBlendMode: isSorry ? "normal, multiply, normal" : undefined,
              clipPath: "polygon(0 0, 100% 0, 50% 88%)",
              borderRadius: "10px 10px 0 0",
              backfaceVisibility: "hidden",
              boxShadow: isSorry ? "inset 0 -2px 10px rgba(120,70,55,0.16)" : "inset 0 3px 7px rgba(255,255,255,0.3), inset 0 -4px 12px rgba(90,55,0,0.3)",
              filter: isSorry
                ? "drop-shadow(0 6px 5px rgba(120,70,55,0.3))"
                : "drop-shadow(0 11px 9px rgba(90,55,0,0.5))",
            }}
          />
          {/* Inside of flap (lighter) — same handmade paper texture as the body */}
          <div
            style={{
              position: "absolute", inset: 0,
              background: pal.flapInner,
              backgroundImage: isSorry ? `${paperGrain}, ${pal.flapInner}` : pal.flapInner,
              backgroundSize: isSorry ? "140px 140px, cover" : undefined,
              backgroundBlendMode: isSorry ? "multiply, normal" : undefined,
              clipPath: "polygon(0 0, 100% 0, 50% 88%)",
              transform: "rotateX(180deg)",
              backfaceVisibility: "hidden",
            }}
          />
        </motion.div>
      </div>

      {/* Beautiful rose tucked into the top-right corner (sorry template only) */}
      {isSorry && (
        <motion.div
          initial={{ opacity: 0, scale: 0.4, rotate: -28 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 60, damping: 13, delay: 0.5 }}
          style={{
            position: "absolute",
            top: "-13%",
            right: "-6%",
            width: "min(104px, 28vw)",
            height: "min(104px, 28vw)",
            zIndex: 30,
            transform: "translateZ(40px)",
            pointerEvents: "none",
          }}
        >
          {/* small foliage sprig behind the bloom for natural depth */}
          <motion.img
            src={eucalyptusImg}
            alt=""
            aria-hidden
            draggable={false}
            animate={{ rotate: [18, 26, 18] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              left: "-26%",
              top: "18%",
              width: "78%",
              height: "78%",
              objectFit: "contain",
              transformOrigin: "bottom center",
              filter: "drop-shadow(0 6px 10px rgba(40,60,40,0.35))",
            }}
          />
          {/* the rose */}
          <motion.img
            src={rosePinkImg}
            alt=""
            aria-hidden
            draggable={false}
            animate={{ rotate: [-6, 6, -6], y: [0, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transformOrigin: "bottom center",
              filter: "drop-shadow(0 8px 14px rgba(80,30,60,0.5))",
            }}
          />
        </motion.div>
      )}

      {/* Sparkles scattered all over the golden envelope (golden template only).
          Lifted toward the viewer so they twinkle above the foil and the flap. */}
      {!isSorry && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 40,
            pointerEvents: "none",
            transform: "translateZ(45px)",
            transformStyle: "preserve-3d",
          }}
        >
          {GOLD_SPARKLES.map((s, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0, 1, 0], scale: [0.3, 1, 0.3], rotate: [0, 90, 0] }}
              transition={{ duration: s.dur, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
              style={{
                position: "absolute",
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                marginLeft: -s.size / 2,
                marginTop: -s.size / 2,
                clipPath: SPARKLE_STAR,
                background: "radial-gradient(circle, #ffffff 0%, #FFF1B8 42%, #F5C44E 100%)",
                filter: "drop-shadow(0 0 4px rgba(255,221,120,0.95))",
              }}
            />
          ))}
        </div>
      )}
      </motion.div>
    </div>
  );
}

/* ─────────────────────────── Orb ───────────────────────────────── */

const Orb = memo(function Orb({
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
  const orbSize = "min(56px, 13.5vw)";

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
        cursor: clicked ? "default" : "pointer",
        zIndex: 25,
        userSelect: "none",
      }}
    >
      {/* Dark orb — solidly filled with the deep cosmic backdrop tone and
          embossed: a soft light catch along the top rim with a dark recess at
          the bottom makes it read as raised from the surface. On tap it inverts
          to a pressed-in (debossed) look. Gentle float gives it life. */}
      <motion.div
        animate={clicked ? { y: 0 } : { y: [-4, 4, -4] }}
        transition={
          clicked
            ? { duration: 0.3 }
            : { duration: 3 + index * 0.3, repeat: Infinity, ease: "easeInOut" }
        }
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: clicked ? "#130d27" : "#120b28",
          border: `1px solid ${clicked ? "rgba(180,150,90,0.22)" : "rgba(255,200,120,0.38)"}`,
          boxShadow: clicked
            ? "inset 4px 4px 9px rgba(0,0,0,0.85), inset -4px -4px 8px rgba(120,98,175,0.2)"
            : "-5px -5px 11px rgba(125,100,180,0.24), 7px 9px 18px rgba(0,0,0,0.85), inset 2px 2px 3px rgba(255,230,180,0.28), inset -4px -5px 9px rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "min(25px, 6.5vw)",
          position: "relative",
        }}
      >
        <span
          style={{
            display: "block",
            position: "relative",
            zIndex: 1,
            filter: clicked ? "grayscale(100%)" : undefined,
          }}
        >
          {orb.emoji}
        </span>
      </motion.div>
    </motion.div>
  );
});

/* ─────────────────────────── OrbTooltip ───────────────────────── */

function OrbTooltip({ orb }: { orb: OrbData }) {
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
      initial={{ scale: 0.5, opacity: 0, rotate: -2 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", damping: 16, stiffness: 140, delay: 0.1 }}
      style={{
        width: "min(360px, 88vw)",
        borderRadius: 24,
        padding: "28px 22px 22px",
        background: "linear-gradient(160deg, rgba(255,200,60,0.13) 0%, rgba(255,120,180,0.07) 60%, rgba(180,100,255,0.07) 100%)",
        border: "1px solid rgba(255,215,0,0.22)",
        backdropFilter: "blur(28px)",
        boxShadow: "0 24px 70px rgba(0,0,0,0.55), 0 0 50px rgba(255,200,80,0.1), inset 0 1px 0 rgba(255,255,255,0.1)",
        textAlign: "center",
        zIndex: 30,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Soft corner deco */}
      <div style={{ position: "absolute", top: 10, left: 14, fontSize: 18, opacity: 0.35, userSelect: "none" }}>🌸</div>
      <div style={{ position: "absolute", top: 10, right: 14, fontSize: 18, opacity: 0.35, userSelect: "none" }}>✨</div>
      <div style={{ position: "absolute", bottom: 14, left: 14, fontSize: 16, opacity: 0.25, userSelect: "none" }}>💛</div>
      <div style={{ position: "absolute", bottom: 14, right: 14, fontSize: 16, opacity: 0.25, userSelect: "none" }}>🌙</div>

      {/* Tiny label */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        style={{
          fontSize: 11,
          color: "rgba(255,215,0,0.5)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 12,
          fontWeight: 500,
        }}
      >
        {titlePrefix}
      </motion.p>

      {/* Name — big & warm */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
        style={{ marginBottom: 16 }}
      >
        <span
          style={{
            fontSize: "min(48px, 12vw)",
            fontWeight: 700,
            background: "linear-gradient(135deg, #FFD700 0%, #FFB347 60%, #FF8C69 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontFamily: "Georgia, serif",
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
          }}
        >
          {recipientName}
        </span>
        {" "}
        <motion.span
          animate={{ scale: [1, 1.4, 1, 1.25, 1] }}
          transition={{ duration: 0.7, delay: 0.55, repeat: Infinity, repeatDelay: 1.4 }}
          style={{ fontSize: "min(32px, 8vw)", display: "inline-block" }}
        >
          ❤️
        </motion.span>
      </motion.div>

      {/* Message */}
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.8 }}
        style={{
          color: "rgba(255,255,255,0.88)",
          fontSize: "min(15px, 3.8vw)",
          lineHeight: 1.8,
          fontStyle: "italic",
          fontFamily: "Georgia, serif",
          marginBottom: 18,
          padding: "0 4px",
        }}
      >
        "{finalMessage}"
      </motion.p>

      {/* Wavy divider */}
      <div style={{
        fontSize: 14, letterSpacing: "0.25em", color: "rgba(255,215,0,0.3)",
        marginBottom: 12, userSelect: "none",
      }}>
        ～ ✦ ～
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", letterSpacing: "0.05em" }}
      >
        made with love · heartsync.in
      </motion.p>
    </motion.div>
  );
}

/* ─────────────────────── MemoryCollage ────────────────────────── */

const PHOTO_ROTATIONS = [-2.5, 2, -1.5, 1.8];
const PHOTO_STICKERS  = ["💛", "🌸", "✨", "💫"];

function MemoryCollage({
  photoUrls,
  voiceNoteUrl,
  onContinue,
  isSorry = false,
}: {
  photoUrls: string[];
  voiceNoteUrl: string | null;
  onContinue: () => void;
  isSorry?: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const n = photoUrls.length;
  const mediaDelay = 0.3 + n * 0.2 + 0.4;

  function togglePlay() {
    if (!voiceNoteUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(voiceNoteUrl);
      audioRef.current.volume = 0.9;
      audioRef.current.onended = () => {
        setIsPlaying(false);
        music.setVolume(1.0);
      };
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      music.setVolume(1.0);
    } else {
      audioRef.current.volume = 0.9;
      void audioRef.current.play().then(() => {
        setIsPlaying(true);
        music.setVolume(0.1);
      }).catch(() => { setIsPlaying(false); });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      style={{
        position: "fixed", inset: 0, zIndex: 30,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "32px 32px 90px",
        gap: 28,
        overflow: "hidden",
      }}
    >
      {/* Gold headline */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.55 }}
        style={{
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: "0.01em",
          lineHeight: 1.4,
          padding: "0 20px",
          ...(isSorry
            ? {
                fontSize: "min(25px, 6.2vw)",
                whiteSpace: "nowrap",
                fontFamily: "'Dancing Script', cursive",
                backgroundImage: "linear-gradient(135deg, #FFE9A8, #F5C44E 45%, #E0A52E)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 2px 12px rgba(245,196,78,0.4))",
              }
            : {
                fontSize: 15,
                color: "#FFD700",
                textShadow: "0 0 20px rgba(255,215,0,0.4)",
              }),
        }}
      >
        {isSorry ? "All I want is for you to smile!" : "Every moment with you is incredible ✨"}
      </motion.p>

      {/* Photos */}
      {n === 0 ? (
        <motion.div
          animate={{ scale: [1, 1.14, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ fontSize: 80, lineHeight: 1, userSelect: "none" }}
        >
          💛
        </motion.div>
      ) : (
        <div style={{
          width: "min(300px, 80vw)",
          display: "grid",
          gridTemplateColumns: n === 1 ? "1fr" : "1fr 1fr",
          gap: 14,
        }}>
          {photoUrls.map((url, i) => (
            /* Outer div: entrance — staggered 200 ms apart, fires immediately */
            <motion.div
              key={url}
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.2, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              style={{
                position: "relative",
                rotate: `${n === 1 ? 0 : (PHOTO_ROTATIONS[i] ?? 0)}deg`,
                gridColumn: n === 3 && i === 2 ? "1 / span 2" : undefined,
                transformOrigin: "center bottom",
              }}
            >
              {/* Inner div: gentle float loop — starts after entrance */}
              <motion.div
                animate={{ y: [0, -7, 0] }}
                transition={{
                  duration: 3.0 + i * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.8 + i * 0.4,
                }}
                style={{
                  background: isSorry
                    ? "linear-gradient(160deg, #fffdf6 0%, #fff7e6 55%, #f3e4c4 100%)"
                    : "#fffcf0",
                  padding: n === 1 ? "8px 8px 28px" : "6px 6px 22px",
                  borderRadius: 3,
                  /* Sorry: a deeper, layered cast shadow lifts the print off the
                     background while a top highlight + bottom inset bevel give the
                     paper real thickness — a 3D bouquet-style lift. */
                  boxShadow: isSorry
                    ? "0 20px 36px rgba(60,30,25,0.5), 0 8px 14px rgba(60,30,25,0.42), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -3px 7px rgba(150,110,80,0.28)"
                    : "0 10px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)",
                  border: isSorry ? "1px solid rgba(255,255,255,0.65)" : undefined,
                }}
              >
                <img
                  src={url}
                  alt=""
                  decoding={isSorry ? "async" : undefined}
                  style={{
                    width: "100%",
                    aspectRatio: n === 1 ? "4/3" : "1",
                    objectFit: "cover",
                    objectPosition: "center 20%",
                    imageOrientation: "from-image",
                    display: "block",
                    borderRadius: 1,
                  }}
                />
              </motion.div>
              {/* Per-photo sticker */}
              <motion.div
                initial={{ opacity: 0, scale: 0, rotate: -30 }}
                animate={{ opacity: 1, scale: 1, rotate: 12 }}
                transition={{ delay: 0.4 + i * 0.2, type: "spring", damping: 10 }}
                style={{
                  position: "absolute",
                  bottom: -6, right: -6,
                  fontSize: isSorry ? 30 : 24,
                  /* Sorry: stacked drop-shadows give the sticker a raised,
                     3D bouquet-style pop off the print. */
                  filter: isSorry
                    ? "drop-shadow(0 1px 0 rgba(255,255,255,0.6)) drop-shadow(0 3px 3px rgba(0,0,0,0.32)) drop-shadow(0 7px 9px rgba(80,40,30,0.4))"
                    : "drop-shadow(0 2px 4px rgba(0,0,0,0.35))",
                  userSelect: "none",
                  pointerEvents: "none",
                  lineHeight: 1,
                }}
              >
                {PHOTO_STICKERS[i % PHOTO_STICKERS.length]}
              </motion.div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Voice note player + next arrow */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: mediaDelay, duration: 0.5 }}
        style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 28 }}
      >
        {voiceNoteUrl && (
          <button
            onClick={togglePlay}
            style={{
              width: 60, height: 60, borderRadius: "50%", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: isPlaying ? "#000" : "linear-gradient(135deg, #FFD700, #FFA500)",
              border: isPlaying ? "2px solid rgba(255,215,0,0.5)" : "2px solid rgba(255,255,255,0.3)",
              boxShadow: isPlaying
                ? "0 0 18px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)"
                : "0 0 22px rgba(255,215,0,0.55), 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.35)",
              fontSize: 22,
              color: isPlaying ? "#FFD700" : "#000",
              flexShrink: 0,
              outline: "none",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
        )}

        {voiceNoteUrl && (
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
              Voice note
            </div>
            <div style={{
              display: "flex", gap: 3, alignItems: "center", height: 18,
            }}>
              {Array.from({ length: 14 }).map((_, k) => (
                <div
                  key={k}
                  style={{
                    width: 2.5,
                    height: `${6 + Math.sin(k * 1.3) * 5 + (k % 3) * 2}px`,
                    borderRadius: 2,
                    background: isPlaying
                      ? `rgba(255,215,0,${0.5 + (k % 3) * 0.2})`
                      : `rgba(255,215,0,${0.2 + (k % 4) * 0.08})`,
                    transition: "background 0.3s",
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 5, fontStyle: "italic", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
              This is a special message for you.
            </div>
          </div>
        )}

        {/* Next — subtle text button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: mediaDelay + 0.5, duration: 0.4 }}
          onClick={onContinue}
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 99,
            padding: "8px 18px",
            cursor: "pointer",
            color: "rgba(255,255,255,0.45)",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.04em",
            flexShrink: 0,
          }}
        >
          Next →
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────── FlowerBurst ────────────────────────── */
const BURST_FLOWERS = ["🌼","🌻","💛","🌸","✨","🌼","🌻","💛","🌸","✨","🌼","💛","🌸","🌟","🌼","✨"];
export function FlowerBurst() {
  return (
    <div style={{ position: "fixed", top: "50%", left: "50%", zIndex: 45, pointerEvents: "none" }}>
      {BURST_FLOWERS.map((f, i) => {
        const angle = (i / BURST_FLOWERS.length) * 360;
        const dist = 130 + (i % 4) * 55;
        const x = Math.cos((angle * Math.PI) / 180) * dist;
        const y = Math.sin((angle * Math.PI) / 180) * dist;
        const cycleDuration = 2.2 + (i % 4) * 0.3;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0, rotate: 0 }}
            animate={{
              opacity: [0, 1, 1, 0, 0],
              x:       [0, x * 0.5, x, x * 1.05, 0],
              y:       [0, y * 0.5, y, y * 1.05, 0],
              scale:   [0, 1.2, 1.0, 0.5, 0],
              rotate:  [0, angle / 2, angle + 180, angle + 270, angle + 360],
            }}
            transition={{
              delay: 0.3 + i * 0.06,
              duration: cycleDuration,
              ease: "easeOut",
              repeat: Infinity,
              repeatDelay: 0.1 + (i % 3) * 0.15,
            }}
            style={{
              position: "absolute",
              top: 0, left: 0,
              fontSize: 22 + (i % 3) * 4,
              lineHeight: 1,
            }}
          >
            {f}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─────────────────────── Sorry Bouquet Screen ─────────────────────── */

/* The bouquet is built from individual photorealistic flower sprites (each a
 * transparent PNG) tucked into a kraft paper cone tied with a ribbon bow. Every
 * bloom and leaf is its own element with per-flower sizing, layered z-index and
 * soft drop-shadows for depth. They load almost all at once; a few accent blooms
 * then flow in from the top. Every flower sways/rotates gently forever and the
 * whole bouquet drifts in 3D. See BLOOMS below for the per-flower layout. */
type Bloom = {
  img: string;
  cx: number; cy: number; /* center within the design box */
  size: number; /* px */
  rot: number; /* resting rotation */
  z: number;
  delay: number;
  drop?: boolean; /* true = flows in from the top after the bouquet loads */
  shadow?: number; /* 0..1 strength */
  sway?: number; /* idle rotation amplitude in deg (default 3) */
};

const BOUQUET_BOX = { w: 300, h: 440 };

/* The bouquet loads almost all at once (small stagger), tucked into a kraft
 * paper cone tied with a ribbon bow. A few accent blooms then flow in from the
 * top (drop: true). Every flower also sways/rotates gently and forever, and the
 * whole bouquet drifts in 3D. Coordinates are in a fixed 300×440 design box. */
const BLOOMS: Bloom[] = [
  /* ── tall back spikes ── */
  { img: delphiniumBlueImg, cx: 116, cy: 95, size: 150, rot: -7, z: 1, delay: 0.1, shadow: 0.2, sway: 4 },
  { img: delphiniumBlueImg, cx: 182, cy: 90, size: 150, rot: 8, z: 1, delay: 0.16, shadow: 0.2, sway: 4, drop: true },
  /* ── greenery ── */
  { img: eucalyptusImg, cx: 66, cy: 150, size: 124, rot: -32, z: 1, delay: 0.08, shadow: 0.2, sway: 4 },
  { img: eucalyptusImg, cx: 234, cy: 150, size: 124, rot: 32, z: 1, delay: 0.12, shadow: 0.2, sway: 4 },
  { img: fernImg, cx: 150, cy: 78, size: 124, rot: 0, z: 1, delay: 0.14, shadow: 0.2, sway: 3.5 },
  { img: fernImg, cx: 92, cy: 120, size: 92, rot: -26, z: 2, delay: 0.1, shadow: 0.2, sway: 4 },
  { img: fernImg, cx: 212, cy: 124, size: 92, rot: 26, z: 2, delay: 0.13, shadow: 0.2, sway: 4 },
  /* ── back blooms ── */
  { img: hydrangeaBlueImg, cx: 88, cy: 132, size: 82, rot: -10, z: 2, delay: 0.06, shadow: 0.3 },
  { img: hydrangeaBlueImg, cx: 210, cy: 120, size: 74, rot: 12, z: 2, delay: 0.09, shadow: 0.3 },
  { img: daisyWhiteImg, cx: 150, cy: 100, size: 66, rot: 0, z: 3, delay: 0.05, shadow: 0.3 },
  { img: anemonePurpleImg, cx: 116, cy: 108, size: 60, rot: -8, z: 3, delay: 0.07, shadow: 0.3 },
  { img: cosmosPinkImg, cx: 196, cy: 100, size: 62, rot: 10, z: 3, delay: 0.18, shadow: 0.3, drop: true },
  /* ── mid blooms ── */
  { img: ranunculusYellowImg, cx: 100, cy: 162, size: 82, rot: -8, z: 3, delay: 0.04, shadow: 0.4 },
  { img: daisyWhiteImg, cx: 198, cy: 160, size: 76, rot: 10, z: 3, delay: 0.06, shadow: 0.4 },
  { img: anemonePurpleImg, cx: 150, cy: 124, size: 66, rot: 0, z: 4, delay: 0.08, shadow: 0.4, drop: true },
  { img: cosmosPinkImg, cx: 124, cy: 150, size: 60, rot: -6, z: 4, delay: 0.05, shadow: 0.4 },
  { img: daisyWhiteImg, cx: 172, cy: 136, size: 58, rot: 8, z: 4, delay: 0.07, shadow: 0.4 },
  { img: hydrangeaBlueImg, cx: 150, cy: 152, size: 58, rot: 0, z: 3, delay: 0.06, shadow: 0.35 },
  /* ── front roses: biggest, up front ── */
  { img: rosePinkImg, cx: 150, cy: 172, size: 106, rot: 0, z: 6, delay: 0.02, shadow: 0.55, sway: 2.5 },
  { img: rosePeachImg, cx: 104, cy: 196, size: 94, rot: -12, z: 5, delay: 0.04, shadow: 0.55, sway: 2.5 },
  { img: rosePinkImg, cx: 196, cy: 196, size: 90, rot: 12, z: 5, delay: 0.06, shadow: 0.55, sway: 2.5 },
  { img: ranunculusYellowImg, cx: 150, cy: 214, size: 70, rot: 0, z: 5, delay: 0.05, shadow: 0.5 },
  /* ── small front fillers over the cone mouth ── */
  { img: cosmosPinkImg, cx: 120, cy: 216, size: 52, rot: -10, z: 5, delay: 0.07, shadow: 0.45 },
  { img: anemonePurpleImg, cx: 182, cy: 218, size: 50, rot: 12, z: 5, delay: 0.08, shadow: 0.45 },
];

export function FloatingBouquet() {
  /* The arrangement is authored in a fixed design box; we scale the whole box
   * uniformly so the absolute flower coordinates stay valid (and never clip)
   * on narrow screens. */
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () =>
      setScale(Math.min(1, (Math.min(window.innerWidth, 480) - 48) / BOUQUET_BOX.w));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: BOUQUET_BOX.w * scale,
        height: BOUQUET_BOX.h * scale,
      }}
    >
    <div
      style={{
        perspective: 1200,
        width: BOUQUET_BOX.w,
        height: BOUQUET_BOX.h,
        position: "absolute",
        top: 0,
        left: 0,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      {/* soft glow behind the bouquet */}
      <motion.div
        animate={{ opacity: [0.4, 0.62, 0.4], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "6%",
          width: "94%",
          height: "52%",
          left: "3%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(210,180,235,0.42), rgba(255,170,200,0.16) 55%, transparent 76%)",
          filter: "blur(16px)",
        }}
      />
      {/* continuous gentle 3D float for the whole bouquet */}
      <motion.div
        animate={{
          y: [-8, 8, -8],
          rotateY: [-7, 7, -7],
          rotateX: [3, -3, 3],
          rotateZ: [-1, 1, -1],
        }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {/* kraft paper cone wrap with ribbon bow — rises into place first */}
        <motion.img
          src={wrapConeImg}
          alt=""
          aria-hidden
          draggable={false}
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          style={{
            position: "absolute",
            left: "50%",
            bottom: 0,
            width: 210,
            marginLeft: -105,
            zIndex: 0,
            filter: "drop-shadow(0 16px 22px rgba(50,20,40,0.45))",
            willChange: "transform",
          }}
        />

        {/* the flowers — load together, accents drop in from the top, all sway */}
        {BLOOMS.map((b, i) => {
          const amp = b.sway ?? 3;
          return (
            <motion.div
              key={i}
              initial={
                b.drop
                  ? { opacity: 0, y: -210, scale: 0.6, rotate: -16 }
                  : { opacity: 0, scale: 0.72 }
              }
              animate={
                b.drop
                  ? { opacity: 1, y: 0, scale: 1, rotate: 0 }
                  : { opacity: 1, scale: 1 }
              }
              transition={
                b.drop
                  ? { type: "spring", stiffness: 55, damping: 15, delay: 1.6 + b.delay * 3 }
                  : { duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.3 + i * 0.05 }
              }
              style={{
                position: "absolute",
                left: b.cx,
                top: b.cy,
                width: b.size,
                height: b.size,
                marginLeft: -b.size / 2,
                marginTop: -b.size / 2,
                zIndex: b.z,
                willChange: "transform",
              }}
            >
              {/* continuous gentle sway / rotation around the resting angle */}
              <motion.img
                src={b.img}
                alt={i === 0 ? "A bouquet of flowers" : ""}
                aria-hidden={i !== 0}
                draggable={false}
                animate={{ rotate: [b.rot - amp, b.rot + amp, b.rot - amp], y: [0, -3, 0] }}
                transition={{
                  duration: 3.6 + (i % 5) * 0.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: (i % 6) * 0.25,
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  transformOrigin: "bottom center",
                  filter: `drop-shadow(0 ${4 + (b.shadow ?? 0.3) * 10}px ${6 + (b.shadow ?? 0.3) * 10}px rgba(60,25,55,${0.25 + (b.shadow ?? 0.3) * 0.3}))`,
                  willChange: "transform",
                }}
              />
            </motion.div>
          );
        })}

        {/* flowers keep arriving into the bouquet at a regular cadence */}
        <BouquetDrops />
      </motion.div>
    </div>
    </div>
  );
}

/* The flower images reused for the ethereal falling-petal layer and for the
 * full-screen explosion when the recipient taps Continue. */
const PETAL_IMGS = [
  rosePinkImg, rosePeachImg, cosmosPinkImg, anemonePurpleImg,
  daisyWhiteImg, ranunculusYellowImg, hydrangeaBlueImg,
];

/* Every flower asset used anywhere in the sorry bouquet flow — warmed up front
 * (sorry cards only) so the whole arrangement arrives together instead of
 * popping in flower-by-flower as each image decodes. */
const BOUQUET_FLOWER_IMGS = [
  rosePinkImg, rosePeachImg, daisyWhiteImg, anemonePurpleImg,
  ranunculusYellowImg, hydrangeaBlueImg, eucalyptusImg, fernImg,
  delphiniumBlueImg, cosmosPinkImg, wrapConeImg,
];

/* A continuous, gentle stream of flowers drifting down from above the screen —
 * each one fades in near the top, sways as it falls, and fades out near the
 * bottom, then repeats forever on its own offset so the flow never stops. */
export function PetalRain({ count = 10 }: { count?: number }) {
  const petals = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        img: PETAL_IMGS[i % PETAL_IMGS.length],
        left: Math.random() * 100,
        size: 26 + Math.random() * 40,
        duration: 7 + Math.random() * 6,
        delay: -Math.random() * 13,
        drift: (Math.random() - 0.5) * 90,
        spin: Math.random() > 0.5 ? 1 : -1,
        opacity: 0.45 + Math.random() * 0.4,
      })),
    [count],
  );
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {petals.map((p, i) => (
        <motion.img
          key={i}
          src={p.img}
          alt=""
          aria-hidden
          draggable={false}
          initial={{ opacity: 0, y: "-12vh", x: 0, rotate: 0 }}
          animate={{
            opacity: [0, p.opacity, p.opacity, 0],
            y: ["-12vh", "112vh"],
            x: [0, p.drift, -p.drift * 0.6, p.drift * 0.3],
            rotate: [0, p.spin * 200],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.12, 0.88, 1],
          }}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            objectFit: "contain",
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}

/* Flowers that keep arriving into the bouquet at a regular cadence until the
 * recipient taps Continue — each one drops in from above, settles into the top
 * of the arrangement, then gently fades, and the cycle repeats forever. */
const BOUQUET_DROPS = [
  { img: rosePinkImg, cx: 122, cy: 120, size: 60, rot: -8, delay: 0 },
  { img: cosmosPinkImg, cx: 182, cy: 110, size: 56, rot: 10, delay: 1.2 },
  { img: anemonePurpleImg, cx: 150, cy: 138, size: 58, rot: 0, delay: 2.4 },
  { img: ranunculusYellowImg, cx: 132, cy: 100, size: 52, rot: 6, delay: 3.5 },
];

function BouquetDrops() {
  return (
    <>
      {BOUQUET_DROPS.map((d, i) => (
        <motion.img
          key={`drop-${i}`}
          src={d.img}
          alt=""
          aria-hidden
          draggable={false}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [-210, 0, 0, -8],
            scale: [0.5, 1, 1, 0.95],
            rotate: [d.rot - 12, d.rot, d.rot, d.rot],
          }}
          transition={{
            duration: 3.8,
            delay: d.delay,
            repeat: Infinity,
            repeatDelay: 2.2,
            ease: "easeInOut",
            times: [0, 0.55, 0.82, 1],
          }}
          style={{
            position: "absolute",
            left: d.cx,
            top: d.cy,
            width: d.size,
            height: d.size,
            marginLeft: -d.size / 2,
            marginTop: -d.size / 2,
            objectFit: "contain",
            transformOrigin: "bottom center",
            zIndex: 7,
            filter: "drop-shadow(0 6px 10px rgba(60,25,55,0.4))",
            willChange: "transform",
          }}
        />
      ))}
    </>
  );
}

/* When the recipient taps Continue, the bouquet bursts into a shower of flowers
 * that fly out from the center and fill the whole screen, and keep drifting and
 * spinning (never freezing) until the next screen takes over. */
function FlowerExplosion({ count = 30 }: { count?: number }) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 390;
  const vh = typeof window !== "undefined" ? window.innerHeight : 844;
  const bits = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        img: PETAL_IMGS[i % PETAL_IMGS.length],
        tx: (Math.random() - 0.5) * vw * 1.25,
        ty: (Math.random() - 0.5) * vh * 1.25,
        size: 42 + Math.random() * 90,
        rot: (Math.random() - 0.5) * 540,
        spin: Math.random() > 0.5 ? 1 : -1,
        drift: (Math.random() - 0.5) * 36,
        delay: Math.random() * 0.12,
        dur: 0.7 + Math.random() * 0.5,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count],
  );
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 50 }}>
      {bits.map((b, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, scale: 0.2, opacity: 0 }}
          animate={{ x: b.tx, y: b.ty, scale: 1, opacity: 1 }}
          transition={{ duration: b.dur, delay: b.delay, ease: [0.18, 0.7, 0.3, 1] }}
          style={{
            position: "absolute",
            left: "50%",
            top: "52%",
            width: b.size,
            height: b.size,
            marginLeft: -b.size / 2,
            marginTop: -b.size / 2,
            willChange: "transform",
          }}
        >
          {/* keep spinning + drifting forever so the flowers never freeze */}
          <motion.img
            src={b.img}
            alt=""
            aria-hidden
            draggable={false}
            animate={{ rotate: [b.rot, b.rot + b.spin * 360], y: [0, -10, 0], x: [0, b.drift, 0] }}
            transition={{
              rotate: { duration: 7 + (i % 4), repeat: Infinity, ease: "linear" },
              y: { duration: 2.4 + (i % 3) * 0.4, repeat: Infinity, ease: "easeInOut" },
              x: { duration: 3.2 + (i % 3) * 0.5, repeat: Infinity, ease: "easeInOut" },
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              willChange: "transform",
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

export function BouquetScreen({ onContinue }: { onContinue: () => void }) {
  const [exploding, setExploding] = useState(false);

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  const handleContinue = useCallback(() => {
    if (exploding) return;
    setExploding(true);
    /* let the flowers fill the screen before advancing to the next phase */
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(onContinue, 1050);
  }, [exploding, onContinue]);

  return (
    <motion.div
      key="bouquet-scene"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      transition={{ duration: 0.6 }}
      style={{
        position: "fixed", inset: 0, zIndex: 35,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: "min(28px, 5vw)",
        padding: "32px 24px",
        overflow: "hidden",
      }}
    >
      {/* continuous ethereal stream of flowers from above */}
      <PetalRain />

      <motion.div
        style={{ position: "relative", zIndex: 1 }}
        initial={{ scale: 0.6, opacity: 0, y: 30 }}
        animate={
          exploding
            ? { scale: 1.5, opacity: 0, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
            : { scale: 1, opacity: 1, y: 0 }
        }
        transition={{ type: "spring", damping: 14, stiffness: 120, delay: 0.15 }}
      >
        <FloatingBouquet />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={exploding ? { opacity: 0, y: 16 } : { opacity: 1, y: 0 }}
        transition={{ delay: exploding ? 0 : 0.7, duration: exploding ? 0.25 : 0.6 }}
        style={{
          position: "relative",
          zIndex: 1,
          fontSize: "min(23px, 5.9vw)",
          fontWeight: 600,
          textAlign: "center",
          lineHeight: 1.45,
          maxWidth: 380,
          margin: 0,
          fontFamily: "'Dancing Script', cursive",
          backgroundImage: "linear-gradient(135deg, #FFE9A8, #F5C44E 45%, #E0A52E)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 2px 12px rgba(245,196,78,0.4))",
        }}
      >
        I'm sorry for how I made you feel.
        <br />
        Please forgive me if you can.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 14 }}
        animate={exploding ? { opacity: 0, y: 14 } : { opacity: 1, y: 0 }}
        transition={{ delay: exploding ? 0 : 1.1, duration: exploding ? 0.25 : 0.5 }}
        whileTap={{ scale: 0.96 }}
        onClick={handleContinue}
        disabled={exploding}
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: 4,
          padding: "11px 46px",
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          background: "linear-gradient(135deg, #FFE9A8 0%, #F5C44E 50%, #E0A52E 100%)",
          color: "#5A3A05",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "0.02em",
          fontFamily: "'Dancing Script', cursive",
          boxShadow: "0 8px 26px rgba(224,165,46,0.5)",
        }}
      >
        Please 😢
      </motion.button>

      {/* full-screen flower burst on Continue */}
      {exploding && <FlowerExplosion />}
    </motion.div>
  );
}

/* ─────────────────────────── Main Page ────────────────────────── */

type Phase = "envelope" | "opening" | "polaroid" | "orbs" | "bouquet" | "collage" | "finale";

export default function Card() {
  const params = useQueryParams();
  /* Route to Cosmic template if requested — lazy chunk, only loads for cosmic visitors */
  if (params.get("template") === "cosmic") {
    return <Suspense fallback={null}><CosmicCard /></Suspense>;
  }
  /* Route to Vinyl template if requested — lazy chunk, only loads for vinyl visitors */
  if (params.get("template") === "vinyl") {
    return <Suspense fallback={null}><VinylCard /></Suspense>;
  }
  /* Route to Crystal Ball template if requested — lazy chunk, only loads for crystal visitors */
  if (params.get("template") === "crystal") {
    return <Suspense fallback={null}><CrystalCard /></Suspense>;
  }

  const recipientName = params.get("to") || "Friend";
  const occasion = params.get("occasion") || "thank_you";
  /* The "sorry" occasion gets a bespoke envelope experience: a heartfelt
   * opening headline and an extra floating-bouquet apology screen inserted
   * after the orbs. Every other occasion is byte-for-byte unchanged. */
  const isSorry = occasion === "sorry";
  const relation = params.get("relation") || "friend";
  const likes = params.get("likes") || "";
  const customMsg = decodeMsg(params.get("msg"));
  const isSender = params.get("sender") === "1";
  const isPreview = params.get("preview") === "1" || isSender;
  const isRecipient = !isSender && !isPreview;
  const directShare = params.get("direct_share") === "1";
  const isAutoplay = params.get("autoplay") === "1";
  const previewSpeed = Math.max(1, Number(params.get("speed")) || 1);
  const personalPictureUrl = (() => {
    const raw = params.get("personalpicture");
    if (!raw) return null;
    try { return decodeURIComponent(raw); } catch { return null; }
  })();

  /* Multi-photo collage URLs — comma-separated, each URI-encoded.
     Falls back to personalPictureUrl for legacy single-photo cards. */
  const collagePhotoUrls = (() => {
    const raw = params.get("photos");
    if (!raw) return [] as string[];
    return raw.split(",").map(u => { try { return decodeURIComponent(u.trim()); } catch { return u.trim(); } }).filter(Boolean);
  })();
  /* Photo[0] lives on the orbs screen (personalpicture); photos[1-2] go to collage */
  const effectiveCollagePhotos: string[] = collagePhotoUrls.slice(1);

  /* Voice note URL */
  const voiceNoteUrl = (() => {
    const raw = params.get("voicenote");
    if (!raw) return null;
    try { return decodeURIComponent(raw); } catch { return null; }
  })();

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
  const cardId = params.get("id") ?? "";
  const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

  /* ── Recipient payment gate ──────────────────────────────────────────
   * Only runs when someone views the card WITHOUT ?sender=1 AND a card ID
   * is present. Legitimate recipients have paid cards (is_watermarked=false).
   * Senders who removed ?sender=1 to bypass the paywall have unpaid cards.
   * Fail-open after 2 s so a slow network never blocks a real recipient. */
  const [recipientPayStatus, setRecipientPayStatus] = useState<"checking" | "paid" | "unpaid">(
    isRecipient && cardId ? "checking" : "paid",
  );

  /* ?finale=1 is silently injected into the URL by history.replaceState when
   * the sender reaches the finale phase (see useEffect below). Any subsequent
   * fresh open of that URL — including copy-paste by someone who got it — skips
   * straight to the finale+paywall without replaying the full animation. */
  const skipToFinale = (directShare && isSender) || (isSender && params.get("finale") === "1");
  const [phase, setPhase] = useState<Phase>(skipToFinale ? "finale" : "envelope");
  const [clickedOrbs, setClickedOrbs] = useState<Set<number>>(() =>
    skipToFinale ? new Set(orbs.map((_, i) => i)) : new Set()
  );
  const [activeTooltip, setActiveTooltip] = useState<{ orb: OrbData; key: number } | null>(null);
  const [orbRadius, setOrbRadius] = useState(130);
  /* Recipients previously saw a 2.2s (later 0.8s) React splash before the
     envelope appeared. This is now removed: the HTML splash in index.html
     already shows "Hey, {name}! 💛" from first paint and covers the 1-2s
     while React mounts, so a second React-layer splash is redundant and
     was pushing card LCP above 3s. Envelope now appears immediately when
     React mounts, matching the HTML splash fade-out. */
  const [showSplash, setShowSplash] = useState(false);
  const [splashEmojiIdx, setSplashEmojiIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const confettiRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  /* ── Preload personal picture + all collage photos on mount so they are
       cached well before those phases render. The envelope → orbs → collage
       journey takes several seconds of user interaction, giving the browser
       plenty of time to finish the downloads in the background. ── */
  useEffect(() => {
    const urls = [personalPictureUrl, ...effectiveCollagePhotos].filter(Boolean) as string[];
    /* Sorry cards detour through the floating-bouquet apology screen, so warm
     * the (now lightweight WebP) flower assets too — this lets the whole
     * arrangement arrive together instead of popping in flower-by-flower. */
    if (isSorry) urls.push(...BOUQUET_FLOWER_IMGS);
    urls.forEach(url => {
      const img = new Image();
      img.src = url;
      /* Sorry flow: also force-decode now so the collage photos are already
       * rasterized and the bouquet→polaroid handoff doesn't freeze decoding
       * a full-size JPEG on the main thread mid-transition. */
      if (isSorry) void img.decode?.().catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── background music ── */
  useEffect(() => {
    if (isRecipient && !isAutoplay) {
      const cardId = params.get("id") ?? undefined;
      trackEvent({ event: "card_viewed", occasion, template: "envelope", recipient_name: recipientName, card_id: cardId });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAutoplay) return;
    music.start("envelope", occasion);
    return () => { music.stop(); };
  }, []);

  useEffect(() => {
    const update = () => {
      setOrbRadius(
        personalPictureUrl
          ? Math.min(195, window.innerWidth * 0.43)
          : Math.min(115, window.innerWidth * 0.27)
      );
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [personalPictureUrl]);

  /* Remove native pre-React splash once React has mounted */
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__clearHsSplash) {
      (window as any).__clearHsSplash();
    }
  }, []);

  /* Auto-hide recipient splash after 0.8s.
   * Reduced from 2.2s — the long wait was delaying LCP on the card page by
   * ~1.4s because the GoldenEnvelope (the true LCP element) was hidden until
   * the splash cleared. 800ms still feels like a meaningful reveal pause. */
  useEffect(() => {
    if (!showSplash) return;
    const t = setTimeout(() => setShowSplash(false), 800);
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

  /* Stamp ?finale=1 into the URL the moment the sender reaches the finale phase.
   * This is silent (history.replaceState — no navigation, no re-render).
   * Effect: any copy-paste of the URL at the finale opens directly to the
   * paywall screen, not the full animation. Totally invisible to the sender. */
  useEffect(() => {
    if (!isSender || phase !== "finale") return;
    const u = new URL(window.location.href);
    if (u.searchParams.get("finale") !== "1") {
      u.searchParams.set("finale", "1");
      window.history.replaceState(null, "", u.toString());
    }
  }, [isSender, phase]);

  /* Payment gate check — recipient views only, no-op for senders / previews */
  useEffect(() => {
    if (!isRecipient || !cardId) return;
    const failOpen = setTimeout(() => setRecipientPayStatus("paid"), 2000);
    fetch(`${BASE}/api/cards/${cardId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        clearTimeout(failOpen);
        setRecipientPayStatus(data?.is_paid === true ? "paid" : "unpaid");
      })
      .catch(() => { clearTimeout(failOpen); setRecipientPayStatus("paid"); });
    return () => clearTimeout(failOpen);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleUnlock() {
    envelope.open();
    setPhase("opening");
    if (personalPictureUrl) {
      setTimeout(() => { setPhase("polaroid"); }, 400);
      setTimeout(() => { setPhase("orbs"); }, 1300);
    } else {
      setTimeout(() => { setPhase("orbs"); }, 1200);
    }
  }

  /* Memoized with useCallback + functional setState so React.memo(Orb) works:
   * sibling orbs won't re-render when a different orb is tapped. */
  const handleOrbClick = useCallback((idx: number, rect: DOMRect) => {
    const orb = orbs[idx];
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    envelope.orbTap();
    fireEmojiParticles(cx, cy, orb.emoji);

    setActiveTooltip(prev => ({ orb, key: (prev?.key ?? 0) + 1 }));

    setClickedOrbs(prev => {
      const newClicked = new Set(prev).add(idx);
      if (newClicked.size === orbs.length) {
        setTimeout(() => {
          envelope.finale();
          if (isSorry) {
            /* Sorry cards detour through the floating-bouquet apology screen
             * before continuing to the photos/voice note or the finale. */
            setPhase("bouquet");
            return;
          }
          const skipCollage = effectiveCollagePhotos.length === 0 && !voiceNoteUrl;
          setPhase(skipCollage ? "finale" : "collage");
          setTimeout(fireConfetti, personalPictureUrl ? 500 : 800);
        }, 1500);
      }
      return newClicked;
    });
  }, [orbs, fireEmojiParticles, fireConfetti, personalPictureUrl, isSorry, effectiveCollagePhotos.length, voiceNoteUrl]);

  /* Bouquet (sorry only) → photos/voice note if present, else straight to finale. */
  const handleBouquetContinue = useCallback(() => {
    const skipCollage = effectiveCollagePhotos.length === 0 && !voiceNoteUrl;
    /* Sorry flow stays floral all the way through: the collage screen rains
     * flowers (PetalRain) instead of confetti, so no confetti is fired here. */
    setPhase(skipCollage ? "finale" : "collage");
  }, [effectiveCollagePhotos.length, voiceNoteUrl]);

  /* ── Autoplay mode: auto-advance all phases for the modal iframe preview ── */
  useEffect(() => {
    if (!isAutoplay || phase !== "envelope") return;
    const t = setTimeout(handleUnlock, 1500 / previewSpeed);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoplay, phase]);

  useEffect(() => {
    if (!isAutoplay || phase !== "orbs") return;
    /* Autoplay: click each orb in sequence without depending on handleOrbClick
       (which has an unstable reference and would reset the timers in a loop). */
    const timers = orbs.map((orb, i) =>
      setTimeout(() => {
        setActiveTooltip(prev => ({ orb, key: (prev?.key ?? 0) + 1 }));
        setClickedOrbs(prev => {
          const next = new Set(prev).add(i);
          if (next.size === orbs.length) {
            setTimeout(() => {
              envelope.finale();
              if (isSorry) { setPhase("bouquet"); return; }
              const skipCollage = effectiveCollagePhotos.length === 0 && !voiceNoteUrl;
              setPhase(skipCollage ? "finale" : "collage");
            }, 1200 / previewSpeed);
          }
          return next;
        });
      }, (800 + i * 900) / previewSpeed)
    );
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoplay, phase]);

  /* Autoplay: advance bouquet (sorry only) → photos/voice note or finale */
  useEffect(() => {
    if (!isAutoplay || phase !== "bouquet") return;
    const t = setTimeout(() => {
      const skipCollage = effectiveCollagePhotos.length === 0 && !voiceNoteUrl;
      setPhase(skipCollage ? "finale" : "collage");
    }, 3000 / previewSpeed);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoplay, phase]);

  /* Autoplay: advance from collage → finale after showing the photos + voice note */
  useEffect(() => {
    if (!isAutoplay || phase !== "collage") return;
    const t = setTimeout(() => setPhase("finale"), 3000 / previewSpeed);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoplay, phase]);

  /* Autoplay: loop back to envelope after a short pause at finale — the preview
     in the paywall modal should never show "card isn't ready yet" and should
     replay continuously so the sender can see the full experience. */
  useEffect(() => {
    if (!isAutoplay || phase !== "finale") return;
    const t = setTimeout(() => {
      setClickedOrbs(new Set());
      setActiveTooltip(null);
      setPhase("envelope");
    }, 3500 / previewSpeed);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoplay, phase]);

  const orbPositions = useMemo(() => orbs.map((_, i) => {
    const angle = (i / orbs.length) * 2 * Math.PI - Math.PI / 2;
    return { x: orbRadius * Math.cos(angle), y: orbRadius * Math.sin(angle), angle };
  }), [orbs, orbRadius]);

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
            exit={{ x: "-110vw", opacity: 0, transition: { duration: 0.45, ease: "easeIn" } }}
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
                    animate={isSorry ? {} : { opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    style={
                      isSorry
                        ? {
                            fontSize: "min(27px, 7vw)",
                            fontWeight: 600,
                            letterSpacing: "0.01em",
                            textAlign: "center",
                            margin: 0,
                            fontFamily: "'Dancing Script', cursive",
                            backgroundImage: "linear-gradient(135deg, #FFE9A8, #F5C44E 45%, #E0A52E)",
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            color: "transparent",
                            WebkitTextFillColor: "transparent",
                            filter: "drop-shadow(0 2px 12px rgba(245,196,78,0.4))",
                          }
                        : {
                            fontSize: "min(18px, 4.5vw)",
                            fontWeight: 700,
                            color: "#FFD700",
                            letterSpacing: "0.05em",
                            textAlign: "center",
                            textShadow: "0 0 30px rgba(255,215,0,0.6)",
                          }
                    }
                  >
                    {isSorry ? "Something I needed to say" : "✨ A Surprise For You! ✨"}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            <GoldenEnvelope recipientName={recipientName} opening={phase === "opening"} isSorry={isSorry} />

            <AnimatePresence>
              {phase === "envelope" && (
                <motion.div key="slider" exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.25 }}>
                  <SlideToUnlock onUnlock={handleUnlock} isSorry={isSorry} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ PHASE 2.5: Polaroid ════ */}
      <AnimatePresence>
        {personalPictureUrl && (phase === "polaroid" || phase === "orbs" || ((phase === "finale" || phase === "collage") && !allClicked)) && (
          <PolaroidFrame key="polaroid-frame" src={personalPictureUrl} isFramed={phase === "orbs" || ((phase === "finale" || phase === "collage") && !allClicked)} />
        )}
      </AnimatePresence>

      {/* ════ PHASE 3: Orbs ════ */}
      <AnimatePresence>
        {(phase === "orbs" || phase === "finale") && (
          <motion.div
            key="orbs-scene"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ position: "fixed", inset: 0, zIndex: 40, pointerEvents: allClicked ? "none" : "auto" }}
          >
            <div style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                    onClick={handleOrbClick}
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
                <OrbTooltip key={activeTooltip.key} orb={activeTooltip.orb} />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ PHASE 3.5: Sorry Bouquet (sorry occasion only) ════ */}
      <AnimatePresence>
        {phase === "bouquet" && isSorry && (
          <BouquetScreen onContinue={handleBouquetContinue} />
        )}
      </AnimatePresence>

      {/* ════ PHASE 4a: Memory Collage ════ */}
      <AnimatePresence>
        {phase === "collage" && (
          <motion.div
            key="collage-scene"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={isSorry ? { duration: 0.4 } : { delay: 0.5 }}
            style={{
              position: "fixed", inset: 0, zIndex: 30,
              padding: isSender ? "0 0 270px" : "0",
            }}
          >
            {isSorry && <PetalRain />}
            <MemoryCollage
              photoUrls={effectiveCollagePhotos}
              voiceNoteUrl={voiceNoteUrl}
              onContinue={() => setPhase("finale")}
              isSorry={isSorry}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ PHASE 4b: Final Card (no media) ════ */}
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
              padding: isSender ? "16px 16px 280px" : "16px",
              overflowY: "auto",
              gap: 16,
            }}
          >
            <FlowerBurst />
            <FinalCard
              recipientName={recipientName}
              titlePrefix={template.title_prefix}
              finalMessage={finalMessage}
            />

            {isRecipient && <ViralReplyCTA template="envelope" occasion={occasion} />}
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

      

      {/* ── Recipient payment gate overlay ──────────────────────────────
           Shows only when card_id is present and the card hasn't been paid
           for yet. The sender who bypassed ?sender=1 sees this; legitimate
           recipients never do (their cards have is_watermarked=false). ── */}
      <AnimatePresence>
        {isRecipient && recipientPayStatus === "unpaid" && (
          <motion.div
            key="recipient-gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(10,8,20,0.88)",
              backdropFilter: "blur(14px)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "32px 24px",
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 20 }}>🔒</div>
            <p style={{
              fontSize: 20, fontWeight: 800, color: "#FFD700",
              textAlign: "center", marginBottom: 10,
            }}>
              Card is locked 🔒
            </p>
            <p style={{
              fontSize: 14, color: "rgba(255,255,255,0.55)",
              textAlign: "center", marginBottom: 32, lineHeight: 1.6,
              maxWidth: 280,
            }}>
              The card hasn't been unlocked for sharing. If you're the creator, tap below to unlock and send it.
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                const u = new URL(window.location.href);
                u.searchParams.set("sender", "1");
                u.searchParams.delete("preview");
                window.location.href = u.toString();
              }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "min(300px, calc(100vw - 48px))", height: 56, borderRadius: 16,
                background: "linear-gradient(135deg, #FFD700 0%, #FFAA00 100%)",
                color: "#000", fontWeight: 800, fontSize: 17,
                border: "none", cursor: "pointer",
                boxShadow: "0 6px 28px rgba(255,165,0,0.45)",
              }}
            >
              🔓 Unlock &amp; Share
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SenderPanel: lazy-loads Clerk + share gate + badge + paywall — only for senders */}
      {isSender && (
        <Suspense fallback={null}>
          <SenderPanel
            senderShareUrl={senderShareUrl}
            recipientName={recipientName}
            occasion={occasion}
            cardId={params.get("id") ?? ""}
            phase={phase as "envelope" | "opening" | "orbs" | "collage" | "finale"}
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
        <div
          key={s.id}
          className="hs-ambient-anim"
          style={{
            position: "absolute",
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "white",
            animation: `hs-star-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
