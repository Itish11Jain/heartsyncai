import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { HeartPulse, MessageCircle, HelpCircle, Sparkles, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authStore } from "@/lib/auth-store";

const FEATURES = [
  {
    icon: MessageCircle,
    title: "Conversation openers",
    desc: "Natural, easy ways to break the ice so the conversation flows from the very first minute.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: HelpCircle,
    title: "Questions they'll love",
    desc: "Thoughtful questions that make them feel genuinely heard and keep the energy going all evening.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: Sparkles,
    title: "How to carry yourself",
    desc: "Simple confidence tips and body language that make a real difference — no awkward silences.",
    color: "from-amber-500 to-orange-500",
  },
];

const TESTIMONIALS = [
  {
    quote: "I was so nervous before my first date. HeartSync gave me exactly what to say and it actually went really well. She wants to meet again!",
    name: "Rahul", city: "Indore", stars: 5,
  },
  {
    quote: "The questions it suggested made our conversation feel so natural. He said it was the best date he had been on in a long time.",
    name: "Priya", city: "Lucknow", stars: 5,
  },
  {
    quote: "I was going in completely blind but after using HeartSync I felt 10 times more confident. Really simple to use.",
    name: "Arjun", city: "Bhopal", stars: 5,
  },
  {
    quote: "Honestly did not expect much but the tips were spot on. I stopped overthinking and just enjoyed the date.",
    name: "Sneha", city: "Jaipur", stars: 5,
  },
];

const HOW = [
  { step: "01", title: "Tell us about your date", desc: "Their name, the occasion, a bit about them — whatever you know." },
  { step: "02", title: "We build your guide", desc: "We put together a personalised plan tailored to your date and your goal." },
  { step: "03", title: "Walk in confident", desc: "Conversation starters, questions to ask, and tips to carry yourself — all in one place." },
];

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
      ))}
    </div>
  );
}

export default function DateGuide() {
  const [isLoggedIn] = useState(() => authStore.isLoggedIn);
  const ctaHref = isLoggedIn ? "/generate" : "/preview";

  return (
    <div className="min-h-screen w-full overflow-hidden bg-background text-foreground selection:bg-accent/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[55%] h-[55%] rounded-full bg-accent/12 blur-[130px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[160px]" />
        <div className="absolute top-[40%] right-[0%] w-[35%] h-[35%] rounded-full bg-purple-800/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-6 pb-20">
        {/* Header */}
        <header className="flex justify-between items-center mb-20">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-primary to-secondary p-2 rounded-xl">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              HeartSync AI
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-white/40 hover:text-white/70 hover:bg-transparent text-sm px-3 h-auto py-1.5">
              <Link href="/moments">Send a Card</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 text-sm px-4 h-auto py-1.5 text-white/70">
              <Link href={ctaHref}>Log in</Link>
            </Button>
          </div>
        </header>

        {/* HERO */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-24"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-accent/20 bg-accent/8 mb-7">
            <Sparkles className="w-3 h-3 text-accent" />
            <span className="text-xs font-medium text-accent">First guide is free</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 text-white">
            Walk into your next date{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent via-purple-400 to-primary">
              feeling ready.
            </span>
          </h1>

          <p className="text-lg text-white/50 mb-10 leading-relaxed max-w-2xl mx-auto">
            Tell us about your date and we'll build you a personalised guide — exactly what to say, questions that spark real connection, and how to carry yourself with confidence.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="rounded-2xl h-14 px-8 text-base font-semibold bg-gradient-to-r from-accent to-purple-500 hover:opacity-90 text-white shadow-[0_0_50px_-12px_rgba(139,92,246,0.6)] transition-all"
            >
              <Link href={ctaHref} className="flex items-center gap-2">
                Get my free guide <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-center gap-4 mt-8">
            <div className="flex -space-x-2">
              {["#f472b6","#fb923c","#a78bfa","#34d399","#60a5fa"].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-background" style={{ background: c }} />
              ))}
            </div>
            <p className="text-xs text-white/30">1,800+ guides used this month</p>
          </div>
        </motion.section>

        {/* Features */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-24"
        >
          <p className="text-white/20 text-xs font-semibold uppercase tracking-[0.2em] text-center mb-10">What you get</p>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
                className="p-6 rounded-3xl bg-white/[0.025] border border-white/[0.05] relative overflow-hidden"
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br ${f.color}`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white/90 mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* How it works */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-24"
        >
          <p className="text-white/20 text-xs font-semibold uppercase tracking-[0.2em] text-center mb-10">How it works</p>
          <div className="grid md:grid-cols-3 gap-5">
            {HOW.map((s, i) => (
              <div key={i} className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] relative overflow-hidden">
                <div className="absolute top-3 right-4 text-6xl font-black text-white/[0.025] select-none leading-none">{s.step}</div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-sm font-bold text-white bg-gradient-to-br from-accent to-purple-500">
                  {parseInt(s.step)}
                </div>
                <h3 className="text-base font-semibold text-white/90 mb-2">{s.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
              </div>
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

        {/* Bottom CTA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center py-12 rounded-3xl bg-gradient-to-br from-accent/10 to-purple-900/10 border border-accent/15"
        >
          <h2 className="text-3xl font-extrabold text-white mb-4">Ready to feel confident?</h2>
          <p className="text-white/45 text-base mb-8 max-w-md mx-auto">
            Your first guide is completely free. No credit card, no fuss — just tell us about your date.
          </p>
          <Button
            asChild
            size="lg"
            className="rounded-2xl h-13 px-8 text-base font-semibold bg-gradient-to-r from-accent to-purple-500 hover:opacity-90 text-white"
          >
            <Link href={ctaHref} className="flex items-center gap-2">
              Get my free guide <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </motion.section>

        {/* Footer link to card feature */}
        <div className="text-center mt-12 pt-8 border-t border-white/[0.05]">
          <p className="text-white/25 text-sm mb-3">Also from HeartSync</p>
          <p className="text-white/40 text-sm mb-4">Want to send a thoughtful card to someone special? We write it for you.</p>
          <Button asChild variant="ghost" className="rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 text-sm px-5 h-10">
            <Link href="/moments" className="flex items-center gap-2">
              Send a Card Free <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
