import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Lock, Sparkles, MessageCircle, Eye, HandHeart, CheckCircle2, Loader2 } from "lucide-react";

import { reportStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const containerVars = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVars = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

const UNLOCK_KEY_PREFIX = "heartsync_unlocked_";

function getStoredToken(sessionId: string): string | null {
  return localStorage.getItem(`${UNLOCK_KEY_PREFIX}${sessionId}`);
}

function storeToken(sessionId: string, token: string) {
  localStorage.setItem(`${UNLOCK_KEY_PREFIX}${sessionId}`, token);
}

export default function Report() {
  const [, setLocation] = useLocation();
  const storeData = reportStore.data;
  const report = storeData?.report ?? null;
  const sessionId = storeData?.sessionId ?? "";

  const [isLocked, setIsLocked] = useState(false);
  const [utr, setUtr] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [utrError, setUtrError] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!report) {
      setLocation("/generate");
      return;
    }

    const hasUsedFree = localStorage.getItem("heartsync_used_free");
    if (!hasUsedFree) {
      localStorage.setItem("heartsync_used_free", "true");
      setIsLocked(false);
    } else {
      const existingToken = getStoredToken(sessionId);
      if (existingToken) {
        setIsLocked(false);
        setUnlocked(true);
      } else {
        setIsLocked(true);
      }
    }
  }, [report, sessionId, setLocation]);

  if (!report) return null;

  const isValidUtrFormat = (value: string) => {
    const cleaned = value.trim();
    return cleaned.length >= 12 && /^[A-Za-z0-9]+$/.test(cleaned);
  };

  const handleUnlock = async () => {
    const trimmed = utr.trim();
    if (!isValidUtrFormat(trimmed)) return;

    setUnlocking(true);
    setUtrError("");

    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/payment/submit-utr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utr: trimmed, reportSession: sessionId }),
      });

      const data = await res.json() as { ok?: boolean; token?: string; message?: string };

      if (res.ok && data.ok && data.token) {
        storeToken(sessionId, data.token);
        setIsLocked(false);
        setUnlocked(true);
      } else {
        setUtrError(data.message ?? "Verification failed. Please try again.");
      }
    } catch {
      setUtrError("Network error — please check your connection and try again.");
    } finally {
      setUnlocking(false);
    }
  };

  const sections = [
    {
      id: "openingGambit",
      data: report.openingGambit,
      icon: MessageCircle,
      color: "text-primary",
      bg: "bg-primary/10",
      locked: false
    },
    {
      id: "iqQuestions",
      data: report.iqQuestions,
      icon: Sparkles,
      color: "text-accent",
      bg: "bg-accent/10",
      locked: isLocked
    },
    {
      id: "auraCheck",
      data: report.auraCheck,
      icon: Eye,
      color: "text-secondary",
      bg: "bg-secondary/10",
      locked: isLocked
    },
    {
      id: "conversationClosers",
      data: report.conversationClosers,
      icon: HandHeart,
      color: "text-destructive",
      bg: "bg-destructive/10",
      locked: isLocked
    }
  ];

  return (
    <div className="min-h-screen w-full bg-background text-foreground pb-24">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-[20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <header className="flex items-center justify-between mb-12">
          <Button asChild variant="ghost" className="pl-0 text-white/60 hover:text-white hover:bg-transparent">
            <Link href="/" className="flex items-center gap-2">
              <ChevronLeft className="w-5 h-5" /> Home
            </Link>
          </Button>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-white/80">Intelligence Report Ready</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">Target: {report.partnerName}</h1>
          <p className="text-white/50 text-lg">Your personalized playbook for the date.</p>
        </motion.div>

        <motion.div
          variants={containerVars}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {sections.map((section, idx) => (
            <motion.div key={section.id} variants={itemVars} className="relative">
              <div className={`p-6 md:p-8 rounded-3xl bg-card/40 border border-white/5 backdrop-blur-md transition-all ${section.locked ? "blur-md opacity-40 select-none pointer-events-none" : ""}`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${section.bg} ${section.color}`}>
                    <section.icon className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-white/90">{section.data.title}</h2>
                </div>

                <div className="space-y-6">
                  <p className="text-white/70 text-lg leading-relaxed">{section.data.content}</p>

                  {section.data.items && section.data.items.length > 0 && (
                    <ul className="space-y-3">
                      {section.data.items.map((item, i) => (
                        <li key={i} className="flex gap-3 text-white/80 items-start">
                          <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${section.color}`} />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {section.locked && idx === 1 && (
                <div className="mt-8 flex justify-center">
                  <div className="bg-card/95 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 text-primary">
                      <Lock className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Aage ka report chahiye?</h3>
                    <p className="text-white/60 mb-6">Unlock the full intelligence playbook for just ₹99.</p>

                    <div className="bg-white p-4 rounded-xl inline-block mb-4 shadow-inner">
                      <img
                        src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=8905158970@upi%26pn=HeartSync%20AI%26am=99%26cu=INR%26tn=HeartSync+Report"
                        alt="UPI QR Code"
                        className="w-40 h-40 mx-auto rounded-lg"
                      />
                    </div>
                    <p className="text-xl font-mono font-bold text-white mb-6">8905158970@upi</p>

                    <div className="space-y-3">
                      <Input
                        placeholder="Enter UTR / Transaction ID (min 12 chars)"
                        value={utr}
                        onChange={(e) => { setUtr(e.target.value); setUtrError(""); }}
                        className="bg-white/5 border-white/10 text-center h-12 text-lg rounded-xl"
                      />
                      {utrError && (
                        <p className="text-sm text-destructive">{utrError}</p>
                      )}
                      <Button
                        onClick={handleUnlock}
                        disabled={!isValidUtrFormat(utr) || unlocking}
                        className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 text-white rounded-xl"
                      >
                        {unlocking ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" /> Verifying...
                          </span>
                        ) : "Unlock My Report"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
