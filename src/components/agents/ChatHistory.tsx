import { MessagesSquare, Play, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { agentList } from "../../features/agents/registry";
import { useAgentAvailability } from "../../features/agents/useAgentAvailability";
import { startAgent } from "../../features/agents/agentActions";
import { listAgentChats, type ChatSummary } from "../../services/agents";
import { isTauri } from "../../lib/platform";
import { timeAgo } from "../../lib/time";
import type { Project } from "../../types";
import { AgentGlyph } from "../ui/AgentGlyph";
import { EmptyLine } from "../workspace/primitives";

type Row = ChatSummary & { kind: string };
const resumable = agentList.filter((a) => a.resumeChatArgs);

/** Conversations the agent CLIs saved for this folder; any of them can be reopened. */
export function ChatHistory({ project }: { project: Project }) {
  const availability = useAgentAvailability();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!isTauri) return setRows([]);
    let cancelled = false;
    const load = () =>
      Promise.all(resumable.map(async (a) => (await listAgentChats(a.kind, project.path).catch(() => [])).map((c) => ({ ...c, kind: a.kind }))))
        .then((all) => !cancelled && setRows(all.flat().sort((x, y) => y.updatedAt - x.updatedAt)));
    void load();
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", load);
    };
  }, [project.path]);

  if (rows === null) return <EmptyLine icon={MessagesSquare}>Reading conversations…</EmptyLine>;
  if (rows.length === 0) return <EmptyLine icon={MessagesSquare}>No saved Claude Code or Codex conversations in this folder yet.</EmptyLine>;

  const shown = rows.filter((r) => r.title.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div>
      <label className="mb-2 flex h-7 items-center gap-2 rounded-md bg-bg px-2 ring-1 ring-line-soft focus-within:ring-fg/30">
        <Search size={12} className="text-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${rows.length} conversations`} className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-faint" />
      </label>
      <div className="-mx-2 max-h-80 overflow-y-auto">
        {shown.map((r) => {
          const def = agentList.find((a) => a.kind === r.kind);
          const installed = !!availability?.[r.kind];
          return (
            <div key={`${r.kind}-${r.id}`} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface/60">
              <AgentGlyph agent={def} size={18} />
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-fg-2" title={r.title}>{r.title}</span>
              <span className="font-mono text-[10.5px] text-faint">{r.messages} msg</span>
              <span className="w-20 text-right font-mono text-[10.5px] text-faint">{timeAgo(r.updatedAt)}</span>
              <button
                disabled={!installed}
                onClick={() => void startAgent(r.kind, project.id, { chat: { id: r.id, title: r.title } })}
                className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11.5px] text-fg opacity-0 ring-1 ring-line transition-opacity hover:bg-surface-2 group-hover:opacity-100 disabled:hidden"
              >
                <Play size={11} /> Resume
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
