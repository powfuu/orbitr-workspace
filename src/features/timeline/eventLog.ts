import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistOptions } from "../../stores/persist";
import type { ID } from "../../types";

/** Things Orbitr itself saw happen to a session (the transcript can't know these). */
export type OrbitrEventKind = "started" | "stopped" | "exited" | "crashed" | "waiting" | "answered" | "voice";

export interface OrbitrEvent {
  at: string;
  kind: OrbitrEventKind;
  title: string;
}

const CAP = 200;

interface EventLogState {
  byId: Record<ID, OrbitrEvent[]>;
  log: (id: ID, kind: OrbitrEventKind, title: string) => void;
  forget: (id: ID) => void;
}

export const useEventLog = create<EventLogState>()(
  persist(
    (set) => ({
      byId: {},
      log: (id, kind, title) =>
        set((s) => ({ byId: { ...s.byId, [id]: [...(s.byId[id] ?? []), { at: new Date().toISOString(), kind, title }].slice(-CAP) } })),
      forget: (id) =>
        set((s) => {
          const { [id]: _gone, ...byId } = s.byId;
          return { byId };
        }),
    }),
    { ...persistOptions, name: "orbitr.events" },
  ),
);

export const logEvent = (id: ID, kind: OrbitrEventKind, title: string) => useEventLog.getState().log(id, kind, title);
