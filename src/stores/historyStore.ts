import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgentKind, ID } from "../types";
import { persistOptions } from "./persist";

/** One agent run. Metadata only — the process itself never survives an app restart. */
export interface HistoryEntry {
  id: ID;
  sessionId: ID;
  kind: AgentKind;
  name: string;
  projectId: ID;
  workspaceId: ID;
  startedAt: number;
  endedAt?: number;
  exitCode?: number | null;
}

const LIMIT = 100;

interface HistoryState {
  entries: HistoryEntry[];
  record: (e: HistoryEntry) => void;
  finish: (id: ID, exitCode: number | null | undefined) => void;
  forgetProject: (projectId: ID) => void;
  forgetWorkspace: (workspaceId: ID) => void;
}

export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      record: (e) => set((s) => ({ entries: [e, ...s.entries].slice(0, LIMIT) })),
      finish: (id, exitCode) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id && !e.endedAt ? { ...e, endedAt: Date.now(), exitCode } : e)),
        })),
      forgetProject: (projectId) => set((s) => ({ entries: s.entries.filter((e) => e.projectId !== projectId) })),
      forgetWorkspace: (workspaceId) => set((s) => ({ entries: s.entries.filter((e) => e.workspaceId !== workspaceId) })),
    }),
    { ...persistOptions, name: "orbitr.history" },
  ),
);
