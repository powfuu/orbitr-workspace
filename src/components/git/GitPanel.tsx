import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Check, GitBranch, GitCommitHorizontal, Loader2, Minus, Plus, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { gitService, type Commit, type FileChange } from "../../services/git";
import { useGit } from "../../features/git/gitStore";
import { toast } from "../../stores/toastStore";
import { hasMod, modKey } from "../../lib/platform";
import { timeAgo } from "../../lib/time";
import { cn } from "../../lib/cn";
import { IconButton } from "../ui/IconButton";
import { Kbd } from "../ui/Kbd";
import { DiffView } from "./DiffView";
import { BranchMenu } from "./BranchMenu";
import { WorktreesSection } from "./WorktreesSection";
import { EmptyLine } from "../workspace/primitives";

type Selected = { path: string; staged: boolean; untracked: boolean };

const letter = (f: FileChange, staged: boolean) => (f.untracked ? "U" : f.conflicted ? "!" : staged ? f.index : f.worktree);
const tone: Record<string, string> = { M: "text-warning", A: "text-success", U: "text-success", D: "text-error", R: "text-fg-2", C: "text-fg-2", "!": "text-error" };

/** Git for one project: branch, staged/unstaged changes with diffs, commit, push/pull, history. */
export function GitPanel({ path }: { path: string }) {
  const status = useGit((g) => g.byPath[path]);
  const refresh = useGit((g) => g.refresh);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [diff, setDiff] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<null | "commit" | "push" | "pull">(null);
  const [log, setLog] = useState<Commit[]>([]);

  useEffect(() => void refresh(path), [path, refresh]);
  const head = status?.lastCommit?.hash;
  useEffect(() => {
    if (status) void gitService.log(path, 8).then(setLog).catch(() => setLog([]));
  }, [path, head, status]);

  // Keep the open diff in sync with the working tree.
  const fingerprint = status?.files.map((f) => f.path + f.index + f.worktree).join("|");
  useEffect(() => {
    if (!selected) return setDiff(null);
    void gitService.diff(path, selected.path, selected.staged, selected.untracked).then(setDiff).catch((e) => setDiff(String(e)));
  }, [path, selected, fingerprint]);

  const { staged, changes } = useMemo(() => {
    const files = status?.files ?? [];
    return { staged: files.filter((f) => f.staged), changes: files.filter((f) => f.unstaged || f.untracked || f.conflicted) };
  }, [status]);

  if (status === undefined) return <EmptyLine icon={GitBranch}>Reading repository…</EmptyLine>;
  if (status === null) return <EmptyLine icon={GitBranch}>Not a git repository.</EmptyLine>;

  const act = async (label: typeof busy, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(label);
    try {
      await fn();
      if (ok) toast({ kind: "success", title: ok });
    } catch (e) {
      toast({ kind: "error", title: `git ${label} failed`, detail: String(e) });
    } finally {
      setBusy(null);
      void refresh(path);
    }
  };
  const run = (fn: () => Promise<unknown>) => fn().catch((e) => toast({ kind: "error", title: "git failed", detail: String(e) })).finally(() => refresh(path));

  const commit = () => {
    const msg = message.trim();
    if (!msg) return;
    void act("commit", async () => {
      if (staged.length === 0) await gitService.stage(path, changes.map((f) => f.path));
      await gitService.commit(path, msg);
      setMessage("");
      setSelected(null);
    }, "Committed");
  };

  const section = (title: string, files: FileChange[], isStaged: boolean) =>
    files.length > 0 && (
      <div>
        <div className="group flex h-7 items-center gap-2 px-3 text-2xs font-medium uppercase tracking-[0.08em] text-faint">
          {title} <span className="font-mono normal-case tracking-normal">{files.length}</span>
          <span className="ml-auto opacity-0 group-hover:opacity-100">
            <IconButton
              icon={isStaged ? Minus : Plus}
              size="sm"
              label={isStaged ? "Unstage all" : "Stage all"}
              onClick={() => void run(() => (isStaged ? gitService.unstage : gitService.stage)(path, files.map((f) => f.path)))}
            />
          </span>
        </div>
        {files.map((f) => {
          const l = letter(f, isStaged);
          const sel = selected?.path === f.path && selected.staged === isStaged;
          const name = f.path.split("/").pop();
          const dir = f.path.slice(0, f.path.length - (name?.length ?? 0));
          return (
            <div
              key={`${isStaged}-${f.path}`}
              onClick={() => setSelected({ path: f.path, staged: isStaged, untracked: f.untracked })}
              className={cn("group flex h-7 cursor-default items-center gap-2 px-3 text-[12px]", sel ? "bg-surface text-fg" : "text-fg-2 hover:bg-surface/60")}
            >
              <span className={cn("w-3 text-center font-mono text-[11px] font-semibold", tone[l] ?? "text-muted")}>{l}</span>
              <span className="truncate">{name}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-faint">{dir}</span>
              <span className="opacity-0 group-hover:opacity-100">
                <IconButton
                  icon={isStaged ? Minus : Plus}
                  size="sm"
                  label={isStaged ? "Unstage" : "Stage"}
                  onClick={() => void run(() => (isStaged ? gitService.unstage : gitService.stage)(path, [f.path]))}
                />
              </span>
            </div>
          );
        })}
      </div>
    );

  return (
    <div className="-m-4 flex flex-col">
      {/* Branch bar */}
      <div className="flex items-center gap-2 border-b border-line-soft px-4 py-2.5">
        <BranchMenu repo={path} current={status.branch} />
        {status.upstream && <span className="truncate font-mono text-[11px] text-faint">→ {status.upstream}</span>}
        {status.ahead > 0 && <span className="flex items-center gap-0.5 font-mono text-[11px] text-fg-2"><ArrowUp size={11} />{status.ahead}</span>}
        {status.behind > 0 && <span className="flex items-center gap-0.5 font-mono text-[11px] text-warning"><ArrowDown size={11} />{status.behind}</span>}
        <div className="flex-1" />
        <button
          disabled={!!busy}
          onClick={() => void act("pull", () => gitService.pull(path), "Pulled")}
          className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] text-fg-2 ring-1 ring-line hover:bg-surface disabled:opacity-50"
        >
          {busy === "pull" ? <Loader2 size={12} className="animate-spin" /> : <ArrowDown size={12} />} Pull
        </button>
        <button
          disabled={!!busy}
          onClick={() => void act("push", () => gitService.push(path), "Pushed")}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] disabled:opacity-50",
            status.ahead > 0 || !status.upstream ? "bg-white text-black hover:bg-white/85" : "text-fg-2 ring-1 ring-line hover:bg-surface",
          )}
        >
          {busy === "push" ? <Loader2 size={12} className="animate-spin" /> : <ArrowUp size={12} />} Push
        </button>
        <IconButton icon={RefreshCw} size="sm" label="Refresh" onClick={() => void refresh(path)} />
      </div>

      <div className="grid min-h-[280px] grid-cols-[minmax(min(240px,100%),1fr)_2fr] @max-2xl:grid-cols-1">
        {/* Changes + commit */}
        <div className="flex min-w-0 flex-col border-r border-line-soft @max-2xl:border-r-0 @max-2xl:border-b">
          <div className="max-h-80 flex-1 overflow-y-auto py-1">
            {status.files.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-6 text-[12px] text-muted"><Check size={13} className="text-success" /> Working tree clean</div>
            ) : (
              <>
                {section("Staged", staged, true)}
                {section("Changes", changes, false)}
              </>
            )}
          </div>
          <div className="border-t border-line-soft p-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && hasMod(e)) {
                  e.preventDefault();
                  commit();
                }
              }}
              placeholder="Commit message"
              rows={2}
              className="w-full resize-none rounded-md bg-bg px-2.5 py-2 text-[12.5px] text-fg outline-none ring-1 ring-line-soft placeholder:text-faint focus:ring-white/30"
            />
            <button
              disabled={!message.trim() || status.files.length === 0 || !!busy}
              onClick={commit}
              className="mt-2 flex h-8 w-full items-center justify-center gap-2 rounded-lg bg-white text-[12.5px] font-medium text-black hover:bg-white/85 disabled:bg-surface disabled:text-faint"
            >
              {busy === "commit" ? <Loader2 size={13} className="animate-spin" /> : <GitCommitHorizontal size={14} />}
              {staged.length ? `Commit ${staged.length} staged` : `Stage all & commit (${changes.length})`}
              <Kbd>{modKey}↵</Kbd>
            </button>
          </div>
        </div>

        {/* Diff / history */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            {selected && diff !== null ? (
              <motion.div key={selected.path + selected.staged} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                <div className="flex h-8 items-center gap-2 border-b border-line-soft px-4 font-mono text-[11px] text-muted">
                  <span className="truncate">{selected.path}</span>
                  <span className="text-faint">{selected.staged ? "staged" : selected.untracked ? "new file" : "working tree"}</span>
                </div>
                <div className="max-h-[420px] overflow-auto py-1">
                  <DiffView diff={diff} />
                </div>
              </motion.div>
            ) : (
              <motion.div key="log" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-2">
                <div className="px-4 pb-1 text-2xs font-medium uppercase tracking-[0.08em] text-faint">Recent commits</div>
                {log.length === 0 && <div className="px-4 py-3 text-[12px] text-muted">No commits yet.</div>}
                {log.map((c) => (
                  <div key={c.hash} className="flex h-7 items-center gap-3 px-4 text-[12px]">
                    <span className="selectable font-mono text-[11px] text-faint">{c.short}</span>
                    <span className="min-w-0 flex-1 truncate text-fg-2" title={c.subject}>{c.subject}</span>
                    <span className="truncate text-[11px] text-faint">{c.author}</span>
                    <span className="w-16 text-right font-mono text-[10.5px] text-faint">{timeAgo(c.time)}</span>
                  </div>
                ))}
                <div className="px-4 pt-2 text-[11px] text-faint">Select a file to see its diff.</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <WorktreesSection repo={path} />
    </div>
  );
}
