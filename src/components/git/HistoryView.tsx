import { AnimatePresence, motion } from "framer-motion";
import { Copy, GitBranchPlus, GitCommitHorizontal, Loader2, Search, Tag } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { branchService, gitMore, type Branch, type Commit, type CommitDetail } from "../../services/git";
import { useGitRun } from "../../features/git/gitRun";
import { useGit } from "../../features/git/gitStore";
import { timeAgo } from "../../lib/time";
import { cn } from "../../lib/cn";
import { Select } from "../ui/Select";
import { DiffView } from "./DiffView";
import { GitButton, RefChips, TextInput } from "./ui";

const PAGE = 50;
const statusTone: Record<string, string> = { A: "text-success", M: "text-warning", D: "text-error", R: "text-fg-2" };

/** Paged history of any branch; a commit opens its message, files and per-file diff. */
export function HistoryView({ repo, initial = null }: { repo: string; initial?: string | null }) {
  const head = useGit((g) => g.byPath[repo]?.lastCommit?.hash);
  const [rev, setRev] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(initial);

  const load = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      try {
        const skip = reset ? 0 : commits.length;
        const page = await gitMore.logPage(repo, skip, PAGE, rev);
        setCommits((c) => (reset ? page : [...c, ...page]));
        setDone(page.length < PAGE);
      } finally {
        setLoading(false);
      }
    },
    [repo, rev, commits.length],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void load(true), [repo, rev, head]);
  useEffect(() => void branchService.list(repo).then(setBranches).catch(() => setBranches([])), [repo, head]);

  const needle = q.trim().toLowerCase();
  const shown = useMemo(
    () => (needle ? commits.filter((c) => `${c.subject} ${c.author} ${c.short} ${c.refs}`.toLowerCase().includes(needle)) : commits),
    [commits, needle],
  );

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(min(340px,100%),1fr)_1.3fr] @max-2xl:grid-cols-1">
      <div className="flex min-h-0 min-w-0 flex-col border-r border-line-soft @max-2xl:border-b @max-2xl:border-r-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-3 py-2">
          <Select
            ariaLabel="Branch"
            className="w-48 font-mono"
            value={rev}
            onChange={setRev}
            options={[{ value: "", label: "HEAD (current)" }, ...branches.map((b) => ({ value: b.name, label: b.name }))]}
          />
          <label className="flex h-7 min-w-[8rem] flex-1 items-center gap-1.5 rounded-md bg-bg px-2 ring-1 ring-line-soft">
            <Search size={12} className="text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="filter commits" className="min-w-0 flex-1 bg-transparent font-mono text-[12px] outline-none placeholder:text-faint" />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {shown.map((c) => (
            <button
              key={c.hash}
              onClick={() => setSelected(c.hash)}
              className={cn("flex w-full items-center gap-2.5 px-3 py-1.5 text-left", selected === c.hash ? "bg-surface" : "hover:bg-surface/50")}
            >
              <GitCommitHorizontal size={12} className={cn("shrink-0", c.subject.startsWith("Merge") ? "text-faint" : "text-muted")} />
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className={cn("truncate text-[12px]", selected === c.hash ? "text-fg" : "text-fg-2")}>{c.subject}</span>
                  <RefChips refs={c.refs} />
                </span>
                <span className="flex gap-2 font-mono text-[10.5px] text-faint">
                  <span>{c.short}</span>
                  <span className="truncate">{c.author}</span>
                  <span className="ml-auto shrink-0">{timeAgo(c.time)}</span>
                </span>
              </span>
            </button>
          ))}
          {!loading && shown.length === 0 && <div className="px-4 py-4 text-[12px] text-muted">{needle ? "No commits match." : "No commits yet."}</div>}
          <div className="flex justify-center py-2">
            {loading ? (
              <Loader2 size={13} className="animate-spin text-faint" />
            ) : (
              !done && (
                <GitButton onClick={() => void load(false)}>
                  load {PAGE} more {needle && "(filter applies to loaded)"}
                </GitButton>
              )
            )}
          </div>
        </div>
      </div>
      <div className="min-h-0 min-w-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key={selected} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
              <CommitPane repo={repo} hash={selected} />
            </motion.div>
          ) : (
            <div className="px-4 py-6 text-[12px] text-faint">Select a commit to see its changes.</div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CommitPane({ repo, hash }: { repo: string; hash: string }) {
  const [d, setD] = useState<CommitDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [file, setFile] = useState<string | null>(null);
  const [diff, setDiff] = useState<string | null>(null);
  const [branchName, setBranchName] = useState("");
  const [tagName, setTagName] = useState("");
  const { busy, run } = useGitRun(repo);

  useEffect(() => {
    setFile(null);
    void gitMore.commitDetail(repo, hash).then(setD, (e) => setErr(String(e)));
  }, [repo, hash]);
  useEffect(() => {
    setDiff(null);
    if (file) void gitMore.commitDiff(repo, hash, file).then(setDiff, (e) => setDiff(String(e)));
  }, [repo, hash, file]);

  if (err) return <div className="p-4 text-[12px] text-error">{err}</div>;
  if (!d) return <div className="p-4"><Loader2 size={13} className="animate-spin text-faint" /></div>;
  const added = d.files.reduce((n, f) => n + (f.additions ?? 0), 0);
  const removed = d.files.reduce((n, f) => n + (f.deletions ?? 0), 0);

  return (
    <div>
      <div className="space-y-2 border-b border-line-soft px-4 py-3">
        <div className="flex flex-wrap items-start gap-2">
          <h3 className="selectable min-w-0 flex-1 text-[13.5px] font-medium text-fg">{d.subject}</h3>
          <RefChips refs={d.refs} />
        </div>
        {d.body && <pre className="selectable whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-fg-2">{d.body}</pre>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
          <span className="selectable">{d.author} &lt;{d.email}&gt;</span>
          <span>{new Date(d.time).toLocaleString()}</span>
          <button onClick={() => void navigator.clipboard.writeText(d.hash)} className="flex items-center gap-1 text-faint hover:text-fg" title="Copy full hash">
            {d.short} <Copy size={10} />
          </button>
          {d.parents.length > 1 && <span className="text-faint">merge of {d.parents.map((p) => p.slice(0, 7)).join(" + ")}</span>}
          <span className="text-success">+{added}</span>
          <span className="text-error">−{removed}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <GitButton disabled={!!busy} onClick={() => void run("cherry-pick", () => gitMore.cherryPick(repo, d.hash), `Cherry-picked ${d.short}`)}>cherry-pick</GitButton>
          <GitButton danger disabled={!!busy} onClick={() => void run("revert", () => gitMore.revert(repo, d.hash), `Reverted ${d.short}`)}>revert</GitButton>
          <span className="mx-1 h-4 w-px bg-line" />
          <TextInput value={branchName} onChange={setBranchName} placeholder="new branch here" className="w-36"
            onEnter={() => branchName.trim() && void run("branch", () => gitMore.createBranch(repo, branchName.trim(), d.hash, true), `Created ${branchName.trim()}`).then(() => setBranchName(""))} />
          <GitButton disabled={!branchName.trim() || !!busy} onClick={() => void run("branch", () => gitMore.createBranch(repo, branchName.trim(), d.hash, true), `Created ${branchName.trim()}`).then(() => setBranchName(""))}>
            <GitBranchPlus size={11} /> branch
          </GitButton>
          <TextInput value={tagName} onChange={setTagName} placeholder="tag (v1.2.0)" className="w-28"
            onEnter={() => tagName.trim() && void run("tag", () => gitMore.tag(repo, tagName.trim(), d.hash), `Tagged ${tagName.trim()}`).then(() => setTagName(""))} />
          <GitButton disabled={!tagName.trim() || !!busy} onClick={() => void run("tag", () => gitMore.tag(repo, tagName.trim(), d.hash), `Tagged ${tagName.trim()}`).then(() => setTagName(""))}>
            <Tag size={11} /> tag
          </GitButton>
        </div>
      </div>
      <div className="py-1">
        <div className="px-4 py-1 term-heading">{d.files.length} files</div>
        {d.files.map((f) => (
          <button
            key={f.path}
            onClick={() => setFile(file === f.path ? null : f.path)}
            className={cn("flex h-7 w-full items-center gap-2 px-4 text-left text-[12px]", file === f.path ? "bg-surface text-fg" : "text-fg-2 hover:bg-surface/50")}
          >
            <span className={cn("w-3 font-mono text-[11px] font-semibold", statusTone[f.status] ?? "text-muted")}>{f.status}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-[11.5px]" title={f.path}>{f.path}</span>
            {f.additions !== null && <span className="font-mono text-[10.5px] text-success">+{f.additions}</span>}
            {f.deletions !== null && <span className="font-mono text-[10.5px] text-error">−{f.deletions}</span>}
          </button>
        ))}
      </div>
      {file && (
        <div className="border-t border-line-soft">
          {diff === null ? <div className="p-4"><Loader2 size={13} className="animate-spin text-faint" /></div> : <DiffView diff={diff} />}
        </div>
      )}
    </div>
  );
}
