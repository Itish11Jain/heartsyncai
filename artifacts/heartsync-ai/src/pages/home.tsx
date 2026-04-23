import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authStore } from "@/lib/auth-store";

const STEPS = [
  { num: "01", title: "Pick who it's for", desc: "Your partner, friend, date, or spouse. Tell us the relationship." },
  { num: "02", title: "Choose an occasion", desc: "I love you, sorry, thank you, or just to make them smile." },
  { num: "03", title: "Your card is ready", desc: "We craft a heartfelt message for you. Pick a style. Send or download." },
];

const TESTIMONIALS = [
  {
    quote: "I sent the 'I love you' card to my girlfriend and she cried (happy tears). She said it was the sweetest thing she had ever received.",
    name: "Rohan", city: "Pune", stars: 5,
  },
  {
    quote: "My best friend was going through a tough time. I sent the feel-good card and she called me immediately.",
    name: "Aditi", city: "Jaipur", stars: 5,
  },
  {
    quote: "Sent a sorry card after a fight. She loved it and we talked it out. Really helped break the ice.",
    name: "Karan", city: "Indore", stars: 5,
  },
  {
    quote: "My date was so impressed I sent something this thoughtful before we even met.",
    name: "Simran", city: "Lucknow", stars: 5,
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
    <div className="relative w-72 h-96">
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-pink-500/40 to-rose-600/25 blur-3xl scale-105" />
      <motion.div
        animate={{ y: [-6, 6, -6] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-full h-full"
      >
        <div
          className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: "linear-gradient(145deg, #1e0510 0%, #0d0208 100%)",
            border: "1px solid rgba(236,72,153,0.2)",
          }}
        >
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(236,72,153,0.35) 0%, transparent 65%)" }} />
          <div className="absolute bottom-0 left-0 right-0 h-1/2" style={{ background: "linear-gradient(to top, rgba(236,72,153,0.06), transparent)" }} />
          <div className="relative p-7 h-full flex flex-col">
            <div className="flex justify-between items-start mb-5">
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f472b6, #f43f5e)" }}>
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "rgba(244,114,182,0.5)" }}>HeartSync</p>
                <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>HeartSync</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-sm font-medium mb-2" style={{ color: "rgba(251,207,232,0.6)" }}>For Priya,</p>
              <p className="text-[13px] leading-[1.7] italic" style={{ color: "rgba(255,255,255,0.8)" }}>
                "Every moment with you feels like home. You make ordinary days feel extraordinary, and I'm so lucky you're mine."
              </p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>With love 💕</p>
              <div className="w-16 h-px rounded-full" style={{ background: "linear-gradient(to right, rgba(244,114,182,0.4), transparent)" }} />
            </div>
          </div>
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(244,114,182,0.5), transparent)" }} />
        </div>
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-3 -right-3"
        >
          <svg className="w-6 h-6 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
          </svg>
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-2 -left-4"
        >
          <svg className="w-5 h-5 text-rose-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
          </svg>
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/3 -right-5"
        >
          <svg className="w-3 h-3 text-pink-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function Home() {
  const [isLoggedIn] = useState(() => authStore.isLoggedIn);
  const guideCta = "/date-guide";

  return (
    <div className="min-h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[55%] h-[55%] rounded-full bg-primary/15 blur-[130px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/15 blur-[160px]" />
        <div className="absolute top-[30%] right-[0%] w-[40%] h-[40%] rounded-full bg-accent/8 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-6 pb-20">
        {/* Header */}
        <header className="flex justify-between items-center mb-20">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-primary to-secondary p-2 rounded-xl">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              HeartSync AI
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-white/40 hover:text-white/70 hover:bg-transparent text-sm px-3 h-auto py-1.5">
              <Link href={guideCta}>Date Guide</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 text-sm px-4 h-auto py-1.5 text-white/70">
              <Link href={guideCta}>Log in</Link>
            </Button>
          </div>
        </header>

        {/* HERO */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="grid md:grid-cols-2 gap-16 items-center mb-28"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/8 mb-7">
              <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-xs font-medium text-primary">2 cards free. Try now.</span>
            </div>

            <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-5 text-white">
              Send love in<br />a card.{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-pink-400 to-secondary">
                Made for them.
              </span>
            </h1>

            <p className="text-base text-white/50 mb-10 leading-relaxed max-w-md">
              Create a heartfelt, personalised greeting card for your partner, friend, or date. We write the perfect message. You pick the style. Done in 60 seconds.
            </p>

            <div className="mb-10">
              <Button
                asChild
                size="lg"
                className="rounded-2xl h-14 px-8 text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white shadow-[0_0_50px_-12px_rgba(236,72,153,0.6)] transition-all"
              >
                <Link href="/send" className="flex items-center gap-2">
                  Send a Card Free
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {["#f472b6","#fb923c","#a78bfa","#34d399","#60a5fa"].map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-background" style={{ background: c }} />
                ))}
              </div>
              <p className="text-xs text-white/30">3,200+ cards sent this month</p>
            </div>
          </div>

          <div className="flex justify-center md:justify-end pr-4">
            <CardIllustration />
          </div>
        </motion.section>

        {/* How it works */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mb-28"
        >
          <p className="text-white/20 text-xs font-semibold uppercase tracking-[0.2em] text-center mb-10">How it works</p>
          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 + i * 0.1 }}
                className="p-6 rounded-3xl bg-white/[0.025] border border-white/[0.05] relative overflow-hidden"
              >
                <div className="absolute top-3 right-4 text-6xl font-black text-white/[0.025] select-none leading-none">{s.num}</div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-sm font-bold text-white bg-gradient-to-br from-primary to-secondary">
                  {parseInt(s.num)}
                </div>
                <h3 className="text-base font-semibold text-white/90 mb-2">{s.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Testimonials */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-20"
        >
          <p className="text-white/20 text-xs font-semibold uppercase tracking-[0.2em] text-center mb-8">What people are saying</p>
          <div className="grid md:grid-cols-2 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 + i * 0.08 }}
                className="p-5 rounded-2xl bg-white/[0.025] border border-white/[0.055]"
              >
                <StarRow count={t.stars} />
                <p className="text-sm text-white/60 leading-relaxed mt-3 mb-3">"{t.quote}"</p>
                <p className="text-xs text-white/25 font-medium">{t.name}, {t.city}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Date Guide — quiet footer mention */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="text-center py-8 border-t border-white/[0.05]"
        >
          <p className="text-white/25 text-sm mb-2">Also from HeartSync</p>
          <p className="text-white/40 text-sm mb-5 max-w-md mx-auto leading-relaxed">
            Going on a date? We put together a personalised guide for you — conversation starters, the right questions, and confidence tips. First guide free.
          </p>
          <Button asChild variant="ghost" className="rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 text-sm px-5 h-10">
            <Link href={guideCta} className="flex items-center gap-2">
              Try the Date Guide
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </Button>
        </motion.section>
      </div>
    </div>
  );
}
