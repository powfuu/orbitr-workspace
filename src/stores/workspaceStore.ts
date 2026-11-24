import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ID, Project, Workspace } from "../types";
import { uid } from "../lib/id";
import { basename } from "../lib/platform";
import { persistOptions } from "./persist";

interface WorkspaceState {
  workspaces: Workspace[];
  projects: Record<ID, Project>;
  activeWorkspaceId: ID;
  createWorkspace: (name: string) => ID;
  renameWorkspace: (id: ID, name: string) => void;
  /** Removes the workspace and its projects. Callers stop its sessions first. */
  deleteWorkspace: (id: ID) => void;
  setActiveWorkspace: (id: ID) => void;
  addProject: (path: string) => ID;
  renameProject: (id: ID, name: string) => void;
  reorderProjects: (workspaceId: ID, projectIds: ID[]) => void;
  removeProject: (id: ID) => void;
}

const HUES = [252, 152, 38, 200, 330, 12];
const newWorkspace = (name: string, i: number): Workspace => ({ id: uid(), name, hue: HUES[i % HUES.length]!, projectIds: [] });
const first = newWorkspace("Personal", 0);

export const useWorkspaces = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [first],
      projects: {},
      activeWorkspaceId: first.id,
      createWorkspace: (name) => {
        const ws = newWorkspace(name, get().workspaces.length);
        set((s) => ({ workspaces: [...s.workspaces, ws], activeWorkspaceId: ws.id }));
        return ws.id;
      },
      renameWorkspace: (id, name) =>
        set((s) => ({ workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, name } : w)) })),
      deleteWorkspace: (id) =>
        set((s) => {
          if (s.workspaces.length <= 1) return s;
          const workspaces = s.workspaces.filter((w) => w.id !== id);
          const projects = Object.fromEntries(Object.entries(s.projects).filter(([, p]) => p.workspaceId !== id));
          const activeWorkspaceId = s.activeWorkspaceId === id ? workspaces[0]!.id : s.activeWorkspaceId;
          return { workspaces, projects, activeWorkspaceId };
        }),
      setActiveWorkspace: (activeWorkspaceId) => set({ activeWorkspaceId }),
      addProject: (path) => {
        const { activeWorkspaceId, projects } = get();
        const existing = Object.values(projects).find((p) => p.path === path && p.workspaceId === activeWorkspaceId);
        if (existing) return existing.id;
        const project: Project = { id: uid(), name: basename(path), path, workspaceId: activeWorkspaceId, addedAt: Date.now() };
        set((s) => ({
          projects: { ...s.projects, [project.id]: project },
          workspaces: s.workspaces.map((w) =>
            w.id === activeWorkspaceId ? { ...w, projectIds: [...w.projectIds, project.id] } : w,
          ),
        }));
        return project.id;
      },
      renameProject: (id, name) =>
        set((s) => {
          const p = s.projects[id];
          return p ? { projects: { ...s.projects, [id]: { ...p, name } } } : s;
        }),
      reorderProjects: (workspaceId, projectIds) =>
        set((s) => ({ workspaces: s.workspaces.map((w) => (w.id === workspaceId ? { ...w, projectIds } : w)) })),
      removeProject: (id) =>
        set((s) => {
          const { [id]: _removed, ...projects } = s.projects;
          return {
            projects,
            workspaces: s.workspaces.map((w) => ({ ...w, projectIds: w.projectIds.filter((p) => p !== id) })),
          };
        }),
    }),
    { ...persistOptions, name: "orbitr.workspaces" },
  ),
);

export const useActiveWorkspace = () =>
  useWorkspaces((s) => s.workspaces.find((w) => w.id === s.activeWorkspaceId) ?? s.workspaces[0]!);
