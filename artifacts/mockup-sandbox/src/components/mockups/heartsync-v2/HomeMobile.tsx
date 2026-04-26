import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import "./_group.css";

export function HomeMobile() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col items-center px-5 py-6 overflow-hidden relative" style={{ width: 390, margin: "0 auto", background: "radial-gradient(ellipse at 50% 20%, #1a0a2e 0%, #0d0618 60%, #060310 100%)" }}>
      {/* Brand mark */}
      <div className="w-full mb-8">
        <span className="text-xs font-semibold tracking-wider text-white/40 uppercase">✦ HeartSync</span>
      </div>

      {/* Headline */}
      <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-3 w-full">
        Send love <br /> in a card.
      </h1>

      {/* Subline */}
      <div className="w-full mb-8 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent blur-md" />
        <p className="text-sm font-medium tracking-wide" style={{ background: "linear-gradient(90deg, #FFD700, #FFA500, #FFD700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200% auto", animation: "shimmer 3s linear infinite" }}>
          Pick who it's for · We write it · You share
        </p>
      </div>

      {/* Static Card Preview */}
      <div className="relative w-[260px] h-[360px] mb-10 select-none">
        <div className="absolute inset-0 rounded-3xl blur-2xl scale-105 bg-gradient-to-tr from-primary/30 to-secondary/30" />
        <div className="relative w-full h-full rounded-3xl overflow-hidden p-6 flex flex-col items-center justify-center text-center" style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,215,0,0.06))", border: "1.5px solid rgba(255,215,0,0.35)", backdropFilter: "blur(20px)", boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}>
          <p className="text-[10px] text-[#FFD700]/80 tracking-widest uppercase mb-2">Happy Birthday</p>
          <p className="text-3xl mb-2">🎉</p>
          <p className="text-2xl font-serif font-bold text-white mb-3">Priya</p>
          <p className="text-xs text-white/70 italic font-serif leading-relaxed">"Wishing you all the happiness in the world."</p>
        </div>
        {/* Orbs */}
        <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity }} className="absolute -top-4 -right-2 text-3xl drop-shadow-lg">💖</motion.div>
        <motion.div animate={{ y: [3, -3, 3] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-1/4 -left-6 text-2xl drop-shadow-lg">✨</motion.div>
        <motion.div animate={{ y: [-2, 2, -2] }} transition={{ duration: 3.5, repeat: Infinity }} className="absolute bottom-10 -right-5 text-4xl drop-shadow-lg">🐼</motion.div>
      </div>

      {/* NEW PIECE - Name Input & CTA */}
      <div className="w-full flex flex-col gap-3 mb-6 relative z-10">
        <div className="flex flex-col gap-1.5">
          <Input 
            placeholder="Who is the card for?"
            className="h-14 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/30 px-4 text-lg focus-visible:ring-primary/50"
          />
          <p className="text-[11px] text-white/40 pl-2">First name only — Priya, Aryan, Mom...</p>
        </div>
        <Button className="h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg border-none shadow-[0_4px_20px_rgba(236,72,153,0.3)] hover:shadow-[0_8px_25px_rgba(236,72,153,0.4)] transition-all relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
          Let's go →
        </Button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 w-full mb-6 opacity-60">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-white/50 lowercase">or</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Secondary CTA */}
      <Button variant="outline" className="w-full h-12 rounded-xl bg-white/5 border-white/10 text-white/80 font-medium mb-8 hover:bg-white/10 hover:text-white transition-colors">
        Send a card in 20 seconds — Free
      </Button>

      {/* Social Proof */}
      <div className="flex items-center justify-center gap-3 w-full opacity-80 mt-auto pb-4">
        <div className="flex -space-x-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0d0618] bg-gradient-to-br from-primary to-secondary opacity-90" />
          ))}
        </div>
        <span className="text-xs font-medium text-white/60">3,200+ cards sent this month</span>
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
