import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Sparkles, MessageCircle, Brain, HandHeart,
  ArrowRight, Copy, Check, Zap, Clock, ClipboardList,
} from "lucide-react";

import { reportStore } from "@/lib/store";
import { authStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";

const SECTION_META = [
  {
    key: "innerGame",
    icon: Brain,
    label: "Inner Game",
    num: "01",
    activeColor: "bg-secondary",
    ring: "ring-secondary/40",
    dot: "bg-secondary",
    itemBg: "bg-secondary/10 hover:bg-secondary/20 border-secondary/20",
    iconColor: "text-secondary",
  },
  {
    key: "openingGambit",
    icon: MessageCircle,
    label: "Opening",
    num: "02",
    activeColor: "bg-primary",
    ring: "ring-primary/40",
    dot: "bg-primary",
    itemBg: "bg-primary/10 hover:bg-primary/20 border-primary/20",
    iconColor: "text-primary",
  },
  {
    key: "iqQuestions",
    icon: Sparkles,
    label: "IQ Questions",
    num: "03",
    activeColor: "bg-accent",
    ring: "ring-accent/40",
    dot: "bg-accent",
    itemBg: "bg-accent/10 hover:bg-accent/20 border-accent/20",
    iconColor: "text-accent",
  },
  {
    key: "conversationClosers",
    icon: HandHeart,
    label: "Closers",
    num: "04",
    activeColor: "bg-rose-500",
    ring: "ring-rose-500/40",
    dot: "bg-rose-400",
    itemBg: "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20",
    iconColor: "text-rose-400",
  },
] as const;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={handleCopy}
      className="shrink-0 p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/10 transition-all"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function SectionContent({
  data,
  meta,
  direction,
}: {
  data: { title: string; content: string; items?: string[] };
  meta: (typeof SECTION_META)[number];
  direction: number;
}) {
  const Icon = meta.icon;
  return (
    <motion.div
      key={meta.key}
      initial={{ opacity: 0, x: direction * 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * -40 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl ${meta.activeColor} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{meta.num}</p>
          <h2 className="text-lg font-bold text-white leading-tight">{data.title}</h2>
        </div>
      </div>

      <p className="text-sm text-white/50 leading-relaxed mb-5 pl-1">{data.content}</p>

      {data.items && data.items.length > 0 && (
        <ul className="space-y-2.5">
          {data.items.slice(0, 3).map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, type: "spring", stiffness: 300, damping: 28 }}
              className={`flex gap-3 items-start justify-between rounded-xl border px-4 py-3 transition-colors ${meta.itemBg}`}
            >
              <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
              <span className="text-sm text-white/85 leading-relaxed flex-1">{item}</span>
              <CopyButton text={item} />
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function formatExpiry(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "expired";
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (h > 0) return `expires in ${h}h ${m}m`;
  return `expires in ${m}m`;
}

export default function Report() {
  const [, setLocation] = useLocation();
  const storeData = reportStore.data;
  const report = storeData?.report ?? null;
  const expiresAt = reportStore.expiresAt();

  const [activeIdx, setActiveIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [expiryLabel, setExpiryLabel] = useState(() =>
    expiresAt ? formatExpiry(expiresAt) : null,
  );

  const navigate = useCallback(
    (idx: number) => {
      setDirection(idx > activeIdx ? 1 : -1);
      setActiveIdx(idx);
    },
    [activeIdx],
  );

  useEffect(() => {
    if (!report) {
      setLocation("/generate");
      return;
    }
    if (!expiresAt) return;
    const tick = setInterval(() => {
      const label = formatExpiry(expiresAt);
      setExpiryLabel(label);
      if (label === "expired") {
        reportStore.clear();
        setLocation("/generate");
      }
    }, 60_000);
    return () => clearInterval(tick);
  }, [report, expiresAt, setLocation]);

  if (!report) return null;

  const sectionData = {
    innerGame: report.innerGame,
    openingGambit: report.openingGambit,
    iqQuestions: report.iqQuestions,
    conversationClosers: report.conversationClosers,
  };

  const meta = SECTION_META[activeIdx];
  const totalSections = SECTION_META.length;
  const credits = authStore.credits;

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[5%] left-[-5%] w-[45%] h-[45%] rounded-full bg-primary/30 blur-[130px]" />
        <div className="absolute bottom-[5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-accent/30 blur-[130px]" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 flex flex-col min-h-screen">
        <div className="py-5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              asChild
              variant="ghost"
              className="pl-0 text-white/40 hover:text-white hover:bg-transparent text-sm"
            >
              <Link href="/" className="flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Home
              </Link>
            </Button>
            <Link
              href="/history"
              className="p-2 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
              title="My Guides"
            >
              <ClipboardList className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-[11px] font-semibold text-white">{credits} left</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/30">Guide for</p>
              <p className="text-sm font-semibold text-white">{report.partnerName}</p>
            </div>
          </div>
        </div>

        {expiryLabel && expiryLabel !== "expired" && (
          <div className="flex items-center gap-1.5 mb-4 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07]">
            <Clock className="w-3 h-3 text-white/30 shrink-0" />
            <p className="text-[11px] text-white/35">
              Available for 24 hours &middot; {expiryLabel}
            </p>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          {SECTION_META.map((s, i) => {
            const SIcon = s.icon;
            const isActive = i === activeIdx;
            return (
              <button
                key={s.key}
                onClick={() => navigate(i)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all
                  ${
                    isActive
                      ? `${s.activeColor} border-transparent shadow-lg ring-2 ${s.ring}`
                      : "bg-white/5 border-white/8 hover:bg-white/10"
                  }`}
              >
                <SIcon className={`w-4 h-4 ${isActive ? "text-white" : s.iconColor} opacity-80`} />
                <span
                  className={`text-[10px] font-semibold leading-none ${isActive ? "text-white" : "text-white/35"}`}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 bg-card/40 border border-white/6 backdrop-blur-md rounded-3xl p-6 mb-6 overflow-hidden min-h-0">
          <AnimatePresence mode="wait" initial={false}>
            <SectionContent
              key={meta.key}
              data={sectionData[meta.key as keyof typeof sectionData]}
              meta={meta}
              direction={direction}
            />
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between pb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(Math.max(0, activeIdx - 1))}
            disabled={activeIdx === 0}
            className="text-white/40 hover:text-white disabled:opacity-20 hover:bg-white/5 rounded-xl px-4"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </Button>

          <div className="flex gap-2 items-center">
            {SECTION_META.map((s, i) => (
              <button
                key={s.key}
                onClick={() => navigate(i)}
                className={`rounded-full transition-all ${
                  i === activeIdx ? `w-5 h-2 ${s.dot}` : "w-2 h-2 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>

          {activeIdx < totalSections - 1 ? (
            <Button
              variant="ghost"
              onClick={() => navigate(activeIdx + 1)}
              className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl px-4"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              asChild
              variant="ghost"
              className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl px-4 text-sm"
            >
              <Link href="/generate">
                New guide <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
