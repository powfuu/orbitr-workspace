import { useSessions } from "../../stores/sessionStore";
import { useWorkspaces } from "../../stores/workspaceStore";
import { useTabs } from "../../stores/tabStore";
import { useHistory } from "../../stores/historyStore";
import { uid } from "../../lib/id";
import { toast } from "../../stores/toastStore";
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
  const opts = await agentSpawnOptions(def, project.path, resume);
  const runId = uid();
  const { record, finish } = useHistory.getState();
  record({ id: runId, sessionId: a.id, kind: a.kind, name: a.name, projectId: a.projectId, workspaceId: a.workspaceId, startedAt: Date.now() });
  await spawnPty(a.id, opts, (u) => {
    useSessions.getState().updateAgent(a.id, u);
    if (u.status === "exited" || u.status === "failed") finish(runId, u.exitCode);
    if (u.status === "failed" && u.exitCode != null)
      toast({ kind: "error", title: `${a.name} exited with code ${u.exitCode}`, detail: u.exitCode === 127 ? `${def.executable} was not found on PATH.` : undefined });
  });
}

function finishOpenRuns(sessionId: ID) {
  const h = useHistory.getState();
  h.entries.filter((e) => e.sessionId === sessionId && !e.endedAt).forEach((e) => h.finish(e.id, null));
}

/** Starts an agent CLI as a real process in a PTY, in the project's folder. */
export async function startAgent(kind: string, projectId: ID, chat?: { id: string; title: string }): Promise<ID | null> {
  const project = useWorkspaces.getState().projects[projectId];
  const def = AGENTS[kind];
  if (!isTauri || !project || !def) return null;
  const sessions = useSessions.getState();
  const n = sessions.agents.filter((a) => a.kind === kind && a.projectId === projectId).length + 1;
  const agent: AgentSession = {
    id: uid(),
    kind,
    name: chat ? `${def.displayName} · ${chat.title}` : `${def.displayName} · ${project.name}${n > 1 ? ` ${n}` : ""}`,
    chatId: chat?.id,
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
}
