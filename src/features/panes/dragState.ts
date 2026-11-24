import { create } from "zustand";
import type { ID } from "../../types";

/** Which tab is being dragged (HTML5 DnD), so panes can show drop zones. */
export const useTabDrag = create<{ tabId: ID | null; set: (id: ID | null) => void }>()((set) => ({
  tabId: null,
  set: (tabId) => set({ tabId }),
}));

export const TAB_MIME = "application/x-orbitr-tab";
