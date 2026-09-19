export type ThemeStyle = "clay" | "glass";
export type ColorScheme = "light" | "dark";

/** @deprecated use ThemeStyle */
export type ThemeMode = ThemeStyle;

/**
 * Semantic colors as CSS variables — values swap with data-style + data-scheme.
 * Keeps light/dark and clay/glass consistent without hard-coded hex in components.
 */
export const colors = {
  bg: "var(--bg)",
  bgDeep: "var(--bg-deep)",
  bgSoft: "var(--bg-soft)",
  paper: "var(--paper)",
  ink: "var(--ink)",
  inkSoft: "var(--ink-soft)",
  muted: "var(--muted)",
  line: "var(--line)",
  lineSoft: "var(--line-soft)",
  moss: "var(--accent)",
  mossSoft: "var(--accent-soft)",
  apricot: "var(--warm)",
  apricotSoft: "var(--warm-soft)",
  clay: "var(--warm)",
  blush: "var(--danger-soft)",
  sky: "var(--sky)",
  skySoft: "var(--sky-soft)",
  lilac: "var(--lilac)",
  butter: "var(--butter)",
  danger: "var(--danger)",
  success: "var(--accent)",
  glass: "var(--panel)",
  glassStrong: "var(--panel-strong)",
};

export const fonts = {
  display: '"Fraunces", "Iowan Old Style", Georgia, serif',
  body: '"Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif',
};

export const radii = {
  sm: 14,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const motion = {
  soft: "200ms cubic-bezier(0.22, 1, 0.36, 1)",
  slow: "420ms cubic-bezier(0.22, 1, 0.36, 1)",
  spring: "480ms cubic-bezier(0.34, 1.3, 0.64, 1)",
};

export function clayShadow(opts?: { lift?: number }) {
  const lift = opts?.lift ?? 10;
  return [
    `0 ${lift}px ${lift * 1.8}px var(--shadow)`,
    `inset 0 ${Math.round(lift * 0.35)}px ${Math.round(lift * 0.7)}px var(--highlight)`,
    `inset 0 -${Math.round(lift * 0.3)}px ${Math.round(lift * 0.65)}px var(--shade)`,
  ].join(", ");
}

export function clayInset() {
  return "inset 4px 4px 10px var(--shade), inset -4px -4px 10px var(--highlight)";
}

export const THEME_STORAGE_KEY = "lifeos_theme_mode";
export const SCHEME_STORAGE_KEY = "lifeos_color_scheme";
