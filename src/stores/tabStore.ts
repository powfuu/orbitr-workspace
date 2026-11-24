import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ID, Tab, TabTarget } from "../types";
import { uid } from "../lib/id";
import { persistOptions } from "./persist";
import { useWorkspaces } from "./workspaceStore";
import { leaves, removePane, setRatio, splitAt, type LayoutNode, type Side } from "./paneTree";

const sameTarget = (a: TabTarget, b: TabTarget) =>
  a.type === b.type && ("id" in a ? a.id : null) === ("id" in b ? b.id : null);

export interface TabGroup {
  tabs: Tab[];
  activeTabId: ID;
}

/** A workspace's center area: a split tree of panes, each with its own tabs. */
export interface PaneLayout {
  panes: Record<ID, TabGroup>;
  layout: LayoutNode;
  focusedPane: ID;
}

const homeGroup = (): TabGroup => {
  const id = uid();
  return { tabs: [{ id, target: { type: "home" } }], activeTabId: id };
};

const freshLayout = (): PaneLayout => {
  const pane = uid();
  return { panes: { [pane]: homeGroup() }, layout: { type: "pane", id: pane }, focusedPane: pane };
};
const FALLBACK = freshLayout();

const activeWs = () => useWorkspaces.getState().activeWorkspaceId;

function paneOf(l: PaneLayout, tabId: ID): ID | undefined {
  return Object.keys(l.panes).find((p) => l.panes[p]!.tabs.some((t) => t.id === tabId));
}

/** Removes a tab from its pane; an emptied pane disappears unless it is the last one. */
function detach(l: PaneLayout, tabId: ID): { l: PaneLayout; tab?: Tab } {
  const from = paneOf(l, tabId);
  if (!from) return { l };
  const g = l.panes[from]!;
  const idx = g.tabs.findIndex((t) => t.id === tabId);
  const tab = g.tabs[idx];
  const tabs = g.tabs.filter((t) => t.id !== tabId);
  if (tabs.length === 0) {
    if (Object.keys(l.panes).length > 1) {
      const { [from]: _gone, ...panes } = l.panes;
      const layout = removePane(l.layout, from);
      const focusedPane = l.focusedPane === from ? leaves(layout)[0]! : l.focusedPane;
      return { l: { panes, layout, focusedPane }, tab };
    }
    return { l: { ...l, panes: { [from]: homeGroup() } }, tab };
  }
  const activeTabId = g.activeTabId === tabId ? tabs[Math.max(0, idx - 1)]!.id : g.activeTabId;
  return { l: { ...l, panes: { ...l.panes, [from]: { tabs, activeTabId } } }, tab };
}

function insert(l: PaneLayout, pane: ID, tab: Tab, index?: number): PaneLayout {
  const g = l.panes[pane] ?? { tabs: [], activeTabId: tab.id };
  const tabs = [...g.tabs];
  tabs.splice(index ?? tabs.length, 0, tab);
  return { ...l, panes: { ...l.panes, [pane]: { tabs, activeTabId: tab.id } }, focusedPane: pane };
}

interface TabState {
  byWorkspace: Record<ID, PaneLayout>;
  /** Focuses the target if open in any pane, else opens it in the focused pane. */
  open: (target: TabTarget, workspaceId?: ID) => void;
  activate: (tabId: ID) => void;
  /** Closes the UI tab only — never terminates the underlying session. */
  close: (tabId: ID) => void;
  closeWhere: (pred: (t: TabTarget) => boolean) => void;
  dropWorkspace: (workspaceId: ID) => void;
  focusPane: (paneId: ID) => void;
  /** Splits `paneId` on `side`. Moves `tabId` (default: the pane's active tab when it has others) into the new pane. */
  split: (paneId: ID, side: Side, tabId?: ID) => void;
  moveTab: (tabId: ID, toPane: ID, index?: number) => void;
  resize: (splitId: ID, ratio: number) => void;
  splitFocused: (side: Side) => void;
}

export const useTabs = create<TabState>()(
  persist(
    (set, get) => {
      const update = (ws: ID, fn: (l: PaneLayout) => PaneLayout) =>
        set((s) => ({ byWorkspace: { ...s.byWorkspace, [ws]: fn(s.byWorkspace[ws] ?? FALLBACK) } }));
      const cur = () => get().byWorkspace[activeWs()] ?? FALLBACK;

      return {
        byWorkspace: {},
        open: (target, ws = activeWs()) =>
          update(ws, (l) => {
            for (const [pane, g] of Object.entries(l.panes)) {
              const found = g.tabs.find((t) => sameTarget(t.target, target));
              if (found) return { ...l, focusedPane: pane, panes: { ...l.panes, [pane]: { ...g, activeTabId: found.id } } };
            }
            return insert(l, l.focusedPane, { id: uid(), target });
          }),
        activate: (tabId) =>
          update(activeWs(), (l) => {
            const pane = paneOf(l, tabId);
            return pane ? { ...l, focusedPane: pane, panes: { ...l.panes, [pane]: { ...l.panes[pane]!, activeTabId: tabId } } } : l;
          }),
        close: (tabId) => update(activeWs(), (l) => detach(l, tabId).l),
        closeWhere: (pred) =>
          set((s) => ({
            byWorkspace: Object.fromEntries(
              Object.entries(s.byWorkspace).map(([ws, l]) => {
                const ids = Object.values(l.panes).flatMap((g) => g.tabs.filter((t) => pred(t.target)).map((t) => t.id));
                return [ws, ids.reduce((acc, id) => detach(acc, id).l, l)];
              }),
            ),
          })),
        dropWorkspace: (ws) =>
          set((s) => {
            const { [ws]: _gone, ...byWorkspace } = s.byWorkspace;
            return { byWorkspace };
          }),
        focusPane: (paneId) => {
          if (cur().focusedPane !== paneId) update(activeWs(), (l) => ({ ...l, focusedPane: paneId }));
        },
        split: (paneId, side, tabId) =>
          update(activeWs(), (l) => {
            const g = l.panes[paneId];
            if (!g) return l;
            const moving = tabId ?? (g.tabs.length > 1 ? g.activeTabId : undefined);
            const newPane = uid();
            let next: PaneLayout = { ...l, layout: splitAt(l.layout, paneId, newPane, side, uid()) };
            if (moving) {
              const { l: after, tab } = detach(next, moving);
              next = tab ? insert(after, newPane, tab) : after;
              // Detaching the last tab of the source removed that pane; the split still needs a home group.
            }
            if (!next.panes[newPane]) next = { ...next, panes: { ...next.panes, [newPane]: homeGroup() } };
            return { ...next, focusedPane: newPane };
          }),
        moveTab: (tabId, toPane, index) =>
          update(activeWs(), (l) => {
            const from = paneOf(l, tabId);
            if (!from) return l;
            if (from === toPane) {
              const g = l.panes[from]!;
              const tab = g.tabs.find((t) => t.id === tabId)!;
              const tabs = g.tabs.filter((t) => t.id !== tabId);
              tabs.splice(Math.min(index ?? tabs.length, tabs.length), 0, tab);
              return { ...l, panes: { ...l.panes, [from]: { tabs, activeTabId: tabId } }, focusedPane: from };
            }
            const { l: after, tab } = detach(l, tabId);
            return tab && after.panes[toPane] ? insert(after, toPane, tab, index) : l;
          }),
        splitFocused: (side) => get().split(cur().focusedPane, side),
        resize: (splitId, ratio) => update(activeWs(), (l) => ({ ...l, layout: setRatio(l.layout, splitId, ratio) })),
      };
    },
    {
      ...persistOptions,
      name: "orbitr.tabs",
      version: 2,
      migrate: (old, version) => {
        if (version === 1) {
          // v1: one tab group per workspace → a single pane.
          const prev = (old as { byWorkspace?: Record<ID, TabGroup> }).byWorkspace ?? {};
          return {
            byWorkspace: Object.fromEntries(
              Object.entries(prev).map(([ws, g]) => {
                const pane = uid();
                return [ws, { panes: { [pane]: g }, layout: { type: "pane", id: pane }, focusedPane: pane }];
              }),
            ),
          };
        }
        return { byWorkspace: {} };
      },
    },
  ),
);

/** Whole pane layout of the active workspace. */
export function useWorkspaceLayout(): PaneLayout {
  const ws = useWorkspaces((s) => s.activeWorkspaceId);
  return useTabs((s) => s.byWorkspace[ws] ?? FALLBACK);
}

/** Tabs of the focused pane in the active workspace. */
export function useActiveTabs(): TabGroup {
  const l = useWorkspaceLayout();
  return l.panes[l.focusedPane] ?? Object.values(l.panes)[0]!;
}

export const getActiveTabs = (): TabGroup => {
  const l = useTabs.getState().byWorkspace[activeWs()] ?? FALLBACK;
  return l.panes[l.focusedPane] ?? Object.values(l.panes)[0]!;
};
