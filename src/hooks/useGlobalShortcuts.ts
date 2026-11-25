import { useEffect } from "react";
import { hasMod, isMac } from "../lib/platform";
import { useLayout } from "../stores/layoutStore";
import { getActiveTabs, useTabs } from "../stores/tabStore";
import { useWorkspaces } from "../stores/workspaceStore";
import { useSessions } from "../stores/sessionStore";
import { terminalRegistry } from "../features/terminals/terminalRegistry";
import { newDefaultTerminal } from "../features/terminals/newDefaultTerminal";
import { openInEditor } from "../features/editors/openInEditor";
import { useQuickOpen } from "../components/editors/QuickOpen";
import { useSnippetPicker } from "../components/snippets/SnippetPicker";
import { useVoice } from "../features/voice/voiceStore";
import { useTerminalSearch } from "../features/search/searchStore";
import { editorFocused } from "../features/vim/useVimMode";
import { toggleFloating } from "../features/floating/floatingTerminal";
import { toggleFocusMode } from "../features/layout/focusMode";
import { closeFocused } from "../features/terminals/closeFocused";
import { searchTarget } from "../features/search/searchTarget";

export function cycleTab(step: 1 | -1) {
  const { tabs, activeTabId } = getActiveTabs();
  const i = tabs.findIndex((t) => t.id === activeTabId);
  const next = tabs[(i + step + tabs.length) % tabs.length];
  if (next) useTabs.getState().activate(next.id);
}

/**
 * App-wide shortcuts (Cmd on macOS, Ctrl elsewhere):
 * K palette · B sidebar · J terminal panel · T terminal · N start agent · W close tab
 * , settings · 1–9 project, Shift+1–9 workspace, Ctrl+1–9 terminal · Shift+[ / ] or Ctrl+(Shift+)Tab cycle tabs.
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
      // Inside Vim/Neovim every Ctrl/Option combo belongs to the editor; only ⌘ shortcuts stay app-wide.
      if (!e.metaKey && (e.ctrlKey || e.altKey) && editorFocused(e.target as Element | null)) return;
      if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        return cycleTab(e.shiftKey ? -1 : 1);
      }
      // Option/Alt+Shift+Q/W/E: focus sidebar search · centre pane · terminal panel.
      if (e.altKey && e.shiftKey && !e.metaKey && !e.ctrlKey && /^Key[QWE]$/.test(e.code)) {
        e.preventDefault();
        e.stopPropagation();
        return focusArea(e.code);
      }
      // Number keys (e.code, so Shift/Option don't change the digit):
      //   Mod+N project · Mod+Shift+N workspace · Option/Alt+N tab in the focused pane ·
      //   Ctrl+N terminal on macOS (Ctrl+Alt+N on Windows/Linux, where Ctrl is the Mod key).
      const digit = /^Digit([1-9])$/.exec(e.code)?.[1];
      if (digit) {
        const n = Number(digit) - 1;
        const terminalKey = isMac ? e.ctrlKey && !e.metaKey && !e.altKey : e.ctrlKey && e.altKey;
        const tabKey = e.altKey && !e.ctrlKey && !e.metaKey;
        const action = terminalKey
          ? () => focusTerminal(n)
          : tabKey
            ? () => goToTab(n)
            : hasMod(e) && !e.altKey
              ? e.shiftKey
                ? () => switchWorkspace(n)
                : () => openProject(n)
              : null;
        if (action) {
          e.preventDefault();
          e.stopPropagation();
          return action();
        }
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
        ? { "[": () => cycleTab(-1), "]": () => cycleTab(1), "{": () => cycleTab(-1), "}": () => cycleTab(1), enter: () => toggleFocusMode(), n: () => toggleFloating(true) }
        : {
            k: () => layout.setPaletteOpen(!layout.paletteOpen),
            b: layout.toggleSidebar,
            j: layout.toggleTerminal,
            t: () => void newDefaultTerminal(),
            n: () => toggleFloating(),
            w: closeFocused,
            ",": () => useTabs.getState().open({ type: "settings" }),
            e: () => void openInEditor(),
            p: () => useQuickOpen.getState().open(),
            ";": () => useSnippetPicker.getState().set(true),
          };
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

/** Nth workspace (sidebar order). */
function switchWorkspace(n: number) {
  const ws = useWorkspaces.getState().workspaces[n];
  if (ws) useWorkspaces.getState().setActiveWorkspace(ws.id);
}

/** Nth project of the active workspace, in sidebar order. */
function openProject(n: number) {
  const { workspaces, activeWorkspaceId } = useWorkspaces.getState();
  const id = workspaces.find((w) => w.id === activeWorkspaceId)?.projectIds[n];
  if (id) useTabs.getState().open({ type: "project", id });
}

/** Nth terminal in the right panel; opens the panel and focuses it. */
export function focusArea(code: string) {
  const layout = useLayout.getState();
  if (code === "KeyQ") {
    if (!layout.sidebarOpen) layout.toggleSidebar();
    return window.setTimeout(() => document.querySelector<HTMLInputElement>("[data-session-search]")?.focus(), 60);
  }
  if (code === "KeyE") {
    const id = useSessions.getState().activeTerminalId ?? useSessions.getState().terminals[0]?.id;
    layout.openTerminalPanel();
    return id && window.setTimeout(() => terminalRegistry.focus(id), 60);
  }
  // Centre: the active tab's agent/editor input, else the pane itself.
  const { tabs, activeTabId } = getActiveTabs();
  const target = tabs.find((t) => t.id === activeTabId)?.target as { type: string; id?: string } | undefined;
  if (target?.type === "agent" && target.id && terminalRegistry.get(target.id)) return terminalRegistry.focus(target.id);
  document.querySelector<HTMLElement>('[data-region="main"]')?.focus();
}

function focusTerminal(n: number) {
  const t = useSessions.getState().terminals[n];
  if (!t) return;
  useSessions.getState().setActiveTerminal(t.id);
  useLayout.getState().openTerminalPanel();
  window.setTimeout(() => terminalRegistry.focus(t.id), 60);
}

/** Nth tab of the focused pane; 9 = last tab, as in browsers. */
function goToTab(n: number) {
  const { tabs } = getActiveTabs();
  const tab = n === 8 ? tabs[tabs.length - 1] : tabs[n];
  if (tab) useTabs.getState().activate(tab.id);
}
