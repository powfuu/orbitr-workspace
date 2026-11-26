import { Blocks, Bot, Folder, GitBranch, LayoutDashboard, LayoutGrid, Newspaper, Settings, type LucideIcon } from "lucide-react";
import type { AgentSession, ID, Project, TabTarget, Workspace } from "../../types";

export interface TabInfo {
  title: string;
  icon: LucideIcon;
}

interface Lookup {
  workspaces: Workspace[];
  projects: Record<ID, Project>;
  agents: AgentSession[];
}

/** Resolves a tab target into display metadata; pure so it stays out of components. */
export function describeTab(target: TabTarget, { workspaces, projects, agents }: Lookup): TabInfo {
  switch (target.type) {
    case "home":
      return { title: "Dashboard", icon: LayoutDashboard };
    case "workspace":
      return { title: workspaces.find((w) => w.id === target.id)?.name ?? "Workspace", icon: LayoutGrid };
    case "project":
      return { title: projects[target.id]?.name ?? "Missing project", icon: Folder };
    case "agent":
      return { title: agents.find((a) => a.id === target.id)?.name ?? "Agent", icon: Bot };
    case "settings":
      return { title: "Settings", icon: Settings };
    case "integrations":
      return { title: "Integrations", icon: Blocks };
    case "news":
      return { title: "News", icon: Newspaper };
    case "git":
      return { title: `Git · ${projects[target.id]?.name ?? "project"}`, icon: GitBranch };
  }
}
