import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, HeartPulse, MessageCircle, HelpCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authStore } from "@/lib/auth-store";

const FEATURES = [
  {
    title: "How to start talking",
    desc: "No more awkward hellos. Get easy, natural ways to break the ice and get the conversation going.",
    icon: MessageCircle,
    color: "text-primary",
  },
  {
    title: "Questions they will love",
    desc: "Ask the right things and make them feel genuinely heard. Keep the conversation flowing without trying too hard.",
    icon: HelpCircle,
    color: "text-accent",
  },
  {
    title: "How to carry yourself",
    desc: "Simple tips on confidence and body language that make a big difference on any date.",
    icon: HeartPulse,
    color: "text-secondary",
  },
];

const TESTIMONIALS = [
  {
    quote: "I was so nervous before my first date. HeartSync gave me exactly what to say and it actually went really well. She wants to meet again!",
    name: "Rahul",
    city: "Indore",
    stars: 5,
  },
  {
    quote: "The questions it suggested made our conversation feel so natural. He said it was the best date he had been on in a long time.",
    name: "Priya",
    city: "Lucknow",
    stars: 5,
  },
  {
    quote: "I was going in completely blind but after using HeartSync I felt 10 times more confident. Really simple to use.",
    name: "Arjun",
    city: "Bhopal",
    stars: 5,
  },
  {
    quote: "Honestly did not expect much but the tips were spot on. I stopped overthinking and just enjoyed the date.",
    name: "Sneha",
    city: "Jaipur",
    stars: 5,
  },
];

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(authStore.isLoggedIn);
  }, []);

  const ctaHref = isLoggedIn ? "/generate" : "/preview";

  return (
    <div className="min-h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/20 blur-[150px]" />
        <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full bg-accent/20 blur-[100px]" />
      </div>

      <div className="relative z-10 container mx-auto px-6 pt-6 pb-16 md:pt-12">
        <header className="flex justify-between items-center mb-14">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-primary to-secondary p-2 rounded-xl">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              HeartSync AI
            </span>
          </div>
          <Button asChild variant="outline" className="rounded-full border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10">
            <Link href={ctaHref}>Get Started</Link>
          </Button>
        </header>

        <main className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
              <Sparkles className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-white/80">First report is free</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 text-white">
              Feel confident <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-secondary">
                on your next date.
              </span>
            </h1>
            <p className="text-base md:text-lg text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
              Just tell us about your date and we will give you exactly what to say, what to ask, and how to make a great impression — in minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-full h-14 px-8 text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-[0_0_40px_-10px_rgba(236,72,153,0.5)] transition-all">
                <Link href={ctaHref} className="flex items-center gap-2">
                  {isLoggedIn ? "Generate a Report" : "Try It Free"} <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mt-14 text-left">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 + (i * 0.1) }}
                className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm"
              >
                <div className={`w-12 h-12 rounded-2xl bg-white/[0.05] flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white/90">{f.title}</h3>
                <p className="text-white/50 leading-relaxed text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-16">
            <p className="text-white/30 text-sm font-medium uppercase tracking-widest mb-8">What people are saying</p>
            <div className="grid md:grid-cols-2 gap-5 text-left">
              {TESTIMONIALS.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 + (i * 0.1) }}
                  className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
                >
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.stars }).map((_, s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed mb-3">"{t.quote}"</p>
                  <p className="text-white/30 text-xs font-medium">{t.name}, {t.city}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
