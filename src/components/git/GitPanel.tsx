import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Check, Columns2, FileCode2, GitBranch, GitCommitHorizontal, Loader2, Minus, Plus, RefreshCw } from "lucide-react";
import { openInEditor, openVimDiff, projectIdForPath } from "../../features/editors/openInEditor";
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
import { HistoryView } from "./HistoryView";
import { BranchesView } from "./BranchesView";
import { StashView } from "./StashView";
import { RefChips } from "./ui";
import { SilentError, withAuth } from "../../features/git/withAuth";
import { conflictAlert, isConflictError, useGitTabs, type GitTab } from "../../features/git/conflicts";
import { MergeBanner } from "./MergeBanner";

const TABS = ["changes", "history", "branches", "stash"] as const;

type Selected = { path: string; staged: boolean; untracked: boolean };

const letter = (f: FileChange, staged: boolean) => (f.untracked ? "U" : f.conflicted ? "!" : staged ? f.index : f.worktree);
const tone: Record<string, string> = { M: "text-warning", A: "text-success", U: "text-success", D: "text-error", R: "text-fg-2", C: "text-fg-2", "!": "text-error" };

/** Git for one project: branch, staged/unstaged changes with diffs, commit, push/pull, history. */
/** `full`: fills its container (Git tab) instead of the compact panel height. */
export function GitPanel({ path, full = false }: { path: string; full?: boolean }) {
  const status = useGit((g) => g.byPath[path]);
  const refresh = useGit((g) => g.refresh);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [diff, setDiff] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<null | "commit" | "push" | "pull">(null);
  const [log, setLog] = useState<Commit[]>([]);
  const tab = useGitTabs((t) => t.byPath[path] ?? "changes");
  const setTab = (t: GitTab) => useGitTabs.getState().set(path, t);
  const [openCommit, setOpenCommit] = useState<string | null>(null);
  const showCommit = (hash: string | null) => {
    setOpenCommit(hash);
    setTab("history");
  };

  useEffect(() => {
    void refresh(path);
  }, [path, refresh]);
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
    return { staged: files.filter((f) => f.staged && !f.conflicted), changes: files.filter((f) => (f.unstaged || f.untracked) && !f.conflicted) };
  }, [status]);

  if (status === undefined) return <EmptyLine icon={GitBranch}>Reading repository…</EmptyLine>;
  if (status === null) return <EmptyLine icon={GitBranch}>Not a git repository.</EmptyLine>;

  const act = async (label: typeof busy, fn: () => Promise<unknown>, ok?: string, detail?: string) => {
    setBusy(label);
    try {
      await withAuth(path, fn);
      if (ok) toast({ kind: "success", title: ok, detail });
    } catch (e) {
      if (isConflictError(e)) void conflictAlert(path, `git ${label} stopped on conflicts.`);
      else if (!(e instanceof SilentError)) toast({ kind: "error", title: `git ${label} failed`, detail: String(e) });
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
        <div className="group flex h-7 items-center gap-2 px-3 term-heading">
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
                <IconButton icon={FileCode2} size="sm" label="Open in Vim" onClick={() => void openInEditor({ projectId: projectIdForPath(path), file: f.path })} />
              </span>
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
    <div className={cn("flex flex-col", full ? "h-full min-h-0" : "-m-4")}>
      {/* Branch bar */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 border-b border-line-soft px-4 py-2.5">
        {/* Branch info takes the row; when the pane is narrow the actions wrap below instead of squeezing it. */}
        <div className="flex min-w-[12rem] flex-1 items-center gap-2">
        <BranchMenu repo={path} current={status.branch} />
        {status.upstream && status.upstream !== `origin/${status.branch}` && (
          <span className="min-w-0 shrink truncate whitespace-nowrap font-mono text-[11px] text-faint" title={status.upstream}>→ {status.upstream}</span>
        )}
        {status.upstream && status.upstream === `origin/${status.branch}` && (
          <span className="shrink-0 font-mono text-[11px] text-faint" title={status.upstream}>→ origin</span>
        )}
        {status.ahead > 0 && <span className="flex shrink-0 items-center gap-0.5 font-mono text-[11px] text-fg-2"><ArrowUp size={11} />{status.ahead}</span>}
        {status.behind > 0 && <span className="flex shrink-0 items-center gap-0.5 font-mono text-[11px] text-warning"><ArrowDown size={11} />{status.behind}</span>}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
        <button
          disabled={!!busy}
          title={status.behind > 0 ? `${status.behind} commit${status.behind === 1 ? "" : "s"} to pull from ${status.upstream}` : "Pull from upstream"}
          onClick={() => {
            const n = status.behind;
            void act(
              "pull",
              () => gitService.pull(path),
              n > 0 ? `Pulled ${n} commit${n === 1 ? "" : "s"} into ${status.branch}` : `Pulled ${status.branch}`,
              `from ${status.upstream ?? "upstream"}`,
            );
          }}
          className={cn(
            "flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] disabled:opacity-50",
            status.behind > 0 ? "bg-fg text-bg hover:bg-fg/85" : "text-fg-2 ring-1 ring-line hover:bg-surface",
          )}
        >
          {busy === "pull" ? <Loader2 size={12} className="animate-spin" /> : <ArrowDown size={12} />} Pull
          {status.behind > 0 && <span className="font-mono text-[10.5px] opacity-70">{status.behind}</span>}
        </button>
        <button
          disabled={!!busy}
          title={!status.upstream ? `Publish ${status.branch} to origin` : status.ahead > 0 ? `${status.ahead} commit${status.ahead === 1 ? "" : "s"} to push to ${status.upstream}` : "Nothing to push"}
          onClick={() => {
            const n = status.ahead;
            const last = status.lastCommit;
            void act(
              "push",
              () => gitService.push(path),
              !status.upstream ? `Published ${status.branch} to origin` : n > 0 ? `Pushed ${n} commit${n === 1 ? "" : "s"} to ${status.upstream}` : `${status.branch} is already up to date`,
              last ? `latest: ${last.short} ${last.subject}` : undefined,
            );
          }}
          className={cn(
            "flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] disabled:opacity-50",
            status.ahead > 0 || !status.upstream ? "bg-fg text-bg hover:bg-fg/85" : "text-fg-2 ring-1 ring-line hover:bg-surface",
          )}
        >
          {busy === "push" ? <Loader2 size={12} className="animate-spin" /> : <ArrowUp size={12} />} Push
          {status.ahead > 0 && <span className="font-mono text-[10.5px] opacity-70">{status.ahead}</span>}
        </button>
        <IconButton icon={RefreshCw} size="sm" label="Refresh" onClick={() => void refresh(path)} />
        </div>
      </div>

      <MergeBanner repo={path} />
      {full && (
        <div role="tablist" className="flex shrink-0 items-stretch gap-1 border-b border-line-soft px-3">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn("relative h-8 px-2.5 font-mono text-[11.5px] transition-colors", tab === t ? "text-fg" : "text-muted hover:text-fg-2")}
            >
              {t}
              {t === "changes" && status.files.some((f) => f.conflicted) ? (
                <span className="ml-1.5 rounded-sm bg-error px-1 text-[10px] font-semibold text-white">{status.files.filter((f) => f.conflicted).length} conflicts</span>
              ) : (
                t === "changes" && status.files.length > 0 && <span className="ml-1.5 text-faint">{status.files.length}</span>
              )}
              {tab === t && <motion.span layoutId={`git-tab-${path}`} className="absolute inset-x-1 bottom-0 h-[2px] bg-accent" transition={{ duration: 0.12 }} />}
            </button>
          ))}
        </div>
      )}
      {full && tab === "history" && <div className="min-h-0 flex-1"><HistoryView key={openCommit ?? "none"} repo={path} initial={openCommit} /></div>}
      {full && tab === "branches" && <div className="min-h-0 flex-1"><BranchesView repo={path} /></div>}
      {full && tab === "stash" && <div className="min-h-0 flex-1"><StashView repo={path} /></div>}
      {(!full || tab === "changes") && (<>
      <div className={cn("grid grid-cols-[minmax(min(260px,100%),1fr)_2fr] @max-2xl:grid-cols-1", full ? "min-h-0 flex-1" : "min-h-[280px]")}>
        {/* Changes + commit */}
        <div className="flex min-w-0 flex-col border-r border-line-soft @max-2xl:border-r-0 @max-2xl:border-b">
          <div className={cn("flex-1 overflow-y-auto py-1", !full && "max-h-80")}>
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
              className="w-full resize-none rounded-md bg-bg px-2.5 py-2 text-[12.5px] text-fg outline-none ring-1 ring-line-soft placeholder:text-faint focus:ring-fg/30"
            />
            <button
              disabled={!message.trim() || status.files.length === 0 || !!busy}
              onClick={commit}
              className="mt-2 flex h-8 w-full items-center justify-center gap-2 rounded-lg bg-fg text-[12.5px] font-medium text-bg hover:bg-fg/85 disabled:bg-surface disabled:text-faint"
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
                <div className="flex min-h-9 min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-line-soft px-4 py-1.5 font-mono text-[11px] text-muted">
                  <span className="min-w-[8rem] flex-1 truncate" title={selected.path}>{selected.path}</span>
                  <span className="shrink-0 whitespace-nowrap text-faint">{selected.staged ? "staged" : selected.untracked ? "new file" : "working tree"}</span>
                  <span className="ml-auto flex shrink-0 gap-1.5">
                    <button onClick={() => void openInEditor({ projectId: projectIdForPath(path), file: selected.path })} className="flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded px-2 font-sans text-[11px] text-fg ring-1 ring-line hover:bg-surface">
                      <FileCode2 size={11} /> Open in Vim
                    </button>
                    {!selected.untracked && (
                      <button onClick={() => { const id = projectIdForPath(path); if (id) void openVimDiff(id, selected.path, selected.staged); }} className="flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded px-2 font-sans text-[11px] text-fg ring-1 ring-line hover:bg-surface">
                        <Columns2 size={11} /> vimdiff
                      </button>
                    )}
                  </span>
                </div>
                <div className={cn("overflow-auto py-1", full ? "max-h-[calc(100vh-14rem)]" : "max-h-[420px]")}>
                  <DiffView diff={diff} />
                </div>
              </motion.div>
            ) : (
              <motion.div key="log" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-2">
                <div className="px-4 pb-1 term-heading">Recent commits</div>
                {log.length === 0 && <div className="px-4 py-3 text-[12px] text-muted">No commits yet.</div>}
                {log.map((c) => (
                  <button key={c.hash} onClick={() => (full ? showCommit(c.hash) : undefined)} className={cn("flex h-7 w-full items-center gap-3 px-4 text-left text-[12px]", full && "hover:bg-surface/50")}>
                    <span className="font-mono text-[11px] text-faint">{c.short}</span>
                    <span className="flex min-w-0 flex-1 items-center gap-1.5"><span className="truncate text-fg-2" title={c.subject}>{c.subject}</span><RefChips refs={c.refs} /></span>
                    <span className="truncate text-[11px] text-faint">{c.author}</span>
                    <span className="w-16 text-right font-mono text-[10.5px] text-faint">{timeAgo(c.time)}</span>
                  </button>
                ))}
                <div className="flex items-center gap-3 px-4 pt-2 text-[11px] text-faint">
                  {full && <button onClick={() => showCommit(null)} className="text-fg-2 underline-offset-2 hover:text-fg hover:underline">view full history →</button>}
                  <span>Select a file to see its diff.</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <WorktreesSection repo={path} />
      </>)}
    </div>
  );
}
