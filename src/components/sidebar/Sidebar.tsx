import { Reorder } from "framer-motion";
import { Bot, FileCode2, GitBranch, LayoutDashboard } from "lucide-react";
import { windowDragProps } from "../../hooks/useWindowDrag";
import { removeProject, revealProject } from "../../features/workspaces/manageActions";
import { Folder, FolderOpen, FolderSearch, PanelLeftClose, RotateCw, Settings, Square, SquareTerminal, Trash2, Command } from "lucide-react";
import { closeTerminal, restartTerminal } from "../../features/terminals/terminalActions";
import { newDefaultTerminal } from "../../features/terminals/newDefaultTerminal";
import { removeAgent, restartAgent, stopAgent } from "../../features/agents/agentActions";
import { useMemo, useState } from "react";
import { useActiveWorkspace, useWorkspaces } from "../../stores/workspaceStore";
import { useSessions } from "../../stores/sessionStore";
import { useActiveTabs, useTabs } from "../../stores/tabStore";
import { useLayout } from "../../stores/layoutStore";
import { addProjectFromDialog } from "../../features/projects/addProject";
import { AGENTS, agentList, isEditor } from "../../features/agents/registry";
import { openInEditor } from "../../features/editors/openInEditor";
import { isMac, modKey } from "../../lib/platform";
import { cn } from "../../lib/cn";
import { Wordmark } from "../ui/Logo";
import { IconButton } from "../ui/IconButton";
import { Kbd } from "../ui/Kbd";
import { AgentGlyph } from "../ui/AgentGlyph";
import { StatusDot } from "../ui/StatusDot";
import { ContextMenu } from "../ui/ContextMenu";
import { PromptChip } from "../approvals/PromptChip";
import { GitBadge } from "../git/GitBadge";
import { GitOverview } from "../git/GitOverview";
import { cwdFull } from "../../features/terminals/terminalContext";
import { useGit } from "../../features/git/gitStore";
import { ActivityIconFor } from "../agents/ActivityBadge";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { SidebarHint, SidebarSection } from "./SidebarSection";
import { SidebarItem } from "./SidebarItem";

export function Sidebar() {
  const workspace = useActiveWorkspace();
  const allProjects = useWorkspaces((s) => s.projects);
  const reorderProjects = useWorkspaces((s) => s.reorderProjects);
  const allAgents = useSessions((s) => s.agents);
  const gitByPath = useGit((g) => g.byPath);
  const { terminals, activeTerminalId, setActiveTerminal } = useSessions();
  const openTerminalPanel = useLayout((s) => s.openTerminalPanel);
  const { tabs, activeTabId } = useActiveTabs();
  const { open } = useTabs.getState();
  const toggleSidebar = useLayout((s) => s.toggleSidebar);
  const setPaletteOpen = useLayout((s) => s.setPaletteOpen);
  const [query, setQuery] = useState("");

  const activeTarget = tabs.find((t) => t.id === activeTabId)?.target;
  const q = query.trim().toLowerCase();
  const inWorkspace = allAgents.filter((a) => a.workspaceId === workspace.id && a.name.toLowerCase().includes(q));
  const agents = inWorkspace.filter((a) => !isEditor(a.kind));
  const editors = inWorkspace.filter((a) => isEditor(a.kind));
  const projects = useMemo(
    () => workspace.projectIds.map((id) => allProjects[id]).filter((p) => p && p.name.toLowerCase().includes(q)),
    [workspace.projectIds, allProjects, q],
  ) as NonNullable<(typeof allProjects)[string]>[];
  // Projects that are git repos (unknown yet counts as maybe, so the section shows while loading).
  const gitProjects = projects.filter((p) => gitByPath[p.path] !== null);

  const onDashboard = tabs.find((t) => t.id === activeTabId)?.target.type === "home";

  return (
    <aside className="flex h-full flex-col bg-bg-2">
      <div {...windowDragProps} className={cn("flex h-11 shrink-0 items-center justify-between pr-2", isMac ? "pl-[84px]" : "pl-4")}>
        <Wordmark />
        <IconButton icon={PanelLeftClose} label="Hide sidebar" shortcut={`${modKey}B`} onClick={toggleSidebar} size="sm" />
      </div>

      <WorkspaceSwitcher />

      <div className="px-3 pt-2">
        <SidebarItem
          icon={<LayoutDashboard size={14} strokeWidth={1.75} />}
          label="Dashboard"
          active={onDashboard}
          onClick={() => useTabs.getState().open({ type: "home" })}
        />
      </div>

      <div className="px-3 pt-2">
        <label className="flex h-7 items-center gap-2 rounded-md bg-bg px-2 ring-1 ring-line-soft transition focus-within:ring-accent/50">
          <span className="font-mono text-[12px] text-success">❯</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-session-search
            placeholder="search sessions"
            className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-fg outline-none placeholder:text-faint"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-3">
        <SidebarSection id="projects" icon={Folder} title="Projects" count={projects.length} onAdd={addProjectFromDialog} addLabel="Add project">
          {projects.length === 0 ? (
            <SidebarHint
              action={
                !q && (
                  <button onClick={addProjectFromDialog} className="text-accent hover:underline">
                    Add a project folder →
                  </button>
                )
              }
            >
              {q ? "No matching projects." : "Projects anchor agents and terminals to a folder."}
            </SidebarHint>
          ) : (
            <Reorder.Group as="div" axis="y" values={workspace.projectIds} onReorder={(ids) => !q && reorderProjects(workspace.id, ids)}>
            {projects.map((p) => {
              const isActive = activeTarget?.type === "project" && activeTarget.id === p.id;
              return (
                <Reorder.Item as="div" key={p.id} value={p.id} dragListener={!q} whileDrag={{ scale: 1.02, zIndex: 10 }}>
                <ContextMenu
                  items={[
                    { label: "Open overview", icon: FolderOpen, onSelect: () => open({ type: "project", id: p.id }) },
                    { label: "Open terminal here", icon: SquareTerminal, onSelect: () => void newDefaultTerminal(p.path, p.name) },
                    { label: isMac ? "Reveal in Finder" : "Show in Explorer", icon: FolderSearch, onSelect: () => void revealProject(p.path) },
                    { label: "Remove from workspace", icon: Trash2, danger: true, onSelect: () => void removeProject(p.id) },
                  ]}
                >
                  <SidebarItem
                    active={isActive}
                    onClick={() => open({ type: "project", id: p.id })}
                    icon={isActive ? <FolderOpen size={14} className="text-accent" /> : <Folder size={14} className="text-muted" />}
                    label={p.name}
                    trailing={
                      <span className="flex items-center gap-1.5">
                        <GitBadge path={p.path} />
                        {workspace.projectIds.indexOf(p.id) < 9 && (
                          <span className="hidden font-mono text-[10px] text-faint group-hover:inline">{modKey}{workspace.projectIds.indexOf(p.id) + 1}</span>
                        )}
                      </span>
                    }
                  />
                </ContextMenu>
                </Reorder.Item>
              );
            })}
            </Reorder.Group>
          )}
        </SidebarSection>

        <SidebarSection id="git" icon={GitBranch} defaultCollapsed title="Git" count={gitProjects.length}>
          {gitProjects.length === 0 ? (
            <SidebarHint>{q ? "No matching projects." : "Git status of each project appears here."}</SidebarHint>
          ) : (
            <GitOverview projects={gitProjects} />
          )}
        </SidebarSection>

        <SidebarSection id="agents" icon={Bot} title="Agents" count={agents.length} addLabel="Start agent" onAdd={() => setPaletteOpen(true, "Start ")}>
          {agents.length === 0 ? (
            <SidebarHint
              action={
                !q && (
                  <button onClick={() => setPaletteOpen(true, "Start ")} className="text-accent hover:underline">
                    Start an agent →
                  </button>
                )
              }
            >
              <div className="mb-1.5 flex gap-1.5">
                {agentList.slice(0, 5).map((a) => <AgentGlyph key={a.kind} agent={a} size={16} />)}
              </div>
              {q ? "No matching sessions." : "Your coding agents run here as real terminal processes."}
            </SidebarHint>
          ) : (
            agents.map((a) => {
              const alive = a.status === "running" || a.status === "starting";
              return (
                <ContextMenu
                  key={a.id}
                  items={[
                    alive
                      ? { label: "Stop", icon: Square, onSelect: () => void stopAgent(a.id) }
                      : { label: "Restart", icon: RotateCw, onSelect: () => void restartAgent(a.id) },
                    { label: "End session", icon: Trash2, danger: true, onSelect: () => void removeAgent(a.id) },
                  ]}
                >
                  <SidebarItem
                    icon={<AgentGlyph agent={AGENTS[a.kind]} size={16} status={a.status} />}
                    label={a.name}
                    trailing={<span className="flex items-center gap-1.5"><PromptChip id={a.id} /><ActivityIconFor id={a.id} status={a.status} /></span>}
                    active={activeTarget?.type === "agent" && activeTarget.id === a.id}
                    onClick={() => open({ type: "agent", id: a.id })}
                    onClose={() => void removeAgent(a.id)}
                    closeLabel={isEditor(a.kind) ? "Close editor" : "End session"}
                  />
                </ContextMenu>
              );
            })
          )}
        </SidebarSection>

        <SidebarSection id="editors" icon={FileCode2} title="Editors" count={editors.length} onAdd={() => void openInEditor()} addLabel={`Open Vim (${modKey}E)`}>
          {editors.length === 0 ? (
            <SidebarHint
              action={
                !q && (
                  <button onClick={() => void openInEditor()} className="text-accent hover:underline">
                    Open Vim here →
                  </button>
                )
              }
            >
              {q ? "No matching editors." : `Vim / Neovim in a center tab, in your project. ${modKey}E to open, ${modKey}P to find a file.`}
            </SidebarHint>
          ) : (
            editors.map((a) => (
              <ContextMenu key={a.id} items={[{ label: "Close (kills the editor)", icon: Trash2, danger: true, onSelect: () => void removeAgent(a.id) }]}>
                <SidebarItem
                  icon={<AgentGlyph agent={AGENTS[a.kind]} size={16} />}
                  label={a.name}
                  active={activeTarget?.type === "agent" && activeTarget.id === a.id}
                  onClick={() => open({ type: "agent", id: a.id })}
                    onClose={() => void removeAgent(a.id)}
                    closeLabel={isEditor(a.kind) ? "Close editor" : "End session"}
                />
              </ContextMenu>
            ))
          )}
        </SidebarSection>

        <SidebarSection id="terminals" icon={SquareTerminal} title="Terminals" count={terminals.length} onAdd={() => void newDefaultTerminal()} addLabel="New terminal">
          {terminals.length === 0 ? (
            <SidebarHint>Shell sessions from the right panel are listed here.</SidebarHint>
          ) : (
            terminals.filter((t) => t.name.toLowerCase().includes(q)).map((t) => (
              <ContextMenu
                key={t.id}
                items={[
                  { label: "Restart", icon: RotateCw, onSelect: () => void restartTerminal(t.id) },
                  { label: "Kill & close", icon: Trash2, danger: true, onSelect: () => void closeTerminal(t.id) },
                ]}
              >
                <SidebarItem
                  icon={<SquareTerminal size={14} className="text-muted" />}
                  label={t.name}
                  tooltip={`${cwdFull(t.cwd)}${t.pid ? `  ·  pid ${t.pid}` : ""}`}
                  meta={t.pid ? String(t.pid) : undefined}
                  trailing={<span className="flex items-center gap-1.5"><PromptChip id={t.id} /><StatusDot status={t.status} /></span>}
                  active={t.id === activeTerminalId}
                  onClick={() => { setActiveTerminal(t.id); openTerminalPanel(); }}
                  onClose={() => void closeTerminal(t.id)}
                  closeLabel="Close terminal"
                />
              </ContextMenu>
            ))
          )}
        </SidebarSection>
      </div>

      <div className="flex h-10 shrink-0 items-center justify-between border-t border-line-soft px-2">
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex h-7 items-center gap-2 rounded-md px-2 text-[12px] text-muted hover:bg-surface hover:text-fg"
        >
          <Command size={13} />
          commands
          <Kbd>{modKey}K</Kbd>
        </button>
        <IconButton icon={Settings} label="Settings" shortcut={`${modKey},`} size="sm" side="top" onClick={() => open({ type: "settings" })} />
      </div>
    </aside>
  );
}
