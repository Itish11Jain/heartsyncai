import type { IntelligenceReport } from "@workspace/api-client-react";

const STORAGE_KEY = "heartsync_last_report_v2";
const FREE_CLAIMED_KEY = "heartsync_free_claimed_v2";

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

export const reportStore = {
  data: loadFromStorage(),
  set(report: IntelligenceReport) {
    const freeClaimed = localStorage.getItem(FREE_CLAIMED_KEY) === "true";
    const isFreeReport = !freeClaimed;

    if (isFreeReport) {
      localStorage.setItem(FREE_CLAIMED_KEY, "true");
    }

    const entry: ReportStoreData = {
      report,
      sessionId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      isFreeReport,
    };
    this.data = entry;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    } catch {
      // Ignore storage quota errors
    }
  }
};
