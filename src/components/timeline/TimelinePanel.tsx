import { PromptImages } from "./PromptImages";
import { motion } from "framer-motion";
import {
  Bot, CircleStop, FilePen, FileText, GitCommitHorizontal, HelpCircle, MessageSquare, Mic, Play, Search,
  ListTree, ShieldCheck, Skull, SquareTerminal, Wrench, X, type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { openInEditor } from "../../features/editors/openInEditor";
import { useTimeline, type Entry } from "../../features/timeline/useTimeline";
import { useUsage } from "../../features/usage/useUsage";
import { duration } from "../../lib/time";
import { compact, money } from "../../lib/format";
import { cn } from "../../lib/cn";
import type { AgentSession } from "../../types";

type Filter = "all" | "prompts" | "files" | "commands";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "prompts", label: "Prompts" },
  { id: "files", label: "Files" },
  { id: "commands", label: "Commands" },
];

function describe(x: Entry): { icon: LucideIcon; tone: string; title: string; detail?: string | null; mono?: boolean } {
  if (x.source === "git") return { icon: GitCommitHorizontal, tone: "text-success", title: x.e.subject, detail: `commit ${x.e.short}` };
  if (x.source === "orbitr") {
    const map = {
      started: [Play, "text-success"],
      stopped: [CircleStop, "text-muted"],
      exited: [CircleStop, "text-muted"],
      crashed: [Skull, "text-error"],
      waiting: [HelpCircle, "text-warning"],
      answered: [ShieldCheck, "text-fg"],
      voice: [Mic, "text-fg"],
    } as const;
    const [icon, tone] = map[x.e.kind];
    return { icon, tone, title: x.e.kind === "answered" ? `You chose: ${x.e.title}` : x.e.kind === "voice" ? `“${x.e.title}”` : x.e.title, detail: x.e.kind === "voice" ? "sent by voice" : undefined };
  }
  const e = x.e;
  const base = { title: e.title, detail: e.detail };
  switch (e.kind) {
    case "prompt": return { ...base, icon: MessageSquare, tone: "text-fg" };
    case "command": return { ...base, icon: SquareTerminal, tone: "text-fg-2", mono: true };
    case "edit": return { ...base, icon: FilePen, tone: "text-warning", mono: true };
    case "read": return { ...base, icon: FileText, tone: "text-muted", mono: true };
    case "search": return { ...base, icon: Search, tone: "text-muted", mono: true };
    case "agent": return { ...base, icon: Bot, tone: "text-fg-2" };
    case "reply": return { ...base, icon: MessageSquare, tone: "text-muted" };
    default: return { ...base, icon: Wrench, tone: "text-muted" };
  }
}

const matches = (x: Entry, f: Filter) => {
  if (f === "all") return !(x.source === "agent" && x.e.kind === "read");
  if (x.source !== "agent") return f === "prompts" ? x.source === "orbitr" && (x.e.kind === "voice" || x.e.kind === "answered") : f === "files" && x.source === "git";
  if (f === "prompts") return x.e.kind === "prompt";
  if (f === "files") return x.e.kind === "edit";
  return x.e.kind === "command";
};

const time = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const shortPath = (p: string, cwd?: string) => (cwd && p.startsWith(cwd + "/") ? p.slice(cwd.length + 1) : p);

/** What the agent did, in order: your prompts, its commands and edits, approvals, commits. */
/** Width of the timeline panel (the terminal reserves this much space while it's open). */
export const TIMELINE_W = 340;

export function TimelinePanel({ agent, cwd, onClose }: { agent: AgentSession; cwd?: string; onClose: () => void }) {
  const entries = useTimeline(agent, cwd);
  const [filter, setFilter] = useState<Filter>("all");
  const usage = useUsage(cwd ?? null, 30);
  const bottom = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const agentEvents = entries.flatMap((x) => (x.source === "agent" ? [x.e] : []));
    return {
      prompts: agentEvents.filter((e) => e.kind === "prompt").length,
      files: new Set(agentEvents.filter((e) => e.kind === "edit").map((e) => e.path)).size,
      commands: agentEvents.filter((e) => e.kind === "command").length,
      failed: agentEvents.filter((e) => e.error).length,
    };
  }, [entries]);
  const session = agent.chatId ? usage?.bySession.find((s) => s.key === agent.chatId) : undefined;
  const shown = entries.filter((x) => matches(x, filter));

  // Follow new events while scrolled to the bottom.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [shown.length]);

  return (
    <motion.aside
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
      style={{ width: TIMELINE_W }}
      className="absolute inset-y-0 right-0 z-10 flex max-w-[60%] flex-col overflow-hidden border-l border-line-soft bg-bg shadow-pop"
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line-soft px-3">
        <ListTree size={13} className="text-muted" />
        <span className="text-[12.5px] font-medium text-fg">Timeline</span>
        <span className="ml-auto" />
        <button aria-label="Close timeline" onClick={onClose} className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-surface hover:text-fg"><X size={13} /></button>
      </div>

      <div className="grid shrink-0 grid-cols-4 gap-2 border-b border-line-soft px-3 py-2.5 text-center">
        {[
          ["Time", duration(Date.now() - agent.startedAt)],
          ["Prompts", stats.prompts],
          ["Files", stats.files],
          ["Cost", session ? money(session.cost) : "—"],
        ].map(([k, v]) => (
          <div key={k as string}>
            <div className="font-mono text-[13px] text-fg">{v}</div>
            <div className="text-[10px] text-faint">{k}</div>
          </div>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-1 border-b border-line-soft px-3 py-1.5">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={cn("h-6 rounded-md px-2 text-[11.5px]", filter === f.id ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")}>
            {f.label}
          </button>
        ))}
        <span className="ml-auto font-mono text-[10px] text-faint" title="commands / failed tool calls">
          {stats.commands} cmd{stats.failed ? ` · ${stats.failed} failed` : ""}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {agent.kind === "claude-code" && !agent.chatId && (
          <div className="mb-2 rounded-md border border-dashed border-line px-2.5 py-2 text-[11px] text-muted">
            Linking to Claude Code's transcript — it appears after your first message.
          </div>
        )}
        {agent.kind !== "claude-code" && (
          <div className="mb-2 rounded-md border border-dashed border-line px-2.5 py-2 text-[11px] text-muted">
            Detailed tool activity is available for Claude Code. Showing what Orbitr observed.
          </div>
        )}
        {shown.length === 0 && <div className="py-6 text-center text-[12px] text-faint">Nothing yet.</div>}
        <ol className="relative">
          {shown.map((x, i) => {
            const d = describe(x);
            const err = x.source === "agent" && x.e.error;
            const prev = shown[i - 1];
            const gap = prev && x.at - prev.at > 5 * 60_000;
            const path = x.source === "agent" ? x.e.path : null;
            return (
              <li key={i} className="group relative flex gap-2.5 py-1.5 pl-0.5">
                {i < shown.length - 1 && <span className="absolute left-[9px] top-6 h-[calc(100%-12px)] w-px bg-line-soft" />}
                <span className={cn("relative mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-surface ring-1 ring-line", err ? "text-error ring-error/50" : d.tone)}>
                  <d.icon size={10} strokeWidth={2.25} />
                </span>
                <div className="min-w-0 flex-1">
                  {gap && <div className="mb-1 text-[10px] text-faint">· {duration(x.at - prev.at)} later</div>}
                  <div
                    title={path ? `Open ${path} in Vim` : d.title}
                    onClick={path ? () => void openInEditor({ projectId: agent.projectId, file: path }) : undefined}
                    className={cn("selectable break-words text-[12px] leading-snug", path && "cursor-pointer hover:underline", d.mono && "font-mono text-[11px]", err ? "text-error" : x.source === "agent" && x.e.kind === "prompt" ? "text-fg" : "text-fg-2")}
                  >
                    {path ? shortPath(path, cwd) : d.title}
                  </div>
                  {x.source === "agent" && x.e.images && x.e.images.length > 0 && <PromptImages paths={x.e.images} />}
                  <div className="mt-0.5 flex gap-2 text-[10px] text-faint">
                    <span className="font-mono">{time(x.at)}</span>
                    {d.detail && <span className="truncate">{d.detail}</span>}
                    {err && <span className="text-error">failed</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <div ref={bottom} />
      </div>
      {session && (
        <div className="shrink-0 border-t border-line-soft px-3 py-1.5 font-mono text-[10px] text-faint">
          {compact(session.tokens.output)} output · {compact(session.tokens.cacheRead)} cached · session {agent.chatId?.slice(0, 8)}
        </div>
      )}
    </motion.aside>
  );
}
