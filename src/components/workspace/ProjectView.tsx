import { Bot, Copy, FolderSearch, FolderX, SquareTerminal, Trash2 } from "lucide-react";
import { openInEditor } from "../../features/editors/openInEditor";
import { AGENTS } from "../../features/agents/registry";
import { Kbd } from "../ui/Kbd";
import { InlineEdit } from "../ui/InlineEdit";
import { IconButton } from "../ui/IconButton";
import { RecentSessions } from "./RecentSessions";
import { ChatHistory } from "../agents/ChatHistory";
import { GitPanel } from "../git/GitPanel";
import { ProjectUsage } from "../usage/ProjectUsage";
import { removeProject, revealProject } from "../../features/workspaces/manageActions";
import { useWorkspaces } from "../../stores/workspaceStore";
import { useSessions } from "../../stores/sessionStore";
import { usePlatformInfo } from "../../hooks/usePlatformInfo";
import { useLayout } from "../../stores/layoutStore";
import { newDefaultTerminal } from "../../features/terminals/newDefaultTerminal";
import { StatusDot } from "../ui/StatusDot";
import { agentList } from "../../features/agents/registry";
import { useAgentAvailability } from "../../features/agents/useAgentAvailability";
import { startAgent } from "../../features/agents/agentActions";
import { useTabs } from "../../stores/tabStore";
import { basename, isMac, modKey, tildify } from "../../lib/platform";
import type { ID } from "../../types";
import { AgentGlyph } from "../ui/AgentGlyph";
import { EmptyLine, Panel, ViewHeader } from "./primitives";

export function ProjectView({ id }: { id: ID }) {
  const project = useWorkspaces((s) => s.projects[id]);
  const agents = useSessions((s) => s.agents).filter((a) => a.projectId === id);
  const platform = usePlatformInfo();
  const renameProject = useWorkspaces((s) => s.renameProject);
  const availability = useAgentAvailability();
  const openTab = useTabs((s) => s.open);
  const allTerminals = useSessions((s) => s.terminals);
  const setActiveTerminal = useSessions((s) => s.setActiveTerminal);
  const openTerminalPanel = useLayout((s) => s.openTerminalPanel);
  const terminals = allTerminals.filter((t) => project && t.cwd === project.path);

  if (!project) return <MissingView />;

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 @lg:px-10 @lg:py-12">
      <ViewHeader
        eyebrow="Project"
        title={<InlineEdit value={project.name} label="project" onCommit={(v) => renameProject(project.id, v)} className="-mx-1.5 px-1.5" />}
        subtitle={
          <button
            onClick={() => navigator.clipboard.writeText(project.path)}
            className="group inline-flex items-center gap-1.5 font-mono text-[12px] text-muted hover:text-fg-2"
            title="Copy path"
          >
            {tildify(project.path, platform?.homeDir ?? undefined)}
            <Copy size={11} className="opacity-0 group-hover:opacity-100" />
          </button>
        }
      >
        <button
          onClick={() => void openInEditor({ projectId: project.id })}
          className="flex h-8 items-center gap-2 rounded-lg px-3 text-[12.5px] text-fg ring-1 ring-line hover:bg-surface"
          title="Open Vim in this project"
        >
          <AgentGlyph agent={AGENTS.nvim} size={16} /> Open in Vim <Kbd>{modKey}E</Kbd>
        </button>
        <IconButton icon={FolderSearch} label={isMac ? "Reveal in Finder" : "Show in Explorer"} onClick={() => void revealProject(project.path)} />
        <IconButton icon={Trash2} label="Remove project" onClick={() => void removeProject(project.id)} />
      </ViewHeader>

      <div className="mb-3 flex items-center gap-3">
        <span className="term-heading">Launch here</span>
      </div>
      <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-3">
        {agentList.filter((a) => !availability || availability[a.kind]).map((a) => {
          const path = availability?.[a.kind];
          const missing = availability !== undefined && !path;
          return (
            <button
              key={a.kind}
              disabled={missing}
              onClick={() => void startAgent(a.kind, project.id, {})}
              title={missing ? `${a.executable} not found on PATH` : path ?? undefined}
              className="flex items-center gap-3 rounded-xl border border-line-soft bg-bg-2 p-3 text-left transition-colors hover:border-line hover:bg-surface/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <AgentGlyph agent={a} size={24} />
              <span className="flex-1 text-[12.5px] text-fg-2">{a.displayName}</span>
              <span className="font-mono text-[10px] text-faint">{availability === undefined ? "…" : missing ? "not installed" : a.executable}</span>
            </button>
          );
        })}
        <button onClick={() => void newDefaultTerminal(project.path, project.name)} className="flex items-center gap-3 rounded-xl border border-line-soft bg-bg-2 p-3 text-left transition-colors hover:border-line hover:bg-surface/70">
          <SquareTerminal size={16} className="text-muted" />
          <span className="flex-1 text-[12.5px] text-fg-2">Shell</span>
          <span className="font-mono text-[10px] text-faint">{platform ? basename(platform.defaultShell) : ""}</span>
        </button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-4">
        <Panel title="Agent sessions" count={agents.length}>
          {agents.length === 0 ? (
            <EmptyLine icon={Bot}>No agents running in this project.</EmptyLine>
          ) : (
            <div className="-m-2">
              {agents.map((a) => (
                <button key={a.id} onClick={() => openTab({ type: "agent", id: a.id })} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-fg-2 hover:bg-surface/60">
                  <StatusDot status={a.status} />
                  <span className="flex-1 truncate">{a.name}</span>
                  <span className="font-mono text-[10.5px] text-faint">{a.status}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Active terminals" count={terminals.length}>
          {terminals.length === 0 ? (
            <EmptyLine icon={SquareTerminal}>No shells open in this folder.</EmptyLine>
          ) : (
            <div className="-m-2">
              {terminals.map((t) => (
                <button key={t.id} onClick={() => { setActiveTerminal(t.id); openTerminalPanel(); }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-fg-2 hover:bg-surface/60">
                  <StatusDot status={t.status} />
                  <span className="flex-1">{t.name}</span>
                  <span className="font-mono text-[10.5px] text-faint">{t.pid ? `pid ${t.pid}` : t.status}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Conversations" className="col-span-full">
          <ChatHistory project={project} />
        </Panel>
        <Panel title="Git" id={`git-${project.id}`} className="col-span-full">
          <GitPanel path={project.path} />
        </Panel>
        <Panel title="Orbitr session log" className="col-span-full">
          <RecentSessions filter={{ projectId: project.id }} />
        </Panel>
        {/* Last, so it never pushes content around when it loads in. */}
        <ProjectUsage path={project.path} />
      </div>
    </div>
  );
}

export function MissingView() {
  return (
    <div className="grid h-full place-items-center">
      <EmptyLine icon={FolderX}>This item no longer exists. Close the tab to dismiss it.</EmptyLine>
    </div>
  );
}
