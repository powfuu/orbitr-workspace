import { create } from "zustand";
import type { ID } from "../../types";

/** Which session's find bar is open. One at a time, like a browser. */
export const useTerminalSearch = create<{ openFor: ID | null; open: (id: ID) => void; close: () => void }>()((set) => ({
  openFor: null,
  open: (openFor) => set({ openFor }),
  close: () => set({ openFor: null }),
}));
