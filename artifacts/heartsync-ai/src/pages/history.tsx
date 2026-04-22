import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Clock, HeartPulse, ArrowRight, Sparkles } from "lucide-react";
import { historyStore, VIEWABLE_MS, type HistoryEntry } from "@/lib/history-store";
import { reportStore } from "@/lib/store";
import { authStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import AuthGate from "@/components/AuthGate";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(diff / 86400000);
  return `${days}d ago`;
}

function timeLeft(ts: number): string {
  const remaining = VIEWABLE_MS - (Date.now() - ts);
  if (remaining <= 0) return "";
  const hrs = Math.floor(remaining / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);
  if (hrs > 0) return `Expires in ${hrs}h ${mins}m`;
  return `Expires in ${mins}m`;
}

function ReportCard({ entry, onView }: { entry: HistoryEntry; onView: (e: HistoryEntry) => void }) {
  const viewable = historyStore.isViewable(entry);
  const date = new Date(entry.generatedAt);
  const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/[0.03] border rounded-2xl p-5 flex items-center justify-between gap-4 ${
        viewable ? "border-white/[0.08]" : "border-white/[0.04] opacity-60"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-white font-semibold text-base truncate">{entry.partnerName}</p>
          <span className="text-white/30 text-xs shrink-0">·</span>
          <span className="text-white/40 text-xs shrink-0 truncate">{entry.occasion}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-white/25 shrink-0" />
          <span className="text-white/30 text-xs">{dateStr}</span>
          {viewable && (
            <>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-primary/70 text-xs">{timeLeft(entry.generatedAt)}</span>
            </>
          )}
          {!viewable && (
            <>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-white/25 text-xs">Expired</span>
            </>
          )}
        </div>
      </div>

      {viewable ? (
        <Button
          size="sm"
          onClick={() => onView(entry)}
          className="shrink-0 h-9 px-4 rounded-xl bg-primary/90 hover:bg-primary text-white text-xs font-semibold flex items-center gap-1.5"
        >
          View <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      ) : (
        <span className="shrink-0 text-[11px] text-white/20 font-medium bg-white/[0.04] px-3 py-1 rounded-lg">
          Expired
        </span>
      )}
    </motion.div>
  );
}

export default function History() {
  const [, setLocation] = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(authStore.isLoggedIn);
  const entries = historyStore.list();

  function handleAuthSuccess() {
    setIsLoggedIn(true);
  }

  function handleView(entry: HistoryEntry) {
    reportStore.set(entry.report);
    setLocation("/report");
  }

  if (!isLoggedIn) {
    return <AuthGate onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-50">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <Button asChild variant="ghost" className="pl-0 text-white/60 hover:text-white hover:bg-transparent">
            <Link href="/generate" className="flex items-center gap-2">
              <ChevronLeft className="w-5 h-5" /> Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-primary to-secondary p-1.5 rounded-lg">
              <HeartPulse className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">HeartSync AI</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold text-white mb-1">My Guides</h1>
          <p className="text-white/45 text-sm mb-8">Guides are viewable for 24 hours after generation.</p>

          {entries.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-white/20" />
              </div>
              <p className="text-white/40 mb-6">No guides yet. Generate your first one!</p>
              <Button asChild className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold">
                <Link href="/generate">Generate a Guide</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <ReportCard key={entry.id} entry={entry} onView={handleView} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
