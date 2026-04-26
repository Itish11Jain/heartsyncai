import { Button } from "@/components/ui/button";
import "./_group.css";

const DATA = [
  { source: "ig_reels_v1", visits: "1,840", clicks: "612", cards: "3", rate: "0.16%", highlight: true },
  { source: "ig_story_v2", visits: "1,210", clicks: "188", cards: "1", rate: "0.08%" },
  { source: "ig_landing_send", visits: "720", clicks: "95", cards: "0", rate: "0.00%" },
  { source: "direct (no utm)", visits: "230", clicks: "41", cards: "0", rate: "0.00%" },
  { source: "TOTAL", visits: "4,000", clicks: "936", cards: "4", rate: "0.10%", total: true },
];

export function AnalyticsUtmTile() {
  return (
    <div className="w-full min-h-screen bg-background flex items-center justify-center p-6" style={{ background: "radial-gradient(ellipse at 50% 10%, #1a0a2e 0%, #0d0618 70%)" }}>
      <div className="w-full max-w-[640px] rounded-2xl overflow-hidden p-6 relative" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,215,0,0.1)" }}>
        
        {/* Header */}
        <div className="mb-6">
          <p className="text-[11px] font-bold text-[#FFD700]/70 tracking-[0.08em] uppercase mb-1">Attribution</p>
          <h2 className="text-lg font-bold text-white mb-1">Conversions by source (UTM)</h2>
          <p className="text-xs text-white/40">First-touch attribution — captured from utm_source/utm_medium/utm_campaign on first landing.</p>
        </div>

        {/* Table */}
        <div className="w-full rounded-xl overflow-hidden mb-6" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
          {/* Table Header */}
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Source</span>
            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider text-right">Visits</span>
            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider text-right">CTA Clicks</span>
            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider text-right">Cards Created</span>
            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider text-right">Conv. Rate</span>
          </div>

          {/* Rows */}
          {DATA.map((row, i) => (
            <div 
              key={i} 
              className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] px-4 py-3 items-center text-[13px]"
              style={{
                borderBottom: i < DATA.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                background: row.highlight ? "linear-gradient(90deg, rgba(52,211,153,0.05), transparent)" : "transparent",
                borderTop: row.total ? "1px solid rgba(255,255,255,0.1)" : "none",
              }}
            >
              <span className={`text-white/80 font-mono text-xs ${row.total ? "font-bold text-white" : ""}`}>{row.source}</span>
              <span className={`text-right tabular-nums ${row.total ? "font-bold text-white" : "text-white/60"}`}>{row.visits}</span>
              <span className={`text-right tabular-nums ${row.total ? "font-bold text-white" : "text-white/60"}`}>{row.clicks}</span>
              <span className={`text-right tabular-nums ${row.total ? "font-bold text-[#FFD700]" : "text-[#FFD700]/80"}`}>{row.cards}</span>
              <span className={`text-right tabular-nums ${row.total ? "font-bold text-[#FFD700]" : "text-[#FFD700]/80"}`}>{row.rate}</span>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="rounded-full bg-white/5 border-white/10 text-[#FFD700] hover:bg-white/10 hover:text-[#FFD700] h-8 text-xs px-4">
            Export CSV
          </Button>
        </div>

      </div>
    </div>
  );
}
