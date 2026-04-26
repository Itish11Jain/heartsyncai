import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CardIllustration } from "./CardIllustration";
import "./_group.css";

export function HomeMobile() {
  return (
    <div
      className="w-full text-foreground flex flex-col items-center px-5 pt-5 pb-4 overflow-hidden relative"
      style={{
        width: 390,
        height: 844,
        margin: "0 auto",
        background: "radial-gradient(ellipse at 50% 20%, #1a0a2e 0%, #0d0618 60%, #060310 100%)",
      }}
    >
      {/* Brand mark */}
      <div className="w-full mb-3">
        <span className="text-xs font-semibold tracking-wider text-white/40 uppercase">✦ HeartSync</span>
      </div>

      {/* Headline */}
      <h1 className="text-[34px] font-extrabold text-white leading-[1.05] tracking-tight mb-2 w-full">
        Send love <br /> in a card.
      </h1>

      {/* Shimmer subline */}
      <div className="w-full mb-4 relative">
        <p
          className="text-[13px] font-medium tracking-wide"
          style={{
            background: "linear-gradient(90deg, #FFD700, #FFA500, #FFD700)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundSize: "200% auto",
            animation: "shimmer 3s linear infinite",
          }}
        >
          Pick who it's for · We write it · You share
        </p>
      </div>

      {/* Real animated CardIllustration — scaled to fit mobile fold */}
      <div className="relative flex items-center justify-center mb-3" style={{ height: 240 }}>
        <div style={{ transform: "scale(0.62)", transformOrigin: "center center" }}>
          <CardIllustration />
        </div>
      </div>

      {/* Single CTA block — gradient-bordered name input + primary CTA */}
      <div className="w-full flex flex-col gap-2.5 mb-3 relative z-10">
        <div className="flex flex-col gap-1">
          {/* Gradient border wrapper matching CTA pink→orange */}
          <div
            className="rounded-2xl p-[1.5px]"
            style={{
              background: "linear-gradient(90deg, hsl(328 86% 59%), hsl(24 95% 53%))",
              boxShadow: "0 0 18px rgba(236,72,153,0.18)",
            }}
          >
            <Input
              placeholder="Who is the card for?"
              className="h-13 rounded-[14px] border-0 bg-[#0d0618] text-white placeholder:text-white/35 px-4 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{ height: 52 }}
            />
          </div>
          <p className="text-[10.5px] text-white/40 pl-2">First name only — Priya, Aryan, Mom...</p>
        </div>

        <Button
          className="h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-[17px] border-none shadow-[0_4px_20px_rgba(236,72,153,0.35)] hover:shadow-[0_8px_25px_rgba(236,72,153,0.5)] transition-all relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
          Send a free card now! →
        </Button>
      </div>

      {/* Social proof — directly under CTA */}
      <div className="flex items-center justify-center gap-2.5 w-full opacity-85">
        <div className="flex -space-x-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="w-6 h-6 rounded-full border-2 border-[#0d0618] bg-gradient-to-br from-primary to-secondary opacity-90"
            />
          ))}
        </div>
        <span className="text-[11.5px] font-medium text-white/65">
          3,200+ cards sent this month
        </span>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}} />
    </div>
  );
}
