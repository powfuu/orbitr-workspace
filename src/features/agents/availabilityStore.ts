import { create } from "zustand";
import { agentService } from "../../services/agents";
import { isTauri } from "../../lib/platform";
import { agentList } from "./registry";

/** kind → absolute path (installed), null (not installed). Missing key = not checked yet. */
interface AvailabilityState {
  paths: Record<string, string | null>;
  checking: boolean;
  refresh: () => Promise<void>;
}

export const useAvailability = create<AvailabilityState>()((set, get) => ({
  paths: {},
  checking: false,
  refresh: async () => {
    if (!isTauri || get().checking) return;
    set({ checking: true });
    const entries = await Promise.all(
      agentList.map(async (a) => [a.kind, await agentService.resolveExecutable(a.executable).catch(() => null)] as const),
    );
    set({ paths: Object.fromEntries(entries), checking: false });
  },
}));

// Re-check when returning to the app (e.g. after installing a CLI elsewhere).
window.addEventListener("focus", () => void useAvailability.getState().refresh());
