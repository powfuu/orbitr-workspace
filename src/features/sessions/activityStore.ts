import { create } from "zustand";
import type { ID } from "../../types";
import type { DetectedPrompt } from "../approvals/detectPrompt";

/**
 * Live activity derived from real PTY traffic (see activityTracker.ts):
 * - working: output is streaming (agents redraw spinners/progress while busy)
 * - idle: no output for a moment — the process is waiting
 * Plus: draft (unsent keystrokes), title (set by the program via OSC 0/2),
 * attention (bell / OSC 9 / OSC 777 notification) and unread (finished while you looked elsewhere).
 */
export interface Activity {
  phase: "working" | "idle";
  draft: number;
  title?: string;
  attention: boolean;
  unread: boolean;
  since: number;
  /** Approval prompt currently on screen, if any. */
  prompt?: DetectedPrompt;
}

interface ActivityState {
  byId: Record<ID, Activity>;
  patch: (id: ID, p: Partial<Activity>) => void;
  clear: (id: ID) => void;
}

const initial = (): Activity => ({ phase: "idle", draft: 0, attention: false, unread: false, since: Date.now() });

export const useActivity = create<ActivityState>()((set) => ({
  byId: {},
  patch: (id, p) =>
    set((s) => {
      const cur = s.byId[id] ?? initial();
      const changed = (Object.keys(p) as (keyof Activity)[]).some((k) => cur[k] !== p[k]);
      return changed ? { byId: { ...s.byId, [id]: { ...cur, ...p } } } : s;
    }),
  clear: (id) =>
    set((s) => {
      const { [id]: _gone, ...byId } = s.byId;
      return { byId };
    }),
}));

/** Marks a session as seen (clears unread/attention). */
export const markSeen = (id: ID) => useActivity.getState().patch(id, { unread: false, attention: false });
