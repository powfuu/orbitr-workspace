import { isMac, modKey } from "../../lib/platform";

/** Every keyboard shortcut, for the cheat sheet. Handlers live in hooks/useGlobalShortcuts.ts. */
export interface Shortcut {
  keys: string[];
  label: string;
}

const m = modKey;
const shift = isMac ? "⇧" : "Shift";
const ctrl = isMac ? "⌃" : "Ctrl";

export const SHORTCUTS: { group: string; items: Shortcut[] }[] = [
  {
    group: "General",
    items: [
      { keys: [m, "K"], label: "Command palette" },
      { keys: [m, ","], label: "Settings" },
      { keys: ["?"], label: "Keyboard shortcuts" },
      { keys: [m, "1–9"], label: "Switch workspace" },
    ],
  },
  {
    group: "Agents & terminals",
    items: [
      { keys: [m, "N"], label: "Start an agent" },
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
      { keys: [m, "W"], label: "Close tab" },
    ],
  },
];
