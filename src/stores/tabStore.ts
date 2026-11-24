import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ID, Tab, TabTarget } from "../types";
import { uid } from "../lib/id";
import { persistOptions } from "./persist";
import { useWorkspaces } from "./workspaceStore";

const sameTarget = (a: TabTarget, b: TabTarget) =>
  a.type === b.type && ("id" in a ? a.id : null) === ("id" in b ? b.id : null);

const HOME: Tab = { id: "home", target: { type: "home" } };

interface TabGroup {
  tabs: Tab[];
  activeTabId: ID;
}
const EMPTY: TabGroup = { tabs: [HOME], activeTabId: HOME.id };

const activeWs = () => useWorkspaces.getState().activeWorkspaceId;

interface TabState {
  /** Each workspace keeps its own tab set, restored when switching back. */
  byWorkspace: Record<ID, TabGroup>;
  open: (target: TabTarget, workspaceId?: ID) => void;
  activate: (id: ID) => void;
  /** Closes the UI tab only — never terminates the underlying session. */
  close: (id: ID) => void;
  closeWhere: (pred: (t: TabTarget) => boolean) => void;
  dropWorkspace: (workspaceId: ID) => void;
}

function closeIn(g: TabGroup, id: ID): TabGroup {
  const idx = g.tabs.findIndex((t) => t.id === id);
  if (idx < 0) return g;
  const tabs = g.tabs.filter((t) => t.id !== id);
  if (tabs.length === 0) return EMPTY;
  return { tabs, activeTabId: g.activeTabId === id ? tabs[Math.max(0, idx - 1)]!.id : g.activeTabId };
}

export const useTabs = create<TabState>()(
  persist(
    (set) => {
      const update = (ws: ID, fn: (g: TabGroup) => TabGroup) =>
        set((s) => ({ byWorkspace: { ...s.byWorkspace, [ws]: fn(s.byWorkspace[ws] ?? EMPTY) } }));
      return {
        byWorkspace: {},
        open: (target, ws = activeWs()) =>
          update(ws, (g) => {
            const found = g.tabs.find((t) => sameTarget(t.target, target));
            if (found) return { ...g, activeTabId: found.id };
            const tab = { id: uid(), target };
            return { tabs: [...g.tabs, tab], activeTabId: tab.id };
          }),
        activate: (id) => update(activeWs(), (g) => ({ ...g, activeTabId: id })),
        close: (id) => update(activeWs(), (g) => closeIn(g, id)),
        closeWhere: (pred) =>
          set((s) => ({
            byWorkspace: Object.fromEntries(
              Object.entries(s.byWorkspace).map(([ws, g]) => [
                ws,
                g.tabs.filter((t) => pred(t.target)).reduce((acc, t) => closeIn(acc, t.id), g),
              ]),
            ),
          })),
        dropWorkspace: (ws) =>
          set((s) => {
            const { [ws]: _gone, ...byWorkspace } = s.byWorkspace;
            return { byWorkspace };
          }),
      };
    },
    {
      ...persistOptions,
      name: "orbitr.tabs",
      version: 1,
      migrate: () => ({ byWorkspace: {} }), // v0 stored a single global tab list
    },
  ),
);

/** Tabs of the active workspace. */
export function useActiveTabs(): TabGroup {
  const ws = useWorkspaces((s) => s.activeWorkspaceId);
  return useTabs((s) => s.byWorkspace[ws] ?? EMPTY);
}

export const getActiveTabs = (): TabGroup => useTabs.getState().byWorkspace[activeWs()] ?? EMPTY;
