const STORAGE_KEY = "heartsync_auth_v1";

interface AuthState {
  sessionToken: string | null;
  displayName: string | null;
  credits: number;
}

function load(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessionToken: null, displayName: null, credits: 0 };
    return JSON.parse(raw) as AuthState;
  } catch {
    return { sessionToken: null, displayName: null, credits: 0 };
  }
}

function save(state: AuthState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

const _state: AuthState = load();

export const authStore = {
  get isLoggedIn(): boolean {
    return _state.sessionToken !== null;
  },
  get sessionToken(): string | null {
    return _state.sessionToken;
  },
  get displayName(): string | null {
    return _state.displayName;
  },
  get credits(): number {
    return _state.credits;
  },

  login(sessionToken: string, displayName: string, credits: number): void {
    _state.sessionToken = sessionToken;
    _state.displayName = displayName;
    _state.credits = credits;
    save(_state);
  },

  logout(): void {
    _state.sessionToken = null;
    _state.displayName = null;
    _state.credits = 0;
    save(_state);
  },

  setCredits(credits: number): void {
    _state.credits = credits;
    save(_state);
  },
};
