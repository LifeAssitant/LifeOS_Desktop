import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import {
  SCHEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
  type ColorScheme,
  type ThemeStyle,
} from "./theme";

type ThemeContextValue = {
  style: ThemeStyle;
  scheme: ColorScheme;
  /** @deprecated use style */
  mode: ThemeStyle;
  setStyle: (style: ThemeStyle) => void;
  setScheme: (scheme: ColorScheme) => void;
  /** @deprecated use setStyle */
  setMode: (mode: ThemeStyle) => void;
  toggleStyle: () => void;
  toggleScheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStyle(): ThemeStyle {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "clay" || raw === "glass") return raw;
  } catch {
    /* ignore */
  }
  return "clay";
}

function readScheme(): ColorScheme {
  try {
    const raw = localStorage.getItem(SCHEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    /* ignore */
  }
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [style, setStyleState] = useState<ThemeStyle>(() => readStyle());
  const [scheme, setSchemeState] = useState<ColorScheme>(() => readScheme());

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-style", style);
    root.setAttribute("data-scheme", scheme);
    root.style.colorScheme = scheme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, style);
      localStorage.setItem(SCHEME_STORAGE_KEY, scheme);
    } catch {
      /* ignore */
    }
  }, [style, scheme]);

  const setStyle = useCallback((next: ThemeStyle) => setStyleState(next), []);
  const setScheme = useCallback((next: ColorScheme) => setSchemeState(next), []);
  const toggleStyle = useCallback(() => {
    setStyleState((s) => (s === "clay" ? "glass" : "clay"));
  }, []);
  const toggleScheme = useCallback(() => {
    setSchemeState((s) => (s === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo(
    () => ({
      style,
      scheme,
      mode: style,
      setStyle,
      setScheme,
      setMode: setStyle,
      toggleStyle,
      toggleScheme,
    }),
    [style, scheme, setStyle, setScheme, toggleStyle, toggleScheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeMode requires ThemeProvider");
  return ctx;
}
