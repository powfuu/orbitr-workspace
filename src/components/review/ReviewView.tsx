import { AlertTriangle, ChevronDown, FileCode2, FilePlus2, GitCompareArrows, MessageSquare, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";
import { openInEditor } from "../../features/editors/openInEditor";
import { lineDiff } from "../../lib/lineDiff";
import { ONE_DARK, extOf, highlight } from "../../lib/syntax";
import { cn } from "../../lib/cn";
import type { AgentSession } from "../../types";
import { IconButton } from "../ui/IconButton";

interface FileEdit {
  at: string;
  tool: string;
  path: string;
  old: string;
  new: string;
  full: boolean;
  error: boolean;
  truncated: boolean;
}
interface PromptChanges {
  at: string;
  prompt: string;
  edits: FileEdit[];
}

const time = (at: string) => {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};
const rel = (path: string, cwd?: string) => (cwd && path.startsWith(cwd + "/") ? path.slice(cwd.length + 1) : path);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * What this agent session actually changed: every edit, its exact diff, and the prompt that
 * asked for it. Built from the Claude Code transcript, so each step stays visible even after
 * later edits or commits.
 */
export function ReviewView({ agent, cwd, onClose }: { agent: AgentSession; cwd?: string; onClose: () => void }) {
  const [data, setData] = useState<PromptChanges[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [file, setFile] = useState<string | null>(null);

  useEffect(() => {
    if (!cwd || !agent.chatId) return;
    let alive = true;
    const load = () =>
      void invoke<PromptChanges[]>("agent_changes", { cwd, sessionId: agent.chatId })
        .then((d) => {
          if (!alive) return;
          setData(d);
          setError(null);
        })
        .catch((e) => alive && setError(String(e)));
    load();
    const t = window.setInterval(load, 4000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [cwd, agent.chatId]);

  const withEdits = useMemo(() => (data ?? []).map((p, i) => ({ ...p, i })).filter((p) => p.edits.length > 0), [data]);
  const files = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of withEdits) for (const e of p.edits) if (!e.error) m.set(e.path, (m.get(e.path) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [withEdits]);
  const totalEdits = withEdits.reduce((n, p) => n + p.edits.filter((e) => !e.error).length, 0);
  const shownPrompts = file ? withEdits.filter((p) => p.edits.some((e) => e.path === file)) : withEdits;
  // Default to the latest prompt that changed something.
  const current = sel ?? shownPrompts[shownPrompts.length - 1]?.i ?? null;
  const prompt = current !== null ? data?.[current] : undefined;

  return (
    <div className="@container flex h-full min-h-0 flex-col bg-bg-2">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-line-soft px-4 py-2">
        <GitCompareArrows size={14} className="text-muted" />
        <span className="font-mono text-[12.5px] text-fg">review</span>
        <span className="font-mono text-[11px] text-faint">
          {plural(withEdits.length, "prompt")} with changes · {plural(totalEdits, "edit")} · {plural(files.length, "file")}
        </span>
        <span className="ml-auto">
          <IconButton icon={X} size="sm" label="Back to the agent" onClick={onClose} />
        </span>
      </div>

      {!agent.chatId ? (
        <div className="p-6 text-[12.5px] text-muted">This session isn't linked to its Claude Code conversation yet — send it a prompt and the review fills in.</div>
      ) : error ? (
        <div className="p-6 text-[12.5px] text-error">{error}</div>
      ) : data && withEdits.length === 0 ? (
        <div className="p-6 text-[12.5px] text-muted">No file changes in this session yet.</div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(240px,320px)_1fr] @max-3xl:grid-cols-1">
          {/* Files (filter) and prompts */}
          <div className="flex min-h-0 flex-col border-r border-line-soft @max-3xl:max-h-72 @max-3xl:border-b @max-3xl:border-r-0">
            {files.length > 0 && (
              <div className="max-h-44 shrink-0 overflow-y-auto border-b border-line-soft p-2">
                <div className="mb-1 px-1 term-heading">files {file && <button onClick={() => setFile(null)} className="ml-1 normal-case tracking-normal text-accent hover:underline">show all</button>}</div>
                {files.map(([p, n]) => (
                  <button
                    key={p}
                    onClick={() => {
                      setFile(file === p ? null : p);
                      setSel(null);
                    }}
                    className={cn("flex h-6 w-full items-center gap-2 rounded px-1.5 text-left font-mono text-[11px]", file === p ? "bg-surface text-fg" : "text-fg-2 hover:bg-surface/60")}
                    title={p}
                  >
                    <span className="min-w-0 flex-1 truncate">{rel(p, cwd)}</span>
                    <span className="text-faint">{n}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              <div className="mb-1 px-1 term-heading">prompts</div>
              {shownPrompts.map((p) => {
                const fileCount = new Set(p.edits.map((e) => e.path)).size;
                const failed = p.edits.filter((e) => e.error).length;
                return (
                  <button
                    key={p.i}
                    onClick={() => setSel(p.i)}
                    className={cn("mb-0.5 w-full rounded-md px-2 py-1.5 text-left", current === p.i ? "bg-surface ring-1 ring-line" : "hover:bg-surface/50")}
                  >
                    <div className="line-clamp-2 text-[12px] leading-snug text-fg">{p.prompt}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[10px] text-faint">
                      <span>{time(p.at)}</span>
                      <span>{plural(fileCount, "file")} · {plural(p.edits.length - failed, "edit")}</span>
                      {failed > 0 && <span className="text-error">{failed} failed</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* The prompt and every change it made */}
          <div className="min-h-0 overflow-y-auto">
            {prompt && (
              <div className="p-4">
                <div className="mb-4 rounded-lg border border-line-soft bg-bg p-3">
                  <div className="mb-1 flex items-center gap-1.5 font-mono text-[10.5px] text-faint">
                    <MessageSquare size={11} /> your prompt · {time(prompt.at)}
                  </div>
                  <p className="selectable whitespace-pre-wrap text-[12.5px] leading-relaxed text-fg">{prompt.prompt}</p>
                </div>
                <div className="space-y-3">
                  {prompt.edits
                    .filter((e) => !file || e.path === file)
                    .map((e, k) => (
                      <EditCard key={k} edit={e} cwd={cwd} projectId={agent.projectId} />
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EditCard({ edit, cwd, projectId }: { edit: FileEdit; cwd?: string; projectId: string }) {
  const lines = useMemo(() => lineDiff(edit.old, edit.new), [edit.old, edit.new]);
  const ext = extOf(edit.path);
  const long = lines.length > 60;
  const [open, setOpen] = useState(!long);
  const added = lines.filter((l) => l.kind === "add").length;
  const removed = lines.filter((l) => l.kind === "del").length;
  const shown = open ? lines : lines.slice(0, 24);
  return (
    <div className={cn("overflow-hidden rounded-lg border", edit.error ? "border-error/40 opacity-70" : "border-line-soft")}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line-soft bg-bg px-3 py-1.5">
        {edit.full ? <FilePlus2 size={12} className="text-success" /> : <FileCode2 size={12} className="text-muted" />}
        <span className="selectable min-w-0 flex-1 truncate font-mono text-[11.5px] text-fg" title={edit.path}>{rel(edit.path, cwd)}</span>
        <span className="rounded-sm bg-surface px-1.5 font-mono text-[10px] text-muted">{edit.full ? "write" : edit.tool.toLowerCase()}</span>
        <span className="font-mono text-[10.5px] text-success">+{added}</span>
        <span className="font-mono text-[10.5px] text-error">−{removed}</span>
        {edit.error && (
          <span className="flex items-center gap-1 font-mono text-[10.5px] text-error">
            <AlertTriangle size={10} /> failed — not applied
          </span>
        )}
        <button onClick={() => void openInEditor({ projectId, file: edit.path })} className="rounded px-1.5 font-mono text-[10.5px] text-fg-2 ring-1 ring-line hover:bg-surface">
          open in Vim
        </button>
      </div>
      <pre className="selectable overflow-x-auto py-1 font-mono text-[11.5px] leading-[1.55]" style={{ background: ONE_DARK.bg, color: ONE_DARK.text }}>
        {shown.map((l, i) => (
          <div key={i} className="flex px-3" style={{ background: l.kind === "add" ? ONE_DARK.addBg : l.kind === "del" ? ONE_DARK.delBg : undefined }}>
            <span className="w-4 shrink-0 select-none" style={{ color: l.kind === "add" ? ONE_DARK.add : l.kind === "del" ? ONE_DARK.del : ONE_DARK.gutter }}>
              {l.kind === "add" ? "+" : l.kind === "del" ? "−" : " "}
            </span>
            <span className="whitespace-pre">{l.text ? highlight(l.text, ext) : " "}</span>
          </div>
        ))}
      </pre>
      {(long || edit.truncated) && (
        <div className="flex items-center gap-3 border-t border-line-soft px-3 py-1 font-mono text-[10.5px] text-faint">
          {long && (
            <button onClick={() => setOpen(!open)} className="flex items-center gap-1 hover:text-fg">
              <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} /> {open ? "show less" : `show all ${lines.length} lines`}
            </button>
          )}
          {edit.truncated && <span>very large change, shown partially</span>}
        </div>
      )}
    </div>
  );
}
