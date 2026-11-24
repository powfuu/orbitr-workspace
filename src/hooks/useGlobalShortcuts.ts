import { useEffect } from "react";
import { hasMod, isMac } from "../lib/platform";
import { useLayout } from "../stores/layoutStore";
import { getActiveTabs, useTabs } from "../stores/tabStore";
import { useWorkspaces } from "../stores/workspaceStore";
import { newDefaultTerminal } from "../features/terminals/newDefaultTerminal";
import { openInEditor } from "../features/editors/openInEditor";
import { useQuickOpen } from "../components/editors/QuickOpen";
import { useVoice } from "../features/voice/voiceStore";
import { useTerminalSearch } from "../features/search/searchStore";
import { searchTarget } from "../features/search/searchTarget";

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
      const typing = (e.target as HTMLElement | null)?.closest?.("input, textarea, [contenteditable], .xterm");
      if ((e.key === "?" || (e.shiftKey && e.code === "Slash")) && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        return useLayout.getState().setHelpOpen(true);
      }
      if (hasMod(e) && e.key === "/") {
        e.preventDefault();
        e.stopPropagation();
        return useLayout.getState().setHelpOpen(!useLayout.getState().helpOpen);
      }
      // Ctrl+Tab cycles tabs on every platform, as in browsers/editors.
      if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        return cycleTab(e.shiftKey ? -1 : 1);
      }
      if (!hasMod(e) || e.altKey) return;
      // Find in terminal: Cmd+F on macOS; Ctrl+Shift+F elsewhere (Ctrl+F is a shell key there).
      if (e.key.toLowerCase() === "f" && (isMac ? !e.shiftKey : e.shiftKey)) {
        const id = searchTarget();
        if (id) {
          e.preventDefault();
          e.stopPropagation();
          return useTerminalSearch.getState().open(id);
        }
      }
      if (e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        e.stopPropagation();
        return useLayout.getState().toggleTimeline();
      }
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
            e: () => void openInEditor(),
            p: () => useQuickOpen.getState().open(),
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
