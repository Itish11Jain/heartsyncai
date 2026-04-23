import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toPng } from "html-to-image";
import {
  ChevronLeft,
  Loader2,
  Download,
  Share2,
  Plus,
  Heart,
  AlertCircle,
  Sparkles,
  CreditCard,
} from "lucide-react";
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

const GUEST_KEY = "hs_guest_moments";
const GUEST_LIMIT = 2;

function getGuestCount(): number {
  try {
    return parseInt(localStorage.getItem(GUEST_KEY) ?? "0", 10);
  } catch {
    return 0;
  }
}

function incGuestCount(): void {
  try {
    localStorage.setItem(GUEST_KEY, String(getGuestCount() + 1));
  } catch {
    /* ignore */
  }
}

function isValidUtr(value: string): boolean {
  const v = value.trim();
  return /^\d{12}$/.test(v) || /^[A-Za-z]{4}[A-Za-z0-9]{12,18}$/.test(v);
}

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

export default function Moments() {
  const [isLoggedIn, setIsLoggedIn] = useState(authStore.isLoggedIn);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showNewUserBanner, setShowNewUserBanner] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [showPaymentWall, setShowPaymentWall] = useState(false);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [dir, setDir] = useState(1);
  const [recipientName, setRecipientName] = useState("");
  const [likes, setLikes] = useState("");
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [relation, setRelation] = useState<Relation | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isOutOfCredits, setIsOutOfCredits] = useState(false);
  const [templateOptions, setTemplateOptions] = useState<TemplateId[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const [momentsCredits, setMomentsCredits] = useState<number | null>(null);
  const [guestCount, setGuestCount] = useState(getGuestCount);

  const [paymentUtr, setPaymentUtr] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const staticCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isNewUser && isLoggedIn) {
      setShowNewUserBanner(true);
      const t = setTimeout(() => setShowNewUserBanner(false), 6000);
      return () => { clearTimeout(t); };
    }
    return undefined;
  }, [isNewUser, isLoggedIn]);

  function goTo(next: 1 | 2 | 3 | 4, direction: number) {
    setDir(direction);
    setStep(next);
  }

  function handleAuthSuccess(newUser: boolean) {
    setIsLoggedIn(true);
    setIsNewUser(newUser);
    setShowAuthGate(false);
    if (newUser) {
      setMomentsCredits(2);
    }
  }

  async function generate() {
    if (!recipientName.trim() || !purpose || !relation) return;

    if (!isLoggedIn && guestCount >= GUEST_LIMIT) {
      setShowAuthGate(true);
      return;
    }

    if (isLoggedIn && momentsCredits !== null && momentsCredits <= 0) {
      setShowPaymentWall(true);
      return;
    }

    setApiError(null);
    setIsOutOfCredits(false);
    goTo(4, 1);
    setIsLoading(true);

    const token = authStore.sessionToken;
    const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

    try {
      const res = await fetch(`${base}/api/moment/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recipientName: recipientName.trim(),
          purpose,
          relation,
          ...(likes.trim() ? { likes: likes.trim() } : {}),
        }),
      });

      const data = await res.json() as {
        message?: string;
        momentsCredits?: number | null;
        error?: string;
        message_text?: string;
      };

      if (!res.ok) {
        if (data.error === "MOMENTS_OUT_OF_CREDITS") {
          setMomentsCredits(0);
          setIsOutOfCredits(true);
          goTo(4, 1);
          return;
        }
        goTo(3, -1);
        setApiError((data as { message?: string }).message ?? "Something went wrong. Please try again.");
        return;
      }

      if (!isLoggedIn) {
        const newCount = guestCount + 1;
        incGuestCount();
        setGuestCount(newCount);
      } else if (typeof data.momentsCredits === "number") {
        setMomentsCredits(data.momentsCredits);
      }

      setGeneratedMessage(data.message ?? "");
      const subset = pickTemplateSubset();
      setTemplateOptions(subset);
      setSelectedTemplate(subset[0]);
    } catch {
      goTo(3, -1);
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleDownload = useCallback(async () => {
    const target = staticCardRef.current ?? cardRef.current;
    if (!target) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(target, { cacheBust: true, pixelRatio: 2 });
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
    if (!isLoggedIn && guestCount >= GUEST_LIMIT) {
      setShowAuthGate(true);
      return;
    }
    if (isLoggedIn && momentsCredits !== null && momentsCredits <= 0) {
      setShowPaymentWall(true);
      return;
    }
    setRecipientName("");
    setLikes("");
    setPurpose(null);
    setRelation(null);
    setGeneratedMessage("");
    setApiError(null);
    setIsOutOfCredits(false);
    setTemplateOptions([]);
    setSelectedTemplate(null);
    goTo(1, -1);
  }

  async function handlePaymentSubmit() {
    const cleanUtr = paymentUtr.trim();
    if (!isValidUtr(cleanUtr)) return;

    setPaymentLoading(true);
    setPaymentError(null);

    try {
      const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
      const res = await fetch(`${base}/api/moment/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authStore.sessionToken}`,
        },
        body: JSON.stringify({ utr: cleanUtr }),
      });

      const data = await res.json() as { ok?: boolean; momentsCredits?: number; error?: string; message?: string };

      if (!res.ok) {
        setPaymentError(data.message ?? "Failed to verify payment. Please try again.");
        return;
      }

      setMomentsCredits(data.momentsCredits ?? 10);
      setShowPaymentWall(false);
      setPaymentUtr("");
      setPaymentError(null);
      setIsOutOfCredits(false);
      handleMakeAnother();
    } catch {
      setPaymentError("Network error. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  }

  const creditsLeft = isLoggedIn ? (momentsCredits ?? null) : Math.max(0, GUEST_LIMIT - guestCount);
  const showPill = creditsLeft !== null;
  const pillLabel = isLoggedIn
    ? `${momentsCredits ?? "?"} card${momentsCredits !== 1 ? "s" : ""} left`
    : `${creditsLeft} free left`;

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-50">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[120px]" />
      </div>

      {showAuthGate && (
        <AuthGate
          subtitle="Sign up free to unlock 2 more cards"
          onSuccess={handleAuthSuccess}
          onDismiss={() => setShowAuthGate(false)}
        />
      )}

      {showPaymentWall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-sm"
          >
            <div className="bg-card/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white text-center mb-1">Get 10 more cards</h2>
              <p className="text-sm text-white/45 text-center mb-6">
                Pay ₹50 via UPI and get 10 Moments credits added instantly.
              </p>

              <div className="flex flex-col items-center gap-2 mb-6">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=8905158970@upi%26pn=HeartSync%20AI%26am=50%26cu=INR%26tn=HeartSync+Moments"
                  alt="UPI QR Code"
                  className="w-36 h-36 rounded-xl border border-white/10"
                />
                <p className="text-[10px] text-white/35 uppercase tracking-wide mt-1">UPI ID</p>
                <p className="font-mono font-bold text-white text-base">8905158970@upi</p>
                <p className="text-xs text-white/35">Amount: ₹50</p>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Paste UTR / Transaction ID"
                  value={paymentUtr}
                  onChange={(e) => { setPaymentUtr(e.target.value); setPaymentError(null); }}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 h-11 rounded-xl font-mono"
                />
                {paymentError && <p className="text-xs text-destructive">{paymentError}</p>}
                <Button
                  onClick={handlePaymentSubmit}
                  disabled={!isValidUtr(paymentUtr) || paymentLoading}
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold"
                >
                  {paymentLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
                    </span>
                  ) : (
                    "Submit & Unlock 10 Cards"
                  )}
                </Button>
                <button
                  onClick={() => { setShowPaymentWall(false); setPaymentUtr(""); setPaymentError(null); }}
                  className="text-xs text-white/25 hover:text-white/50 transition-colors w-full text-center"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="relative z-10 max-w-lg mx-auto px-5 py-10 flex flex-col min-h-screen">
        <div className="flex items-center justify-between mb-8">
          <Button asChild variant="ghost" className="pl-0 text-white/50 hover:text-white hover:bg-transparent">
            <Link href="/" className="flex items-center gap-2">
              <ChevronLeft className="w-5 h-5" /> Back
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            {showPill && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  creditsLeft! > 0
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                {pillLabel}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary fill-primary" />
              <span className="text-sm font-bold text-white">HeartSync Moments</span>
            </div>
          </div>
        </div>

        {showNewUserBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-6"
          >
            <span className="text-lg">🎉</span>
            <p className="text-sm text-green-300 font-medium">2 free cards unlocked! Enjoy your Moments.</p>
          </motion.div>
        )}

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
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 h-14 text-lg rounded-xl mb-4"
                    autoFocus
                  />
                  <div className="mb-6">
                    <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">
                      What do they like? <span className="text-white/25 normal-case tracking-normal font-normal">(optional)</span>
                    </label>
                    <Input
                      placeholder="loves pandas, obsessed with minions, loves pink…"
                      value={likes}
                      onChange={(e) => setLikes(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 text-sm rounded-xl"
                    />
                    <p className="text-white/25 text-xs mt-2 leading-relaxed">We'll personalise the card message around what they love.</p>
                  </div>
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
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-6">
                    <div className="relative">
                      <motion.div
                        className="w-20 h-20 rounded-full border-2 border-primary/30"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      />
                      <motion.div
                        className="absolute inset-2 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Heart className="w-7 h-7 text-primary fill-primary/40" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold text-lg mb-1">Creating your Moment…</p>
                      <p className="text-white/40 text-sm">Writing the perfect message for {recipientName}</p>
                    </div>
                  </div>
                ) : isOutOfCredits ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                      <CreditCard className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">You're all out of cards</h2>
                    <p className="text-white/50 text-sm mb-8 max-w-xs mx-auto leading-relaxed">
                      Get 10 more cards for ₹50 — pay via UPI and credits are added instantly.
                    </p>
                    <div className="flex flex-col gap-3 max-w-xs mx-auto">
                      <Button
                        onClick={() => setShowPaymentWall(true)}
                        className="h-12 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Get 10 cards for ₹50
                      </Button>
                      <Button asChild variant="ghost" className="h-11 rounded-xl text-white/40 hover:text-white hover:bg-white/5 border border-white/10">
                        <Link href="/generate">Try Date Guide instead</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-white mb-1">Your Moment is ready 💙</h2>
                    {isLoggedIn && momentsCredits !== null && (
                      <p className="text-white/40 text-sm mb-5">
                        {momentsCredits} card{momentsCredits !== 1 ? "s" : ""} remaining
                      </p>
                    )}
                    {!isLoggedIn && (
                      <p className="text-white/40 text-sm mb-5">
                        {Math.max(0, GUEST_LIMIT - guestCount)} free card{Math.max(0, GUEST_LIMIT - guestCount) !== 1 ? "s" : ""} remaining — sign up to unlock 2 more
                      </p>
                    )}

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
                        <div style={{ perspective: "900px" }}>
                          <motion.div
                            key={selectedTemplate}
                            initial={{ rotateY: 90, opacity: 0 }}
                            animate={{ rotateY: 0, opacity: 1 }}
                            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <CardTemplate
                              ref={cardRef}
                              templateId={selectedTemplate}
                              recipientName={recipientName}
                              message={generatedMessage}
                            />
                          </motion.div>
                        </div>
                        <div style={{ position: "fixed", left: "-9999px", top: "-9999px", pointerEvents: "none", zIndex: -1 }}>
                          <CardTemplate
                            ref={staticCardRef}
                            templateId={selectedTemplate}
                            recipientName={recipientName}
                            message={generatedMessage}
                            static
                          />
                        </div>
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
