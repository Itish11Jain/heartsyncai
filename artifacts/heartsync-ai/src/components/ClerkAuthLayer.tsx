import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from "@clerk/react";
import { dark } from "@clerk/themes";
import { Switch, Route, useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

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

const REDIRECT_STORAGE_KEY = "hs_post_auth_redirect";

function useRedirectUrl() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const raw = params.get("redirect_url");
  if (raw) {
    // Clear any stale sessionStorage entry now that we have an explicit param.
    try { sessionStorage.removeItem(REDIRECT_STORAGE_KEY); } catch { /* ignore */ }
    return decodeURIComponent(raw);
  }
  // For new Google sign-ups Clerk routes through /sign-up (losing the URL
  // param), so fall back to whatever was saved in sessionStorage.
  try {
    const stored = sessionStorage.getItem(REDIRECT_STORAGE_KEY);
    if (stored) {
      sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
      return stored;
    }
  } catch { /* ignore */ }
  return `${basePath}/send`;
}

function SignInPage() {
  const redirectUrl = useRedirectUrl();
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
        fallbackRedirectUrl={redirectUrl}
      />
    </div>
  );
}

function SignUpPage() {
  const redirectUrl = useRedirectUrl();
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
        fallbackRedirectUrl={redirectUrl}
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

const HS_SIGNED_IN_KEY = "hs_clerk_signed_in";

/** Writes/clears a localStorage flag so pages outside ClerkProvider
 *  (e.g. the home page) can react to sign-in state without the full SDK. */
function SessionSyncer() {
  const { isSignedIn, isLoaded } = useAuth();
  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (isSignedIn) {
        localStorage.setItem(HS_SIGNED_IN_KEY, "1");
      } else {
        localStorage.removeItem(HS_SIGNED_IN_KEY);
      }
    } catch { /* ignore quota errors */ }
  }, [isSignedIn, isLoaded]);
  return null;
}

/** Clears the Clerk session and bounces the user back to the home page. */
function SignOutPage() {
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  useEffect(() => {
    signOut().then(() => {
      try { localStorage.removeItem(HS_SIGNED_IN_KEY); } catch { /* ignore */ }
      setLocation("/");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

interface ClerkAuthLayerProps {
  children: React.ReactNode;
}

export default function ClerkAuthLayer({ children }: ClerkAuthLayerProps) {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey ?? ""}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => {
        // Clerk passes absolute URLs for the final post-auth redirect.
        // Wouter's setLocation can't handle those — use the browser directly.
        if (to.startsWith("http://") || to.startsWith("https://")) {
          window.location.href = to;
        } else {
          setLocation(stripBase(to));
        }
      }}
      routerReplace={(to) => {
        if (to.startsWith("http://") || to.startsWith("https://")) {
          window.location.replace(to);
        } else {
          setLocation(stripBase(to), { replace: true });
        }
      }}
    >
      <ClerkQueryClientCacheInvalidator />
      <SessionSyncer />
      <Switch>
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/sign-out" component={SignOutPage} />
        <Route>{children}</Route>
      </Switch>
    </ClerkProvider>
  );
}
