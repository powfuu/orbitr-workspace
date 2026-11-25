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

/* ── Popular editor themes ─────────────────────────────────────────────── */

type Ansi16 = [string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string];
const ANSI_KEYS = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white", "brightBlack", "brightRed", "brightGreen", "brightYellow", "brightBlue", "brightMagenta", "brightCyan", "brightWhite"] as const;

/** UI palette: bg, bg-2, surface, surface-2, line, line-soft, fg, fg-2, muted, faint, accent, success, warning, error. */
type Ui = [string, string, string, string, string, string, string, string, string, string, string, string, string, string];

function theme(id: string, name: string, mode: "dark" | "light", ui: Ui, ansi: Ansi16): ThemeDef {
  const [bg, bg2, surface, surface2, line, lineSoft, fg, fg2, muted, faint, accent, success, warning, error] = ui;
  const palette = Object.fromEntries(ANSI_KEYS.map((k, i) => [k, ansi[i]])) as ITheme;
  return {
    id, name, mode,
    colors: { bg, "bg-2": bg2, surface, "surface-2": surface2, line, "line-soft": lineSoft, fg, "fg-2": fg2, muted, faint, accent, success, warning, error, term: bg },
    terminal: term(palette, bg, fg, accent, `${accent}40`),
  };
}

THEMES.push(
  theme("vitesse-dark", "Vitesse Dark", "dark",
    ["#121212", "#181818", "#1e1e1e", "#252525", "#333333", "#222222", "#dbd7ca", "#bfbaaa", "#758575", "#555555", "#4d9375", "#4d9375", "#e6cc77", "#cb7676"],
    ["#393a34", "#cb7676", "#4d9375", "#e6cc77", "#6394bf", "#d9739f", "#5eaab5", "#dbd7ca", "#777777", "#cb7676", "#4d9375", "#e6cc77", "#6394bf", "#d9739f", "#5eaab5", "#ffffff"]),
  theme("vitesse-dark-plus", "Vitesse Dark Plus", "dark",
    ["#000000", "#050505", "#0d0d0d", "#141414", "#232323", "#111111", "#dbd7ca", "#bfbaaa", "#758575", "#4a4a4a", "#4d9375", "#4d9375", "#e6cc77", "#cb7676"],
    ["#1a1a1a", "#cb7676", "#4d9375", "#e6cc77", "#6394bf", "#d9739f", "#5eaab5", "#dbd7ca", "#666666", "#cb7676", "#4d9375", "#e6cc77", "#6394bf", "#d9739f", "#5eaab5", "#ffffff"]),
  theme("vitesse-light", "Vitesse Light", "light",
    ["#ffffff", "#f7f7f7", "#f0f0f0", "#e7e7e7", "#d8d8d8", "#ececec", "#393a34", "#4e4f47", "#7a7a6f", "#a0a0a0", "#1e754f", "#1e754f", "#bda437", "#ab5959"],
    ["#121212", "#ab5959", "#1e754f", "#bda437", "#296aa3", "#a13865", "#2993a3", "#dbd7ca", "#aaaaaa", "#ab5959", "#1e754f", "#bda437", "#296aa3", "#a13865", "#2993a3", "#dddddd"]),
  theme("one-dark", "One Dark", "dark",
    ["#282c34", "#2c313a", "#333842", "#3b4048", "#4b5263", "#353b45", "#abb2bf", "#9da5b4", "#7f848e", "#5c6370", "#61afef", "#98c379", "#e5c07b", "#e06c75"],
    ["#282c34", "#e06c75", "#98c379", "#e5c07b", "#61afef", "#c678dd", "#56b6c2", "#abb2bf", "#5c6370", "#e06c75", "#98c379", "#e5c07b", "#61afef", "#c678dd", "#56b6c2", "#ffffff"]),
  theme("one-light", "One Light", "light",
    ["#fafafa", "#f2f2f2", "#eaeaeb", "#e0e0e2", "#d0d0d3", "#e5e5e6", "#383a42", "#4f525d", "#696c77", "#a0a1a7", "#4078f2", "#50a14f", "#c18401", "#e45649"],
    ["#383a42", "#e45649", "#50a14f", "#c18401", "#4078f2", "#a626a4", "#0184bc", "#a0a1a7", "#696c77", "#e45649", "#50a14f", "#c18401", "#4078f2", "#a626a4", "#0184bc", "#fafafa"]),
  theme("gruvbox-dark", "Gruvbox Dark", "dark",
    ["#282828", "#2e2c2b", "#32302f", "#3c3836", "#504945", "#3a3634", "#ebdbb2", "#d5c4a1", "#a89984", "#7c6f64", "#fabd2f", "#b8bb26", "#fabd2f", "#fb4934"],
    ["#282828", "#cc241d", "#98971a", "#d79921", "#458588", "#b16286", "#689d6a", "#a89984", "#928374", "#fb4934", "#b8bb26", "#fabd2f", "#83a598", "#d3869b", "#8ec07c", "#ebdbb2"]),
  theme("gruvbox-light", "Gruvbox Light", "light",
    ["#fbf1c7", "#f6ebbf", "#f2e5bc", "#ebdbb2", "#d5c4a1", "#efe2b8", "#3c3836", "#504945", "#7c6f64", "#a89984", "#af3a03", "#79740e", "#b57614", "#9d0006"],
    ["#fbf1c7", "#cc241d", "#98971a", "#d79921", "#458588", "#b16286", "#689d6a", "#7c6f64", "#928374", "#9d0006", "#79740e", "#b57614", "#076678", "#8f3f71", "#427b58", "#3c3836"]),
  theme("dark-modern", "Dark Modern", "dark",
    ["#1f1f1f", "#181818", "#262626", "#2b2b2b", "#3c3c3c", "#2b2b2b", "#cccccc", "#b5b5b5", "#9d9d9d", "#6e6e6e", "#0078d4", "#2ea043", "#cca700", "#f85149"],
    ["#000000", "#cd3131", "#0dbc79", "#e5e510", "#2472c8", "#bc3fbc", "#11a8cd", "#e5e5e5", "#666666", "#f14c4c", "#23d18b", "#f5f543", "#3b8eea", "#d670d6", "#29b8db", "#e5e5e5"]),
  theme("light-modern", "Light Modern", "light",
    ["#ffffff", "#f8f8f8", "#f3f3f3", "#e8e8e8", "#e5e5e5", "#ededed", "#3b3b3b", "#4f4f4f", "#6e7681", "#9e9e9e", "#005fb8", "#2ea043", "#9a6700", "#f85149"],
    ["#000000", "#cd3131", "#107c10", "#949800", "#0451a5", "#bc05bc", "#0598bc", "#555555", "#666666", "#cd3131", "#14ce14", "#b5ba00", "#0451a5", "#bc05bc", "#0598bc", "#a5a5a5"]),
  theme("github-dark", "GitHub Dark", "dark",
    ["#0d1117", "#010409", "#161b22", "#21262d", "#30363d", "#21262d", "#e6edf3", "#c9d1d9", "#8b949e", "#6e7681", "#2f81f7", "#3fb950", "#d29922", "#f85149"],
    ["#484f58", "#ff7b72", "#3fb950", "#d29922", "#58a6ff", "#bc8cff", "#39c5cf", "#b1bac4", "#6e7681", "#ffa198", "#56d364", "#e3b341", "#79c0ff", "#d2a8ff", "#56d4dd", "#ffffff"]),
  theme("github-dimmed", "GitHub Dark Dimmed", "dark",
    ["#22272e", "#1c2128", "#2d333b", "#373e47", "#444c56", "#2d333b", "#adbac7", "#9fadbb", "#768390", "#636e7b", "#539bf5", "#57ab5a", "#c69026", "#e5534b"],
    ["#545d68", "#f47067", "#57ab5a", "#c69026", "#539bf5", "#b083f0", "#39c5cf", "#909dab", "#636e7b", "#ff938a", "#6bc46d", "#daaa3f", "#6cb6ff", "#dcbdfb", "#56d4dd", "#cdd9e5"]),
  theme("github-light", "GitHub Light", "light",
    ["#ffffff", "#f6f8fa", "#f6f8fa", "#eaeef2", "#d0d7de", "#eaeef2", "#1f2328", "#424a53", "#656d76", "#8c959f", "#0969da", "#1a7f37", "#9a6700", "#cf222e"],
    ["#24292f", "#cf222e", "#116329", "#4d2d00", "#0969da", "#8250df", "#1b7c83", "#6e7781", "#57606a", "#a40e26", "#1a7f37", "#633c01", "#218bff", "#a475f9", "#3192aa", "#8c959f"]),
  theme("codesandbox", "CodeSandbox", "dark",
    ["#151515", "#191919", "#1f1f1f", "#262626", "#343434", "#242424", "#e5e5e5", "#c5c5c5", "#999999", "#666666", "#dcff50", "#5bc266", "#f7cc66", "#ef7a7a"],
    ["#151515", "#ef7a7a", "#5bc266", "#f7cc66", "#6cc7f6", "#b88bff", "#7ad9fb", "#e5e5e5", "#757575", "#ff9a9a", "#7dd887", "#ffe08a", "#8fd5f9", "#cdaaff", "#9be4fd", "#ffffff"]),
  theme("catppuccin-mocha", "Catppuccin Mocha", "dark",
    ["#1e1e2e", "#181825", "#313244", "#45475a", "#45475a", "#2a2b3c", "#cdd6f4", "#bac2de", "#a6adc8", "#6c7086", "#cba6f7", "#a6e3a1", "#f9e2af", "#f38ba8"],
    ["#45475a", "#f38ba8", "#a6e3a1", "#f9e2af", "#89b4fa", "#f5c2e7", "#94e2d5", "#bac2de", "#585b70", "#f38ba8", "#a6e3a1", "#f9e2af", "#89b4fa", "#f5c2e7", "#94e2d5", "#a6adc8"]),
  theme("catppuccin-macchiato", "Catppuccin Macchiato", "dark",
    ["#24273a", "#1e2030", "#363a4f", "#494d64", "#494d64", "#2f3247", "#cad3f5", "#b8c0e0", "#a5adcb", "#6e738d", "#c6a0f6", "#a6da95", "#eed49f", "#ed8796"],
    ["#494d64", "#ed8796", "#a6da95", "#eed49f", "#8aadf4", "#f5bde6", "#8bd5ca", "#b8c0e0", "#5b6078", "#ed8796", "#a6da95", "#eed49f", "#8aadf4", "#f5bde6", "#8bd5ca", "#a5adcb"]),
  theme("catppuccin-frappe", "Catppuccin Frappé", "dark",
    ["#303446", "#292c3c", "#414559", "#51576d", "#51576d", "#3a3e52", "#c6d0f5", "#b5bfe2", "#a5adce", "#737994", "#ca9ee6", "#a6d189", "#e5c890", "#e78284"],
    ["#51576d", "#e78284", "#a6d189", "#e5c890", "#8caaee", "#f4b8e4", "#81c8be", "#b5bfe2", "#626880", "#e78284", "#a6d189", "#e5c890", "#8caaee", "#f4b8e4", "#81c8be", "#a5adce"]),
  theme("catppuccin-latte", "Catppuccin Latte", "light",
    ["#eff1f5", "#e6e9ef", "#dce0e8", "#ccd0da", "#bcc0cc", "#dce0e8", "#4c4f69", "#5c5f77", "#6c6f85", "#9ca0b0", "#8839ef", "#40a02b", "#df8e1d", "#d20f39"],
    ["#5c5f77", "#d20f39", "#40a02b", "#df8e1d", "#1e66f5", "#ea76cb", "#179299", "#acb0be", "#6c6f85", "#d20f39", "#40a02b", "#df8e1d", "#1e66f5", "#ea76cb", "#179299", "#bcc0cc"]),
  theme("tokyo-night", "Tokyo Night", "dark",
    ["#1a1b26", "#16161e", "#1f2335", "#292e42", "#3b4261", "#232433", "#c0caf5", "#a9b1d6", "#787c99", "#565f89", "#7aa2f7", "#9ece6a", "#e0af68", "#f7768e"],
    ["#15161e", "#f7768e", "#9ece6a", "#e0af68", "#7aa2f7", "#bb9af7", "#7dcfff", "#a9b1d6", "#414868", "#f7768e", "#9ece6a", "#e0af68", "#7aa2f7", "#bb9af7", "#7dcfff", "#c0caf5"]),
  theme("tokyo-night-storm", "Tokyo Night Storm", "dark",
    ["#24283b", "#1f2335", "#292e42", "#2f344d", "#3b4261", "#292e42", "#c0caf5", "#a9b1d6", "#787c99", "#565f89", "#7aa2f7", "#9ece6a", "#e0af68", "#f7768e"],
    ["#1d202f", "#f7768e", "#9ece6a", "#e0af68", "#7aa2f7", "#bb9af7", "#7dcfff", "#a9b1d6", "#414868", "#f7768e", "#9ece6a", "#e0af68", "#7aa2f7", "#bb9af7", "#7dcfff", "#c0caf5"]),
  theme("dracula", "Dracula", "dark",
    ["#282a36", "#21222c", "#343746", "#44475a", "#44475a", "#2f3140", "#f8f8f2", "#e2e2dc", "#9ea8c7", "#6272a4", "#bd93f9", "#50fa7b", "#f1fa8c", "#ff5555"],
    ["#21222c", "#ff5555", "#50fa7b", "#f1fa8c", "#bd93f9", "#ff79c6", "#8be9fd", "#f8f8f2", "#6272a4", "#ff6e6e", "#69ff94", "#ffffa5", "#d6acff", "#ff92df", "#a4ffff", "#ffffff"]),
  theme("nord", "Nord", "dark",
    ["#2e3440", "#2a2f3a", "#3b4252", "#434c5e", "#4c566a", "#3b4252", "#eceff4", "#d8dee9", "#a3acbd", "#6f7a8f", "#88c0d0", "#a3be8c", "#ebcb8b", "#bf616a"],
    ["#3b4252", "#bf616a", "#a3be8c", "#ebcb8b", "#81a1c1", "#b48ead", "#88c0d0", "#e5e9f0", "#4c566a", "#bf616a", "#a3be8c", "#ebcb8b", "#81a1c1", "#b48ead", "#8fbcbb", "#eceff4"]),
  theme("rose-pine", "Rosé Pine", "dark",
    ["#191724", "#1f1d2e", "#26233a", "#2a273f", "#403d52", "#21202e", "#e0def4", "#c7c4dd", "#908caa", "#6e6a86", "#ebbcba", "#9ccfd8", "#f6c177", "#eb6f92"],
    ["#26233a", "#eb6f92", "#31748f", "#f6c177", "#9ccfd8", "#c4a7e7", "#ebbcba", "#e0def4", "#6e6a86", "#eb6f92", "#31748f", "#f6c177", "#9ccfd8", "#c4a7e7", "#ebbcba", "#e0def4"]),
  theme("rose-pine-dawn", "Rosé Pine Dawn", "light",
    ["#faf4ed", "#fffaf3", "#f2e9e1", "#f4ede8", "#dfdad9", "#f2e9e1", "#575279", "#6b6590", "#797593", "#9893a5", "#d7827e", "#286983", "#ea9d34", "#b4637a"],
    ["#f2e9e1", "#b4637a", "#286983", "#ea9d34", "#56949f", "#907aa9", "#d7827e", "#575279", "#9893a5", "#b4637a", "#286983", "#ea9d34", "#56949f", "#907aa9", "#d7827e", "#575279"]),
  theme("kanagawa", "Kanagawa", "dark",
    ["#1f1f28", "#181820", "#2a2a37", "#363646", "#54546d", "#2a2a37", "#dcd7ba", "#c8c093", "#938aa9", "#727169", "#7e9cd8", "#98bb6c", "#e6c384", "#e82424"],
    ["#16161d", "#c34043", "#76946a", "#c0a36e", "#7e9cd8", "#957fb8", "#6a9589", "#c8c093", "#727169", "#e82424", "#98bb6c", "#e6c384", "#7fb4ca", "#938aa9", "#7aa89f", "#dcd7ba"]),
  theme("everforest", "Everforest", "dark",
    ["#2d353b", "#272e33", "#343f44", "#3d484d", "#475258", "#343f44", "#d3c6aa", "#c5b99c", "#9da9a0", "#7a8478", "#a7c080", "#a7c080", "#dbbc7f", "#e67e80"],
    ["#475258", "#e67e80", "#a7c080", "#dbbc7f", "#7fbbb3", "#d699b6", "#83c092", "#d3c6aa", "#859289", "#e67e80", "#a7c080", "#dbbc7f", "#7fbbb3", "#d699b6", "#83c092", "#d3c6aa"]),
  theme("solarized-dark", "Solarized Dark", "dark",
    ["#002b36", "#00252f", "#073642", "#0b3f4c", "#1c4f5b", "#073642", "#eee8d5", "#93a1a1", "#839496", "#586e75", "#268bd2", "#859900", "#b58900", "#dc322f"],
    ["#073642", "#dc322f", "#859900", "#b58900", "#268bd2", "#d33682", "#2aa198", "#eee8d5", "#586e75", "#cb4b16", "#859900", "#b58900", "#268bd2", "#6c71c4", "#2aa198", "#fdf6e3"]),
  theme("solarized-light", "Solarized Light", "light",
    ["#fdf6e3", "#f7f0dc", "#eee8d5", "#e6dfc8", "#d6cfb8", "#eee8d5", "#073642", "#586e75", "#657b83", "#93a1a1", "#268bd2", "#859900", "#b58900", "#dc322f"],
    ["#073642", "#dc322f", "#859900", "#b58900", "#268bd2", "#d33682", "#2aa198", "#93a1a1", "#586e75", "#cb4b16", "#859900", "#b58900", "#268bd2", "#6c71c4", "#2aa198", "#657b83"]),
  theme("ayu-dark", "Ayu Dark", "dark",
    ["#0b0e14", "#0d1017", "#131721", "#1a1f29", "#252a35", "#151a22", "#bfbdb6", "#acb6bf", "#7f8590", "#565b66", "#e6b450", "#7fd962", "#ffb454", "#d95757"],
    ["#11151c", "#ea6c73", "#7fd962", "#f9af4f", "#53bdfa", "#cda1fa", "#90e1c6", "#c7c7c7", "#686868", "#f07178", "#aad94c", "#ffb454", "#59c2ff", "#d2a6ff", "#95e6cb", "#ffffff"]),
  theme("ayu-light", "Ayu Light", "light",
    ["#fcfcfc", "#f8f9fa", "#f3f4f5", "#e9ebed", "#dbdde0", "#eceef0", "#5c6166", "#6b7075", "#8a9199", "#adaeb1", "#fa8d3e", "#6cbf43", "#f2ae49", "#e65050"],
    ["#000000", "#ea6c6d", "#6cbf43", "#eca944", "#3199e1", "#9e75c7", "#46ba94", "#bababa", "#686868", "#f07171", "#86b300", "#f2ae49", "#399ee6", "#a37acc", "#4cbf99", "#d1d1d1"]),
  theme("night-owl", "Night Owl", "dark",
    ["#011627", "#01111d", "#0b2942", "#13344f", "#1d3b53", "#0b2942", "#d6deeb", "#c5cfe0", "#7e97ac", "#5f7e97", "#82aaff", "#22da6e", "#ffeb95", "#ef5350"],
    ["#011627", "#ef5350", "#22da6e", "#c5e478", "#82aaff", "#c792ea", "#21c7a8", "#ffffff", "#575656", "#ef5350", "#22da6e", "#ffeb95", "#82aaff", "#c792ea", "#7fdbca", "#ffffff"]),
  theme("monokai-pro", "Monokai Pro", "dark",
    ["#2d2a2e", "#221f22", "#363337", "#403e41", "#5b595c", "#363337", "#fcfcfa", "#e3e1e4", "#939293", "#727072", "#ffd866", "#a9dc76", "#fc9867", "#ff6188"],
    ["#403e41", "#ff6188", "#a9dc76", "#ffd866", "#fc9867", "#ab9df2", "#78dce8", "#fcfcfa", "#727072", "#ff6188", "#a9dc76", "#ffd866", "#fc9867", "#ab9df2", "#78dce8", "#fcfcfa"]),
  theme("palenight", "Material Palenight", "dark",
    ["#292d3e", "#242837", "#32374d", "#3a3f58", "#444267", "#2f3347", "#eeffff", "#a6accd", "#8796b0", "#676e95", "#c792ea", "#c3e88d", "#ffcb6b", "#f07178"],
    ["#292d3e", "#f07178", "#c3e88d", "#ffcb6b", "#82aaff", "#c792ea", "#89ddff", "#d0d0d0", "#434758", "#ff8b92", "#ddffa7", "#ffe585", "#9cc4ff", "#e1acff", "#a3f7ff", "#ffffff"]),
);
