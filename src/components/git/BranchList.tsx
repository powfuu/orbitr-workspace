import { ArrowDown, ArrowUp, Check, ChevronRight, GitBranch, GitMerge, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState, type ReactNode } from "react";
import { branchService, gitMore, type Branch } from "../../services/git";
import { useLayout } from "../../stores/layoutStore";
import { timeAgo } from "../../lib/time";
import { cn } from "../../lib/cn";
import { IconButton } from "../ui/IconButton";
import { confirmDialog } from "../ui/ConfirmDialog";
import { SyncBadges, TextInput } from "./ui";

type Act = <T>(label: string, fn: () => Promise<T>, ok?: string | ((r: T) => string)) => Promise<unknown>;

/** Groups "feature/x", "release/y"… by their prefix, like Sourcetree's branch folders. */
function groupByPrefix(branches: Branch[]) {
  const groups = new Map<string, Branch[]>();
  for (const b of branches) {
    const key = b.name.includes("/") ? b.name.split("/")[0]! : "";
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  // Loose branches (main, develop…) first, then folders A→Z.
  return [...groups.entries()].sort(([a], [b]) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)));
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
  const remove = async (b: Branch) => {
    const ok = await confirmDialog({ title: "Delete branch", message: `Delete the local branch ${b.name}? Its remote branch (if any) is kept.`, okLabel: "Delete" });
    if (ok) void act("delete", () => gitMore.deleteBranch(repo, b.name, false), `Deleted ${b.name}`);
  };

  const row = (b: Branch, short: string): ReactNode => (
    <div
      key={b.name}
      onMouseEnter={() => setHot(b.name)}
      onFocus={() => setHot(b.name)}
      onDoubleClick={() => switchTo(b)}
      title={b.current ? undefined : "Double-click to switch"}
      className={cn("group flex h-9 items-center gap-2 pl-3 pr-2", b.current && "bg-surface/50")}
    >
      <Check size={12} className={cn("shrink-0 text-accent", !b.current && "invisible")} />
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
        <span className={cn("min-w-0 flex-1 truncate font-mono text-[12px]", b.current ? "text-fg" : "text-fg-2")} title={b.name}>
          {short}
        </span>
      )}
      <SyncBadges ahead={b.ahead} behind={b.behind} gone={b.gone} />
      {/* Direct pull/push, always visible when there's something to sync. */}
      {b.behind > 0 && (
        <button disabled={busy} onClick={() => pull(b)} className="flex h-6 shrink-0 items-center gap-1 rounded-md bg-warning/15 px-2 font-mono text-[11px] text-warning hover:bg-warning/25 disabled:opacity-40">
          <ArrowDown size={11} /> pull
        </button>
      )}
      {(b.ahead > 0 || (!b.upstream && hot === b.name)) && (
        <button disabled={busy} onClick={() => push(b)} className="flex h-6 shrink-0 items-center gap-1 rounded-md bg-fg/10 px-2 font-mono text-[11px] text-fg hover:bg-fg/20 disabled:opacity-40">
          <ArrowUp size={11} /> {b.upstream ? "push" : "publish"}
        </button>
      )}
      {hot === b.name && !renaming ? (
        <span className="flex shrink-0 items-center">
          {b.upstream && b.behind === 0 && <IconButton icon={ArrowDown} size="sm" label={`Pull ${b.name}`} onClick={() => pull(b)} disabled={busy} />}
          {!b.current && <IconButton icon={GitBranch} size="sm" label={`Switch to ${b.name}`} onClick={() => switchTo(b)} disabled={busy} />}
          {!b.current && current && (
            <IconButton icon={GitMerge} size="sm" label={`Merge ${b.name} into ${current}`} onClick={() => void act("merge", () => gitMore.merge(repo, b.name, true), `Merged ${b.name} into ${current}`)} disabled={busy} />
          )}
          <IconButton icon={Pencil} size="sm" label="Rename" onClick={() => setRenaming({ from: b.name, to: b.name })} disabled={busy} />
          {!b.current && <IconButton icon={Trash2} size="sm" label="Delete branch" onClick={() => void remove(b)} disabled={busy} />}
        </span>
      ) : (
        <span className="w-16 shrink-0 text-right font-mono text-[10.5px] text-faint">{timeAgo(b.updatedAt)}</span>
      )}
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
            <button onClick={() => toggle(key)} className="flex h-8 w-full items-center gap-2 bg-bg/60 px-3 text-left hover:bg-surface/40">
              <motion.span animate={{ rotate: isCollapsed ? 0 : 90 }} transition={{ duration: 0.15 }} className="flex text-faint">
                <ChevronRight size={11} />
              </motion.span>
              <span className={cn("font-mono text-[11.5px]", hasCurrent ? "text-fg" : "text-muted")}>{prefix}/</span>
              <span className="font-mono text-[10.5px] text-faint">{list.length}</span>
              {isCollapsed && <SyncBadges ahead={ahead} behind={behind} />}
            </button>
            {!isCollapsed && <div className="divide-y divide-line-soft border-t border-line-soft">{list.map((b) => row(b, b.name.slice(prefix.length + 1)))}</div>}
          </div>
        );
      })}
    </div>
  );
}
