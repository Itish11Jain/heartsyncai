import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Lock, Sparkles, MessageCircle, Eye, HandHeart,
  Loader2, ArrowRight, Gift, Info
} from "lucide-react";

import { useSubmitUtr, useGetPaymentStatus, type PaymentStatusResponse } from "@workspace/api-client-react";
import { type UseQueryOptions } from "@tanstack/react-query";
import { reportStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const containerVars = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } }
};

const itemVars = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 26 } }
};

const SECTION_META = [
  { key: "openingGambit",      icon: MessageCircle, num: "01", accent: "from-primary/20 to-primary/5",   border: "border-primary/30",   badge: "bg-primary/15 text-primary",   dot: "bg-primary"    },
  { key: "iqQuestions",        icon: Sparkles,      num: "02", accent: "from-accent/20 to-accent/5",     border: "border-accent/30",    badge: "bg-accent/15 text-accent",     dot: "bg-accent"     },
  { key: "auraCheck",          icon: Eye,           num: "03", accent: "from-secondary/20 to-secondary/5", border: "border-secondary/30", badge: "bg-secondary/15 text-secondary", dot: "bg-secondary" },
  { key: "conversationClosers",icon: HandHeart,     num: "04", accent: "from-rose-500/20 to-rose-500/5", border: "border-rose-500/30",  badge: "bg-rose-500/15 text-rose-400",  dot: "bg-rose-400"   },
] as const;

export default function Report() {
  const [, setLocation] = useLocation();
  const storeData = reportStore.data;
  const report = storeData?.report ?? null;
  const sessionId = storeData?.sessionId ?? "";
  const isFreeReport = storeData?.isFreeReport ?? false;

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
  const isLocked = !isFreeReport && !isApprovedServerSide;

  useEffect(() => {
    if (!report || !sessionId) {
      setLocation("/generate");
    }
  }, [report, sessionId, setLocation]);

  if (!report) return null;

  const isValidUtrFormat = (value: string) => {
    const cleaned = value.trim();
    return cleaned.length >= 12 && /^[A-Za-z0-9]+$/.test(cleaned);
  };

  const handleUnlock = () => {
    const trimmed = utr.trim();
    if (!isValidUtrFormat(trimmed)) return;
    setUtrError("");
    submitUtr.mutate(
      { data: { utr: trimmed, reportSession: sessionId } },
      {
        onSuccess: () => { paymentStatus.refetch(); },
        onError: () => { setUtrError("Verification failed. Please try again."); },
      }
    );
  };

  const sectionData: Record<string, typeof report.openingGambit> = {
    openingGambit: report.openingGambit,
    iqQuestions: report.iqQuestions,
    auraCheck: report.auraCheck,
    conversationClosers: report.conversationClosers,
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground pb-24">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-primary/30 blur-[130px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-accent/30 blur-[130px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-5 py-10">
        <header className="mb-8">
          <Button asChild variant="ghost" className="pl-0 text-white/50 hover:text-white hover:bg-transparent text-sm">
            <Link href="/" className="flex items-center gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Home
            </Link>
          </Button>
        </header>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Intelligence Report</p>
          <h1 className="text-3xl font-bold text-white">For your date with {report.partnerName}</h1>
        </motion.div>

        {/* Free report notice */}
        <AnimatePresence>
          {isFreeReport && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3 items-start bg-gradient-to-r from-primary/15 to-accent/10 border border-primary/20 rounded-2xl p-4 mb-8"
            >
              <Gift className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">This is your free report</p>
                <p className="text-xs text-white/55 mt-0.5">
                  Enjoy the full playbook on us. From your next report, each one is just ₹99.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section progress indicators */}
        <div className="flex gap-2 mb-8">
          {SECTION_META.map((meta, i) => (
            <div key={meta.key} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full h-1 rounded-full ${isLocked && i > 0 ? "bg-white/10" : meta.dot} opacity-80`} />
              <span className="text-[10px] text-white/30">{meta.num}</span>
            </div>
          ))}
        </div>

        {/* Sections */}
        <motion.div variants={containerVars} initial="hidden" animate="show" className="space-y-4">
          {SECTION_META.map((meta, idx) => {
            const data = sectionData[meta.key];
            const locked = isLocked && idx > 0;
            const Icon = meta.icon;

            return (
              <motion.div key={meta.key} variants={itemVars}>
                <div className={`rounded-2xl border bg-gradient-to-br ${meta.accent} ${meta.border} backdrop-blur-md transition-all ${locked ? "blur-sm opacity-30 select-none pointer-events-none" : ""}`}>
                  {/* Section header */}
                  <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>{meta.num}</span>
                    <Icon className={`w-4 h-4 ${meta.badge.split(" ")[1]}`} />
                    <h2 className="text-sm font-semibold text-white/90 tracking-wide uppercase">{data.title}</h2>
                  </div>

                  {/* Insight line */}
                  <p className="px-5 pb-4 text-sm text-white/60 leading-relaxed border-b border-white/5">{data.content}</p>

                  {/* Items */}
                  {data.items && data.items.length > 0 && (
                    <ul className="px-5 py-4 space-y-2.5">
                      {data.items.map((item, i) => (
                        <li key={i} className="flex gap-3 items-start">
                          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                          <span className="text-sm text-white/80 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Paywall gate — shown after section 1 when locked */}
                {locked && idx === 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-2xl border border-white/10 bg-card/80 backdrop-blur-xl p-6"
                  >
                    <div className="flex items-start gap-3 mb-5">
                      <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">3 more sections inside</p>
                        <p className="text-xs text-white/50 mt-0.5">Pay ₹99 via UPI to unlock IQ Questions, Aura Check, and Conversation Closers.</p>
                      </div>
                    </div>

                    {/* UPI */}
                    <div className="flex gap-4 items-center mb-5">
                      <div className="bg-white rounded-xl p-2 shrink-0">
                        <img
                          src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=upi://pay?pa=8905158970@upi%26pn=HeartSync%20AI%26am=99%26cu=INR%26tn=HeartSync+Report"
                          alt="UPI QR Code"
                          className="w-20 h-20 rounded-lg"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-white/40 mb-1">UPI ID</p>
                        <p className="font-mono font-bold text-white text-sm">8905158970@upi</p>
                        <p className="text-xs text-white/40 mt-2">Amount: ₹99</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Info className="w-3 h-3 text-white/30" />
                          <p className="text-[11px] text-white/30">Scan or copy UPI ID to pay</p>
                        </div>
                      </div>
                    </div>

                    {/* UTR input */}
                    <div className="space-y-2">
                      <Input
                        placeholder="Paste your UTR / Transaction ID here"
                        value={utr}
                        onChange={(e) => { setUtr(e.target.value); setUtrError(""); }}
                        className="bg-white/5 border-white/10 h-10 text-sm rounded-xl placeholder:text-white/25"
                      />
                      {utrError && <p className="text-xs text-destructive">{utrError}</p>}
                      <Button
                        onClick={handleUnlock}
                        disabled={!isValidUtrFormat(utr) || submitUtr.isPending}
                        className="w-full h-10 text-sm font-semibold bg-primary hover:bg-primary/90 text-white rounded-xl"
                      >
                        {submitUtr.isPending ? (
                          <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</span>
                        ) : (
                          <span className="flex items-center gap-2">Unlock Full Report <ArrowRight className="w-4 h-4" /></span>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Generate another */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 text-center"
        >
          <Button asChild variant="ghost" className="text-white/40 hover:text-white text-sm">
            <Link href="/generate" className="flex items-center gap-1.5">
              Generate another report <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
