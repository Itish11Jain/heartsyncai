import type { IntelligenceReport } from "@workspace/api-client-react";

export const reportStore = {
  data: null as IntelligenceReport | null,
  set(data: IntelligenceReport) {
    this.data = data;
  }
};
