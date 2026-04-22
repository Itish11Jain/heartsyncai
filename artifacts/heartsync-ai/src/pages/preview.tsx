import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ChevronLeft, Loader2, Sparkles, Lock, Brain, MessageCircle, HelpCircle, HandHeart,
  ArrowRight, Copy, Check,
} from "lucide-react";

import { useGenerateReport } from "@workspace/api-client-react";
import { reportStore } from "@/lib/store";
import { historyStore } from "@/lib/history-store";
import { authStore } from "@/lib/auth-store";
import AuthGate from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const PREVIEW_FORM_KEY = "heartsync_preview_form_v1";

function trackEvent(name: string, params?: Record<string, string>) {
  try {
    (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.("event", name, params ?? {});
  } catch { /* ignore */ }
}

const formSchema = z.object({
  partnerName: z.string().min(1, "Please enter their name."),
  occasion: z.string().min(1, "Please select an occasion."),
  knownDetails: z.string().optional(),
  vibe: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const LOADING_MESSAGES = [
  "Analyzing the situation...",
  "Crafting your playbook...",
  "Reading between the lines...",
  "Putting it all together...",
  "Almost ready...",
];

const LOCKED_SECTIONS = [
  {
    icon: MessageCircle,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    label: "How to Start the Conversation",
    desc: "3 easy, natural openers tailored to your date",
  },
  {
    icon: HelpCircle,
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
    label: "Questions They Will Love",
    desc: "3 questions that spark real conversation",
  },
  {
    icon: HandHeart,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    label: "How to Wrap It Up",
    desc: "3 warm ways to end the date on a high note",
  },
];

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

export default function Preview() {
  const [, setLocation] = useLocation();
  const generateReport = useGenerateReport();

  const [step, setStep] = useState<"form" | "preview">("form");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [innerGame, setInnerGame] = useState<{ title: string; content: string; items: string[] } | null>(null);
  const [formValues, setFormValues] = useState<FormValues | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isGeneratingFull, setIsGeneratingFull] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  useEffect(() => {
    if (authStore.isLoggedIn) {
      setLocation("/generate");
    }
  }, []);

  useEffect(() => {
    if (!isGeneratingFull) return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isGeneratingFull]);

  function loadSavedForm(): Partial<FormValues> {
    try {
      const raw = localStorage.getItem(PREVIEW_FORM_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as Partial<FormValues>;
    } catch {
      return {};
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { partnerName: "", occasion: "", knownDetails: "", vibe: "", ...loadSavedForm() },
  });

  async function onFormSubmit(values: FormValues) {
    setFormValues(values);
    setIsPreviewLoading(true);
    setPreviewError(null);
    trackEvent("preview_form_submitted", { occasion: values.occasion });
    try {
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const res = await fetch(`${base}/api/report/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json()) as { innerGame?: { title: string; content: string; items: string[] }; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Failed to generate preview");
      if (!data.innerGame) throw new Error("No preview data returned");
      try { localStorage.setItem(PREVIEW_FORM_KEY, JSON.stringify(values)); } catch { /* ignore */ }
      setInnerGame(data.innerGame);
      setStep("preview");
      trackEvent("preview_shown", { occasion: values.occasion });
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  function handleAuthSuccess(isNewUser: boolean) {
    setShowAuth(false);
    if (!formValues) return;
    setIsGeneratingFull(true);
    if (isNewUser) trackEvent("preview_signup_completed", { occasion: formValues.occasion });
    generateReport.mutate(
      { data: formValues },
      {
        onSuccess: (data) => {
          const { creditsRemaining, ...report } = data;
          reportStore.set(report);
          historyStore.add(report, formValues.occasion);
          authStore.setCredits(creditsRemaining);
          try { localStorage.removeItem(PREVIEW_FORM_KEY); } catch { /* ignore */ }
          setLocation("/report");
        },
        onError: () => {
          setIsGeneratingFull(false);
          setPreviewError("Could not generate your full report. Please try again.");
        },
      },
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-50">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      {isGeneratingFull && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-white/70 text-base font-medium">{LOADING_MESSAGES[loadingMsgIdx]}</p>
          </motion.div>
        </div>
      )}

      {showAuth && <AuthGate onSuccess={handleAuthSuccess} />}

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center mb-8">
          <Button asChild variant="ghost" className="pl-0 text-white/60 hover:text-white hover:bg-transparent">
            <Link href="/" className="flex items-center gap-2">
              <ChevronLeft className="w-5 h-5" /> Back
            </Link>
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {step === "form" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="text-4xl font-bold mb-2 text-white">Set the Scene</h1>
              <p className="text-white/60 mb-8">Tell us about your date and we'll show you a free preview.</p>

              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="partnerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">Who are you meeting?</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter their name"
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-destructive" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="occasion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">What's the occasion?</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl">
                                <SelectValue placeholder="Select location/vibe" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-card border-white/10 text-white">
                              <SelectItem value="Coffee date">Coffee date</SelectItem>
                              <SelectItem value="Dinner">Dinner</SelectItem>
                              <SelectItem value="Movie">Movie</SelectItem>
                              <SelectItem value="Road trip">Road trip</SelectItem>
                              <SelectItem value="House party">House party</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-destructive" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="knownDetails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">Any intel? (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="What do you know about them? Share their interests, hobbies, where they work — anything helps..."
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none min-h-[100px] rounded-xl"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-destructive" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vibe"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">What's your goal?</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl">
                                <SelectValue placeholder="Select desired vibe" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-card border-white/10 text-white">
                              <SelectItem value="Relaxed and easy-going">Relaxed and easy-going</SelectItem>
                              <SelectItem value="I want to impress them">I want to impress them</SelectItem>
                              <SelectItem value="Keep it fun and light">Keep it fun and light</SelectItem>
                              <SelectItem value="Build a real connection">Build a real connection</SelectItem>
                              <SelectItem value="Just wing it">Just wing it</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-destructive" />
                        </FormItem>
                      )}
                    />

                    {previewError && (
                      <p className="text-xs text-destructive text-center">{previewError}</p>
                    )}

                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={isPreviewLoading}
                        className="w-full h-14 rounded-xl text-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-5px_rgba(236,72,153,0.5)] transition-all"
                      >
                        {isPreviewLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" /> Generating preview…
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5" /> Show Me a Free Preview
                          </span>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/15 border border-secondary/30 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-secondary" />
                  <span className="text-xs font-semibold text-secondary">Free Preview</span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-1">
                  Your report for <span className="text-primary">{formValues?.partnerName}</span>
                </h1>
                <p className="text-white/50 text-sm">
                  Here's a taste. Create a free account to unlock the full report instantly.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-card/50 backdrop-blur-xl border border-secondary/25 p-6 rounded-3xl shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shadow-lg shrink-0">
                      <Brain className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">01 · Unlocked</p>
                      <h2 className="text-base font-bold text-white leading-tight">{innerGame?.title}</h2>
                    </div>
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed mb-4 pl-1">{innerGame?.content}</p>
                  <ul className="space-y-2">
                    {innerGame?.items.slice(0, 3).map((item, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 28 }}
                        className="flex gap-3 items-start justify-between rounded-xl border px-4 py-3 bg-secondary/10 hover:bg-secondary/20 border-secondary/20 transition-colors"
                      >
                        <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0 bg-secondary" />
                        <span className="text-sm text-white/85 leading-relaxed flex-1">{item}</span>
                        <CopyButton text={item} />
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {LOCKED_SECTIONS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.1 }}
                      className="relative overflow-hidden rounded-3xl border border-white/8"
                    >
                      <div className="bg-card/30 backdrop-blur-xl p-6 select-none pointer-events-none">
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-9 h-9 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-4 h-4 ${s.color}`} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">
                              0{i + 2} · Locked
                            </p>
                            <h2 className="text-base font-bold text-white/50 leading-tight">{s.label}</h2>
                          </div>
                        </div>
                        <div className="blur-[6px] space-y-2 opacity-50">
                          {[...Array(3)].map((_, j) => (
                            <div
                              key={j}
                              className={`h-11 rounded-xl border ${s.border} ${s.bg}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/30 backdrop-blur-[2px]">
                        <div className="flex items-center gap-2 bg-white/8 border border-white/12 rounded-2xl px-4 py-2.5">
                          <Lock className="w-3.5 h-3.5 text-white/50" />
                          <span className="text-xs font-semibold text-white/60">{s.desc}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-card/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl text-center"
              >
                <p className="text-white font-semibold mb-1">Like what you see?</p>
                <p className="text-white/45 text-sm mb-5">
                  Create a free account to unlock your full report — no payment needed.
                </p>
                <Button
                  onClick={() => { trackEvent("unlock_cta_clicked"); setShowAuth(true); }}
                  className="w-full h-13 rounded-xl text-base font-bold bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white shadow-[0_0_25px_-5px_rgba(236,72,153,0.6)] transition-all"
                >
                  <span className="flex items-center justify-center gap-2">
                    Unlock Full Report — It's Free <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>
                <button
                  onClick={() => setStep("form")}
                  className="mt-3 text-xs text-white/25 hover:text-white/50 transition-colors"
                >
                  ← Change details
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
