import { useEffect } from "react";
import { hasMod, isMac } from "../lib/platform";
import { useLayout } from "../stores/layoutStore";
import { getActiveTabs, useTabs } from "../stores/tabStore";
import { useWorkspaces } from "../stores/workspaceStore";
import { newDefaultTerminal } from "../features/terminals/newDefaultTerminal";
import { useVoice } from "../features/voice/voiceStore";

function cycleTab(step: 1 | -1) {
  const { tabs, activeTabId } = getActiveTabs();
  const i = tabs.findIndex((t) => t.id === activeTabId);
  const next = tabs[(i + step + tabs.length) % tabs.length];
  if (next) useTabs.getState().activate(next.id);
}

/**
 * App-wide shortcuts (Cmd on macOS, Ctrl elsewhere):
 * K palette · B sidebar · J terminal panel · T terminal · N start agent · W close tab
 * , settings · 1–9 workspace · Shift+[ / ] or Ctrl+(Shift+)Tab cycle tabs.
 */
export function useGlobalShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ctrl+Tab cycles tabs on every platform, as in browsers/editors.
      if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        return cycleTab(e.shiftKey ? -1 : 1);
      }
      if (!hasMod(e) || e.altKey) return;
      // Voice toggle works everywhere, including inside a focused terminal.
      if (e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        e.stopPropagation();
        return void useVoice.getState().toggle();
      }
      // On Windows/Linux Ctrl+letter belongs to the shell (Ctrl+W, Ctrl+K…) while a terminal has focus.
      if (!isMac && (e.target as HTMLElement | null)?.closest?.(".xterm")) return;
      if (e.code === "Backslash") {
        e.preventDefault();
        e.stopPropagation();
        useTabs.getState().splitFocused(e.shiftKey ? "bottom" : "right");
        return;
      }
      const layout = useLayout.getState();
      const key = e.key.toLowerCase();

      const actions: Record<string, () => void> = e.shiftKey
        ? { "[": () => cycleTab(-1), "]": () => cycleTab(1), "{": () => cycleTab(-1), "}": () => cycleTab(1) }
        : {
            k: () => layout.setPaletteOpen(!layout.paletteOpen),
            b: layout.toggleSidebar,
            j: layout.toggleTerminal,
            t: () => void newDefaultTerminal(),
            n: () => layout.setPaletteOpen(true, "Start "),
            w: () => useTabs.getState().close(getActiveTabs().activeTabId),
            ",": () => useTabs.getState().open({ type: "settings" }),
          };
      if (!e.shiftKey && /^[1-9]$/.test(key)) {
        const ws = useWorkspaces.getState().workspaces[Number(key) - 1];
        if (ws) actions[key] = () => useWorkspaces.getState().setActiveWorkspace(ws.id);
      }
      const action = actions[key];
      if (action) {
        e.preventDefault();
        e.stopPropagation();
        action();
      }
    };
    // Capture phase: xterm swallows key events once focused.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
}
