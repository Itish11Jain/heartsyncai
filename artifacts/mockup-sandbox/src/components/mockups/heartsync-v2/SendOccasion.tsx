import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import "./_group.css";

const OCCASIONS = [
  { id: "just_because", emoji: "🌸", label: "Just Because", sub: "Main character energy, no occasion needed" },
  { id: "i_love_you", emoji: "💖", label: "I Love You", sub: "When an emoji really isn't enough" },
  { id: "birthday", emoji: "🎉", label: "Birthday", sub: "Make their whole day stop and smile" },
  { id: "sorry", emoji: "🙏", label: "Sorry", sub: "Skip the awkward text. Send a moment instead" },
  { id: "thank_you", emoji: "💛", label: "Thank You", sub: "Real gratitude, not just 'tysm'" },
  { id: "feel_good", emoji: "🌟", label: "Feel Good", sub: "A little pick-me-up, hand-delivered" },
];

export function SendOccasion() {
  const [selected, setSelected] = useState("just_because");

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col items-center px-4 py-4" style={{ width: 390, margin: "0 auto", background: "radial-gradient(ellipse at 50% 20%, #1a0a2e 0%, #0d0618 60%, #060310 100%)" }}>
      
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between mb-8 pt-2">
        <button className="flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex gap-1.5">
          <div className="w-6 h-1.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500]" />
          <div className="w-2 h-1.5 rounded-full bg-white/15" />
          <div className="w-2 h-1.5 rounded-full bg-white/15" />
        </div>
        <div className="w-[50px]" /> {/* spacer for balance */}
      </div>

      {/* Headlines */}
      <div className="flex flex-col items-center text-center mb-8 relative w-full">
        <motion.span animate={{ scale:[0,1.2,0], opacity:[0,1,0] }} transition={{ duration:2, repeat:Infinity }} className="absolute -top-3 left-[15%] text-[#FFD700] text-xs">✦</motion.span>
        <motion.span animate={{ scale:[0,1,0], opacity:[0,0.8,0] }} transition={{ duration:2.5, delay: 1, repeat:Infinity }} className="absolute bottom-1 right-[10%] text-primary text-sm">✦</motion.span>
        
        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
          What's the vibe for <span className="text-[#FFD700]">Priya</span>?
        </h1>
        <p className="text-sm text-white/40">Tap one — we'll write it</p>
      </div>

      {/* Occasions List */}
      <div className="w-full flex flex-col gap-3">
        {OCCASIONS.map(occ => {
          const isSel = selected === occ.id;
          return (
            <motion.button
              key={occ.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(occ.id)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
              style={{
                background: isSel ? "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,165,0,0.05))" : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${isSel ? "rgba(255,215,0,0.4)" : "rgba(255,255,255,0.08)"}`
              }}
            >
              <span className="text-[28px] drop-shadow-md">{occ.emoji}</span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white mb-0.5">{occ.label}</span>
                <span className="text-xs text-white/50">{occ.sub}</span>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  );
}
