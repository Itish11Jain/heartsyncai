import { useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toPng } from "html-to-image";
import { ChevronLeft, Loader2, Download, Share2, Plus, Heart, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authStore } from "@/lib/auth-store";
import AuthGate from "@/components/AuthGate";
import { CardTemplate, TEMPLATE_META, type TemplateId } from "@/components/moments/CardTemplate";

type Purpose = "thank_you" | "sorry" | "i_love_you" | "feel_good";
type Relation = "date" | "friend" | "partner" | "spouse";

const PURPOSE_OPTIONS: { id: Purpose; label: string; emoji: string }[] = [
  { id: "thank_you", label: "Thank You", emoji: "🙏" },
  { id: "sorry", label: "Sorry", emoji: "🥺" },
  { id: "i_love_you", label: "I Love You", emoji: "💕" },
  { id: "feel_good", label: "Feel Good", emoji: "✨" },
];

const RELATION_OPTIONS: { id: Relation; label: string; sub: string }[] = [
  { id: "date", label: "Date", sub: "First date or crush" },
  { id: "friend", label: "Friend", sub: "Close friend" },
  { id: "partner", label: "Partner", sub: "Girlfriend / Boyfriend" },
  { id: "spouse", label: "Spouse", sub: "Wife / Husband" },
];

function pickTemplateSubset(): TemplateId[] {
  const all: TemplateId[] = [1, 2, 3, 4, 5, 6, 7, 8];
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3) as TemplateId[];
}

function stepVariants(dir: number) {
  return {
    initial: { opacity: 0, x: dir * 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: dir * -40 },
  };
}

interface GenerateResponse {
  message: string;
  momentsUsed: number;
  momentsLimit: number;
}

export default function Moments() {
  const [isLoggedIn, setIsLoggedIn] = useState(authStore.isLoggedIn);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [dir, setDir] = useState(1);
  const [recipientName, setRecipientName] = useState("");
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [relation, setRelation] = useState<Relation | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [templateOptions, setTemplateOptions] = useState<TemplateId[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [momentsUsed, setMomentsUsed] = useState(0);
  const [momentsLimit, setMomentsLimit] = useState(3);

  const cardRef = useRef<HTMLDivElement>(null);

  function goTo(next: 1 | 2 | 3 | 4, direction: number) {
    setDir(direction);
    setStep(next);
  }

  async function generate() {
    if (!recipientName.trim() || !purpose || !relation) return;
    setIsLoading(true);
    setApiError(null);
    const token = authStore.sessionToken;
    const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    try {
      const res = await fetch(`${base}/api/moment/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ recipientName: recipientName.trim(), purpose, relation }),
      });
      const data = await res.json() as GenerateResponse & { error?: string; momentsUsed?: number; momentsLimit?: number };
      if (!res.ok) {
        if (data.error === "MOMENT_LIMIT_REACHED") {
          setMomentsUsed(data.momentsUsed ?? 3);
          setMomentsLimit(data.momentsLimit ?? 3);
          setIsLimitReached(true);
          goTo(4, 1);
          return;
        }
        setApiError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setGeneratedMessage(data.message);
      setMomentsUsed(data.momentsUsed);
      setMomentsLimit(data.momentsLimit);
      const subset = pickTemplateSubset();
      setTemplateOptions(subset);
      setSelectedTemplate(subset[0]);
      goTo(4, 1);
    } catch {
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `heartsync-moment-${recipientName.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      /* silent */
    } finally {
      setIsDownloading(false);
    }
  }, [recipientName]);

  function handleShareWhatsApp() {
    const purposeLabel = PURPOSE_OPTIONS.find((p) => p.id === purpose)?.label ?? "";
    const text = `I made a "${purposeLabel}" card for ${recipientName} using HeartSync AI 💙\n\n"${generatedMessage}"\n\n📲 Download the card and try it at https://heartsyncai.replit.app`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function handleMakeAnother() {
    if (momentsUsed >= momentsLimit) {
      setIsLimitReached(true);
      return;
    }
    setRecipientName("");
    setPurpose(null);
    setRelation(null);
    setGeneratedMessage("");
    setApiError(null);
    setIsLimitReached(false);
    setTemplateOptions([]);
    setSelectedTemplate(null);
    goTo(1, -1);
  }

  if (!isLoggedIn) {
    return <AuthGate onSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-50">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 py-10 flex flex-col min-h-screen">
        <div className="flex items-center justify-between mb-8">
          <Button asChild variant="ghost" className="pl-0 text-white/50 hover:text-white hover:bg-transparent">
            <Link href="/" className="flex items-center gap-2">
              <ChevronLeft className="w-5 h-5" /> Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-bold text-white">HeartSync Moments</span>
          </div>
        </div>

        {step < 4 && (
          <div className="flex items-center gap-2 mb-8">
            {([1, 2, 3] as const).map((s) => (
              <div key={s} className="flex-1 flex flex-col gap-1">
                <div className={`h-1 rounded-full transition-all duration-300 ${step >= s ? "bg-primary" : "bg-white/10"}`} />
                <span className={`text-[10px] font-medium text-center transition-colors ${step === s ? "text-white/60" : "text-white/20"}`}>
                  {s === 1 ? "Who" : s === 2 ? "Purpose" : "Relation"}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1">
          <AnimatePresence mode="wait" initial={false}>
            {step === 1 && (
              <motion.div key="step1" variants={stepVariants(dir)} initial="initial" animate="animate" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                <h1 className="text-3xl font-bold text-white mb-2">Who is this for?</h1>
                <p className="text-white/50 text-sm mb-8">Enter the name of the person you're sending a moment to.</p>
                <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl">
                  <Input
                    placeholder="Their name…"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && recipientName.trim()) goTo(2, 1); }}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 h-14 text-lg rounded-xl mb-6"
                    autoFocus
                  />
                  <Button
                    onClick={() => goTo(2, 1)}
                    disabled={!recipientName.trim()}
                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold"
                  >
                    Next
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" variants={stepVariants(dir)} initial="initial" animate="animate" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                <h1 className="text-3xl font-bold text-white mb-2">What's the message for?</h1>
                <p className="text-white/50 text-sm mb-8">Pick the purpose of this card for <span className="text-white/80">{recipientName}</span>.</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {PURPOSE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setPurpose(opt.id)}
                      className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border transition-all ${purpose === opt.id ? "bg-primary/20 border-primary shadow-[0_0_20px_-5px_rgba(236,72,153,0.4)]" : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07]"}`}
                    >
                      <span className="text-3xl">{opt.emoji}</span>
                      <span className={`text-sm font-semibold ${purpose === opt.id ? "text-white" : "text-white/60"}`}>{opt.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => goTo(1, -1)} className="flex-1 h-12 rounded-xl text-white/50 border border-white/10 hover:bg-white/5 hover:text-white">
                    Back
                  </Button>
                  <Button onClick={() => goTo(3, 1)} disabled={!purpose} className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold">
                    Next
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" variants={stepVariants(dir)} initial="initial" animate="animate" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                <h1 className="text-3xl font-bold text-white mb-2">Your relationship?</h1>
                <p className="text-white/50 text-sm mb-8">This helps us set the right tone for the message.</p>
                <div className="space-y-3 mb-6">
                  {RELATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setRelation(opt.id)}
                      className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all ${relation === opt.id ? "bg-primary/20 border-primary" : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07]"}`}
                    >
                      <div className="text-left">
                        <p className={`font-semibold ${relation === opt.id ? "text-white" : "text-white/80"}`}>{opt.label}</p>
                        <p className="text-white/40 text-xs mt-0.5">{opt.sub}</p>
                      </div>
                      {relation === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </button>
                  ))}
                </div>

                {apiError && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-sm text-red-300">{apiError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => goTo(2, -1)} className="flex-1 h-12 rounded-xl text-white/50 border border-white/10 hover:bg-white/5 hover:text-white">
                    Back
                  </Button>
                  <Button
                    onClick={generate}
                    disabled={!relation || isLoading}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating…</span>
                    ) : (
                      <span className="flex items-center gap-2"><Heart className="w-4 h-4 fill-white" /> Create Moment</span>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" variants={stepVariants(dir)} initial="initial" animate="animate" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                {isLimitReached ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-5">
                      <Heart className="w-8 h-8 text-white/30" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">You're all out for this month</h2>
                    <p className="text-white/50 text-sm mb-2 max-w-xs mx-auto leading-relaxed">
                      You've used all {momentsLimit} free Moments for this month. Come back next month for more!
                    </p>
                    <p className="text-white/30 text-xs mb-8">
                      {momentsUsed} / {momentsLimit} moments used
                    </p>
                    <Button asChild className="h-11 px-8 rounded-xl bg-primary/80 hover:bg-primary text-white font-semibold">
                      <Link href="/generate">Generate a Date Guide instead</Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-white mb-1">Your Moment is ready 💙</h2>
                    <p className="text-white/40 text-sm mb-5">
                      {momentsUsed} / {momentsLimit} moments used this month
                    </p>

                    {templateOptions.length > 0 && (
                      <div className="mb-6">
                        <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Choose a style</p>
                        <div className="flex gap-3 overflow-x-auto pb-1">
                          {templateOptions.map((tid) => (
                            <button
                              key={tid}
                              onClick={() => setSelectedTemplate(tid)}
                              className={`shrink-0 rounded-2xl transition-all overflow-hidden ${selectedTemplate === tid ? "ring-2 ring-primary shadow-[0_0_16px_-4px_rgba(236,72,153,0.5)]" : "opacity-60 hover:opacity-80"}`}
                            >
                              <CardTemplate
                                templateId={tid}
                                recipientName={recipientName}
                                message={generatedMessage}
                                preview
                              />
                              <p className="text-[10px] text-white/40 text-center py-1">{TEMPLATE_META[tid].name}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedTemplate && (
                      <div className="flex justify-center mb-6">
                        <motion.div
                          key={selectedTemplate}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        >
                          <CardTemplate
                            ref={cardRef}
                            templateId={selectedTemplate}
                            recipientName={recipientName}
                            message={generatedMessage}
                          />
                        </motion.div>
                      </div>
                    )}

                    <div className="flex gap-3 mb-4">
                      <Button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex-1 h-12 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 font-semibold"
                      >
                        {isDownloading ? (
                          <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving…</span>
                        ) : (
                          <span className="flex items-center gap-2"><Download className="w-4 h-4" /> Download</span>
                        )}
                      </Button>
                      <Button
                        onClick={handleShareWhatsApp}
                        className="flex-1 h-12 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold"
                      >
                        <span className="flex items-center gap-2"><Share2 className="w-4 h-4" /> WhatsApp</span>
                      </Button>
                    </div>

                    <button
                      onClick={handleMakeAnother}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white/40 hover:text-white/70 text-sm transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Make another moment
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
