import type { IntelligenceReport } from "@workspace/api-client-react";

const STORAGE_KEY = "heartsync_report_v6";
const EXPIRY_MS = 48 * 60 * 60 * 1000;

try {
  [
    "heartsync_free_session_id",
    "heartsync_free_claimed_v2",
    "heartsync_last_report_v2",
    "heartsync_report_v3",
    "heartsync_report_v4",
    "heartsync_report_v5",
  ].forEach((k) => localStorage.removeItem(k));
} catch { /* ignore */ }

interface ReportStoreData {
  report: IntelligenceReport;
  sessionId: string;
  generatedAt: number;
}

function loadFromStorage(): ReportStoreData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReportStoreData;
    if (!parsed.generatedAt || Date.now() - parsed.generatedAt > EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export const reportStore = {
  data: loadFromStorage(),

  set(report: IntelligenceReport): void {
    const entry: ReportStoreData = {
      report,
      sessionId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      generatedAt: Date.now(),
    };
    this.data = entry;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    } catch { /* ignore storage quota errors */ }
  },

  expiresAt(): number | null {
    return this.data?.generatedAt ? this.data.generatedAt + EXPIRY_MS : null;
  },
};
