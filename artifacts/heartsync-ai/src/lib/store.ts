import type { IntelligenceReport } from "@workspace/api-client-react";

const STORAGE_KEY = "heartsync_report_v5";

try {
  [
    "heartsync_free_session_id",
    "heartsync_free_claimed_v2",
    "heartsync_last_report_v2",
    "heartsync_report_v3",
    "heartsync_report_v4",
  ].forEach((k) => localStorage.removeItem(k));
} catch { /* ignore */ }

interface ReportStoreData {
  report: IntelligenceReport;
  sessionId: string;
}

function loadFromStorage(): ReportStoreData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ReportStoreData;
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
    };
    this.data = entry;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    } catch { /* ignore storage quota errors */ }
  },
};
