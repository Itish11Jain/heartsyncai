import { useEffect, useContext } from "react";
import { useAuth, useClerk, useUser } from "@clerk/react";
import { SendAuthCtx } from "@/contexts/sendAuthContext";

/**
 * Mounts inside ClerkProvider (via ClerkAuthLayer) and bridges Clerk's auth
 * state into SendAuthCtx so the Send form — which renders OUTSIDE ClerkProvider
 * for instant first paint — can react to auth state once Clerk is ready.
 *
 * Renders nothing visible; purely a context bridge.
 */
export default function ClerkBridgeForSend() {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();
  const clerk = useClerk();
  const { user } = useUser();
  const { update } = useContext(SendAuthCtx);

  useEffect(() => {
    update({
      isLoaded,
      isSignedIn,
      getToken,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      openSignIn: (opts) => clerk.openSignIn(opts as any),
      clerkUserId: userId,
      userEmail: user?.emailAddresses?.[0]?.emailAddress ?? null,
    });
  }, [isLoaded, isSignedIn, getToken, clerk, userId, user, update]);

  return null;
}
