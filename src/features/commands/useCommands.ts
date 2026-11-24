import { ArrowRight, Settings, Bot, Folder, FolderPlus, Home, LayoutGrid, PanelLeft, PanelRight, SquareTerminal, X, type LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { useLayout } from "../../stores/layoutStore";
import { getActiveTabs, useTabs } from "../../stores/tabStore";
import { useWorkspaces } from "../../stores/workspaceStore";
import { useSessions } from "../../stores/sessionStore";
import { addProjectFromDialog } from "../projects/addProject";
import { newDefaultTerminal } from "../terminals/newDefaultTerminal";
import { agentList } from "../agents/registry";
import { startAgent } from "../agents/agentActions";
import { modKey } from "../../lib/platform";

export interface Command {
  id: string;
  title: string;
  group: string;
  icon: LucideIcon;
  shortcut?: string;
  run: () => void;
}

/** Every palette action. Only actions that genuinely work are listed. */
function cycleHint(step: 1 | -1) {
  const { tabs, activeTabId } = getActiveTabs();
  const i = tabs.findIndex((t) => t.id === activeTabId);
  const next = tabs[(i + step + tabs.length) % tabs.length];
  if (next) useTabs.getState().activate(next.id);
}

export function useCommands(): Command[] {
  const { workspaces, projects, activeWorkspaceId, setActiveWorkspace } = useWorkspaces();
  const agents = useSessions((s) => s.agents);
  return useMemo(() => {
    const layout = useLayout.getState();
    const tabs = useTabs.getState();
    const wsProjects = Object.values(projects).filter((p) => p.workspaceId === activeWorkspaceId);

    const start = wsProjects.flatMap((p) =>
      agentList.map<Command>((a) => ({
        id: `start-${a.kind}-${p.id}`,
        title: `Start ${a.displayName} in ${p.name}`,
        group: "Agent",
        icon: Bot,
        run: () => void startAgent(a.kind, p.id),
      })),
    );
    const sessions = agents
      .filter((a) => a.workspaceId === activeWorkspaceId)
      .map<Command>((a) => ({ id: `go-${a.id}`, title: `Go to ${a.name}`, group: "Session", icon: Bot, run: () => tabs.open({ type: "agent", id: a.id }) }));
    const base: Command[] = [
      { id: "home", title: "Go to Home", group: "Navigate", icon: Home, run: () => tabs.open({ type: "home" }) },
      { id: "new-terminal", title: "New terminal", group: "Terminal", icon: SquareTerminal, shortcut: `${modKey}T`, run: () => void newDefaultTerminal() },
      { id: "settings", title: "Open settings", group: "App", icon: Settings, shortcut: `${modKey},`, run: () => tabs.open({ type: "settings" }) },
      { id: "next-tab", title: "Next tab", group: "View", icon: ArrowRight, shortcut: "⌃Tab", run: () => cycleHint(1) },
      { id: "add-project", title: "Add project…", group: "Project", icon: FolderPlus, run: addProjectFromDialog },
      { id: "sidebar", title: "Toggle sidebar", group: "View", icon: PanelLeft, shortcut: `${modKey}B`, run: layout.toggleSidebar },
      { id: "terminal", title: "Toggle terminal panel", group: "View", icon: PanelRight, shortcut: `${modKey}J`, run: layout.toggleTerminal },
      { id: "close-tab", title: "Close tab", group: "View", icon: X, shortcut: `${modKey}W`, run: () => tabs.close(getActiveTabs().activeTabId) },
    ];
    const ws = workspaces.map<Command>((w) => ({
      id: `ws-${w.id}`,
      title: w.id === activeWorkspaceId ? `${w.name} overview` : `Switch to ${w.name}`,
      group: "Workspace",
      icon: LayoutGrid,
      run: () => { setActiveWorkspace(w.id); tabs.open({ type: "workspace", id: w.id }); },
    }));
    const pj = wsProjects.map<Command>((p) => ({ id: `pj-${p.id}`, title: p.name, group: "Project", icon: Folder, run: () => tabs.open({ type: "project", id: p.id }) }));
    return [...sessions, ...start, ...base, ...pj, ...ws];
  }, [workspaces, projects, activeWorkspaceId, setActiveWorkspace, agents]);
}
