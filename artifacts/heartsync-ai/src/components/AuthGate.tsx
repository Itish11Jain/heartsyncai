import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  getAdditionalUserInfo,
  RecaptchaVerifier,
  type ConfirmationResult,
} from "firebase/auth";
import { Link } from "wouter";
import { Loader2, Mail, Phone, Heart } from "lucide-react";

import { auth } from "@/lib/firebase";
import { authStore } from "@/lib/auth-store";
import { useVerifyAuth } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type Tab = "email" | "phone";
type Step = "form" | "otp";

interface AuthGateProps {
  onSuccess: (isNewUser: boolean) => void;
}

function getFirebaseErrorMessage(code: string): string {
  const map: Record<string, string> = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/wrong-password": "Incorrect password. Try again.",
    "auth/invalid-credential": "Incorrect email or password. Try again.",
    "auth/user-not-found": "No account found. Creating a new one…",
    "auth/email-already-in-use": "Email already registered. Try signing in.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment.",
    "auth/invalid-phone-number": "Enter a valid 10-digit Indian mobile number.",
    "auth/invalid-verification-code": "Incorrect OTP. Please try again.",
    "auth/code-expired": "OTP expired. Please request a new one.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}

export default function AuthGate({ onSuccess }: AuthGateProps) {
  const [tab, setTab] = useState<Tab>("email");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const verifyAuth = useVerifyAuth();

  useEffect(() => {
    return () => {
      recaptchaRef.current?.clear();
    };
  }, []);

  async function finishAuth(idToken: string, isNewUser: boolean) {
    const result = await new Promise<{ sessionToken: string; credits: number; displayName: string }>(
      (resolve, reject) => {
        verifyAuth.mutate(
          { data: { idToken } },
          {
            onSuccess: resolve,
            onError: reject,
          },
        );
      },
    );
    authStore.login(result.sessionToken, result.displayName, result.credits);
    onSuccess(isNewUser);
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setIsLoading(true);
    try {
      let cred;
      let isNewUser = false;
      try {
        cred = await signInWithEmailAndPassword(auth, email, password);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? "";
        if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
          cred = await createUserWithEmailAndPassword(auth, email, password);
          isNewUser = true;
        } else {
          throw err;
        }
      }
      const idToken = await cred.user.getIdToken();
      await finishAuth(idToken, isNewUser);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(getFirebaseErrorMessage(code));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (phone.length < 10) return;
    setError(null);
    setIsLoading(true);
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
      }
      const result = await signInWithPhoneNumber(auth, `+91${phone}`, recaptchaRef.current);
      confirmationRef.current = result;
      setStep("otp");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(getFirebaseErrorMessage(code));
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp(value: string) {
    if (value.length < 6 || !confirmationRef.current) return;
    setError(null);
    setIsLoading(true);
    try {
      const cred = await confirmationRef.current.confirm(value);
      const isNewUser = getAdditionalUserInfo(cred)?.isNewUser ?? false;
      const idToken = await cred.user.getIdToken();
      await finishAuth(idToken, isNewUser);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(getFirebaseErrorMessage(code));
    } finally {
      setIsLoading(false);
    }
  }

  function switchTab(t: Tab) {
    setTab(t);
    setStep("form");
    setError(null);
    setOtp("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm px-6">
      <div id="recaptcha-container" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-xl font-bold text-white">HeartSync AI</span>
        </div>

        <div className="bg-card/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-1 text-center">Welcome</h2>
          <p className="text-sm text-white/45 text-center mb-6">
            Sign in to get your first free report
          </p>

          {/* Tabs */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6">
            {(["email", "phone"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === t
                    ? "bg-primary text-white shadow"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {t === "email" ? (
                  <><Mail className="w-4 h-4" /> Email</>
                ) : (
                  <><Phone className="w-4 h-4" /> Phone</>
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === "email" ? (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleEmailSubmit}
                className="space-y-3"
              >
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 h-11 rounded-xl"
                  autoComplete="email"
                />
                <Input
                  type="password"
                  placeholder="Password (min 6 chars)"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 h-11 rounded-xl"
                  autoComplete="current-password"
                />
                {error && (
                  <p className="text-xs text-destructive text-center">{error}</p>
                )}
                <Button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                    </span>
                  ) : (
                    "Continue"
                  )}
                </Button>
                <p className="text-[11px] text-white/25 text-center">
                  New? We'll create your account automatically.
                </p>
              </motion.form>
            ) : (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <AnimatePresence mode="wait">
                  {step === "form" ? (
                    <motion.form
                      key="phone-form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleSendOtp}
                      className="space-y-3"
                    >
                      <div className="flex gap-2">
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 text-white/60 text-sm shrink-0 h-11">
                          🇮🇳 +91
                        </div>
                        <Input
                          type="tel"
                          placeholder="10-digit mobile number"
                          value={phone}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                            setPhone(v);
                            setError(null);
                          }}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/25 h-11 rounded-xl flex-1"
                          inputMode="numeric"
                        />
                      </div>
                      {error && (
                        <p className="text-xs text-destructive text-center">{error}</p>
                      )}
                      <Button
                        type="submit"
                        disabled={isLoading || phone.length < 10}
                        className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold"
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Sending OTP…
                          </span>
                        ) : (
                          "Send OTP"
                        )}
                      </Button>
                    </motion.form>
                  ) : (
                    <motion.div
                      key="otp-form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <p className="text-sm text-white/50 text-center">
                        Enter the 6-digit OTP sent to{" "}
                        <span className="text-white font-semibold">+91 {phone}</span>
                      </p>
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={otp}
                          onChange={(v) => { setOtp(v); setError(null); handleVerifyOtp(v); }}
                          disabled={isLoading}
                        >
                          <InputOTPGroup>
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                              <InputOTPSlot
                                key={i}
                                index={i}
                                className="w-10 h-11 text-white border-white/20 bg-white/5 text-base"
                              />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      {isLoading && (
                        <div className="flex justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      )}
                      {error && (
                        <p className="text-xs text-destructive text-center">{error}</p>
                      )}
                      <button
                        onClick={() => { setStep("form"); setOtp(""); setError(null); }}
                        className="text-xs text-white/30 hover:text-white/60 transition-colors w-full text-center"
                      >
                        ← Change number
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-white/20 text-center mt-5 px-1">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-white/40 transition-colors">
              Terms &amp; Refund Policy
            </Link>
            {" · "}
            <Link href="/contact" className="underline underline-offset-2 hover:text-white/40 transition-colors">
              Contact Us
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
