export type ThemeName = "playful" | "professional";

/** @deprecated use ThemeName */
export type ColorPalette = ThemeName;
/** @deprecated use ThemeName */
export type ThemeStyle = ThemeName;
/** @deprecated use ThemeName */
export type ThemeMode = ThemeName;

/**
 * Semantic colors as CSS variables — values swap with data-theme.
 * Components never hard-code hex so both themes stay in sync.
 */
export const colors = {
  bg: "var(--bg)",
  bgSoft: "var(--bg-soft)",
  surface: "var(--surface)",
  surfaceRaised: "var(--surface-2)",
  ink: "var(--ink)",
  inkSoft: "var(--ink-soft)",
  muted: "var(--muted)",
  line: "var(--line)",
  lineSoft: "var(--line-soft)",
  accent: "var(--accent)",
  accentInk: "var(--accent-ink)",
  accentSoft: "var(--accent-soft)",
  mint: "var(--mint)",
  peach: "var(--peach)",
  sky: "var(--sky)",
  lilac: "var(--lilac)",
  butter: "var(--butter)",
  danger: "var(--danger)",
  dangerSoft: "var(--danger-soft)",
  success: "var(--mint)",
};

export const fonts = {
  display: "var(--font-display)",
  body: "var(--font-body)",
};

export const radii = {
  sm: "var(--r-sm)",
  md: "var(--r-md)",
  lg: "var(--r-lg)",
  xl: "var(--r-xl)",
  pill: "999px",
};

export const THEME_STORAGE_KEY = "lifeos_theme";

export const THEMES: Array<{ id: ThemeName; label: string; hint: string }> = [
  { id: "playful", label: "Playful", hint: "Soft pastels, rounded, bright" },
  { id: "professional", label: "Professional", hint: "Graphite, monochrome, focused" },
];

/** Accepts legacy stored values (clay/glass/sage/ocean/bloom). */
export function normalizeTheme(raw: string | null): ThemeName {
  if (raw === "professional" || raw === "playful") return raw;
  if (raw === "glass" || raw === "ocean") return "professional";
  return "playful";
}
