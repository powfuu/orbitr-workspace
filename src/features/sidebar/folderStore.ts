import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistOptions } from "../../stores/persist";
import { uid } from "../../lib/id";

export type FolderSection = "agents" | "terminals";

export interface Folder {
  id: string;
  name: string;
  section: FolderSection;
  collapsed: boolean;
}

interface FolderState {
  folders: Folder[];
  /** session id → folder id. Sessions not listed are loose. */
  placement: Record<string, string>;
  add: (section: FolderSection) => string;
  rename: (id: string, name: string) => void;
  toggle: (id: string) => void;
  /** Deleting a folder keeps its sessions; they become loose again. */
  remove: (id: string) => void;
  place: (sessionId: string, folderId: string | null) => void;
}

/** Sidebar folders for agents and terminals. Persisted until deleted. */
export const useFolders = create<FolderState>()(
  persist(
    (set) => ({
      folders: [],
      placement: {},
      add: (section) => {
        const id = uid();
        set((s) => ({ folders: [...s.folders, { id, name: "New folder", section, collapsed: false }] }));
        return id;
      },
      rename: (id, name) => set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)) })),
      toggle: (id) => set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, collapsed: !f.collapsed } : f)) })),
      remove: (id) =>
        set((s) => ({
          folders: s.folders.filter((f) => f.id !== id),
          placement: Object.fromEntries(Object.entries(s.placement).filter(([, f]) => f !== id)),
        })),
      place: (sessionId, folderId) =>
        set((s) => {
          const placement = { ...s.placement };
          if (folderId) placement[sessionId] = folderId;
          else delete placement[sessionId];
          return { placement };
        }),
    }),
    { ...persistOptions, name: "orbitr.folders" },
  ),
);

/** Which sidebar row is being renamed (session or folder id). */
export const useRenaming = create<{ id: string | null; set: (id: string | null) => void }>()((set) => ({ id: null, set: (id) => set({ id }) }));

export const SESSION_MIME = "application/x-orbitr-session";
