import { Check, CloudDownload, GitBranch, GitMerge, Pencil, Workflow } from "lucide-react";
import { useEffect, useState } from "react";
import { branchService, gitMore, type Branch, type FlowConfig, type FlowKind } from "../../services/git";
import { useGitRun } from "../../features/git/gitRun";
import { useGit } from "../../features/git/gitStore";
import { timeAgo } from "../../lib/time";
import { cn } from "../../lib/cn";
import { Select } from "../ui/Select";
import { GitButton, SyncBadges, TextInput } from "./ui";
import { RemotesSection } from "./RemotesSection";

const FLOW: { kind: FlowKind; from: "develop" | "main"; hint: string }[] = [
  { kind: "feature", from: "develop", hint: "New work" },
  { kind: "bugfix", from: "develop", hint: "Fix on develop" },
  { kind: "release", from: "develop", hint: "Prepare a version" },
  { kind: "hotfix", from: "main", hint: "Urgent fix on production" },
];

/** Local + remote branches with switch/merge/rename/delete, new branch from any base, and git flow. */
export function BranchesView({ repo }: { repo: string }) {
  const status = useGit((g) => g.byPath[repo]);
  const current = status?.branch ?? null;
  const [local, setLocal] = useState<Branch[]>([]);
  const [remote, setRemote] = useState<string[]>([]);
  const [flow, setFlow] = useState<FlowConfig | null>(null);
  const [name, setName] = useState("");
  const [base, setBase] = useState("");
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null);
  const [q, setQ] = useState("");
  const { busy, run } = useGitRun(repo);
  // One row's actions at a time: CSS :hover can stick on several rows in WebKit after scrolling.
  const [hot, setHot] = useState<string | null>(null);

  const reload = () => {
    void branchService.list(repo).then(setLocal).catch(() => setLocal([]));
    void gitMore.remoteBranches(repo).then(setRemote).catch(() => setRemote([]));
    void gitMore.flowConfig(repo).then(setFlow).catch(() => setFlow(null));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [repo, current, status?.lastCommit?.hash]);
  // Like Sourcetree: fetch quietly when opened so ↑/↓ counts are current (never prompts).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void gitMore.fetch(repo).then(reload, () => undefined), [repo]);
  const act = <T,>(label: string, fn: () => Promise<T>, ok?: string | ((r: T) => string)) => run(label, fn, ok).then(reload);

  const needle = q.trim().toLowerCase();
  const localShown = local.filter((b) => b.name.toLowerCase().includes(needle));
  const localNames = new Set(local.map((b) => b.name));
  const remoteShown = remote.filter((r) => r.toLowerCase().includes(needle) && !localNames.has(r.split("/").slice(1).join("/")));
  const create = () => name.trim() && void act("create branch", () => gitMore.createBranch(repo, name.trim(), base || null, true), `Created ${name.trim()}`).then(() => setName(""));

  return (
    <div className="h-full overflow-y-auto">
      {/* New branch */}
      <section className="border-b border-line-soft px-4 py-3">
        <div className="mb-2 term-heading">New branch</div>
        <div className="flex flex-wrap items-center gap-2">
          <TextInput value={name} onChange={setName} onEnter={create} placeholder="feature/my-change" className="w-60" />
          <span className="text-[11px] text-faint">from</span>
          <Select
            ariaLabel="Base branch"
            className="w-52 font-mono"
            value={base}
            onChange={setBase}
            options={[{ value: "", label: `${current ?? "HEAD"} (current)` }, ...local.filter((b) => !b.current).map((b) => ({ value: b.name, label: b.name, group: "Local" })), ...remote.map((r) => ({ value: r, label: r, group: "Remote" }))]}
          />
          <GitButton primary disabled={!name.trim() || !!busy} onClick={create}>create & switch</GitButton>
        </div>
      </section>

      {/* Git flow */}
      <section className="border-b border-line-soft px-4 py-3">
        <div className="mb-2 flex items-center gap-2 term-heading">
          <Workflow size={11} /> git flow
          {flow && <span className="font-mono normal-case tracking-normal text-faint">main: {flow.main} · develop: {flow.develop ?? "— (created on first start)"}</span>}
        </div>
        <FlowStart repo={repo} busy={!!busy} onStart={(kind, n) => act(`start ${kind}`, () => gitMore.flowStart(repo, kind, n), (b) => `Started ${b}`)} flow={flow} />
        {current && /^(feature|bugfix|release|hotfix)\//.test(current) && (
          <FlowFinish branch={current} busy={!!busy} flow={flow} onFinish={(tag) => act("finish", () => gitMore.flowFinish(repo, current, tag), (into) => `Finished ${current} → ${into}`)} />
        )}
      </section>

      <RemotesSection repo={repo} />

      {/* Branch lists */}
      <section className="px-4 py-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="term-heading">Branches</span>
          <TextInput value={q} onChange={setQ} placeholder="filter" className="ml-auto w-40" />
          <GitButton disabled={!!busy} onClick={() => void act("fetch", () => gitMore.fetch(repo), "Fetched all remotes")}>
            <CloudDownload size={11} /> fetch
          </GitButton>
        </div>
        <div onMouseLeave={() => setHot(null)} className="divide-y divide-line-soft rounded-lg border border-line-soft">
          {localShown.map((b) => (
            <div key={b.name} onMouseEnter={() => setHot(b.name)} onFocus={() => setHot(b.name)} className="group flex min-h-9 flex-wrap items-center gap-2 px-3 py-1.5">
              <Check size={12} className={cn("shrink-0 text-accent", !b.current && "invisible")} />
              {renaming?.from === b.name ? (
                <TextInput autoFocus value={renaming.to} onChange={(to) => setRenaming({ from: b.name, to })} onCancel={() => setRenaming(null)} className="w-56"
                  onEnter={() => {
                    const to = renaming.to.trim();
                    setRenaming(null);
                    if (to && to !== b.name) void act("rename", () => gitMore.renameBranch(repo, b.name, to), `Renamed to ${to}`);
                  }} />
              ) : (
                <span className={cn("min-w-[8rem] flex-1 truncate font-mono text-[12px]", b.current ? "text-fg" : "text-fg-2")} title={b.name}>{b.name}</span>
              )}
              <SyncBadges ahead={b.ahead} behind={b.behind} gone={b.gone} />
              {b.upstream && b.upstream !== `origin/${b.name}` && <span className="max-w-[35%] truncate font-mono text-[10.5px] text-faint" title={b.upstream}>→ {b.upstream}</span>}
              <span className="font-mono text-[10.5px] text-faint">{timeAgo(b.updatedAt)}</span>
              <span className={cn("flex gap-1", hot !== b.name && "invisible")}>
                {!b.current && <GitButton disabled={!!busy} onClick={() => void act("switch", () => branchService.switch(repo, b.name), `Switched to ${b.name}`)}><GitBranch size={11} /> switch</GitButton>}
                {!b.current && current && <GitButton disabled={!!busy} title={`Merge ${b.name} into ${current}`} onClick={() => void act("merge", () => gitMore.merge(repo, b.name, true), `Merged ${b.name} into ${current}`)}><GitMerge size={11} /> merge into {current}</GitButton>}
                <GitButton disabled={!!busy} onClick={() => setRenaming({ from: b.name, to: b.name })}><Pencil size={11} /></GitButton>
                {!b.current && <GitButton danger disabled={!!busy} onClick={() => void act("delete", () => gitMore.deleteBranch(repo, b.name, false), `Deleted ${b.name}`)}>delete</GitButton>}
              </span>
            </div>
          ))}
          {remoteShown.length > 0 && <div className="bg-bg px-3 py-1 term-heading">remote</div>}
          {remoteShown.map((r) => (
            <div key={r} onMouseEnter={() => setHot(r)} onFocus={() => setHot(r)} className="group flex min-h-8 items-center gap-2 px-3 py-1">
              <span className="w-3" />
              <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted">{r}</span>
              <span className={hot === r ? "" : "invisible"}>
                <GitButton disabled={!!busy} onClick={() => void act("checkout", () => gitMore.checkoutRemote(repo, r), (b) => `Switched to ${b}`)}>checkout</GitButton>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FlowStart({ busy, onStart, flow }: { repo: string; busy: boolean; onStart: (kind: FlowKind, name: string) => Promise<unknown>; flow: FlowConfig | null }) {
  const [kind, setKind] = useState<FlowKind>("feature");
  const [name, setName] = useState("");
  const def = FLOW.find((f) => f.kind === kind)!;
  const from = def.from === "main" ? flow?.main ?? "main" : flow?.develop ?? "develop";
  const start = () => name.trim() && void onStart(kind, name.trim()).then(() => setName(""));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-md bg-bg p-0.5 ring-1 ring-line-soft">
        {FLOW.map((f) => (
          <button key={f.kind} title={f.hint} onClick={() => setKind(f.kind)} className={cn("h-6 rounded px-2 font-mono text-[11px]", kind === f.kind ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")}>
            {f.kind}
          </button>
        ))}
      </div>
      <span className="font-mono text-[12px] text-faint">{kind}/</span>
      <TextInput value={name} onChange={setName} onEnter={start} placeholder={kind === "release" || kind === "hotfix" ? "1.4.0" : "UAAPT-1234-name"} className="w-52" />
      <span className="text-[11px] text-faint">from {from}</span>
      <GitButton primary disabled={!name.trim() || busy} onClick={start}>start</GitButton>
    </div>
  );
}

function FlowFinish({ branch, busy, flow, onFinish }: { branch: string; busy: boolean; flow: FlowConfig | null; onFinish: (tag: boolean) => Promise<unknown> }) {
  const kind = branch.split("/")[0];
  const versioned = kind === "release" || kind === "hotfix";
  const [tag, setTag] = useState(true);
  const develop = flow?.develop ?? "develop";
  const into = versioned ? `${flow?.main ?? "main"} + ${develop}` : develop;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-surface/60 px-3 py-2 text-[12px]">
      <span className="text-fg-2">You're on <span className="font-mono text-fg">{branch}</span>.</span>
      <span className="text-faint">Finish merges it (--no-ff) into {into} and deletes it.</span>
      {versioned && (
        <label className="flex items-center gap-1.5 text-[11.5px] text-fg-2">
          <input type="checkbox" checked={tag} onChange={(e) => setTag(e.target.checked)} className="accent-fg" /> tag {branch.split("/").slice(1).join("/")}
        </label>
      )}
      <span className="ml-auto"><GitButton primary disabled={busy} onClick={() => void onFinish(versioned && tag)}>finish {kind}</GitButton></span>
    </div>
  );
}
