import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NotFound from "@/pages/not-found";

/* Radix UI (TooltipProvider + Toaster) is not needed for the first paint.
 * Lazy-loading this wrapper removes the 22 KB gzip radix chunk from the
 * critical modulepreload list so card/crystal/cosmic/vinyl visitors don't
 * pay for it up-front. The fallback renders AppRoutes directly (no tooltip
 * context) while the shell loads — the HTML splash hides the transition. */
const AppShellProvider = lazy(() => import("@/components/AppShellProvider"));

/* Home is the largest page (Framer Motion + confetti + testimonials).
 * Lazy-loading it moves the 123 KB motion chunk out of the critical path
 * so /card, /crystal, /cosmic, /vinyl visitors never download it.
 * The HTML splash screen bridges the tiny extra fetch delay on /. */
const Home = lazy(() => import("@/pages/home"));

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const queryClient = new QueryClient();

/* ── Lazy public pages (no auth needed) ─────────────────────────────── */
const Preview = lazy(() => import("@/pages/preview"));
const Generate = lazy(() => import("@/pages/generate"));
const Report = lazy(() => import("@/pages/report"));
const Contact = lazy(() => import("@/pages/contact"));
const Terms = lazy(() => import("@/pages/terms"));
const History = lazy(() => import("@/pages/history"));
const Moments = lazy(() => import("@/pages/moments"));
const DateGuide = lazy(() => import("@/pages/date-guide"));
const CardExperience = lazy(() => import("@/pages/card"));
const CrystalCard = lazy(() => import("@/pages/crystal"));
const CosmicCard = lazy(() => import("@/pages/cosmic"));
const VinylCard = lazy(() => import("@/pages/vinyl"));

/* ── Lazy auth-required pages (Clerk) ───────────────────────────────── */
const Send = lazy(() => import("@/pages/send"));
const Analytics = lazy(() => import("@/pages/analytics"));
const RemoveWatermark = lazy(() => import("@/pages/remove-watermark"));
const Account = lazy(() => import("@/pages/account"));

/* ── Lazy Clerk wrapper (loads ~250 KB only when needed) ────────────── */
const ClerkAuthLayer = lazy(() => import("@/components/ClerkAuthLayer"));

/* Routes that need ClerkProvider mounted around them. The check is a
 * prefix match against the URL pathname (after the basePath strip). */
/* /card is intentionally absent: Clerk now mounts lazily inside SenderPanel
 * only when isSender===true. Recipients of the default envelope card never
 * trigger a Clerk download at all, cutting ~250 KB from their critical path. */
const AUTH_ROUTE_PREFIXES = ["/sign-in", "/sign-up", "/sign-out", "/account", "/send", "/analytics", "/remove-watermark", "/crystal", "/cosmic", "/vinyl"];

function SuspenseFallback() {
  /* The HTML splash (`#hs-splash`) is still on screen for the very first paint,
   * and pages dismiss it themselves via window.__clearHsSplash(). For
   * route-to-route navigation Suspense fallbacks, we render nothing — the
   * previous page stays painted until the new chunk loads, which feels
   * snappier than a flash of an empty wrapper. */
  return null;
}

/** Dismisses the HTML splash overlay once a lazy-loaded page actually mounts.
 * Keeping the splash visible until the chunk finishes loading bridges the
 * gap on slow connections; this clears it the instant real content is ready. */
function SplashClearer() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const clear = (window as unknown as { __clearHsSplash?: () => void }).__clearHsSplash;
    if (clear) clear();
  }, []);
  return null;
}

function L({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      {children}
      <SplashClearer />
    </Suspense>
  );
}

function AppRoutes() {
  const [location] = useLocation();
  const needsClerk = AUTH_ROUTE_PREFIXES.some(
    (p) => location === p || location.startsWith(p + "/"),
  );

  const switchEl = (
    <Switch>
      {/* Public — instant, no Clerk, no Firebase */}
      <Route path="/"><L><Home /></L></Route>
      <Route path="/terms"><L><Terms /></L></Route>
      <Route path="/contact"><L><Contact /></L></Route>
      <Route path="/preview"><L><Preview /></L></Route>
      <Route path="/generate"><L><Generate /></L></Route>
      <Route path="/report"><L><Report /></L></Route>
      <Route path="/history"><L><History /></L></Route>
      <Route path="/moments"><L><Moments /></L></Route>
      <Route path="/date-guide"><L><DateGuide /></L></Route>
      <Route path="/card"><L><CardExperience /></L></Route>
      <Route path="/crystal"><L><CrystalCard /></L></Route>
      <Route path="/cosmic"><L><CosmicCard /></L></Route>
      <Route path="/vinyl"><L><VinylCard /></L></Route>

      {/* Auth-required — only matched when ClerkAuthLayer is mounted around the Switch.
          (When Clerk isn't mounted, the user can't be on /send or /analytics anyway.) */}
      <Route path="/send"><L><Send /></L></Route>
      <Route path="/analytics"><L><Analytics /></L></Route>
      <Route path="/remove-watermark"><L><RemoveWatermark /></L></Route>
      <Route path="/account"><L><Account /></L></Route>

      <Route component={NotFound} />
    </Switch>
  );

  if (needsClerk) {
    /* SplashClearer is intentionally NOT placed here.
     * If we put it at this level it fires as soon as the ClerkAuthLayer chunk
     * resolves — BEFORE the inner page chunk (e.g. send) has rendered — leaving
     * a blank screen for the remaining download time.  Each page is wrapped in
     * L() which has its own SplashClearer that fires only after the page itself
     * mounts.  Combined with the 8 s safety auto-clear in index.html (for /send)
     * this guarantees the "Create a card 💌" hero heading stays visible until
     * the form is actually ready, keeping the splash as our LCP candidate. */
    return (
      <Suspense fallback={<SuspenseFallback />}>
        <ClerkAuthLayer>{switchEl}</ClerkAuthLayer>
      </Suspense>
    );
  }

  return switchEl;
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        {/* AppShellProvider (Radix TooltipProvider + Toaster) loads lazily.
            While it fetches, the fallback renders routes without tooltip/toast
            context — imperceptible because the HTML splash is still covering
            the viewport. Once the tiny chunk arrives, the full tree mounts. */}
        <Suspense fallback={<AppRoutes />}>
          <AppShellProvider>
            <AppRoutes />
          </AppShellProvider>
        </Suspense>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
