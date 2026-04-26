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
  if ("requestIdleCallback" in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void) => void })
      .requestIdleCallback(() => startTrackingVitals());
  } else {
    setTimeout(() => startTrackingVitals(), 1500);
  }
}
