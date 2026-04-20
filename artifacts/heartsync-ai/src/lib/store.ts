import type { IntelligenceReport } from "@workspace/api-client-react";

interface ReportStoreData {
  report: IntelligenceReport;
  sessionId: string;
}

export const reportStore = {
  data: null as ReportStoreData | null,
  set(report: IntelligenceReport) {
    this.data = {
      report,
      sessionId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
  }
};
