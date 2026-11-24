import type { ITheme } from "@xterm/xterm";

/** UI tokens (Tailwind `--color-*` variables) + terminal palette for one theme. */
export interface ThemeDef {
  id: string;
  name: string;
  mode: "dark" | "light";
  colors: Record<"bg" | "bg-2" | "surface" | "surface-2" | "line" | "line-soft" | "fg" | "fg-2" | "muted" | "faint" | "accent" | "success" | "warning" | "error" | "term", string>;
  terminal: ITheme;
}

const darkAnsi: ITheme = {
  black: "#1A1A1A", brightBlack: "#5A5A5A",
  red: "#F16D78", brightRed: "#FF8F98",
  green: "#42D392", brightGreen: "#6BE3AC",
  yellow: "#F0B95B", brightYellow: "#F7CE84",
  blue: "#6CA2FF", brightBlue: "#94BCFF",
  magenta: "#A898FF", brightMagenta: "#C3B8FF",
  cyan: "#5FC6E8", brightCyan: "#8ADAF2",
  white: "#C8C8C8", brightWhite: "#FFFFFF",
};

const lightAnsi: ITheme = {
  black: "#24292F", brightBlack: "#57606A",
  red: "#CF222E", brightRed: "#A40E26",
  green: "#116329", brightGreen: "#1A7F37",
  yellow: "#7D4E00", brightYellow: "#9A6700",
  blue: "#0550AE", brightBlue: "#218BFF",
  magenta: "#8250DF", brightMagenta: "#A475F9",
  cyan: "#1B7C83", brightCyan: "#3192AA",
  white: "#6E7781", brightWhite: "#8C959F",
};

const term = (ansi: ITheme, bg: string, fg: string, cursor: string, selection: string): ITheme => ({
  ...ansi,
  background: bg,
  foreground: fg,
  cursor,
  cursorAccent: bg,
  selectionBackground: selection,
});

export const THEMES: ThemeDef[] = [
  {
    id: "midnight",
    name: "Midnight",
    mode: "dark",
    colors: {
      bg: "#000000", "bg-2": "#050505", surface: "#111111", "surface-2": "#1a1a1a", line: "#2a2a2a", "line-soft": "#181818",
      fg: "#ffffff", "fg-2": "#c8c8c8", muted: "#8a8a8a", faint: "#555555", accent: "#ffffff",
      success: "#3ddc84", warning: "#e0b04a", error: "#ff4d4d", term: "#000000",
    },
    terminal: term(darkAnsi, "#000000", "#E6E6E6", "#FFFFFF", "#FFFFFF40"),
  },
  {
    id: "graphite",
    name: "Graphite",
    mode: "dark",
    colors: {
      bg: "#17181b", "bg-2": "#1c1d21", surface: "#24262b", "surface-2": "#2c2f35", line: "#3a3d44", "line-soft": "#2a2c31",
      fg: "#ecedef", "fg-2": "#c3c6cc", muted: "#8b9099", faint: "#60656e", accent: "#a9b6ff",
      success: "#4fd18b", warning: "#e5b453", error: "#f2707a", term: "#141518",
    },
    terminal: term(darkAnsi, "#141518", "#DCDEE3", "#A9B6FF", "#A9B6FF40"),
  },
  {
    id: "ocean",
    name: "Ocean",
    mode: "dark",
    colors: {
      bg: "#0b1220", "bg-2": "#0e1628", surface: "#142036", "surface-2": "#1a2944", line: "#24365a", "line-soft": "#182642",
      fg: "#e6edf7", "fg-2": "#b8c4d8", muted: "#7d8ba3", faint: "#51607a", accent: "#5eb3ff",
      success: "#46d39a", warning: "#f0bd5e", error: "#ff6b81", term: "#0a111e",
    },
    terminal: term(darkAnsi, "#0A111E", "#D8E2F0", "#5EB3FF", "#5EB3FF40"),
  },
  {
    id: "paper",
    name: "Paper",
    mode: "light",
    colors: {
      bg: "#f4f4f1", "bg-2": "#ffffff", surface: "#ecece8", "surface-2": "#e2e2dd", line: "#d4d4ce", "line-soft": "#e6e6e1",
      fg: "#141414", "fg-2": "#3b3b3b", muted: "#6b6b6b", faint: "#9a9a96", accent: "#141414",
      success: "#13804a", warning: "#b06d00", error: "#c9302c", term: "#ffffff",
    },
    terminal: term(lightAnsi, "#FFFFFF", "#1F2328", "#141414", "#14141426"),
  },
  {
    id: "contrast",
    name: "High contrast",
    mode: "dark",
    colors: {
      bg: "#000000", "bg-2": "#000000", surface: "#121212", "surface-2": "#1f1f1f", line: "#6a6a6a", "line-soft": "#3d3d3d",
      fg: "#ffffff", "fg-2": "#ffffff", muted: "#d0d0d0", faint: "#a0a0a0", accent: "#ffd400",
      success: "#38ff9c", warning: "#ffd400", error: "#ff5c5c", term: "#000000",
    },
    terminal: term({ ...darkAnsi, white: "#FFFFFF", brightBlack: "#9A9A9A" }, "#000000", "#FFFFFF", "#FFD400", "#FFD40055"),
  },
];

export const themeById = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0]!;

/** "system" follows the OS appearance: Paper in light mode, Midnight in dark. */
export function resolveTheme(choice: string): ThemeDef {
  if (choice !== "system") return themeById(choice);
  return window.matchMedia("(prefers-color-scheme: light)").matches ? themeById("paper") : themeById("midnight");
}
