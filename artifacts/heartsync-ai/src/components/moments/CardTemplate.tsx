import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

export type TemplateId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface CardTemplateProps {
  templateId: TemplateId;
  recipientName: string;
  message: string;
  preview?: boolean;
  static?: boolean;
}

const TEMPLATE_META: Record<
  TemplateId,
  { name: string; bg: string; textColor: string; subColor: string; watermarkColor: string }
> = {
  1: { name: "Rose Bloom", bg: "from-rose-900 via-pink-800 to-rose-950", textColor: "text-rose-100", subColor: "text-rose-300/80", watermarkColor: "text-rose-400/50" },
  2: { name: "Midnight Spark", bg: "from-indigo-950 via-purple-900 to-slate-950", textColor: "text-indigo-100", subColor: "text-purple-300/80", watermarkColor: "text-purple-400/50" },
  3: { name: "Golden Hour", bg: "from-amber-800 via-orange-700 to-yellow-900", textColor: "text-amber-50", subColor: "text-yellow-200/80", watermarkColor: "text-amber-300/50" },
  4: { name: "Mint Fresh", bg: "from-teal-900 via-emerald-800 to-cyan-950", textColor: "text-teal-50", subColor: "text-emerald-300/80", watermarkColor: "text-teal-300/50" },
  5: { name: "Cherry Pop", bg: "from-red-700 via-rose-600 to-red-800", textColor: "text-white", subColor: "text-rose-200/80", watermarkColor: "text-rose-300/50" },
  6: { name: "Lavender Dream", bg: "from-violet-900 via-purple-800 to-fuchsia-950", textColor: "text-violet-100", subColor: "text-purple-200/80", watermarkColor: "text-violet-300/50" },
  7: { name: "Ocean Calm", bg: "from-blue-950 via-sky-900 to-blue-950", textColor: "text-sky-100", subColor: "text-blue-300/80", watermarkColor: "text-sky-400/50" },
  8: { name: "Sunshine", bg: "from-yellow-400 via-amber-400 to-orange-400", textColor: "text-orange-900", subColor: "text-orange-800/80", watermarkColor: "text-orange-700/50" },
};

// ─── Rose Bloom: Breathing name glow ────────────────────────────────────────
function RoseBloomDecor({ isStatic }: { isStatic: boolean }) {
  if (isStatic) return null;
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${180 + i * 60}px`,
            height: `${180 + i * 60}px`,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, rgba(251,113,133,${0.18 - i * 0.04}) 0%, transparent 70%)`,
          }}
          animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3.5 + i * 0.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
        />
      ))}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`petal-${i}`}
          className="absolute rounded-full bg-rose-300/15"
          style={{
            width: `${8 + (i % 3) * 6}px`,
            height: `${8 + (i % 3) * 6}px`,
            top: `${15 + (i * 11) % 70}%`,
            left: `${8 + (i * 13) % 80}%`,
          }}
          animate={{
            y: [0, -18, 0],
            x: [0, (i % 2 === 0 ? 6 : -6), 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{ duration: 4 + (i % 3), repeat: Infinity, ease: "easeInOut", delay: i * 0.35 }}
        />
      ))}
    </>
  );
}

function RoseBloomName({ name, textColor, isStatic }: { name: string; textColor: string; isStatic: boolean }) {
  if (isStatic) return <p className={`font-extrabold leading-tight ${textColor}`} style={{ fontSize: "1.75rem", fontFamily: "Georgia, serif" }}>{name}</p>;
  return (
    <motion.p
      className={`font-extrabold leading-tight ${textColor}`}
      style={{
        fontSize: "1.75rem",
        fontFamily: "Georgia, serif",
        textShadow: "0 0 20px rgba(251,113,133,0.4)",
      }}
      animate={{
        scale: [1, 1.04, 1],
        textShadow: [
          "0 0 20px rgba(251,113,133,0.3)",
          "0 0 40px rgba(251,113,133,0.7), 0 0 60px rgba(251,113,133,0.3)",
          "0 0 20px rgba(251,113,133,0.3)",
        ],
      }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {name}
    </motion.p>
  );
}

// ─── Midnight Spark: Neon flicker ───────────────────────────────────────────
const DIAMOND_POSITIONS = [
  { top: "10%", left: "8%", size: 14, delay: 0 },
  { top: "18%", right: "10%", size: 10, delay: 0.4 },
  { top: "55%", left: "5%", size: 18, delay: 0.8 },
  { top: "70%", right: "8%", size: 12, delay: 0.2 },
  { top: "40%", left: "85%", size: 8, delay: 1.1 },
  { top: "85%", left: "20%", size: 10, delay: 0.6 },
];

function MidnightSparkDecor({ isStatic }: { isStatic: boolean }) {
  if (isStatic) return null;
  return (
    <>
      {DIAMOND_POSITIONS.map((d, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            width: d.size,
            height: d.size,
            top: d.top,
            left: "left" in d ? d.left : undefined,
            right: "right" in d ? d.right : undefined,
            background: "rgba(167,139,250,0.8)",
            clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            filter: "drop-shadow(0 0 6px rgba(167,139,250,0.9))",
          }}
          animate={{
            opacity: [0.2, 1, 0.6, 1, 0.2],
            filter: [
              "drop-shadow(0 0 4px rgba(167,139,250,0.5))",
              "drop-shadow(0 0 12px rgba(167,139,250,1)) drop-shadow(0 0 20px rgba(167,139,250,0.6))",
              "drop-shadow(0 0 6px rgba(167,139,250,0.7))",
              "drop-shadow(0 0 16px rgba(167,139,250,1))",
              "drop-shadow(0 0 4px rgba(167,139,250,0.5))",
            ],
            scale: [0.8, 1.2, 1, 1.3, 0.8],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: d.delay }}
        />
      ))}
      <motion.div
        className="absolute inset-0 rounded-3xl"
        style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.15) 0%, transparent 65%)" }}
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

function MidnightSparkName({ name, textColor, isStatic }: { name: string; textColor: string; isStatic: boolean }) {
  if (isStatic) return <p className={`font-extrabold leading-tight ${textColor}`} style={{ fontSize: "1.75rem", fontFamily: "Georgia, serif" }}>{name}</p>;
  return (
    <motion.p
      className={`font-extrabold leading-tight ${textColor}`}
      style={{ fontSize: "1.75rem", fontFamily: "Georgia, serif" }}
      animate={{
        textShadow: [
          "0 0 10px rgba(167,139,250,0.6)",
          "0 0 20px rgba(167,139,250,1), 0 0 40px rgba(99,102,241,0.8), 0 0 60px rgba(167,139,250,0.4)",
          "0 0 8px rgba(167,139,250,0.3)",
          "0 0 25px rgba(167,139,250,1), 0 0 50px rgba(99,102,241,0.7)",
          "0 0 10px rgba(167,139,250,0.6)",
        ],
        opacity: [1, 1, 0.85, 1, 1],
      }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      {name}
    </motion.p>
  );
}

// ─── Golden Hour: Light sweep ────────────────────────────────────────────────
function GoldenHourDecor({ isStatic }: { isStatic: boolean }) {
  if (isStatic) return (
    <div className="absolute inset-0 rounded-3xl" style={{ background: "radial-gradient(circle at 70% 25%, rgba(253,224,71,0.25) 0%, transparent 55%)" }} />
  );
  return (
    <>
      <div
        className="absolute inset-0 rounded-3xl"
        style={{ background: "radial-gradient(circle at 70% 25%, rgba(253,224,71,0.2) 0%, transparent 55%)" }}
      />
      <motion.div
        className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <motion.div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "60%",
            background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.22) 50%, transparent 80%)",
            filter: "blur(6px)",
          }}
          initial={{ left: "-60%" }}
          animate={{ left: ["-60%", "160%"] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
        />
      </motion.div>
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1/3 rounded-b-3xl"
        style={{ background: "linear-gradient(to top, rgba(180,83,9,0.25) 0%, transparent 100%)" }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

// ─── Mint Fresh: Typewriter message ─────────────────────────────────────────
const CURSOR_BLINK = {
  opacity: [1, 1, 0, 0, 1] as number[],
  transition: { duration: 1.1, repeat: Infinity },
};

function TypewriterMessage({ message, textColor, isStatic }: { message: string; textColor: string; isStatic: boolean }) {
  const [visibleCount, setVisibleCount] = useState(isStatic ? message.length : 0);
  const [done, setDone] = useState(isStatic);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isStatic) return;
    setVisibleCount(0);
    setDone(false);
    let i = 0;
    function tick() {
      i += 1;
      setVisibleCount(i);
      if (i < message.length) {
        timerRef.current = setTimeout(tick, 28);
      } else {
        setTimeout(() => setDone(true), 200);
      }
    }
    timerRef.current = setTimeout(tick, 600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [message, isStatic]);

  return (
    <div className="relative z-10 flex-1 flex items-center justify-center">
      <p
        className={`leading-relaxed ${textColor}`}
        style={{ fontSize: "1rem", fontFamily: "Georgia, serif", fontStyle: "italic", textAlign: "center", opacity: 0.92 }}
      >
        "
        {message.slice(0, visibleCount)}
        {!done && (
          <motion.span
            className="inline-block w-0.5 h-4 bg-teal-300 ml-0.5 align-middle"
            animate={CURSOR_BLINK}
          />
        )}
        {done && "\""}
      </p>
      {done && (
        <motion.span
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-teal-300 text-base"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.4, 1], opacity: 1 }}
          transition={{ duration: 0.5, ease: "backOut" }}
        >
          ✦
        </motion.span>
      )}
    </div>
  );
}

function MintFreshDecor({ isStatic }: { isStatic: boolean }) {
  if (isStatic) return null;
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-teal-400/25"
          style={{
            width: `${80 + i * 55}px`,
            height: `${80 + i * 55}px`,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
          animate={{ scale: [0.9, 1.06, 0.9], opacity: [0.15, 0.45, 0.15] }}
          transition={{ duration: 3.5 + i * 0.7, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
        />
      ))}
    </>
  );
}

// ─── Cherry Pop: Confetti burst ──────────────────────────────────────────────
const CONFETTI_COLORS = ["#f87171", "#fb923c", "#fbbf24", "#f472b6", "#e879f9", "#ffffff"];

function useConfettiParticles(count: number, isStatic: boolean) {
  return useMemo(() => {
    if (isStatic) return [];
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * 360;
      const rad = (angle * Math.PI) / 180;
      const dist = 80 + Math.random() * 100;
      return {
        id: i,
        x: Math.cos(rad) * dist,
        y: Math.sin(rad) * dist - 30,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 4 + Math.floor(Math.random() * 5),
        delay: Math.random() * 0.3,
        duration: 0.9 + Math.random() * 0.5,
      };
    });
  }, [count, isStatic]);
}

function CherryPopDecor({ isStatic }: { isStatic: boolean }) {
  const particles = useConfettiParticles(20, isStatic);
  if (isStatic) return null;
  return (
    <>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-sm"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              top: 0,
              left: 0,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
            animate={{
              x: p.x,
              y: p.y,
              opacity: [0, 1, 1, 0],
              scale: [0, 1.2, 1, 0],
              rotate: [0, 180 + Math.random() * 180],
            }}
            transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          />
        ))}
      </div>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`h-${i}`}
          className="absolute text-white/25 select-none text-xl"
          style={{
            top: `${15 + (i * 14) % 65}%`,
            left: `${10 + (i * 17) % 75}%`,
          }}
          animate={{ y: [0, -10, 0], scale: [1, 1.2, 1], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 2 + (i % 3) * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
        >
          ♥
        </motion.div>
      ))}
    </>
  );
}

// ─── Lavender Dream: Aurora aura ────────────────────────────────────────────
const AURORA_ORBS = [
  { color: "rgba(167,139,250,0.25)", size: "55%", initX: "10%", initY: "10%", dX: "20%", dY: "30%", dur: 9 },
  { color: "rgba(232,121,249,0.2)", size: "45%", initX: "50%", initY: "5%", dX: "-15%", dY: "40%", dur: 11 },
  { color: "rgba(99,102,241,0.2)", size: "50%", initX: "60%", initY: "50%", dX: "-20%", dY: "-25%", dur: 13 },
  { color: "rgba(236,72,153,0.15)", size: "40%", initX: "5%", initY: "60%", dX: "30%", dY: "-15%", dur: 8 },
];

function LavenderDreamDecor({ isStatic }: { isStatic: boolean }) {
  return (
    <>
      {AURORA_ORBS.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-2xl"
          style={{
            width: orb.size,
            height: orb.size,
            background: orb.color,
            top: orb.initY,
            left: orb.initX,
          }}
          animate={isStatic ? {} : {
            x: [0, orb.dX, `calc(${orb.dX} / 2)`, 0],
            y: [0, orb.dY, `calc(${orb.dY} * 0.6)`, 0],
            opacity: [0.5, 0.9, 0.6, 0.5],
          }}
          transition={{ duration: orb.dur, repeat: Infinity, ease: "easeInOut", delay: i * 1.2 }}
        />
      ))}
    </>
  );
}

// ─── Ocean Calm: Expanding ripple rings ─────────────────────────────────────
function OceanCalmDecor({ isStatic }: { isStatic: boolean }) {
  if (isStatic) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-sky-400/30"
          initial={{ width: 20, height: 20, opacity: 0.8 }}
          animate={{ width: 320, height: 320, opacity: 0 }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            delay: i * 0.875,
            ease: "easeOut",
          }}
        />
      ))}
      <motion.div
        className="absolute w-3 h-3 rounded-full bg-sky-400/50"
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ─── Sunshine: Sun rays + confetti ──────────────────────────────────────────
function SunshineDecor({ isStatic }: { isStatic: boolean }) {
  const RAYS = 12;
  const particles = useConfettiParticles(18, isStatic);

  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl">
        <motion.div
          className="absolute"
          style={{ width: 500, height: 500 }}
          animate={isStatic ? {} : { rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          {Array.from({ length: RAYS }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-orange-900/20"
              style={{
                width: 3,
                height: 250,
                top: "50%",
                left: "calc(50% - 1.5px)",
                transformOrigin: "top center",
                transform: `rotate(${(i / RAYS) * 360}deg)`,
                borderRadius: 2,
              }}
            />
          ))}
        </motion.div>
      </div>
      {!isStatic && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{ width: p.size, height: p.size, backgroundColor: p.color, top: 0, left: 0 }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
              animate={{ x: p.x, y: p.y, opacity: [0, 1, 1, 0], scale: [0, 1.2, 1, 0] }}
              transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
type NameOverrideProps = { name: string; textColor: string; isStatic: boolean };

const NAME_OVERRIDE: Partial<Record<TemplateId, (p: NameOverrideProps) => React.ReactNode>> = {
  1: ({ name, textColor, isStatic }) => <RoseBloomName name={name} textColor={textColor} isStatic={isStatic} />,
  2: ({ name, textColor, isStatic }) => <MidnightSparkName name={name} textColor={textColor} isStatic={isStatic} />,
};

type MessageOverrideProps = { message: string; textColor: string; isStatic: boolean; preview: boolean };

const MESSAGE_OVERRIDE: Partial<Record<TemplateId, (p: MessageOverrideProps) => React.ReactNode>> = {
  4: ({ message, textColor, isStatic, preview }) =>
    preview
      ? <div className="relative z-10 flex-1 flex items-center"><p className={`leading-relaxed ${textColor} text-center w-full`} style={{ fontSize: "0.5rem", fontFamily: "Georgia, serif", fontStyle: "italic", opacity: 0.92 }}>"{message}"</p></div>
      : <TypewriterMessage message={message} textColor={textColor} isStatic={isStatic} />,
};

const DECOR_MAP: Record<TemplateId, (preview: boolean, isStatic: boolean) => React.ReactNode> = {
  1: (_, s) => <RoseBloomDecor isStatic={s} />,
  2: (_, s) => <MidnightSparkDecor isStatic={s} />,
  3: (_, s) => <GoldenHourDecor isStatic={s} />,
  4: (_, s) => <MintFreshDecor isStatic={s} />,
  5: (_, s) => <CherryPopDecor isStatic={s} />,
  6: (_, s) => <LavenderDreamDecor isStatic={s} />,
  7: (_, s) => <OceanCalmDecor isStatic={s} />,
  8: (_, s) => <SunshineDecor isStatic={s} />,
};

const CardTemplate = forwardRef<HTMLDivElement, CardTemplateProps>(
  ({ templateId, recipientName, message, preview = false, static: isStatic = false }, ref) => {
    const meta = TEMPLATE_META[templateId];
    const NameOverride = NAME_OVERRIDE[templateId];
    const MessageOverride = MESSAGE_OVERRIDE[templateId];

    const cardStyle = preview
      ? { width: 160, height: 200, padding: "12px 14px" }
      : { width: 340, height: 420, padding: "36px 32px" };

    const nameFontSize = preview ? "0.9rem" : "1.75rem";
    const messageFontSize = preview ? "0.5rem" : "1rem";

    return (
      <div
        ref={ref}
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${meta.bg} flex flex-col justify-between`}
        style={cardStyle}
      >
        {DECOR_MAP[templateId](preview, isStatic || preview)}

        <div className="relative z-10">
          <p
            className={`font-bold leading-tight ${meta.subColor}`}
            style={{ fontSize: preview ? "0.55rem" : "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: preview ? 4 : 8 }}
          >
            For
          </p>
          {NameOverride && !preview
            ? NameOverride({ name: recipientName, textColor: meta.textColor, isStatic })
            : (
              <p
                className={`font-extrabold leading-tight ${meta.textColor}`}
                style={{ fontSize: nameFontSize, fontFamily: "Georgia, serif" }}
              >
                {recipientName}
              </p>
            )}
        </div>

        {MessageOverride
          ? MessageOverride({ message, textColor: meta.textColor, isStatic, preview })
          : (
            <div className="relative z-10 flex-1 flex items-center">
              <p
                className={`leading-relaxed ${meta.textColor}`}
                style={{ fontSize: messageFontSize, fontFamily: "Georgia, serif", fontStyle: "italic", textAlign: "center", opacity: 0.92 }}
              >
                "{message}"
              </p>
            </div>
          )}

        <div className="relative z-10 text-right">
          <p
            className={meta.watermarkColor}
            style={{ fontSize: preview ? "0.38rem" : "0.65rem", letterSpacing: "0.04em" }}
          >
            💙 HeartSync AI
          </p>
        </div>
      </div>
    );
  },
);

CardTemplate.displayName = "CardTemplate";

export { CardTemplate, TEMPLATE_META };
export type { CardTemplateProps };
