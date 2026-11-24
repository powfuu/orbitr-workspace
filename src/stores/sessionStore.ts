import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgentSession, ID, TerminalSession } from "../types";
import { persistOptions } from "./persist";

/**
 * Sessions backed by OS processes. Their metadata is persisted; the processes
 * themselves cannot survive a restart, so features/sessions/restore.ts relaunches them.
 */
interface SessionState {
  agents: AgentSession[];
  terminals: TerminalSession[];
  activeTerminalId: ID | null;
  addTerminal: (t: TerminalSession) => void;
  updateTerminal: (id: ID, patch: Partial<TerminalSession>) => void;
  removeTerminal: (id: ID) => void;
  setActiveTerminal: (id: ID) => void;
  addAgent: (a: AgentSession) => void;
  updateAgent: (id: ID, patch: Partial<AgentSession>) => void;
  removeAgent: (id: ID) => void;
}

const patchById = <T extends { id: ID }>(list: T[], id: ID, patch: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...patch } : x));

export const useSessions = create<SessionState>()(
  persist(
  (set) => ({
  agents: [],
  terminals: [],
  activeTerminalId: null,
  addTerminal: (t) => set((s) => ({ terminals: [...s.terminals, t], activeTerminalId: t.id })),
  updateTerminal: (id, patch) => set((s) => ({ terminals: patchById(s.terminals, id, patch) })),
  removeTerminal: (id) =>
    set((s) => {
      const idx = s.terminals.findIndex((t) => t.id === id);
      const terminals = s.terminals.filter((t) => t.id !== id);
      const activeTerminalId =
        s.activeTerminalId === id ? (terminals[Math.max(0, idx - 1)]?.id ?? null) : s.activeTerminalId;
      return { terminals, activeTerminalId };
    }),
  setActiveTerminal: (activeTerminalId) => set({ activeTerminalId }),
  addAgent: (a) => set((s) => ({ agents: [...s.agents, a] })),
  updateAgent: (id, patch) => set((s) => ({ agents: patchById(s.agents, id, patch) })),
  removeAgent: (id) => set((s) => ({ agents: s.agents.filter((a) => a.id !== id) })),
  }),
  {
    ...persistOptions,
    name: "orbitr.sessions",
    partialize: ({ agents, terminals, activeTerminalId }) => ({ agents, terminals, activeTerminalId }),
  },
  ),
);
