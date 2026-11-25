import { useWorkspaces } from "../../stores/workspaceStore";
import { useSessions } from "../../stores/sessionStore";
import { useFocusedSession } from "../../stores/focusStore";
import { getActiveTabs } from "../../stores/tabStore";
import { cachedPlatformInfo } from "../../hooks/usePlatformInfo";
import { basename } from "../../lib/platform";

/**
 * Folder a new terminal should open in, from what you're looking at:
 * project / its Git tab → project folder; agent → its folder (worktree included);
 * a focused terminal → the same folder; otherwise (Dashboard, Settings) → home.
 */
export function contextCwd(): string | undefined {
  const { projects } = useWorkspaces.getState();
  const { agents, terminals } = useSessions.getState();
  const focused = useFocusedSession.getState().id;
  const focusedTerminal = terminals.find((t) => t.id === focused && t.cwd !== "~");
  if (focusedTerminal && document.activeElement?.closest(`[data-session="${CSS.escape(focusedTerminal.id)}"]`)) return focusedTerminal.cwd;

  const { tabs, activeTabId } = getActiveTabs();
  const tab = tabs.find((t) => t.id === activeTabId)?.target;
  if (tab?.type === "project" || tab?.type === "git") return projects[tab.id]?.path;
  if (tab?.type === "agent") {
    const a = agents.find((x) => x.id === tab.id);
    return a ? (a.cwd ?? projects[a.projectId]?.path) : undefined;
  }
  return undefined; // home
}

/** "tasaciones-mobile" when the folder is a project, else a short path like "~/Desktop/notes". */
export function cwdLabel(cwd: string | undefined): string {
  if (!cwd || cwd === "~") return "~";
  const project = Object.values(useWorkspaces.getState().projects).find((p) => p.path === cwd);
  if (project) return project.name;
  const home = cachedPlatformInfo()?.homeDir;
  if (home && cwd === home) return "~";
  const rel = home && cwd.startsWith(home + "/") ? "~/" + cwd.slice(home.length + 1) : cwd;
  const parts = rel.split("/").filter(Boolean);
  return parts.length > 3 ? `…/${parts.slice(-2).join("/")}` : rel || basename(cwd);
}

/** Full path for tooltips ("~" expanded when known). */
export function cwdFull(cwd: string): string {
  return cwd === "~" ? (cachedPlatformInfo()?.homeDir ?? "~") : cwd;
}
