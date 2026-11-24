import { create } from "zustand";
import type { ID } from "../types";

/** The agent/terminal session that last had keyboard focus — where voice input goes. */
export const useFocusedSession = create<{ id: ID | null; set: (id: ID) => void }>()((set) => ({
  id: null,
  set: (id) => set({ id }),
}));
