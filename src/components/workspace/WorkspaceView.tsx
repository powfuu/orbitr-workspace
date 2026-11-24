import { Bot, Folder, FolderPlus, SquareTerminal, Trash2 } from "lucide-react";
import { useWorkspaces } from "../../stores/workspaceStore";
import { useSessions } from "../../stores/sessionStore";
import { useTabs } from "../../stores/tabStore";
import { addProjectFromDialog } from "../../features/projects/addProject";
import { deleteWorkspace } from "../../features/workspaces/manageActions";
import type { ID } from "../../types";
import { WorkspaceGlyph } from "../ui/WorkspaceGlyph";
import { InlineEdit } from "../ui/InlineEdit";
import { IconButton } from "../ui/IconButton";
import { EmptyLine, Panel, ViewHeader } from "./primitives";
import { MissingView } from "./ProjectView";
import { RecentSessions } from "./RecentSessions";

export function WorkspaceView({ id }: { id: ID }) {
  const workspace = useWorkspaces((s) => s.workspaces.find((w) => w.id === id));
  const canDelete = useWorkspaces((s) => s.workspaces.length > 1);
  const rename = useWorkspaces((s) => s.renameWorkspace);
  const projects = useWorkspaces((s) => s.projects);
  const allAgents = useSessions((s) => s.agents);
  const terminals = useSessions((s) => s.terminals);
  const open = useTabs((s) => s.open);
  if (!workspace) return <MissingView />;

  const agents = allAgents.filter((a) => a.workspaceId === id);
  const stats = [
    { label: "Projects", value: workspace.projectIds.length, icon: Folder },
    { label: "Agents running", value: agents.filter((a) => a.status === "running").length, icon: Bot },
    { label: "Terminals", value: terminals.length, icon: SquareTerminal },
  ];

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 @lg:px-10 @lg:py-12">
      <div className="mb-5"><WorkspaceGlyph name={workspace.name} size={40} /></div>
      <ViewHeader
        eyebrow="Workspace"
        title={<InlineEdit value={workspace.name} label="workspace" onCommit={(v) => rename(id, v)} className="-mx-1.5 px-1.5" />}
      >
        {canDelete && <IconButton icon={Trash2} label="Delete workspace" onClick={() => void deleteWorkspace(id)} />}
        <button onClick={addProjectFromDialog} className="flex h-8 items-center gap-2 rounded-lg bg-fg px-3 text-[12.5px] font-medium text-bg hover:bg-fg/85">
          <FolderPlus size={14} /> Add project
        </button>
      </ViewHeader>

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-line-soft bg-bg-2 p-4">
            <s.icon size={14} className="mb-3 text-faint" />
            <div className="font-mono text-[22px] font-medium tracking-tight text-fg">{s.value}</div>
            <div className="text-[11.5px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4">
        <Panel title="Projects" count={workspace.projectIds.length}>
          {workspace.projectIds.length === 0 ? (
            <EmptyLine icon={FolderPlus}>No projects yet — add a folder to get started.</EmptyLine>
          ) : (
            <div className="-m-2">
              {workspace.projectIds.map((pid) => {
                const p = projects[pid];
                if (!p) return null;
                const live = agents.filter((a) => a.projectId === pid && a.status === "running").length;
                return (
                  <button key={pid} onClick={() => open({ type: "project", id: pid })} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface/60">
                    <Folder size={15} className="text-muted" />
                    <span className="text-[13px] text-fg">{p.name}</span>
                    {live > 0 && <span className="rounded-full border border-success/30 px-1.5 font-mono text-[10px] text-success">{live} live</span>}
                    <span className="ml-auto truncate font-mono text-[11px] text-faint">{p.path}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>
        <Panel title="Recent activity">
          <RecentSessions filter={{ workspaceId: id }} limit={12} />
        </Panel>
      </div>
    </div>
  );
}
