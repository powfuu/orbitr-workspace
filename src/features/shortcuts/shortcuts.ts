import { isMac, modKey } from "../../lib/platform";

/** Every keyboard shortcut, for the cheat sheet. Handlers live in hooks/useGlobalShortcuts.ts. */
export interface Shortcut {
  keys: string[];
  label: string;
}

const m = modKey;
const shift = isMac ? "⇧" : "Shift";
const ctrl = isMac ? "⌃" : "Ctrl";
const alt = isMac ? "⌥" : "Alt";

export const SHORTCUTS: { group: string; items: Shortcut[] }[] = [
  {
    group: "General",
    items: [
      { keys: [m, "K"], label: "Command palette" },
      { keys: [m, ","], label: "Settings" },
      { keys: ["?"], label: "Keyboard shortcuts" },
      { keys: [m, "1–9"], label: "Go to project" },
      { keys: [m, shift, "1–9"], label: "Switch workspace" },
      { keys: [isMac ? "⌥" : "Alt", "1–9"], label: "Go to tab (9 = last)" },
      { keys: isMac ? [ctrl, "1–9"] : [ctrl, "Alt", "1–9"], label: "Go to terminal" },
    ],
  },
  {
    group: "Agents & terminals",
    items: [
      { keys: [m, "E"], label: "Open Vim in this project" },
      { keys: [m, "P"], label: "Open file in Vim (fuzzy)" },
      { keys: [m, "N"], label: "Start an agent" },
      { keys: [m, ";"], label: "Send a snippet" },
      { keys: [m, "T"], label: "New terminal" },
      { keys: isMac ? [m, "F"] : [ctrl, shift, "F"], label: "Find in output" },
      { keys: [m, shift, "L"], label: "Agent timeline" },
      { keys: [m, shift, "V"], label: "Voice input (speak, then pause)" },
    ],
  },
  {
    group: "Layout",
    items: [
      { keys: [m, "B"], label: "Toggle sidebar" },
      { keys: [m, "J"], label: "Toggle terminal panel" },
      { keys: [m, "\\"], label: "Split pane right" },
      { keys: [m, shift, "\\"], label: "Split pane down" },
      { keys: [ctrl, "Tab"], label: "Next tab" },
      { keys: [ctrl, "H"], label: "Previous tab / terminal (focused area)" },
      { keys: [ctrl, "L"], label: "Next tab / terminal (focused area)" },
      { keys: [m, "W"], label: "Close tab / terminal (focused area)" },
      { keys: [alt, shift, "Q"], label: "Focus session search" },
      { keys: [alt, shift, "W"], label: "Focus centre (agent, Vim, view)" },
      { keys: [alt, shift, "E"], label: "Focus terminal panel" },
    ],
  },
  {
    group: "Vim mode (Settings → Vim)",
    items: [
      { keys: ["Esc"], label: "NORMAL mode (Esc Esc inside an editor)" },
      { keys: ["i"], label: "Back to typing (INSERT)" },
      { keys: ["f"], label: "Hints: click anything by its letters" },
      { keys: [":"], label: "Command palette" },
      { keys: ["j", "k"], label: "Scroll down / up" },
      { keys: ["d", "u"], label: "Half page down / up" },
    ],
  },
];
