import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistOptions } from "./persist";

export const SIDEBAR_MIN = 220;
export const SIDEBAR_MAX = 380;
export const TERMINAL_MIN = 300;
export const TERMINAL_MAX = 760;

interface LayoutState {
  sidebarWidth: number;
  terminalWidth: number;
  sidebarOpen: boolean;
  terminalOpen: boolean;
  collapsedSections: Record<string, boolean>;
  paletteOpen: boolean;
  timelineOpen: boolean;
  toggleTimeline: () => void;
  paletteQuery: string;
  setSidebarWidth: (w: number) => void;
  setTerminalWidth: (w: number) => void;
  toggleSidebar: () => void;
  toggleTerminal: () => void;
  openTerminalPanel: () => void;
  toggleSection: (key: string) => void;
  setPaletteOpen: (open: boolean, query?: string) => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const useLayout = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarWidth: 264,
      terminalWidth: 420,
      sidebarOpen: true,
      terminalOpen: true,
      collapsedSections: {},
      paletteOpen: false,
      timelineOpen: false,
      toggleTimeline: () => set((s) => ({ timelineOpen: !s.timelineOpen })),
      paletteQuery: "",
      setSidebarWidth: (w) => set({ sidebarWidth: clamp(w, SIDEBAR_MIN, SIDEBAR_MAX) }),
      setTerminalWidth: (w) => set({ terminalWidth: clamp(w, TERMINAL_MIN, TERMINAL_MAX) }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleTerminal: () => set((s) => ({ terminalOpen: !s.terminalOpen })),
      openTerminalPanel: () => set({ terminalOpen: true }),
      toggleSection: (key) =>
        set((s) => ({ collapsedSections: { ...s.collapsedSections, [key]: !s.collapsedSections[key] } })),
      setPaletteOpen: (paletteOpen, paletteQuery = "") => set({ paletteOpen, paletteQuery }),
    }),
    {
      ...persistOptions,
      name: "orbitr.layout",
      partialize: ({ paletteOpen: _p, paletteQuery: _q, ...rest }) => rest,
    },
  ),
);
