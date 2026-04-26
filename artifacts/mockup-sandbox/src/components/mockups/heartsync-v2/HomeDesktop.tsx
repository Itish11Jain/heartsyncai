import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { CardIllustration } from "./CardIllustration";
import "./_group.css";

export function HomeDesktop() {
  return (
    <div
      className="w-full text-foreground flex items-center justify-center p-12 overflow-hidden"
      style={{
        minHeight: 720,
        background: "radial-gradient(ellipse at 50% 20%, #1a0a2e 0%, #0d0618 60%, #060310 100%)",
      }}
    >
      <div className="max-w-[1100px] w-full grid grid-cols-2 gap-16 items-center">

        {/* Left Column */}
        <div className="flex flex-col items-start relative z-10">

          <div className="mb-5 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-white/80">2 cards free. Try now.</span>
          </div>

          <h1 className="text-6xl sm:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-4">
            Send love <br /> in a card.
          </h1>

          <div className="mb-5 relative inline-block">
            <p
              className="text-lg font-medium tracking-wide"
              style={{
                background: "linear-gradient(90deg, #FFD700, #FFA500, #FFD700)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundSize: "200% auto",
                animation: "shimmer 3s linear infinite",
              }}
            >
              Personalised · 100+ Unique Templates · All Occasions
            </p>
          </div>

          <p className="text-[17px] text-white/60 mb-6 max-w-md leading-relaxed">
            We write the perfect heartfelt message for you. Pick a style. Share in 20 seconds.
          </p>

          <div className="flex items-center gap-3 mb-6 opacity-70">
            <div className="text-xs font-medium bg-white/10 px-3 py-1.5 rounded-md text-white/80">Pick who it's for</div>
            <ChevronRight className="w-4 h-4 text-white/40" />
            <div className="text-xs font-medium bg-white/10 px-3 py-1.5 rounded-md text-white/80">We write the message</div>
            <ChevronRight className="w-4 h-4 text-white/40" />
            <div className="text-xs font-medium bg-white/10 px-3 py-1.5 rounded-md text-white/80">Share the link</div>
          </div>

          {/* SINGLE PRIMARY CTA — name capture happens on mobile hero */}
          <div className="w-full max-w-md mb-5">
            <Button className="w-full h-16 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xl border-none shadow-[0_4px_25px_rgba(236,72,153,0.35)] hover:shadow-[0_8px_35px_rgba(236,72,153,0.5)] transition-all hover:-translate-y-0.5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
              Send a free card now! →
            </Button>
          </div>

          {/* Social proof — directly UNDER the CTA */}
          <div className="flex items-center gap-4 opacity-85">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-[#0d0618] bg-gradient-to-br from-primary to-secondary opacity-90 shadow-md"
                />
              ))}
            </div>
            <span className="text-sm font-medium text-white/65">3,200+ cards sent this month</span>
          </div>
        </div>

        {/* Right Column — real animated CardIllustration */}
        <div className="relative flex justify-center items-center">
          <CardIllustration />
        </div>

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
