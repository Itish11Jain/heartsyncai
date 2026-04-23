import React from 'react';
import { motion } from 'framer-motion';

export function Cinematic() {
  return (
    <div className="min-h-screen bg-[#010106] flex items-center justify-center p-4">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes orb-drift {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes glow-pulse {
          0%, 100% { text-shadow: 0 0 15px rgba(139, 92, 246, 0.5), 0 0 30px rgba(139, 92, 246, 0.3); }
          50% { text-shadow: 0 0 25px rgba(139, 92, 246, 0.8), 0 0 50px rgba(139, 92, 246, 0.5); }
        }
        
        .animate-orb-1 { animation: orb-drift 12s ease-in-out infinite alternate; }
        .animate-orb-2 { animation: orb-drift 15s ease-in-out infinite alternate-reverse; }
        .animate-orb-3 { animation: orb-drift 18s ease-in-out infinite alternate; animation-delay: -5s; }
        .animate-orb-4 { animation: orb-drift 14s ease-in-out infinite alternate-reverse; animation-delay: -2s; }
        .animate-orb-5 { animation: orb-drift 16s ease-in-out infinite alternate; animation-delay: -7s; }
        .animate-orb-6 { animation: orb-drift 13s ease-in-out infinite alternate-reverse; animation-delay: -4s; }
        
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent);
          background-size: 200% 100%;
          animation: shimmer 4s infinite linear;
        }
        
        .glow-text {
          animation: glow-pulse 3s ease-in-out infinite;
        }
      `}} />

      <div className="relative w-[340px] h-[420px] rounded-3xl overflow-hidden border border-violet-500/20 bg-gradient-to-b from-[#020208] via-[#08081a] to-[#040410] shadow-[0_0_50px_rgba(139,92,246,0.1)]">
        
        {/* Bokeh Orbs */}
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-violet-600/20 blur-3xl animate-orb-1" />
        <div className="absolute top-40 right-[-20px] w-24 h-24 rounded-full bg-indigo-600/25 blur-2xl animate-orb-2" />
        <div className="absolute bottom-10 left-[-10px] w-36 h-36 rounded-full bg-purple-600/20 blur-3xl animate-orb-3" />
        <div className="absolute bottom-32 right-10 w-20 h-20 rounded-full bg-fuchsia-600/15 blur-2xl animate-orb-4" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-violet-800/20 blur-3xl animate-orb-5" />
        <div className="absolute top-[-20px] right-10 w-28 h-28 rounded-full bg-indigo-500/20 blur-2xl animate-orb-6" />

        {/* Content Container */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10">
          
          {/* Shimmer Line */}
          <div className="absolute top-[35%] w-full h-[1px] animate-shimmer opacity-50" />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="flex flex-col items-center text-center space-y-6"
          >
            <div className="space-y-2">
              <h1 className="text-4xl md:text-[40px] font-bold text-violet-100 tracking-tight glow-text font-sans">
                Priya
              </h1>
              <p className="text-sm italic text-violet-300/70 font-serif">
                You are loved
              </p>
            </div>

            <p className="text-[15px] text-white/70 leading-relaxed font-sans max-w-[240px] pt-4">
              Every moment with you feels like a dream come true.
            </p>
          </motion.div>
        </div>

        {/* Watermark */}
        <div className="absolute bottom-4 right-5 z-20">
          <p className="text-[10px] font-medium tracking-wider text-white/30 uppercase">
            <span className="text-blue-400/50 mr-1">💙</span> HeartSync AI
          </p>
        </div>
      </div>
    </div>
  );
}
