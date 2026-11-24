import { useSessions } from "../../stores/sessionStore";
import { useWorkspaces } from "../../stores/workspaceStore";
import { useTabs } from "../../stores/tabStore";
import { useHistory } from "../../stores/historyStore";
import { uid } from "../../lib/id";
import { toast } from "../../stores/toastStore";
import { useSettings } from "../../stores/settingsStore";
import { logEvent, useEventLog } from "../timeline/eventLog";
import { bindClaudeSession } from "../timeline/bindSession";
import { branchService } from "../../services/git";
import { isTauri } from "../../lib/platform";
import { disposePty, killPty, resetScreen, spawnPty } from "../sessions/ptySession";
import { AGENTS } from "./registry";
import { agentSpawnOptions } from "./launch";
import type { AgentSession, ID } from "../../types";

/** Spawns the agent's process into its session. `resume` is used when restoring after an app restart. */
export async function launchAgent(a: AgentSession, resume: boolean | string = false) {
  const project = useWorkspaces.getState().projects[a.projectId];
  const def = AGENTS[a.kind];
  if (!project || !def) return;
  const editor = def.category === "editor";
  const opts = await agentSpawnOptions(def, a.cwd ?? project.path, editor ? false : resume, a.args ?? []);
  const runId = uid();
  const { record, finish } = useHistory.getState();
  if (!editor) record({ id: runId, sessionId: a.id, kind: a.kind, name: a.name, projectId: a.projectId, workspaceId: a.workspaceId, startedAt: Date.now() });
  await spawnPty(a.id, opts, (u) => {
    useSessions.getState().updateAgent(a.id, u);
    if (u.status === "running") {
      logEvent(a.id, "started", resume === true ? "Restored (continued last conversation)" : typeof resume === "string" ? "Resumed conversation" : `Started ${def.displayName}`);
      bindClaudeSession({ ...a, startedAt: Date.now() }, a.cwd ?? project.path);
    }
    if (u.status === "exited") logEvent(a.id, "exited", `Process exited${u.exitCode != null ? ` (code ${u.exitCode})` : ""}`);
    // :q in an editor closes its tab, like any editor would.
    if (editor && u.status === "exited" && (u.exitCode ?? 0) === 0 && useSettings.getState().closeEditorOnQuit) void removeAgent(a.id);
    if (u.status === "failed") logEvent(a.id, "crashed", `Crashed${u.exitCode != null ? ` with code ${u.exitCode}` : ""}`);
    if (u.status === "exited" || u.status === "failed") finish(runId, u.exitCode);
    if (u.status === "failed" && u.exitCode != null)
      toast({ kind: "error", title: `${a.name} exited with code ${u.exitCode}`, detail: u.exitCode === 127 ? `${def.executable} was not found on PATH.` : undefined });
  }, { quiet: editor });
}

function finishOpenRuns(sessionId: ID) {
  const h = useHistory.getState();
  h.entries.filter((e) => e.sessionId === sessionId && !e.endedAt).forEach((e) => h.finish(e.id, null));
}

export interface StartOptions {
  /** Resume this past conversation. */
  chat?: { id: string; title: string };
  /** Run in a fresh git worktree on a new branch so parallel agents don't touch the same files. */
  worktree?: boolean;
  /** Extra CLI args (an editor's file) and a display name override. */
  args?: string[];
  name?: string;
}

/** Starts an agent CLI as a real process in a PTY, in the project's folder (or a new worktree). */
export async function startAgent(kind: string, projectId: ID, { chat, worktree, args, name }: StartOptions = {}): Promise<ID | null> {
  const project = useWorkspaces.getState().projects[projectId];
  const def = AGENTS[kind];
  if (!isTauri || !project || !def) return null;
  const sessions = useSessions.getState();
  const n = sessions.agents.filter((a) => a.kind === kind && a.projectId === projectId).length + 1;
  let place: { cwd: string; branch: string } | undefined;
  if (worktree) {
    const branch = `orbitr/${def.executable}-${Date.now().toString(36).slice(-5)}`;
    try {
      place = { cwd: await branchService.addWorktree(project.path, branch, true), branch };
    } catch (e) {
      toast({ kind: "error", title: "Couldn't create worktree", detail: String(e) });
      return null;
    }
  }
  const agent: AgentSession = {
    id: uid(),
    kind,
    name: name
      ? `${def.displayName} · ${name}`
      : chat
      ? `${def.displayName} · ${chat.title}`
      : place
        ? `${def.displayName} · ${place.branch.replace("orbitr/", "")}`
        : `${def.displayName} · ${project.name}${n > 1 ? ` ${n}` : ""}`,
    chatId: chat?.id,
    args,
    ...place,
    projectId,
    workspaceId: project.workspaceId,
    status: "starting",
    startedAt: Date.now(),
  };
  sessions.addAgent(agent);
  useTabs.getState().open({ type: "agent", id: agent.id }, agent.workspaceId);
  await launchAgent(agent, chat?.id ?? false);
  return agent.id;
}

/** Stops the process; the session and its output stay visible. */
export async function stopAgent(id: ID) {
  logEvent(id, "stopped", "Stopped from Orbitr");
  await killPty(id);
  useSessions.getState().updateAgent(id, { status: "exited", exitCode: null });
  finishOpenRuns(id);
}

export async function restartAgent(id: ID) {
  const a = useSessions.getState().agents.find((x) => x.id === id);
  if (!a) return;
  finishOpenRuns(id);
  resetScreen(id);
  useSessions.getState().updateAgent(id, { startedAt: Date.now() });
  await launchAgent(a);
}

/** Explicit removal: kills the process, frees the terminal, closes its tab. */
export async function removeAgent(id: ID) {
  useTabs.getState().closeWhere((t) => t.type === "agent" && t.id === id);
  await disposePty(id);
  useSessions.getState().removeAgent(id);
  finishOpenRuns(id);
  useEventLog.getState().forget(id);
}
