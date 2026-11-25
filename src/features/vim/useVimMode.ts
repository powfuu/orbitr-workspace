import { useEffect } from "react";
import { useSettings } from "../../stores/settingsStore";
import { useLayout } from "../../stores/layoutStore";
import { getActiveTabs } from "../../stores/tabStore";
import { useSessions } from "../../stores/sessionStore";
import { focusedRegion } from "../../lib/focusRegion";
import { isEditor } from "../agents/registry";
import { cycleTab, focusArea } from "../../hooks/useGlobalShortcuts";
import { terminalRegistry } from "../terminals/terminalRegistry";
import { useVim } from "./vimStore";
import { activate, collectHints } from "./hints";

const EDITABLE = "input, textarea, select, [contenteditable], .xterm";
const DOUBLE_ESC_MS = 400;

export function editorFocused(target: Element | null) {
  if (focusedRegion() !== "main" || !target?.closest(".xterm")) return false;
  const { tabs, activeTabId } = getActiveTabs();
  const t = tabs.find((x) => x.id === activeTabId)?.target as { type: string; id?: string } | undefined;
  const agent = t?.type === "agent" ? useSessions.getState().agents.find((a) => a.id === t.id) : undefined;
  return !!agent && isEditor(agent.kind);
}

function toInsert() {
  const region = focusedRegion();
  focusArea(region === "terminal" ? "KeyE" : region === "sidebar" ? "KeyQ" : "KeyW");
  useVim.getState().set({ mode: "insert" });
}

function cycle(step: 1 | -1) {
  if (focusedRegion() === "terminal") {
    const { terminals, activeTerminalId, setActiveTerminal } = useSessions.getState();
    const i = terminals.findIndex((t) => t.id === activeTerminalId);
    const next = terminals[(i + step + terminals.length) % terminals.length];
    if (next) {
      setActiveTerminal(next.id);
      window.setTimeout(() => terminalRegistry.focus(next.id), 60);
    }
    return useVim.getState().set({ mode: "insert" });
  }
  cycleTab(step);
  window.setTimeout(toInsert, 60);
}

function scroll(dy: number) {
  const region = document.querySelector(`[data-region="${focusedRegion()}"]`) ?? document.body;
  const box = [...region.querySelectorAll<HTMLElement>("*")].find((el) => el.scrollHeight > el.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(el).overflowY) && el.offsetParent);
  box?.scrollBy({ top: dy, behavior: "smooth" });
}

/** App-wide Vim mode. Esc (double Esc inside an editor) → NORMAL; i/Enter or clicking an input → INSERT. */
export function useVimMode() {
  useEffect(() => {
    let lastEsc = 0;
    const vim = () => useVim.getState();
    const swallow = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };

    const onFocus = (e: FocusEvent) => {
      if (useSettings.getState().vimMode && (e.target as Element)?.closest?.(EDITABLE)) vim().set({ mode: "insert", hints: null });
    };

    const onKey = (e: KeyboardEvent) => {
      // Ctrl+H / Ctrl+L: previous / next tab in the focused area (centre tabs or terminals), always.
      if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && (e.code === "KeyH" || e.code === "KeyL") && focusedRegion() !== "sidebar" && focusedRegion() !== "floating" && !editorFocused(e.target as Element | null)) {
        swallow(e);
        return cycle(e.code === "KeyL" ? 1 : -1);
      }
      if (!useSettings.getState().vimMode) return;
      const target = e.target as Element | null;
      const { mode, hints, typed, set } = vim();

      if (hints) {
        swallow(e);
        if (e.key === "Escape") return set({ hints: null, typed: "" });
        if (!/^[a-z]$/i.test(e.key)) return;
        const next = typed + e.key.toLowerCase();
        const matches = hints.filter((h) => h.label.startsWith(next));
        if (matches.length === 0) return set({ hints: null, typed: "" });
        const [only] = matches;
        if (matches.length === 1 && only && only.label === next) {
          set({ hints: null, typed: "" });
          return activate(only.el);
        }
        return set({ typed: next });
      }

      if (e.key === "Escape" && mode === "insert") {
        const layout = useLayout.getState();
        if (layout.paletteOpen || layout.helpOpen || [...document.querySelectorAll<HTMLElement>('[role="dialog"], [role="menu"], [role="listbox"]')].some((el) => el.checkVisibility())) return;
        if (editorFocused(target)) {
          const now = performance.now();
          if (now - lastEsc > DOUBLE_ESC_MS) return void (lastEsc = now); // first Esc goes to Vim
        }
        swallow(e);
        (document.activeElement as HTMLElement | null)?.blur();
        return set({ mode: "normal" });
      }

      if (mode !== "normal" || e.metaKey || e.altKey) return;
      if (target?.closest?.(EDITABLE) && !target.closest(".xterm")) return; // focused by hint/click → typing

      if (e.ctrlKey) return;
      const actions: Record<string, () => void> = {
        ":": () => useLayout.getState().setPaletteOpen(true),
        i: toInsert,
        a: toInsert,
        Enter: toInsert,
        f: () => set({ hints: collectHints(), typed: "" }),
        j: () => scroll(80),
        k: () => scroll(-80),
        d: () => scroll(innerHeight / 2),
        u: () => scroll(-innerHeight / 2),
      };
      const action = actions[e.key];
      if (action) {
        swallow(e);
        action();
      }
    };

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("focusin", onFocus, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("focusin", onFocus, true);
    };
  }, []);
}
