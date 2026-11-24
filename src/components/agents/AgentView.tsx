import { RotateCw, Square, Trash2 } from "lucide-react";
import { windowDragProps } from "../../hooks/useWindowDrag";
import { usePaneFocused } from "../../features/panes/paneFocus";
import { useSessions } from "../../stores/sessionStore";
import { useWorkspaces } from "../../stores/workspaceStore";
import { usePlatformInfo } from "../../hooks/usePlatformInfo";
import { AGENTS } from "../../features/agents/registry";
import { removeAgent, restartAgent, stopAgent } from "../../features/agents/agentActions";
import { tildify } from "../../lib/platform";
import type { ID } from "../../types";
import { AgentGlyph } from "../ui/AgentGlyph";
import { IconButton } from "../ui/IconButton";
import { TerminalView } from "../terminal/TerminalView";
import { MissingView } from "../workspace/ProjectView";
import { ActivityBadge, useActivitySubtitle } from "./ActivityBadge";
import { markSeen } from "../../features/sessions/activityStore";
import { useEffect } from "react";

export function AgentView({ id }: { id: ID }) {
  const agent = useSessions((s) => s.agents.find((a) => a.id === id));
  const project = useWorkspaces((s) => (agent ? s.projects[agent.projectId] : undefined));
  const platform = usePlatformInfo();
  const task = useActivitySubtitle(id);
  const paneFocused = usePaneFocused();
  useEffect(() => markSeen(id), [id]);
  if (!agent) return <MissingView />;

  const def = AGENTS[agent.kind];
  const alive = agent.status === "running" || agent.status === "starting";

  return (
    <div className="flex h-full flex-col">
      <div {...windowDragProps} className="flex h-12 shrink-0 items-center gap-3 border-b border-line-soft bg-bg px-4">
        <AgentGlyph agent={def} size={26} status={agent.status} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-[13px] font-medium text-fg">{agent.name}</span>
            {task && <span className="truncate text-[12px] text-muted">— {task}</span>}
          </div>
          <div className="selectable truncate font-mono text-[10.5px] text-faint">
            {project ? tildify(project.path, platform?.homeDir ?? undefined) : "project removed"}
            {agent.pid && alive ? ` · pid ${agent.pid}` : ""}
          </div>
        </div>
        <ActivityBadge id={id} status={agent.status} />
        <div className="ml-1 flex items-center gap-0.5">
          {alive ? (
            <IconButton icon={Square} label="Stop agent" onClick={() => void stopAgent(id)} />
          ) : (
            <IconButton icon={RotateCw} label="Restart agent" onClick={() => void restartAgent(id)} disabled={!project} />
          )}
          <IconButton icon={Trash2} label="End session" onClick={() => void removeAgent(id)} />
        </div>
      </div>
      <div className="relative min-h-0 flex-1 bg-black py-2 pl-4 pr-1">
        <TerminalView id={id} focused={paneFocused} />
      </div>
    </div>
  );
}
