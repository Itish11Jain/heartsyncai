import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { authStore } from "@/lib/auth-store";
import { startTrackingVitals } from "@/lib/trackVitals";

setAuthTokenGetter(() => authStore.sessionToken);

createRoot(document.getElementById("root")!).render(<App />);

// Kick off Web Vitals tracking after React mounts. Lazy-imports the
// `web-vitals` package so it never blocks the initial paint.
if (typeof window !== "undefined") {
  const ric = (cb: () => void, timeout = 2000) => {
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void };
    if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(cb, { timeout });
    else setTimeout(cb, 1500);
  };
  ric(() => startTrackingVitals());

  // Warm up the /send route bundle once the browser is idle. Almost every
  // visitor that converts on the landing page heads straight to /send, so
  // pre-pulling the chunk eliminates the navigation stall without delaying
  // the initial paint. Conservative on connection quality — most Indian
  // mobile traffic is 3g/4g; we only warm-load on 4g+ to avoid competing
  // with critical resources on slower links.
  ric(() => {
    try {
      const conn = (navigator as unknown as {
        connection?: { saveData?: boolean; effectiveType?: string };
      }).connection;
      if (conn?.saveData) return;
      // effectiveType is one of "slow-2g" | "2g" | "3g" | "4g". Only proceed on 4g
      // (or when the API isn't available — desktop browsers without NetworkInformation).
      if (conn?.effectiveType && conn.effectiveType !== "4g") return;
      void import("./pages/send");
    } catch { /* non-critical */ }
  }, 4000);
}
