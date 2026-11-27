import { ArrowDown, ArrowUp, ChevronRight, Folder, FolderOpen, GitBranch, GitMerge, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState, type ReactNode } from "react";
import { branchService, gitMore, type Branch } from "../../services/git";
import { useLayout } from "../../stores/layoutStore";
import { timeAgo } from "../../lib/time";
import { cn } from "../../lib/cn";
import { confirmChoices } from "../ui/ConfirmDialog";
import { GitButton, SyncBadges, TextInput } from "./ui";

type Act = <T>(label: string, fn: () => Promise<T>, ok?: string | ((r: T) => string)) => Promise<unknown>;

/** Groups "feature/x", "release/y"… by their prefix, like Sourcetree's branch folders. */
function groupByPrefix(branches: Branch[]) {
  const groups = new Map<string, Branch[]>();
  for (const b of branches) {
    const key = b.name.includes("/") ? b.name.split("/")[0]! : "";
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  // Loose branches (main, develop…) first, then release/hotfix (the urgent ones), then the rest A→Z.
  const rank = (k: string) => (k === "" ? 0 : k === "release" ? 1 : k === "hotfix" ? 2 : k === "bugfix" ? 3 : k === "feature" ? 4 : 5);
  return [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));
}

/** Local branches: one line each, sync badges, a direct pull/push, and actions on hover. */
export function BranchList({ repo, branches, current, busy, act }: { repo: string; branches: Branch[]; current: string | null; busy: boolean; act: Act }) {
  const [hot, setHot] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null);
  const collapsed = useLayout((s) => s.collapsedSections);
  const toggle = (key: string) => useLayout.setState((s) => ({ collapsedSections: { ...s.collapsedSections, [key]: !s.collapsedSections[key] } }));
  const groups = useMemo(() => groupByPrefix(branches), [branches]);

  const switchTo = (b: Branch) => !b.current && void act("switch", () => branchService.switch(repo, b.name), `Switched to ${b.name}`);
  const pull = (b: Branch) => void act("pull", () => gitMore.pullBranch(repo, b.name), `Pulled ${b.behind || ""} ${b.behind === 1 ? "commit" : b.behind ? "commits" : ""} into ${b.name}`.replace(/\s+/g, " "));
  const push = (b: Branch) => void act("push", () => gitMore.pushBranch(repo, b.name), b.upstream ? `Pushed ${b.ahead} commit${b.ahead === 1 ? "" : "s"} to ${b.upstream}` : `Published ${b.name} to origin`);
  // Merges the row's branch INTO the branch you're on, and says plainly what happened.
  const merge = (b: Branch) =>
    void act(
      "merge",
      () => gitMore.merge(repo, b.name, true),
      (out) => (/already up.to.date/i.test(String(out)) ? `Nothing to merge: ${current} already has everything from ${b.name}` : `Merged ${b.name} into ${current}`),
    );
  const remove = async (b: Branch) => {
    const opts = await confirmChoices({
      title: "Delete branch",
      message: `Delete the local branch ${b.name}?`,
      okLabel: "Delete",
      options: [
        { id: "force", label: "Force delete", hint: "Even if it has commits that aren't merged anywhere (they'll be lost)." },
        ...(b.upstream ? [{ id: "remote", label: `Also delete ${b.upstream}`, hint: "Removes the branch on the remote for everyone." }] : []),
      ],
    });
    if (!opts) return;
    void act(
      "delete",
      async () => {
        // Remote first: it needs the local branch's upstream setting.
        if (opts.remote) await gitMore.deleteRemoteBranch(repo, b.name);
        await gitMore.deleteBranch(repo, b.name, !!opts.force);
      },
      opts.remote ? `Deleted ${b.name} and ${b.upstream}` : `Deleted ${b.name}`,
    );
  };

  const row = (b: Branch, short: string): ReactNode => (
    <div
      key={b.name}
      onMouseEnter={() => setHot(b.name)}
      onFocus={() => setHot(b.name)}
      onDoubleClick={() => switchTo(b)}
      title={b.current ? undefined : "Double-click to switch"}
      className={cn("group flex h-9 items-center gap-2 pr-2", short === b.name ? "pl-3" : "pl-8", b.current && "bg-surface/50")}
    >
      <GitBranch size={13} className={cn("shrink-0", b.current ? "text-accent" : "text-faint")} />
      {renaming?.from === b.name ? (
        <TextInput
          autoFocus
          value={renaming.to}
          onChange={(to) => setRenaming({ from: b.name, to })}
          onCancel={() => setRenaming(null)}
          className="min-w-0 flex-1"
          onEnter={() => {
            const to = renaming.to.trim();
            setRenaming(null);
            if (to && to !== b.name) void act("rename", () => gitMore.renameBranch(repo, b.name, to), `Renamed to ${to}`);
          }}
        />
      ) : (
        <span className={cn("min-w-0 flex-1 truncate font-mono text-[12px]", b.current ? "font-semibold text-fg" : "text-fg-2")} title={b.name}>
          {short}
          {b.current && <span className="ml-2 rounded-sm bg-accent/15 px-1.5 py-px text-[9.5px] font-normal uppercase tracking-[0.08em] text-accent">current</span>}
        </span>
      )}
      {/* Hover actions open to the LEFT, so pull/push and the date never move. */}
      {hot === b.name && !renaming && (
        <span className="flex shrink-0 items-center gap-1">
          {b.upstream && b.behind === 0 && <GitButton disabled={busy} onClick={() => pull(b)}><ArrowDown size={11} /> pull</GitButton>}
          {!b.current && current && (
            <GitButton disabled={busy} title={`Merge ${b.name} into ${current}, the branch you're on`} onClick={() => merge(b)}>
              <GitMerge size={11} /> merge into {current.split("/").pop()}
            </GitButton>
          )}
          <GitButton disabled={busy} onClick={() => setRenaming({ from: b.name, to: b.name })}><Pencil size={11} /> rename</GitButton>
          {!b.current && <GitButton disabled={busy} onClick={() => void remove(b)}><Trash2 size={11} /> delete</GitButton>}
        </span>
      )}
      {/* The pull/push buttons carry the counts; only "gone" needs its own badge. */}
      {b.gone && <SyncBadges ahead={0} behind={0} gone />}
      {b.behind > 0 && (
        <button disabled={busy} onClick={() => pull(b)} title={`Pull ${b.behind} commit${b.behind === 1 ? "" : "s"} into ${b.name}`} className="flex h-6 shrink-0 items-center gap-1.5 rounded-md bg-fg px-2.5 font-mono text-[11px] font-medium text-bg shadow-sm transition hover:bg-fg/85 disabled:opacity-40">
          <ArrowDown size={11} strokeWidth={2.5} /> pull {b.behind}
        </button>
      )}
      {(b.ahead > 0 || (!b.upstream && hot === b.name)) && (
        <button disabled={busy} onClick={() => push(b)} className="flex h-6 shrink-0 items-center gap-1.5 rounded-md bg-fg px-2.5 font-mono text-[11px] font-medium text-bg shadow-sm transition hover:bg-fg/85 disabled:opacity-40">
          <ArrowUp size={11} strokeWidth={2.5} /> {b.upstream ? `push ${b.ahead}` : "publish"}
        </button>
      )}
      <span className="w-16 shrink-0 text-right font-mono text-[10.5px] text-faint">{timeAgo(b.updatedAt)}</span>
    </div>
  );

  return (
    <div onMouseLeave={() => setHot(null)} className="overflow-hidden rounded-lg border border-line-soft">
      {groups.map(([prefix, list]) => {
        if (!prefix) return <div key="_" className="divide-y divide-line-soft">{list.map((b) => row(b, b.name))}</div>;
        const key = `git-branches-${prefix}`;
        const isCollapsed = collapsed[key] ?? false;
        const behind = list.reduce((n, b) => n + b.behind, 0);
        const ahead = list.reduce((n, b) => n + b.ahead, 0);
        const hasCurrent = list.some((b) => b.current);
        return (
          <div key={prefix} className="border-t border-line-soft first:border-t-0">
            <button onClick={() => toggle(key)} className="flex h-9 w-full items-center gap-2 bg-surface/70 px-3 text-left hover:bg-surface">
              <motion.span animate={{ rotate: isCollapsed ? 0 : 90 }} transition={{ duration: 0.15 }} className="flex text-faint">
                <ChevronRight size={11} />
              </motion.span>
              {isCollapsed ? <Folder size={14} className="text-accent/80" /> : <FolderOpen size={14} className="text-accent/80" />}
              <span className={cn("font-mono text-[12px] font-semibold", hasCurrent ? "text-fg" : "text-fg-2")}>{prefix}</span>
              <span className="rounded-full bg-bg px-1.5 font-mono text-[10px] text-muted">{list.length}</span>
              {isCollapsed && <SyncBadges ahead={ahead} behind={behind} />}
            </button>
            {!isCollapsed && <div className="divide-y divide-line-soft border-t border-line-soft">{list.map((b) => row(b, b.name.slice(prefix.length + 1)))}</div>}
          </div>
        );
      })}
    </div>
  );
}
