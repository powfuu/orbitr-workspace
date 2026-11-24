import { create } from "zustand";
import { gitService, type GitStatus } from "../../services/git";
import { useWorkspaces } from "../../stores/workspaceStore";
import { isTauri } from "../../lib/platform";

/** path → status (null = not a git repo). Missing key = not checked yet. */
interface GitState {
  byPath: Record<string, GitStatus | null>;
  refresh: (path: string) => Promise<void>;
}

const inflight = new Set<string>();

export const useGit = create<GitState>()((set) => ({
  byPath: {},
  async refresh(path) {
    if (!isTauri || inflight.has(path)) return;
    inflight.add(path);
    try {
      const status = await gitService.status(path);
      set((s) => ({ byPath: { ...s.byPath, [path]: status } }));
    } catch {
      set((s) => ({ byPath: { ...s.byPath, [path]: null } }));
    } finally {
      inflight.delete(path);
    }
  },
}));

/** Refreshes every project of the active workspace. Agents edit files constantly, so poll. */
function refreshActiveWorkspace() {
  if (document.hidden) return;
  const { projects, activeWorkspaceId } = useWorkspaces.getState();
  for (const p of Object.values(projects)) if (p.workspaceId === activeWorkspaceId) void useGit.getState().refresh(p.path);
}

if (isTauri) {
  window.setInterval(refreshActiveWorkspace, 4000);
  window.addEventListener("focus", refreshActiveWorkspace);
  useWorkspaces.subscribe((s, prev) => {
    if (s.activeWorkspaceId !== prev.activeWorkspaceId || s.projects !== prev.projects) refreshActiveWorkspace();
  });
  queueMicrotask(refreshActiveWorkspace);
}
