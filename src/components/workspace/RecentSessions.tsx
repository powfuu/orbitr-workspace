import { ListTree, Play } from "lucide-react";
import { useHistory, type HistoryEntry } from "../../stores/historyStore";
import { useSessions } from "../../stores/sessionStore";
import { useWorkspaces } from "../../stores/workspaceStore";
import { useTabs } from "../../stores/tabStore";
import { AGENTS } from "../../features/agents/registry";
import { startAgent } from "../../features/agents/agentActions";
import { duration, timeAgo } from "../../lib/time";
import { AgentGlyph } from "../ui/AgentGlyph";
import { IconButton } from "../ui/IconButton";
import { EmptyLine } from "./primitives";

type Filter = { projectId: string } | { workspaceId: string };

function outcome(e: HistoryEntry, live: boolean) {
  if (live) return { text: "running", tone: "text-success" };
  // No end time and no live session = the app quit while it ran.
  if (!e.endedAt) return { text: "interrupted", tone: "text-warning" };
  if (e.exitCode && e.exitCode !== 0) return { text: `exit ${e.exitCode}`, tone: "text-error" };
  return { text: duration(e.endedAt - e.startedAt), tone: "text-faint" };
}

export function RecentSessions({ filter, limit = 8 }: { filter: Filter; limit?: number }) {
  const all = useHistory((s) => s.entries);
  const sessions = useSessions((s) => s.agents);
  const projects = useWorkspaces((s) => s.projects);
  const open = useTabs((s) => s.open);
  const entries = all
    .filter((e) => ("projectId" in filter ? e.projectId === filter.projectId : e.workspaceId === filter.workspaceId))
    .slice(0, limit);

  if (entries.length === 0) return <EmptyLine icon={ListTree}>Session history appears once you start an agent here.</EmptyLine>;

  return (
    <div className="-m-2">
      {entries.map((e) => {
        const session = sessions.find((s) => s.id === e.sessionId);
        const live = !e.endedAt && !!session && (session.status === "running" || session.status === "starting");
        const o = outcome(e, live);
        const def = AGENTS[e.kind];
        return (
          <div key={e.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface/60">
            {def && <AgentGlyph agent={def} size={18} />}
            <button
              className="min-w-0 flex-1 truncate text-left text-[12.5px] text-fg-2 disabled:cursor-default"
              disabled={!session}
              onClick={() => session && open({ type: "agent", id: session.id })}
            >
              {e.name}
            </button>
            <span className={`font-mono text-[10.5px] ${o.tone}`}>{o.text}</span>
            <span className="w-20 text-right font-mono text-[10.5px] text-faint">{timeAgo(e.startedAt)}</span>
            {def && projects[e.projectId] && (
              <span className="opacity-0 transition-opacity group-hover:opacity-100">
                <IconButton icon={Play} label={`Start new ${def.displayName} session`} size="sm" onClick={() => void startAgent(e.kind, e.projectId)} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
