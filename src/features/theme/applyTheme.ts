import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSettings } from "../../stores/settingsStore";
import { isTauri } from "../../lib/platform";
import { resolveTheme, type ThemeDef } from "./themes";

let current: ThemeDef = resolveTheme("midnight");
const listeners = new Set<(t: ThemeDef) => void>();

export const currentTheme = () => current;
export const onThemeChange = (fn: (t: ThemeDef) => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Writes the theme's tokens onto :root (Tailwind utilities read them), the window background and terminals. */
function apply(t: ThemeDef) {
  current = t;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(t.colors)) root.style.setProperty(`--color-${k}`, v);
  root.style.colorScheme = t.mode;
  root.dataset.theme = t.id;
  root.classList.toggle("dark", t.mode === "dark");
  if (isTauri) void getCurrentWindow().setBackgroundColor(t.colors.bg).catch(() => undefined);
  listeners.forEach((fn) => fn(t));
}

/** Applies the saved theme now and whenever the setting or (for "system") the OS appearance changes. */
export function initTheme() {
  const resolve = () => resolveTheme(useSettings.getState().theme, useSettings.getState());
  apply(resolve());
  useSettings.subscribe((s, prev) => {
    if (s.theme !== prev.theme || s.systemDark !== prev.systemDark || s.systemLight !== prev.systemLight) apply(resolve());
  });
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (useSettings.getState().theme === "system") apply(resolve());
  });
}
