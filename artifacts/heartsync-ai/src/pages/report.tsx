import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Lock, Sparkles, MessageCircle, Eye, HandHeart, CheckCircle2 } from "lucide-react";

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

export default function Report() {
  const [, setLocation] = useLocation();
  const [report, setReport] = useState(reportStore.data);
  const [isLocked, setIsLocked] = useState(false);
  const [utr, setUtr] = useState("");
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
      setIsLocked(true);
    }

    // Check if they already paid before
    const hasPaid = Object.keys(localStorage).some(k => k.startsWith("heartsync_utr_"));
    if (hasPaid) {
      setIsLocked(false);
      setUnlocked(true);
    }
  }, [report, setLocation]);

  if (!report) return null;

  const handleUnlock = () => {
    if (utr.trim().length > 0) {
      localStorage.setItem(`heartsync_utr_${Date.now()}`, utr);
      setIsLocked(false);
      setUnlocked(true);
    }
  };

  const sections = [
    {
      id: "openingGambit",
      data: report.openingGambit,
      icon: MessageCircle,
      color: "text-primary",
      bg: "bg-primary/10",
      locked: false // always free
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
      {/* Background */}
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
              {section.locked && idx === 1 && (
                <div className="absolute inset-x-0 -top-6 -bottom-6 z-20 flex flex-col items-center justify-center p-6 mt-8">
                  <div className="bg-card/95 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 text-primary">
                      <Lock className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Aage ka report chahiye?</h3>
                    <p className="text-white/60 mb-6">Unlock the full intelligence playbook for just ₹99.</p>
                    
                    <div className="bg-white p-4 rounded-xl inline-block mb-6 shadow-inner">
                      <img 
                        src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=8905158970@upi%26pn=HeartSync%20AI%26am=99%26cu=INR%26tn=HeartSync+Report" 
                        alt="UPI QR Code" 
                        className="w-40 h-40 mx-auto rounded-lg"
                      />
                    </div>
                    <p className="text-xl font-mono font-bold text-white mb-6">8905158970@upi</p>

                    <div className="space-y-4">
                      <Input 
                        placeholder="Enter UTR / Transaction ID" 
                        value={utr}
                        onChange={(e) => setUtr(e.target.value)}
                        className="bg-white/5 border-white/10 text-center h-12 text-lg rounded-xl"
                      />
                      <Button 
                        onClick={handleUnlock}
                        disabled={utr.trim().length === 0}
                        className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 text-white rounded-xl"
                      >
                        Unlock My Report
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className={`p-6 md:p-8 rounded-3xl bg-card/40 border border-white/5 backdrop-blur-md transition-all ${section.locked ? 'blur-md opacity-40 select-none pointer-events-none' : ''}`}>
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
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
