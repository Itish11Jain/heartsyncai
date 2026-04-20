import type { IntelligenceReport } from "@workspace/api-client-react";

const STORAGE_KEY = "heartsync_last_report";

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
  set(report: IntelligenceReport) {
    const entry: ReportStoreData = {
      report,
      sessionId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    this.data = entry;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    } catch {
      // Ignore storage quota errors
    }
  }
};
