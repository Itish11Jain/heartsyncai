import { createContext, useContext } from "react";

export interface SendAuthState {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  getToken: () => Promise<string | null>;
  openSignIn: (opts?: Record<string, unknown>) => void;
  clerkUserId: string | null | undefined;
  userEmail: string | null;
}

export const defaultSendAuth: SendAuthState = {
  isLoaded: false,
  isSignedIn: undefined,
  getToken: async () => null,
  openSignIn: () => {},
  clerkUserId: undefined,
  userEmail: null,
};

export interface SendAuthCtxValue {
  state: SendAuthState;
  update: (s: SendAuthState) => void;
}

export const SendAuthCtx = createContext<SendAuthCtxValue>({
  state: defaultSendAuth,
  update: () => {},
});

export function useSendAuth(): SendAuthState {
  return useContext(SendAuthCtx).state;
}
