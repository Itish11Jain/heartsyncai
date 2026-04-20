import type { IntelligenceReport } from "@workspace/api-client-react";

const STORAGE_KEY = "heartsync_report_v3";

// Clean up any stale keys from earlier implementations
try {
  ["heartsync_free_session_id", "heartsync_free_claimed_v2", "heartsync_last_report_v2"].forEach(k =>
    localStorage.removeItem(k)
  );
} catch { /* ignore */ }

interface ReportStoreData {
  report: IntelligenceReport;
  sessionId: string;
  isFreeReport: boolean;
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

// Loaded once at module init — presence here means the user has already had a report
const initialData = loadFromStorage();

export const reportStore = {
  data: initialData,

  set(report: IntelligenceReport) {
    // First report = no prior entry existed when the module loaded
    const isFreeReport = initialData === null;

    const entry: ReportStoreData = {
      report,
      sessionId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      isFreeReport,
    };
    this.data = entry;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    } catch { /* ignore storage quota errors */ }
  },
};
