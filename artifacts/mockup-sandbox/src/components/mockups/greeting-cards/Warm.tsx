import React from 'react';
import { motion } from 'framer-motion';

export function Warm() {
  return (
    <div className="min-h-screen bg-[#fff3e8] flex items-center justify-center p-4">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blob-pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(1.05); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.1; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
        
        .blob-1 { animation: blob-pulse 6s ease-in-out infinite; }
        .blob-2 { animation: blob-pulse 7s ease-in-out infinite 1s; }
        .blob-3 { animation: blob-pulse 5s ease-in-out infinite 2s; }
        .blob-4 { animation: blob-pulse 8s ease-in-out infinite 0.5s; }
        
        .twinkle-1 { animation: twinkle 3s ease-in-out infinite; }
        .twinkle-2 { animation: twinkle 4s ease-in-out infinite 1s; }
        .twinkle-3 { animation: twinkle 2.5s ease-in-out infinite 0.5s; }
        .twinkle-4 { animation: twinkle 5s ease-in-out infinite 2s; }
        .twinkle-5 { animation: twinkle 3.5s ease-in-out infinite 1.5s; }
        .twinkle-6 { animation: twinkle 4.5s ease-in-out infinite 0.2s; }
        .twinkle-7 { animation: twinkle 3s ease-in-out infinite 2.5s; }
        .twinkle-8 { animation: twinkle 5.5s ease-in-out infinite 0.8s; }
      `}} />

      <div 
        className="relative w-[340px] h-[420px] rounded-3xl overflow-hidden flex flex-col items-center justify-center p-8"
        style={{
          background: 'linear-gradient(135deg, #fff8f0 0%, #ffe4cc 50%, #ffd4b0 100%)',
          boxShadow: '0 20px 25px -5px rgba(255, 180, 150, 0.2), 0 8px 10px -6px rgba(255, 180, 150, 0.2)'
        }}
      >
        {/* Watercolour Blobs */}
        <div className="absolute top-[-20%] left-[-20%] w-64 h-64 rounded-full bg-[#ffb69b] blur-[40px] blob-1 mix-blend-multiply" />
        <div className="absolute bottom-[-10%] right-[-20%] w-72 h-72 rounded-full bg-[#fca5a5] blur-[50px] blob-2 mix-blend-multiply" />
        <div className="absolute top-[30%] right-[-30%] w-56 h-56 rounded-full bg-[#fcd34d] blur-[45px] blob-3 mix-blend-multiply" />
        <div className="absolute bottom-[20%] left-[-10%] w-48 h-48 rounded-full bg-[#f87171] blur-[40px] blob-4 mix-blend-multiply" />

        {/* Twinkles */}
        <div className="absolute top-[15%] left-[20%] text-amber-500/60 text-xs twinkle-1">✦</div>
        <div className="absolute top-[25%] right-[15%] text-rose-400/60 text-[10px] twinkle-2">★</div>
        <div className="absolute top-[45%] left-[10%] text-amber-400/50 text-sm twinkle-3">✦</div>
        <div className="absolute bottom-[30%] right-[20%] text-rose-300/70 text-xs twinkle-4">✦</div>
        <div className="absolute bottom-[15%] left-[25%] text-amber-500/40 text-[10px] twinkle-5">★</div>
        <div className="absolute top-[60%] right-[10%] text-rose-400/50 text-xs twinkle-6">✦</div>
        <div className="absolute top-[10%] right-[40%] text-amber-300/60 text-[10px] twinkle-7">★</div>
        <div className="absolute bottom-[25%] left-[15%] text-rose-300/50 text-sm twinkle-8">✦</div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center w-full mt-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-amber-700/60 mb-2 font-medium">
              For
            </span>
            <h1 
              className="text-4xl text-[#5c2d0a] font-bold mb-4" 
              style={{ fontFamily: "'Dancing Script', cursive" }}
            >
              Priya
            </h1>
          </motion.div>

          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex items-center w-3/4 my-4 opacity-50"
          >
            <div className="flex-grow h-px bg-gradient-to-r from-transparent via-[#5c2d0a] to-transparent"></div>
            <span className="text-[#5c2d0a] text-xs mx-2">❤</span>
            <div className="flex-grow h-px bg-gradient-to-l from-transparent via-[#5c2d0a] to-transparent"></div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            <p 
              className="text-[14px] text-[#5c2d0a]/80 leading-relaxed max-w-[220px]"
              style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
            >
              "Every moment with you feels like a dream come true, Priya."
            </p>
          </motion.div>
        </div>

        {/* Watermark */}
        <div className="absolute bottom-4 right-5 text-[10px] text-amber-700/40 font-sans tracking-wide">
          <span className="opacity-75">💙</span> HeartSync AI
        </div>
      </div>
    </div>
  );
}
