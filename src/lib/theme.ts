export type ThemeName = "red" | "green" | "blue" | "yellow";

interface Accent {
  accent: string;
  accentHover: string;
  onAccent: string;
}

export const ACCENTS: Record<ThemeName, Accent> = {
  red: { accent: "#e5484d", accentHover: "#f2555a", onAccent: "#ffffff" },
  green: { accent: "#46a758", accentHover: "#53b466", onAccent: "#0b0d10" },
  blue: { accent: "#3e63dd", accentHover: "#5472e4", onAccent: "#ffffff" },
  yellow: { accent: "#ffc016", accentHover: "#ffd43b", onAccent: "#0b0d10" },
};

export function applyTheme(theme: ThemeName): void {
  const a = ACCENTS[theme] ?? ACCENTS.red;
  const root = document.documentElement;
  root.style.setProperty("--accent", a.accent);
  root.style.setProperty("--accent-hover", a.accentHover);
  root.style.setProperty("--on-accent", a.onAccent);
  root.dataset.theme = theme;
}
