import { useEffect } from "react";
import { useSignIn } from "@clerk/react";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

/**
 * Thin redirect page — mounts inside ClerkAuthLayer (added to AUTH_ROUTE_PREFIXES)
 * so ClerkProvider is guaranteed to be stable and fully initialized here.
 *
 * Reads ?return_url= from the query string, calls signIn.create() with
 * strategy "oauth_google", and navigates directly to Google's OAuth page.
 * Falls back to /sign-in if anything goes wrong.
 */
export default function GoogleAuth() {
  const { signIn, isLoaded } = useSignIn();

  useEffect(() => {
    if (!isLoaded) return;

    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get("return_url") || window.location.origin + BASE + "/";
    const fallback = `${window.location.origin}${BASE}/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`;

    if (!signIn) {
      window.location.href = fallback;
      return;
    }

    signIn
      .create({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}${BASE}/sign-in/sso-callback`,
        actionCompleteRedirectUrl: returnUrl,
      })
      .then((attempt) => {
        const redirectTo =
          attempt.firstFactorVerification?.externalVerificationRedirectURL?.toString();
        if (redirectTo && redirectTo !== "null" && redirectTo !== "undefined") {
          window.location.href = redirectTo;
        } else {
          window.location.href = fallback;
        }
      })
      .catch(() => {
        window.location.href = fallback;
      });
  }, [isLoaded, signIn]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at 50% 0%, #1a0a2e 0%, #0d0618 60%, #04000c 100%)",
      }}
    >
      <svg
        style={{ width: 36, height: 36, animation: "spin 0.8s linear infinite" }}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle cx="12" cy="12" r="10" stroke="rgba(168,85,247,0.25)" strokeWidth="3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
