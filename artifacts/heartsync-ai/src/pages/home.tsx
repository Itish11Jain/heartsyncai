import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authStore } from "@/lib/auth-store";

const STEPS = [
  { num: "01", title: "Pick who it's for", desc: "Your partner, friend, date, or spouse. Tell us the relationship." },
  { num: "02", title: "Choose an occasion", desc: "I love you, sorry, thank you, or just to make them smile." },
  { num: "03", title: "Your card is ready", desc: "AI writes a heartfelt message. Pick a style. Send or download." },
];

const TESTIMONIALS = [
  {
    quote: "I sent the 'I love you' card to my girlfriend and she cried (happy tears). She said it was the sweetest thing she had ever received.",
    name: "Rohan", city: "Pune", stars: 5,
  },
  {
    quote: "My best friend was going through a tough time. I sent the feel-good card and she called me immediately. So glad I found this.",
    name: "Aditi", city: "Jaipur", stars: 5,
  },
  {
    quote: "I was so nervous before my first date. HeartSync gave me exactly what to say and it actually went really well.",
    name: "Rahul", city: "Indore", stars: 5,
  },
  {
    quote: "The questions it suggested made our conversation feel so natural. He said it was the best date he had been on in a long time.",
    name: "Priya", city: "Lucknow", stars: 5,
  },
];

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function CardIllustration() {
  return (
    <div className="relative w-52 h-64 mx-auto my-5">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-500/25 to-rose-600/15 blur-2xl scale-110" />
      <motion.div
        animate={{ y: [-3, 3, -3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-full h-full"
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#2e0a1a] to-[#1a0610] border border-pink-500/20 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(236,72,153,0.4) 0%, transparent 70%)" }} />
          <div className="relative p-5 h-full flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                </svg>
              </div>
              <span className="text-[7px] text-pink-300/50 font-medium uppercase tracking-wider">HeartSync</span>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-[10px] text-pink-200/70 mb-1.5 font-medium">For Priya,</div>
              <div className="text-[10px] leading-relaxed text-white/75 italic">
                "Every moment with you feels like home. You make ordinary days feel extraordinary."
              </div>
            </div>
            <div className="text-[7px] text-white/20">With love 💕</div>
          </div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-pink-400/40 to-transparent" />
        </div>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-2 -right-2"
        >
          <svg className="w-4 h-4 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
          </svg>
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-1 -left-2"
        >
          <svg className="w-3 h-3 text-rose-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function Home() {
  const [isLoggedIn] = useState(() => authStore.isLoggedIn);
  const guideCta = isLoggedIn ? "/generate" : "/preview";

  return (
    <div className="min-h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full bg-primary/15 blur-[130px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/15 blur-[150px]" />
        <div className="absolute top-[35%] right-[5%] w-[35%] h-[35%] rounded-full bg-accent/10 blur-[100px]" />
      </div>

      <div className="relative z-10 container mx-auto px-6 pt-6 pb-20 max-w-5xl">
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-primary to-secondary p-2 rounded-xl">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              HeartSync AI
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-white/50 hover:text-white/80 hover:bg-transparent text-sm px-3 py-1.5 h-auto">
              <Link href={guideCta}>Date Guide</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 text-sm px-4 py-1.5 h-auto">
              <Link href={guideCta}>Log in</Link>
            </Button>
          </div>
        </header>

        {/* Dual Hero — Card leads, Guide secondary */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="grid md:grid-cols-2 gap-5 mb-20"
        >
          {/* Send a Card — PRIMARY */}
          <div className="p-8 rounded-3xl border border-primary/20 bg-gradient-to-br from-pink-950/40 to-rose-950/20 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(236,72,153,0.5) 0%, transparent 60%)" }} />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/25 mb-5">
                <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                </svg>
                <span className="text-xs font-medium text-primary">2 cards free. Try now.</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight leading-tight mb-3 text-white">
                Send love in a card.{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                  Written by AI.
                </span>
              </h1>
              <p className="text-sm text-white/50 mb-2 leading-relaxed">
                Heartfelt, personalized cards for your partner, friend, or date. AI writes the message. Done in 60 seconds.
              </p>
              <CardIllustration />
              <Button
                asChild
                className="w-full rounded-2xl h-12 text-sm font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white shadow-[0_0_30px_-8px_rgba(236,72,153,0.5)] transition-all"
              >
                <Link href="/moments" className="flex items-center justify-center gap-2">
                  Send a Card Free
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </Button>
            </div>
          </div>

          {/* Date Guide — SECONDARY but clearly present */}
          <div className="p-8 rounded-3xl border border-accent/25 bg-gradient-to-br from-violet-950/40 to-indigo-950/20 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(ellipse at 100% 0%, rgba(139,92,246,0.5) 0%, transparent 60%)" }} />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/25 mb-5">
                <svg className="w-3 h-3 text-accent" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span className="text-xs font-medium text-accent">First guide is free</span>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight leading-tight mb-3 text-white">
                Ace your date.{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent to-purple-400">
                  Date Smarter.
                </span>
              </h2>
              <p className="text-sm text-white/50 mb-6 leading-relaxed">
                Get a personalized AI guide before your date — what to say, questions to ask, and how to carry yourself with confidence.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  "Conversation starters that feel natural",
                  "Deep questions they'll actually enjoy answering",
                  "Confidence tips to carry yourself well",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-white/55">
                    <div className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 text-accent" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    {item}
                  </div>
                ))}
              </div>
              <Button
                asChild
                variant="outline"
                className="w-full rounded-2xl h-12 text-sm font-semibold border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 hover:text-white transition-all"
              >
                <Link href={guideCta} className="flex items-center justify-center gap-2">
                  Try Date Guide Free
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-20"
        >
          <p className="text-white/25 text-xs font-semibold uppercase tracking-widest text-center mb-10">How sending a card works</p>
          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }}
                className="p-6 rounded-3xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm relative overflow-hidden"
              >
                <div className="absolute top-4 right-5 text-5xl font-black text-white/[0.03] select-none leading-none">{s.num}</div>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))" }}
                >
                  {parseInt(s.num)}
                </div>
                <h3 className="text-base font-semibold mb-2 text-white/90">{s.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <p className="text-white/25 text-xs font-semibold uppercase tracking-widest text-center mb-8">What people are saying</p>
          <div className="grid md:grid-cols-2 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 + i * 0.08 }}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
              >
                <StarRow count={t.stars} />
                <p className="text-white/65 text-sm leading-relaxed mt-3 mb-3">"{t.quote}"</p>
                <p className="text-white/30 text-xs font-medium">{t.name}, {t.city}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
