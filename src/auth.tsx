import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api, clearTokens, getAccessToken, saveTokens, User } from "./api";
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
    if (!window.lifeosDesktop?.onAuthUrl) return;
    const unsubscribe = window.lifeosDesktop.onAuthUrl(async (url) => {
      try {
        if (url.includes("calendar-connected")) {
          window.dispatchEvent(new CustomEvent("lifeos-calendar-connected"));
          return;
        }
        const session = await sessionFromDeepLink(url);
        if (session?.access_token) {
          await finishGoogleSession(session.access_token);
        }
      } catch (err) {
        console.error(err);
        setOfflineHint(
          err instanceof Error ? err.message : "Google sign-in failed"
        );
      }
    });
    return unsubscribe;
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
