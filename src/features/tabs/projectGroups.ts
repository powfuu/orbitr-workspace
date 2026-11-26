import type { AgentSession, ID, TabTarget } from "../../types";

/** The project a tab belongs to (its overview or one of its agents/editors), if any. */
export function projectOfTarget(t: TabTarget, agents: AgentSession[]): ID | undefined {
  if (t.type === "project") return t.id;
  if (t.type === "agent") return agents.find((a) => a.id === t.id)?.projectId;
  return undefined;
}

/** Tabs that never show in the strip: they live in the sidebar (Dashboard, Git views). */
export const isSidebarTab = (t: TabTarget) => t.type === "home" || t.type === "git";

/** Last tab you were on inside each project, so clicking the project tab goes back there. */
export const lastInProject = new Map<ID, string>();
