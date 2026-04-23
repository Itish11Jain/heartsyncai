import { forwardRef } from "react";
import { motion } from "framer-motion";

export type TemplateId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface CardTemplateProps {
  templateId: TemplateId;
  recipientName: string;
  message: string;
  preview?: boolean;
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

function RoseBloomDecor({ preview }: { preview: boolean }) {
  const size = preview ? 0.5 : 1;
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-rose-400/20"
          style={{
            width: `${(30 + i * 15) * size}px`,
            height: `${(30 + i * 15) * size}px`,
            top: `${Math.sin(i * 1.2) * 30 + 15}%`,
            left: `${Math.cos(i * 1.0) * 35 + 10}%`,
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

function MidnightSparkDecor({ preview }: { preview: boolean }) {
  const count = preview ? 8 : 18;
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-purple-300"
          style={{
            width: "3px",
            height: "3px",
            top: `${(i * 13) % 90 + 5}%`,
            left: `${(i * 17 + 5) % 90 + 5}%`,
          }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
          transition={{ duration: 2 + (i % 4) * 0.5, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

function GoldenHourDecor() {
  return (
    <motion.div
      className="absolute inset-0 rounded-3xl"
      style={{ background: "radial-gradient(circle at 70% 30%, rgba(251,191,36,0.3) 0%, transparent 60%)" }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function MintFreshDecor({ preview }: { preview: boolean }) {
  const lines = preview ? 3 : 6;
  return (
    <>
      {[...Array(lines)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute border border-teal-400/20 rounded-full"
          style={{
            width: `${(60 + i * 30) * (preview ? 0.6 : 1)}%`,
            height: `${(60 + i * 30) * (preview ? 0.6 : 1)}%`,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
          animate={{ scale: [0.9, 1.05, 0.9], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3 + i * 0.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
        />
      ))}
    </>
  );
}

function CherryPopDecor({ preview }: { preview: boolean }) {
  const count = preview ? 5 : 10;
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-white/20 select-none"
          style={{
            fontSize: preview ? "1rem" : "1.5rem",
            top: `${(i * 19) % 80 + 5}%`,
            left: `${(i * 23 + 7) % 85 + 5}%`,
          }}
          animate={{ y: [0, -8, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 1.5 + (i % 3) * 0.5, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
        >
          ♥
        </motion.div>
      ))}
    </>
  );
}

function LavenderDreamDecor({ preview }: { preview: boolean }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-3xl"
          style={{
            background: `radial-gradient(ellipse at ${30 + i * 20}% ${20 + i * 25}%, rgba(167,139,250,0.2) 0%, transparent 50%)`,
          }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 1.2 }}
        />
      ))}
      {!preview && (
        <div className="absolute bottom-12 left-0 right-0 overflow-hidden h-8 opacity-30">
          <motion.div
            className="h-full"
            style={{
              background: "repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(216,180,254,0.4) 20px, rgba(216,180,254,0.4) 22px)",
            }}
            animate={{ x: [0, -44] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}
    </>
  );
}

function OceanCalmDecor({ preview }: { preview: boolean }) {
  const rings = preview ? 2 : 4;
  return (
    <>
      {[...Array(rings)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-sky-400/20"
          style={{
            width: `${(40 + i * 25) * (preview ? 0.7 : 1)}%`,
            height: `${(40 + i * 25) * (preview ? 0.7 : 1)}%`,
            top: "60%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.4, 0.15] }}
          transition={{ duration: 3 + i * 0.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
        />
      ))}
    </>
  );
}

function SunshineDecor({ preview }: { preview: boolean }) {
  const count = preview ? 6 : 14;
  const colors = ["bg-orange-400", "bg-yellow-300", "bg-rose-400", "bg-amber-300"];
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${colors[i % colors.length]} opacity-60`}
          style={{
            width: `${6 + (i % 5) * 4}px`,
            height: `${6 + (i % 5) * 4}px`,
            top: `${(i * 17) % 80 + 5}%`,
            left: `${(i * 13 + 9) % 85 + 5}%`,
          }}
          animate={{ y: [0, -12, 0], opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 1.2 + (i % 4) * 0.4, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

const DECOR_MAP: Record<TemplateId, (preview: boolean) => React.ReactNode> = {
  1: (p) => <RoseBloomDecor preview={p} />,
  2: (p) => <MidnightSparkDecor preview={p} />,
  3: (_) => <GoldenHourDecor />,
  4: (p) => <MintFreshDecor preview={p} />,
  5: (p) => <CherryPopDecor preview={p} />,
  6: (p) => <LavenderDreamDecor preview={p} />,
  7: (p) => <OceanCalmDecor preview={p} />,
  8: (p) => <SunshineDecor preview={p} />,
};

const CardTemplate = forwardRef<HTMLDivElement, CardTemplateProps>(
  ({ templateId, recipientName, message, preview = false }, ref) => {
    const meta = TEMPLATE_META[templateId];
    const Decor = DECOR_MAP[templateId];

    return (
      <div
        ref={ref}
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${meta.bg} flex flex-col justify-between`}
        style={preview ? { width: 160, height: 200, padding: "12px 14px" } : { width: 340, height: 420, padding: "36px 32px" }}
      >
        {Decor(preview)}

        <div className="relative z-10">
          <p
            className={`font-bold leading-tight ${meta.subColor}`}
            style={{ fontSize: preview ? "0.55rem" : "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: preview ? 4 : 8 }}
          >
            For
          </p>
          <p
            className={`font-extrabold leading-tight ${meta.textColor}`}
            style={{ fontSize: preview ? "0.9rem" : "1.75rem", fontFamily: "Georgia, serif" }}
          >
            {recipientName}
          </p>
        </div>

        <div className="relative z-10 flex-1 flex items-center">
          <p
            className={`leading-relaxed ${meta.textColor}`}
            style={{
              fontSize: preview ? "0.5rem" : "1rem",
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              textAlign: "center",
              opacity: 0.92,
            }}
          >
            "{message}"
          </p>
        </div>

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
