import { useAvailability } from "../agents/availabilityStore";
import { startAgent } from "../agents/agentActions";
import { useSettings } from "../../stores/settingsStore";
import { useSessions } from "../../stores/sessionStore";
import { useWorkspaces } from "../../stores/workspaceStore";
import { useTabs, getActiveTabs } from "../../stores/tabStore";
import { useFocusedSession } from "../../stores/focusStore";
import { toast } from "../../stores/toastStore";
import { basename } from "../../lib/platform";
import type { ID } from "../../types";

const ORDER = ["nvim", "vim", "vi"] as const;

/** The editor to use: the preference if installed, else the first installed of nvim, vim, vi. */
export async function preferredEditor(): Promise<string | null> {
  let paths = useAvailability.getState().paths;
  if (!Object.keys(paths).length) {
    await useAvailability.getState().refresh();
    paths = useAvailability.getState().paths;
  }
  const pref = useSettings.getState().editor;
  if (pref !== "auto" && paths[pref]) return pref;
  return ORDER.find((k) => paths[k]) ?? null;
}

/** Project in context: active tab's project / agent's project / focused session's, else the first one. */
export function contextProject(): ID | null {
  const { projects, activeWorkspaceId } = useWorkspaces.getState();
  const { agents } = useSessions.getState();
  const tab = getActiveTabs().tabs.find((t) => t.id === getActiveTabs().activeTabId)?.target;
  if (tab?.type === "project" && projects[tab.id]) return tab.id;
  const agentId = tab?.type === "agent" ? tab.id : useFocusedSession.getState().id;
  const agent = agents.find((a) => a.id === agentId);
  if (agent && projects[agent.projectId]) return agent.projectId;
  return Object.values(projects).find((p) => p.workspaceId === activeWorkspaceId)?.id ?? null;
}

interface OpenOptions {
  projectId?: ID | null;
  /** Absolute or project-relative path. */
  file?: string;
  line?: number;
}

/** Opens Vim/Neovim in a center tab: the project root, or a file (at a line). Re-focuses an open one. */
export async function openInEditor({ projectId = contextProject(), file, line }: OpenOptions = {}) {
  if (!projectId) return toast({ kind: "info", title: "Add a project first", detail: "Vim opens in a project folder." });
  const kind = await preferredEditor();
  if (!kind) return toast({ kind: "error", title: "No Vim found", detail: "Install Neovim (Home → IDE integrations) and try again." });

  const args = [...(line ? [`+${line}`] : []), ...(file ? ["--", file] : [])];
  const same = useSessions.getState().agents.find(
    (a) => a.kind === kind && a.projectId === projectId && a.status === "running" && (a.args ?? []).filter((x) => !x.startsWith("+")).join("\0") === args.filter((x) => !x.startsWith("+")).join("\0"),
  );
  if (same) return useTabs.getState().open({ type: "agent", id: same.id });
  await startAgent(kind, projectId, { args, name: file ? basename(file) : undefined });
}

/** Side-by-side diff of a changed file in Vim (git difftool), working tree or staged. */
export async function openVimDiff(projectId: ID, file: string, staged: boolean) {
  const kind = await preferredEditor();
  const tool = kind === "nvim" ? "nvimdiff" : "vimdiff";
  await startAgent("diff", projectId, {
    args: ["difftool", "--no-prompt", `--tool=${tool}`, ...(staged ? ["--cached"] : []), "--", file],
    name: basename(file),
  });
}

/** Project owning a folder path (for views that only know the path). */
export const projectIdForPath = (path: string) => Object.values(useWorkspaces.getState().projects).find((p) => p.path === path)?.id ?? null;
