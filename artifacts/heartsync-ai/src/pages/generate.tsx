import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ChevronLeft, Loader2, Sparkles, LogOut, Zap, Lock, Info, ArrowRight, ClipboardList,
} from "lucide-react";

import { useGenerateReport, useSubmitUtr } from "@workspace/api-client-react";
import { reportStore } from "@/lib/store";
import { historyStore } from "@/lib/history-store";
import { authStore } from "@/lib/auth-store";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
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

const formSchema = z.object({
  partnerName: z.string().min(1, "Please enter their name."),
  occasion: z.string().min(1, "Please select an occasion."),
  knownDetails: z.string().optional(),
  vibe: z.string().optional(),
});

const LOADING_MESSAGES = [
  "Analyzing the situation...",
  "Crafting your playbook...",
  "Reading between the lines...",
  "Putting it all together...",
  "Almost ready...",
];

function isValidUtr(value: string) {
  const v = value.trim();
  return /^\d{12}$/.test(v) || /^[A-Za-z]{4}[A-Za-z0-9]{12,18}$/.test(v);
}

export default function Generate() {
  const [, setLocation] = useLocation();
  const generateReport = useGenerateReport();
  const submitUtr = useSubmitUtr();
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  const [isLoggedIn, setIsLoggedIn] = useState(authStore.isLoggedIn);
  const [credits, setCredits] = useState(authStore.credits);
  const [displayName, setDisplayName] = useState(authStore.displayName ?? "");

  const [utr, setUtr] = useState("");
  const [utrError, setUtrError] = useState("");
  const [utrDone, setUtrDone] = useState(false);
  const [paymentSession] = useState(
    () => `topup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { partnerName: "", occasion: "", knownDetails: "", vibe: "" },
  });

  useEffect(() => {
    if (!generateReport.isPending) return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [generateReport.isPending]);

  async function refreshCredits() {
    const token = authStore.sessionToken;
    if (!token) return;
    try {
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const res = await fetch(`${base}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { credits: number };
        authStore.setCredits(data.credits);
        setCredits(data.credits);
      }
    } catch {
      /* silent — stale value shown is fine */
    }
  }

  useEffect(() => {
    refreshCredits();
    const onFocus = () => refreshCredits();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAuthSuccess() {
    setIsLoggedIn(true);
    setCredits(authStore.credits);
    setDisplayName(authStore.displayName ?? "");
  }

  async function handleSignOut() {
    await signOut(auth).catch(() => {});
    authStore.logout();
    setIsLoggedIn(false);
    setCredits(0);
  }

  function handleUtrSubmit() {
    const trimmed = utr.trim();
    if (!isValidUtr(trimmed)) return;
    setUtrError("");
    submitUtr.mutate(
      { data: { utr: trimmed, reportSession: paymentSession } },
      {
        onSuccess: (data) => {
          const newCredits = data.creditsRemaining;
          authStore.setCredits(newCredits);
          setCredits(newCredits);
          setUtrDone(true);
        },
        onError: () => setUtrError("Submission failed. Please try again."),
      },
    );
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    generateReport.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          const { creditsRemaining, ...report } = data;
          reportStore.set(report);
          historyStore.add(report, values.occasion);
          authStore.setCredits(creditsRemaining);
          setLocation("/report");
        },
      },
    );
  }

  if (!isLoggedIn) {
    return <AuthGate onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-50">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <Button asChild variant="ghost" className="pl-0 text-white/60 hover:text-white hover:bg-transparent">
            <Link href="/" className="flex items-center gap-2">
              <ChevronLeft className="w-5 h-5" /> Back
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-white">{credits} left</span>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[11px] text-white/30 leading-none">Signed in as</p>
              <p className="text-xs text-white/60 leading-none mt-0.5 max-w-[140px] truncate">{displayName}</p>
            </div>
            <Link
              href="/history"
              className="p-2 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
              title="My Reports"
            >
              <ClipboardList className="w-4 h-4" />
            </Link>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {credits === 0 && !utrDone ? (
            /* Paywall */
            <div>
              <h1 className="text-4xl font-bold mb-2 text-white">Get More Reports</h1>
              <p className="text-white/60 mb-8">Top up to keep the winning streak going.</p>

              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">5 Reports for ₹99</h3>
                  <p className="text-sm text-white/45 mb-8 max-w-xs">
                    Pay via UPI, submit your UTR, and credits are added instantly.
                  </p>

                  <div className="flex gap-5 items-center mb-8">
                    <div className="bg-white rounded-xl p-2 shadow-lg shrink-0">
                      <img
                        src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=upi://pay?pa=8905158970@upi%26pn=HeartSync%20AI%26am=99%26cu=INR%26tn=HeartSync+Reports"
                        alt="UPI QR Code"
                        className="w-28 h-28 rounded-lg"
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

                  <div className="w-full space-y-3">
                    <Input
                      placeholder="Paste UTR / Transaction ID"
                      value={utr}
                      onChange={(e) => { setUtr(e.target.value); setUtrError(""); }}
                      className="bg-white/5 border-white/10 h-11 text-sm rounded-xl placeholder:text-white/20 text-center"
                    />
                    {utrError && <p className="text-xs text-destructive">{utrError}</p>}
                    <Button
                      onClick={handleUtrSubmit}
                      disabled={!isValidUtr(utr) || submitUtr.isPending}
                      className="w-full h-11 text-sm font-semibold bg-primary hover:bg-primary/90 text-white rounded-xl"
                    >
                      {submitUtr.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Unlock 5 Reports <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : utrDone ? (
            /* Credits added success */
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <h1 className="text-4xl font-bold mb-2 text-white">You're all set!</h1>
              <p className="text-white/60 mb-8">5 reports have been added to your account.</p>
              <Button
                onClick={() => setUtrDone(false)}
                className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
              >
                <Sparkles className="w-4 h-4 mr-2" /> Generate a Report
              </Button>
            </motion.div>
          ) : (
            /* Generate form */
            <>
              <h1 className="text-4xl font-bold mb-2 text-white">Set the Scene</h1>
              <p className="text-white/60 mb-8">Give us the details, we'll give you the ultimate strategy.</p>

              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="partnerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">Who are we meeting?</FormLabel>
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
                              placeholder="What do you know about them? Share their bio, interests, hobbies, where they work, what they love — anything helps..."
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

                    <div className="pt-4">
                      <Button
                        type="submit"
                        disabled={generateReport.isPending}
                        className="w-full h-14 rounded-xl text-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-5px_rgba(236,72,153,0.5)] transition-all overflow-hidden relative"
                      >
                        <AnimatePresence mode="wait">
                          {generateReport.isPending ? (
                            <motion.div
                              key="loading"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              className="flex items-center gap-3"
                            >
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>{LOADING_MESSAGES[loadingMsgIdx]}</span>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="idle"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-2"
                            >
                              <Sparkles className="w-5 h-5" /> Generate My Report
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
