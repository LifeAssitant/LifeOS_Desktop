import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api, clearTokens, getAccessToken, saveTokens, User } from "./api";
import { clearGardenEntered } from "./gardenGate";
import { sessionFromDeepLink, startGoogleOAuth } from "./supabase";

type AuthState = {
  user: User | null;
  loading: boolean;
  offlineHint: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setOfflineHint: (v: string | null) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineHint, setOfflineHint] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const me = await api.me();
    setUser(me);
    setOfflineHint(null);
  }, []);

  const finishGoogleSession = useCallback(
    async (accessToken: string) => {
      const tokens = await api.loginWithGoogle(accessToken);
      saveTokens(tokens);
      await refreshUser();
    },
    [refreshUser]
  );

  useEffect(() => {
    (async () => {
      try {
        if (getAccessToken()) await refreshUser();
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  useEffect(() => {
    const processAuthUrl = async (url: string) => {
      console.log("Received auth callback URL");
      try {
        if (url.includes("calendar-connected")) {
          console.log("Calendar connected callback received");
          window.dispatchEvent(new CustomEvent("lifeos-calendar-connected"));
          return;
        }
        const session = await sessionFromDeepLink(url);
        console.log("Parsed deep-link session", session ? { hasAccessToken: Boolean(session.access_token), hasRefreshToken: Boolean(session.refresh_token) } : null);
        if (session?.access_token) {
          await finishGoogleSession(session.access_token);
        }
      } catch (err) {
        console.error("Auth callback error", err);
        setOfflineHint(
          err instanceof Error ? err.message : "Google sign-in failed"
        );
      }
    };

    const handleWindowAuthEvent = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.startsWith("lifeos://")) {
        void processAuthUrl(detail);
      }
    };

    window.addEventListener("lifeos-auth-url", handleWindowAuthEvent);

    if (!window.lifeosDesktop?.onAuthUrl || !window.lifeosDesktop?.getAuthUrl) {
      return () => {
        window.removeEventListener("lifeos-auth-url", handleWindowAuthEvent);
      };
    }

    const drainQueuedAuth = async () => {
      const url = await window.lifeosDesktop!.getAuthUrl();
      if (url) {
        await processAuthUrl(url);
      }
    };

    const unsubscribe = window.lifeosDesktop.onAuthUrl(async (url) => {
      await processAuthUrl(url);
    });

    void drainQueuedAuth();
    const timer = window.setInterval(() => {
      void drainQueuedAuth();
    }, 1000);

    return () => {
      unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener("lifeos-auth-url", handleWindowAuthEvent);
    };
  }, [finishGoogleSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await api.login(email.trim(), password);
      saveTokens(tokens);
      await refreshUser();
    },
    [refreshUser]
  );

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const tokens = await api.register(email.trim(), password, name);
      saveTokens(tokens);
      await refreshUser();
    },
    [refreshUser]
  );

  const loginWithGoogle = useCallback(async () => {
    await startGoogleOAuth();
  }, []);

  const logout = useCallback(() => {
    clearGardenEntered();
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      offlineHint,
      login,
      register,
      loginWithGoogle,
      logout,
      refreshUser,
      setOfflineHint,
    }),
    [
      user,
      loading,
      offlineHint,
      login,
      register,
      loginWithGoogle,
      logout,
      refreshUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
