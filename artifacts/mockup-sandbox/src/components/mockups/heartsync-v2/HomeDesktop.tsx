import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import "./_group.css";

export function HomeDesktop() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-12 overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 20%, #1a0a2e 0%, #0d0618 60%, #060310 100%)" }}>
      <div className="max-w-[1100px] w-full grid grid-cols-2 gap-16 items-center">
        
        {/* Left Column */}
        <div className="flex flex-col items-start relative z-10">
          
          <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-white/80">2 cards free. Try now.</span>
          </div>

          <h1 className="text-6xl sm:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-5">
            Send love <br /> in a card.
          </h1>

          <div className="mb-6 relative inline-block">
            <p className="text-lg font-medium tracking-wide" style={{ background: "linear-gradient(90deg, #FFD700, #FFA500, #FFD700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200% auto", animation: "shimmer 3s linear infinite" }}>
              Personalised · 100+ Unique Templates · All Occasions
            </p>
          </div>

          <p className="text-lg text-white/60 mb-8 max-w-md leading-relaxed">
            We write the perfect heartfelt message for you. Pick a style. Share in 60 seconds.
          </p>

          <div className="flex items-center gap-3 mb-10 opacity-70">
            <div className="text-xs font-medium bg-white/10 px-3 py-1.5 rounded-md text-white/80">Pick who it's for</div>
            <ChevronRight className="w-4 h-4 text-white/40" />
            <div className="text-xs font-medium bg-white/10 px-3 py-1.5 rounded-md text-white/80">We write the message</div>
            <ChevronRight className="w-4 h-4 text-white/40" />
            <div className="text-xs font-medium bg-white/10 px-3 py-1.5 rounded-md text-white/80">Share the link</div>
          </div>

          {/* PRIMARY CTA BLOCK */}
          <div className="w-full max-w-md flex flex-col gap-3 mb-6 p-1">
            <div className="flex flex-col gap-1.5">
              <Input 
                placeholder="Who is the card for?"
                className="h-16 rounded-2xl border-white/15 bg-white/5 text-white placeholder:text-white/30 px-5 text-xl shadow-inner focus-visible:ring-primary/50"
              />
              <p className="text-xs text-white/40 pl-2">First name only — Priya, Aryan, Mom...</p>
            </div>
            <Button className="h-16 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xl border-none shadow-[0_4px_25px_rgba(236,72,153,0.35)] hover:shadow-[0_8px_35px_rgba(236,72,153,0.5)] transition-all hover:-translate-y-0.5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
              Let's go →
            </Button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 w-full max-w-md mb-6 opacity-60">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/50 uppercase tracking-widest font-semibold">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* SECONDARY CTA */}
          <Button variant="outline" className="w-full max-w-md h-12 rounded-xl bg-white/5 border-white/10 text-white/70 font-medium mb-8 hover:bg-white/10 hover:text-white transition-colors">
            Send a card in 20 seconds — Free
          </Button>

          {/* Social Proof */}
          <div className="flex items-center gap-4 opacity-80">
            <div className="flex -space-x-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0d0618] bg-gradient-to-br from-primary to-secondary opacity-90 shadow-md" />
              ))}
            </div>
            <span className="text-sm font-medium text-white/60">3,200+ cards sent this month</span>
          </div>
        </div>

        {/* Right Column - Card Visual */}
        <div className="relative flex justify-center items-center">
          <div className="relative w-[340px] h-[480px] select-none group">
            <div className="absolute inset-0 rounded-[2rem] blur-3xl scale-110 bg-gradient-to-tr from-primary/30 to-secondary/30 group-hover:scale-115 transition-transform duration-700" />
            <div className="relative w-full h-full rounded-[2rem] overflow-hidden p-8 flex flex-col items-center justify-center text-center transition-transform duration-700 hover:-translate-y-2 hover:rotate-1" style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,215,0,0.06))", border: "1.5px solid rgba(255,215,0,0.35)", backdropFilter: "blur(20px)", boxShadow: "0 24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)" }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-[#FFD700] to-transparent opacity-60" />
              <p className="text-xs text-[#FFD700]/80 tracking-[0.15em] uppercase mb-4">Happy Birthday</p>
              <p className="text-5xl mb-4">🎉</p>
              <p className="text-4xl font-serif font-bold text-white mb-6">Priya</p>
              <p className="text-sm text-white/70 italic font-serif leading-relaxed max-w-[200px]">"Wishing you all the happiness in the world."</p>
            </div>
            {/* Orbs */}
            <motion.div animate={{ y: [-6, 6, -6] }} transition={{ duration: 3.5, repeat: Infinity }} className="absolute -top-6 -right-4 text-5xl drop-shadow-xl z-20">💖</motion.div>
            <motion.div animate={{ y: [5, -5, 5] }} transition={{ duration: 4.5, repeat: Infinity }} className="absolute top-1/4 -left-10 text-4xl drop-shadow-xl z-20">✨</motion.div>
            <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 4, repeat: Infinity }} className="absolute bottom-16 -right-8 text-6xl drop-shadow-xl z-20">🐼</motion.div>
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.5, repeat: Infinity }} className="absolute -bottom-4 left-10 text-[#FFD700] text-2xl z-20">✦</motion.div>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}} />
    </div>
  );
}
