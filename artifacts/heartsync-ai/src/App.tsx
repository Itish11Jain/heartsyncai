import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { dark } from "@clerk/themes";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Preview from "@/pages/preview";
import Generate from "@/pages/generate";
import Report from "@/pages/report";
import Contact from "@/pages/contact";
import Terms from "@/pages/terms";
import History from "@/pages/history";
import Moments from "@/pages/moments";
import DateGuide from "@/pages/date-guide";
import Send from "@/pages/send";
import CardExperience from "@/pages/card";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const queryClient = new QueryClient();

const clerkAppearance = {
  theme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${typeof window !== "undefined" ? window.location.origin : ""}${basePath}/logo.svg`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "#FFD700",
    colorForeground: "#ffffff",
    colorMutedForeground: "rgba(255,255,255,0.45)",
    colorDanger: "#ef4444",
    colorBackground: "#110722",
    colorInput: "rgba(255,255,255,0.07)",
    colorInputForeground: "#ffffff",
    colorNeutral: "rgba(255,255,255,0.18)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    borderRadius: "12px",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "bg-[#0d0618] border border-white/10 rounded-2xl w-[420px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white font-bold text-xl",
    headerSubtitle: "text-white/50 text-sm",
    socialButtonsBlockButtonText: "text-white font-medium",
    formFieldLabel: "text-white/70 text-sm",
    footerActionLink: "text-yellow-400 hover:text-yellow-300",
    footerActionText: "text-white/50",
    dividerText: "text-white/35",
    identityPreviewEditButton: "text-yellow-400",
    formFieldSuccessText: "text-green-400",
    alertText: "text-white",
    logoBox: "flex justify-center mb-2",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton: "border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl",
    formButtonPrimary: "bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-bold rounded-xl hover:opacity-90",
    formFieldInput: "bg-white/5 border border-white/10 text-white rounded-xl",
    footerAction: "border-t border-white/10",
    dividerLine: "bg-white/10",
    alert: "bg-red-500/10 border border-red-500/20 rounded-xl",
    otpCodeFieldInput: "bg-white/5 border border-white/10 text-white rounded-lg",
    formFieldRow: "gap-2",
    main: "gap-4",
  },
};

function SignInPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "radial-gradient(ellipse at 50% 20%, #1a0a2e 0%, #0d0618 60%, #060310 100%)",
      }}
    >
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/send`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "radial-gradient(ellipse at 50% 20%, #1a0a2e 0%, #0d0618 60%, #060310 100%)",
      }}
    >
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/send`}
      />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey ?? ""}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/date-guide" component={DateGuide} />
            <Route path="/preview" component={Preview} />
            <Route path="/generate" component={Generate} />
            <Route path="/report" component={Report} />
            <Route path="/contact" component={Contact} />
            <Route path="/terms" component={Terms} />
            <Route path="/history" component={History} />
            <Route path="/moments" component={Moments} />
            <Route path="/send" component={Send} />
            <Route path="/card" component={CardExperience} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
