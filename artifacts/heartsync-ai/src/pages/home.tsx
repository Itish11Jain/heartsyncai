import { Link } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, HeartPulse, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary/30">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/20 blur-[150px]" />
        <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full bg-accent/20 blur-[100px]" />
      </div>

      <div className="relative z-10 container mx-auto px-6 pt-12 pb-24 md:pt-24">
        {/* Header */}
        <header className="flex justify-between items-center mb-24">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-primary to-secondary p-2 rounded-xl">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              HeartSync AI
            </span>
          </div>
          <Button asChild variant="outline" className="rounded-full border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10">
            <Link href="/generate">Get Started</Link>
          </Button>
        </header>

        {/* Hero Section */}
        <main className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8">
              <Sparkles className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-white/80">Your Mumbai Wingman for First Dates</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8 text-white">
              Don't guess the vibe. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-secondary">
                Engineer it.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
              Drop the basic small talk. Get an AI-powered Intelligence Report with opening gambits, aura checks, and conversation closers tailored for your exact date context.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-full h-14 px-8 text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-[0_0_40px_-10px_rgba(236,72,153,0.5)] transition-all">
                <Link href="/generate" className="flex items-center gap-2">
                  Get My Free Report <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-32 text-left">
            {[
              {
                title: "Opening Gambits",
                desc: "No more 'hey how are you'. Get lines that actually hook attention.",
                icon: Zap,
                color: "text-primary"
              },
              {
                title: "Aura Check",
                desc: "Read the room. Know exactly what vibe to project and what to avoid.",
                icon: Sparkles,
                color: "text-accent"
              },
              {
                title: "Hinglish Native",
                desc: "Bandra energy encoded. Sounds like your smartest friend, not a robot.",
                icon: HeartPulse,
                color: "text-secondary"
              }
            ].map((f, i) => (
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
                <h3 className="text-xl font-semibold mb-2 text-white/90">{f.title}</h3>
                <p className="text-white/50 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
