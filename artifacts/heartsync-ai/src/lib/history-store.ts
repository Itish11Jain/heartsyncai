import type { IntelligenceReport } from "@workspace/api-client-react";

const HISTORY_KEY = "heartsync_history_v1";
const MAX_ENTRIES = 20;
export const VIEWABLE_MS = 24 * 60 * 60 * 1000;

export interface HistoryEntry {
  id: string;
  partnerName: string;
  occasion: string;
  generatedAt: number;
  report: IntelligenceReport;
}

function load(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function save(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch { /* ignore quota errors */ }
}

export const historyStore = {
  add(report: IntelligenceReport, occasion: string): HistoryEntry {
    const entries = load();
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      partnerName: report.partnerName,
      occasion,
      generatedAt: Date.now(),
      report,
    };
    const updated = [entry, ...entries].slice(0, MAX_ENTRIES);
    save(updated);
    return entry;
  },

  list(): HistoryEntry[] {
    return load();
  },

  getById(id: string): HistoryEntry | null {
    return load().find((e) => e.id === id) ?? null;
  },

  isViewable(entry: HistoryEntry): boolean {
    return Date.now() - entry.generatedAt < VIEWABLE_MS;
  },
};
