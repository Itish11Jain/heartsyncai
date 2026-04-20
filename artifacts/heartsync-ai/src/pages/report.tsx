import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Lock, Sparkles, MessageCircle, Brain, HandHeart,
  Loader2, ArrowRight, Gift, Copy, Check, Info, Star
} from "lucide-react";

import { useSubmitUtr, useGetPaymentStatus, type PaymentStatusResponse } from "@workspace/api-client-react";
import { type UseQueryOptions } from "@tanstack/react-query";
import { reportStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    recBg: "bg-secondary/20 border-secondary/40",
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
    recBg: "bg-primary/20 border-primary/40",
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
    recBg: "bg-accent/20 border-accent/40",
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
    recBg: "bg-rose-500/20 border-rose-500/40",
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
  data: { title: string; content: string; items?: string[]; recommendedIndex?: number };
  meta: typeof SECTION_META[number];
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
          {data.items.slice(0, 3).map((item, i) => {
            const recIdx = (data.recommendedIndex != null && data.recommendedIndex >= 0 && data.recommendedIndex <= 2)
              ? data.recommendedIndex : 0;
            const isRecommended = i === recIdx;
            return (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, type: "spring", stiffness: 300, damping: 28 }}
                className={`flex gap-3 items-start justify-between rounded-xl border px-4 py-3 transition-colors ${
                  isRecommended ? meta.recBg : meta.itemBg
                }`}
              >
                <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                <span className="text-sm text-white/85 leading-relaxed flex-1">{item}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isRecommended && (
                    <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${meta.activeColor} text-white`}>
                      <Star className="w-2.5 h-2.5" /> Recommended
                    </span>
                  )}
                  <CopyButton text={item} />
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}

function PaywallPanel({
  sessionId,
  utr,
  setUtr,
  utrError,
  setUtrError,
  submitUtr,
  onUnlocked,
}: {
  sessionId: string;
  utr: string;
  setUtr: (v: string) => void;
  utrError: string;
  setUtrError: (v: string) => void;
  submitUtr: ReturnType<typeof useSubmitUtr>;
  onUnlocked: () => void;
}) {
  const isValidUtrFormat = (value: string) => value.trim().length >= 12 && /^[A-Za-z0-9]+$/.test(value.trim());

  const handleUnlock = () => {
    const trimmed = utr.trim();
    if (!isValidUtrFormat(trimmed)) return;
    setUtrError("");
    submitUtr.mutate(
      { data: { utr: trimmed, reportSession: sessionId } },
      { onSuccess: onUnlocked, onError: () => setUtrError("Verification failed. Please try again.") }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center"
    >
      <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
        <Lock className="w-5 h-5 text-primary" />
      </div>
      <h3 className="text-lg font-bold text-white mb-1">3 more sections await</h3>
      <p className="text-sm text-white/45 mb-6 max-w-xs">Pay ₹99 via UPI to unlock Opening Gambit, IQ Questions and Conversation Closers.</p>

      <div className="flex gap-5 items-center mb-6">
        <div className="bg-white rounded-xl p-2 shadow-lg shrink-0">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=upi://pay?pa=8905158970@upi%26pn=HeartSync%20AI%26am=99%26cu=INR%26tn=HeartSync+Report"
            alt="UPI QR Code"
            className="w-24 h-24 rounded-lg"
          />
        </div>
        <div className="text-left">
          <p className="text-[10px] text-white/35 uppercase tracking-wide mb-1">UPI ID</p>
          <p className="font-mono font-bold text-white text-base">8905158970@upi</p>
          <p className="text-xs text-white/35 mt-2">Amount: ₹99</p>
          <div className="flex items-center gap-1 mt-1.5">
            <Info className="w-3 h-3 text-white/25" />
            <p className="text-[11px] text-white/25">Scan QR or copy UPI ID</p>
          </div>
        </div>
      </div>

      <div className="w-full space-y-2.5">
        <Input
          placeholder="Paste UTR / Transaction ID (min 12 chars)"
          value={utr}
          onChange={(e) => { setUtr(e.target.value); setUtrError(""); }}
          className="bg-white/5 border-white/10 h-11 text-sm rounded-xl placeholder:text-white/20 text-center"
        />
        {utrError && <p className="text-xs text-destructive">{utrError}</p>}
        <Button
          onClick={handleUnlock}
          disabled={!isValidUtrFormat(utr) || submitUtr.isPending}
          className="w-full h-11 text-sm font-semibold bg-primary hover:bg-primary/90 text-white rounded-xl"
        >
          {submitUtr.isPending
            ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Verifying...</span>
            : <span className="flex items-center gap-2">Unlock Full Report <ArrowRight className="w-4 h-4" /></span>
          }
        </Button>
      </div>
    </motion.div>
  );
}

export default function Report() {
  const [, setLocation] = useLocation();
  const storeData = reportStore.data;
  const report = storeData?.report ?? null;
  const sessionId = storeData?.sessionId ?? "";
  const isFreeReport = storeData?.isFreeReport ?? false;

  const [activeIdx, setActiveIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [utr, setUtr] = useState("");
  const [utrError, setUtrError] = useState("");

  const submitUtr = useSubmitUtr();

  const paymentStatus = useGetPaymentStatus(sessionId, {
    query: {
      enabled: !!sessionId && !isFreeReport,
      refetchInterval: false,
    } as UseQueryOptions<PaymentStatusResponse>,
  });

  const isApprovedServerSide = paymentStatus.data?.approved === true;
  const isUnlocked = isFreeReport || isApprovedServerSide;

  const navigate = useCallback((idx: number) => {
    setDirection(idx > activeIdx ? 1 : -1);
    setActiveIdx(idx);
  }, [activeIdx]);

  useEffect(() => {
    if (!report || !sessionId) setLocation("/generate");
  }, [report, sessionId, setLocation]);

  if (!report) return null;

  const sectionData = {
    innerGame: report.innerGame,
    openingGambit: report.openingGambit,
    iqQuestions: report.iqQuestions,
    conversationClosers: report.conversationClosers,
  };

  const meta = SECTION_META[activeIdx];
  const isCurrentLocked = !isUnlocked && activeIdx > 0;
  const totalSections = SECTION_META.length;

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[5%] left-[-5%] w-[45%] h-[45%] rounded-full bg-primary/30 blur-[130px]" />
        <div className="absolute bottom-[5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-accent/30 blur-[130px]" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 flex flex-col min-h-screen">
        {/* Header */}
        <div className="py-5 flex items-center justify-between">
          <Button asChild variant="ghost" className="pl-0 text-white/40 hover:text-white hover:bg-transparent text-sm">
            <Link href="/" className="flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Home
            </Link>
          </Button>
          <div className="text-right">
            <p className="text-xs text-white/30">Report for</p>
            <p className="text-sm font-semibold text-white">{report.partnerName}</p>
          </div>
        </div>

        {/* Free badge */}
        {isFreeReport && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 mb-4"
          >
            <Gift className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-white/70">
              <span className="text-white font-semibold">Free report</span> — next one is ₹99
            </p>
          </motion.div>
        )}

        {/* Section tabs */}
        <div className="flex gap-2 mb-6">
          {SECTION_META.map((s, i) => {
            const SIcon = s.icon;
            const locked = !isUnlocked && i > 0;
            const isActive = i === activeIdx;
            return (
              <button
                key={s.key}
                onClick={() => navigate(i)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all
                  ${isActive
                    ? `${s.activeColor} border-transparent shadow-lg ring-2 ${s.ring}`
                    : "bg-white/5 border-white/8 hover:bg-white/10"
                  }`}
              >
                {locked
                  ? <Lock className="w-4 h-4 text-white/25" />
                  : <SIcon className={`w-4 h-4 ${isActive ? "text-white" : s.iconColor} opacity-80`} />
                }
                <span className={`text-[10px] font-semibold leading-none ${isActive ? "text-white" : "text-white/35"}`}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content card */}
        <div className="flex-1 bg-card/40 border border-white/6 backdrop-blur-md rounded-3xl p-6 mb-6 overflow-hidden min-h-0">
          <AnimatePresence mode="wait" initial={false}>
            {isCurrentLocked ? (
              <PaywallPanel
                key="paywall"
                sessionId={sessionId}
                utr={utr}
                setUtr={setUtr}
                utrError={utrError}
                setUtrError={setUtrError}
                submitUtr={submitUtr}
                onUnlocked={() => paymentStatus.refetch()}
              />
            ) : (
              <SectionContent
                key={meta.key}
                data={sectionData[meta.key as keyof typeof sectionData]}
                meta={meta}
                direction={direction}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Nav controls */}
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
            <Button asChild variant="ghost" className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl px-4 text-sm">
              <Link href="/generate">New report <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
