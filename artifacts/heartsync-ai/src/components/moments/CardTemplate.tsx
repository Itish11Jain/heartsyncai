import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Lottie from "lottie-react";

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
  { name: string; bg: string; textColor: string; subColor: string; watermarkColor: string; previewGradient: string }
> = {
  1: { name: "Rose Bloom",      bg: "from-rose-900 via-pink-800 to-rose-950",      textColor: "text-rose-100",   subColor: "text-rose-300/80",   watermarkColor: "text-rose-400/50",   previewGradient: "radial-gradient(ellipse at 60% 30%, rgba(251,113,133,0.55) 0%, rgba(159,18,57,0.4) 60%, transparent 100%)" },
  2: { name: "Midnight Spark",  bg: "from-indigo-950 via-purple-900 to-slate-950", textColor: "text-indigo-100", subColor: "text-purple-300/80", watermarkColor: "text-purple-400/50", previewGradient: "radial-gradient(ellipse at 50% 40%, rgba(139,92,246,0.5) 0%, rgba(30,27,75,0.5) 60%, transparent 100%)" },
  3: { name: "Golden Hour",     bg: "from-amber-800 via-orange-700 to-yellow-900", textColor: "text-amber-50",   subColor: "text-yellow-200/80", watermarkColor: "text-amber-300/50",  previewGradient: "radial-gradient(ellipse at 70% 25%, rgba(253,224,71,0.6) 0%, rgba(180,83,9,0.4) 60%, transparent 100%)" },
  4: { name: "Mint Fresh",      bg: "from-teal-900 via-emerald-800 to-cyan-950",   textColor: "text-teal-50",    subColor: "text-emerald-300/80",watermarkColor: "text-teal-300/50",   previewGradient: "radial-gradient(ellipse at 50% 50%, rgba(45,212,191,0.45) 0%, rgba(6,78,59,0.4) 60%, transparent 100%)" },
  5: { name: "Cherry Pop",      bg: "from-red-700 via-rose-600 to-red-800",        textColor: "text-white",      subColor: "text-rose-200/80",   watermarkColor: "text-rose-300/50",   previewGradient: "radial-gradient(ellipse at 50% 50%, rgba(248,113,113,0.6) 0%, rgba(127,29,29,0.4) 60%, transparent 100%)" },
  6: { name: "Lavender Dream",  bg: "from-violet-900 via-purple-800 to-fuchsia-950",textColor:"text-violet-100", subColor: "text-purple-200/80", watermarkColor: "text-violet-300/50", previewGradient: "radial-gradient(ellipse at 40% 35%, rgba(167,139,250,0.5) 0%, rgba(76,5,149,0.4) 60%, transparent 100%)" },
  7: { name: "Ocean Calm",      bg: "from-blue-950 via-sky-900 to-blue-950",       textColor: "text-sky-100",    subColor: "text-blue-300/80",   watermarkColor: "text-sky-400/50",    previewGradient: "radial-gradient(ellipse at 50% 60%, rgba(56,189,248,0.45) 0%, rgba(7,89,133,0.4) 60%, transparent 100%)" },
  8: { name: "Sunshine",        bg: "from-yellow-400 via-amber-400 to-orange-400", textColor: "text-orange-900", subColor: "text-orange-800/80", watermarkColor: "text-orange-700/50", previewGradient: "radial-gradient(ellipse at 55% 35%, rgba(252,211,77,0.7) 0%, rgba(234,88,12,0.3) 60%, transparent 100%)" },
};

// ─── Lottie JSON cache ───────────────────────────────────────────────────────
const lottieCache = new Map<number, object>();

function useLottieData(templateId: number): object | null {
  const [data, setData] = useState<object | null>(() =>
    templateId > 0 ? (lottieCache.get(templateId) ?? null) : null
  );
  useEffect(() => {
    if (templateId <= 0) return;
    if (lottieCache.has(templateId)) {
      setData(lottieCache.get(templateId)!);
      return;
    }
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    fetch(`${base}/lottie/t${templateId}.json`)
      .then((r) => r.json())
      .then((json: object) => {
        lottieCache.set(templateId, json);
        setData(json);
      })
      .catch(() => {});
  }, [templateId]);
  return data;
}

// ─── Lottie decoration layer ─────────────────────────────────────────────────
function LottieDecor({ templateId, preview, isStatic, gradient }: {
  templateId: number;
  preview: boolean;
  isStatic: boolean;
  gradient: string;
}) {
  const data = useLottieData(isStatic || preview ? -1 : templateId);

  if (isStatic || preview) {
    return (
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{ background: gradient }}
      />
    );
  }

  if (!data) {
    return (
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{ background: gradient }}
      />
    );
  }

  return (
    <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <Lottie
        animationData={data}
        loop
        autoplay
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.72,
          objectFit: "cover",
          objectPosition: "center 20%",
          imageOrientation: "from-image",
        }}
      />
    </div>
  );
}

// ─── Rose Bloom: Breathing name glow ────────────────────────────────────────
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
        <LottieDecor
          templateId={templateId}
          preview={preview}
          isStatic={isStatic}
          gradient={meta.previewGradient}
        />

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
