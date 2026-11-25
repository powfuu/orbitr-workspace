import { confirmDialog } from "../../components/ui/ConfirmDialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useWorkspaces } from "../../stores/workspaceStore";
import { useSessions } from "../../stores/sessionStore";
import { useTabs } from "../../stores/tabStore";
import { useHistory } from "../../stores/historyStore";
import { isTauri } from "../../lib/platform";
import { removeAgent } from "../agents/agentActions";
import type { ID } from "../../types";

const isAlive = (s: { status: string }) => s.status === "running" || s.status === "starting";

const confirm = (message: string, title: string, okLabel: string) => confirmDialog({ title, message, okLabel });

/** Removes a project; its agent sessions are ended (with confirmation if any are running). */
export async function removeProject(id: ID) {
  const project = useWorkspaces.getState().projects[id];
  if (!project) return;
  const agents = useSessions.getState().agents.filter((a) => a.projectId === id);
  const running = agents.filter(isAlive).length;
  const ok = await confirm(
    running
      ? `${running} running agent${running > 1 ? "s" : ""} in “${project.name}” will be stopped. Files on disk are not touched.`
      : `Remove “${project.name}” from this workspace? Files on disk are not touched.`,
    "Remove project",
    "Remove",
  );
  if (!ok) return;
  await Promise.all(agents.map((a) => removeAgent(a.id)));
  useTabs.getState().closeWhere((t) => t.type === "project" && t.id === id);
  useHistory.getState().forgetProject(id);
  useWorkspaces.getState().removeProject(id);
}

/** Deletes a workspace, its projects and sessions. The last workspace can't be deleted. */
export async function deleteWorkspace(id: ID) {
  const ws = useWorkspaces.getState();
  const workspace = ws.workspaces.find((w) => w.id === id);
  if (!workspace || ws.workspaces.length <= 1) return;
  const agents = useSessions.getState().agents.filter((a) => a.workspaceId === id);
  const running = agents.filter(isAlive).length;
  const ok = await confirm(
    `Delete “${workspace.name}” and its ${workspace.projectIds.length} project(s)?` +
      (running ? ` ${running} running agent(s) will be stopped.` : "") +
      " Files on disk are not touched.",
    "Delete workspace",
    "Delete",
  );
  if (!ok) return;
  await Promise.all(agents.map((a) => removeAgent(a.id)));
  useTabs.getState().closeWhere((t) => t.type === "workspace" && t.id === id);
  useTabs.getState().dropWorkspace(id);
  useHistory.getState().forgetWorkspace(id);
  ws.deleteWorkspace(id);
}

export async function revealProject(path: string) {
  if (isTauri) await revealItemInDir(path).catch((e) => console.error("reveal failed", e));
}
