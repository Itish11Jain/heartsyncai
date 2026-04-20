import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { authStore } from "@/lib/auth-store";

setAuthTokenGetter(() => authStore.sessionToken);

createRoot(document.getElementById("root")!).render(<App />);
