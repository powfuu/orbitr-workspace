import { GitBranch, GitCompareArrows, ListTree, RotateCw, Square, Trash2 } from "lucide-react";
import { useLayout } from "../../stores/layoutStore";
import { isEditor } from "../../features/agents/registry";
import { modKey, tildify } from "../../lib/platform";
import { TimelinePanel } from "../timeline/TimelinePanel";
import { windowDragProps } from "../../hooks/useWindowDrag";
import { AnimatePresence } from "framer-motion";
import { useActivity } from "../../features/sessions/activityStore";
import { ApprovalCard } from "../approvals/ApprovalCard";
import { usePaneFocused } from "../../features/panes/paneFocus";
import { useSessions } from "../../stores/sessionStore";
import { useWorkspaces } from "../../stores/workspaceStore";
import { usePlatformInfo } from "../../hooks/usePlatformInfo";
import { AGENTS } from "../../features/agents/registry";
import { removeAgent, restartAgent, stopAgent } from "../../features/agents/agentActions";
import type { ID } from "../../types";
import { AgentGlyph } from "../ui/AgentGlyph";
import { IconButton } from "../ui/IconButton";
import { TerminalView } from "../terminal/TerminalView";
import { ReviewView } from "../review/ReviewView";
import { MissingView } from "../workspace/ProjectView";
import { ActivityBadge, useActivitySubtitle } from "./ActivityBadge";
import { markSeen } from "../../features/sessions/activityStore";
import { useEffect, useState } from "react";

export function AgentView({ id }: { id: ID }) {
  const agent = useSessions((s) => s.agents.find((a) => a.id === id));
  const project = useWorkspaces((s) => (agent ? s.projects[agent.projectId] : undefined));
  const platform = usePlatformInfo();
  const task = useActivitySubtitle(id);
  const paneFocused = usePaneFocused();
  const prompt = useActivity((s) => s.byId[id]?.prompt);
  const timelineOpen = useLayout((s) => s.timelineOpen);
  const toggleTimeline = useLayout((s) => s.toggleTimeline);
  const [reviewing, setReviewing] = useState(false);
  useEffect(() => {
    markSeen(id);
  }, [id]);
  if (!agent) return <MissingView />;

  const def = AGENTS[agent.kind];
  const alive = agent.status === "running" || agent.status === "starting";
  const editing = isEditor(agent.kind);

  return (
    <div className="@container flex h-full flex-col">
      <div {...windowDragProps} className="flex h-12 shrink-0 items-center gap-3 border-b border-line-soft bg-bg px-4">
        <AgentGlyph agent={def} size={26} status={agent.status} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-[13px] font-medium text-fg">{agent.name}</span>
            {task && <span className="truncate text-[12px] text-muted">— {task}</span>}
            {agent.branch && (
              <span className="flex shrink-0 items-center gap-1 rounded-full border border-line px-1.5 py-px font-mono text-[10px] text-fg-2" title={agent.cwd}>
                <GitBranch size={10} /> {agent.branch}
              </span>
            )}
          </div>
          <div className="selectable truncate font-mono text-[10.5px] text-faint">
            {project ? tildify(agent.cwd ?? project.path, platform?.homeDir ?? undefined) : "project removed"}
            {agent.pid && alive ? ` · pid ${agent.pid}` : ""}
          </div>
        </div>
        {!editing && <ActivityBadge id={id} status={agent.status} />}
        <div className="ml-1 flex items-center gap-0.5">
          {alive ? (
            <IconButton icon={Square} label={editing ? "Kill editor" : "Stop agent"} onClick={() => void stopAgent(id)} />
          ) : (
            <IconButton icon={RotateCw} label="Restart agent" onClick={() => void restartAgent(id)} disabled={!project} />
          )}
          {!editing && <IconButton icon={GitCompareArrows} label={reviewing ? "Back to the agent" : "Review changes (what each prompt changed)"} active={reviewing} onClick={() => setReviewing((r) => !r)} />}
          {!editing && <IconButton icon={ListTree} label={timelineOpen ? "Hide timeline" : "Timeline"} shortcut={`${modKey}⇧L`} active={timelineOpen} onClick={toggleTimeline} />}
          <IconButton icon={Trash2} label="End session" onClick={() => void removeAgent(id)} />
        </div>
      </div>
      <AnimatePresence>
        {prompt && (
          <div className="border-b border-line-soft bg-bg p-3">
            <ApprovalCard id={id} name={agent.name} prompt={prompt} />
          </div>
        )}
      </AnimatePresence>
      {reviewing && (
        <div className="min-h-0 flex-1">
          <ReviewView agent={agent} cwd={agent.cwd ?? project?.path} onClose={() => setReviewing(false)} />
        </div>
      )}
      {/* The terminal stays mounted while reviewing, so the agent keeps running and redraws instantly. */}
      <div className={reviewing ? "hidden" : "flex min-h-0 flex-1"}>
        <div className="relative min-w-0 flex-1 bg-term py-2 pl-4 pr-1">
          <TerminalView id={id} focused={paneFocused} />
        </div>
        <AnimatePresence initial={false}>
          {timelineOpen && !editing && <TimelinePanel agent={agent} cwd={agent.cwd ?? project?.path} onClose={toggleTimeline} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
