import { ArrowDown, ArrowUp, Check, GitBranch, TriangleAlert } from "lucide-react";
import type { GitStatus } from "../../services/git";
import { useGit } from "../../features/git/gitStore";
import { useTabs } from "../../stores/tabStore";
import { timeAgo } from "../../lib/time";
import { cn } from "../../lib/cn";
import type { Project } from "../../types";

/** Counts by kind of change, for the at-a-glance summary. */
function summarize(s: GitStatus) {
  const f = s.files;
  return {
    staged: f.filter((x) => x.staged).length,
    modified: f.filter((x) => x.unstaged && !x.untracked && !x.conflicted).length,
    untracked: f.filter((x) => x.untracked).length,
    conflicts: f.filter((x) => x.conflicted).length,
  };
}

/** Opens the project and scrolls to its Git panel. */
function openGit(projectId: string) {
  useTabs.getState().open({ type: "project", id: projectId });
  window.setTimeout(() => document.getElementById(`git-${projectId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 180);
}

function Card({ project }: { project: Project }) {
  const s = useGit((g) => g.byPath[project.path]);
  if (s === null) return null; // not a git repo
  const c = s ? summarize(s) : null;
  const clean = s && s.files.length === 0;
  const chips = c
    ? ([
        ["staged", c.staged, "text-success"],
        ["modified", c.modified, "text-warning"],
        ["new", c.untracked, "text-fg-2"],
        ["conflicts", c.conflicts, "text-error"],
      ] as const).filter(([, n]) => n > 0)
    : [];

  return (
    <button
      onClick={() => openGit(project.id)}
      className={cn(
        "w-full rounded-lg px-2.5 py-2 text-left ring-1 ring-line-soft transition-colors hover:bg-surface/60 hover:ring-line",
        !!c?.conflicts && "ring-error/40",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-fg">{project.name}</span>
        {s && s.ahead > 0 && <span className="flex shrink-0 items-center font-mono text-[10.5px] text-fg-2" title={`${s.ahead} to push`}><ArrowUp size={10} />{s.ahead}</span>}
        {s && s.behind > 0 && <span className="flex shrink-0 items-center font-mono text-[10.5px] text-warning" title={`${s.behind} to pull`}><ArrowDown size={10} />{s.behind}</span>}
      </div>
      <div className="mt-0.5 flex min-w-0 items-center gap-1 font-mono text-[10.5px] text-muted" title={s?.branch ?? undefined}>
        <GitBranch size={10} className="shrink-0" />
        <span className="truncate">{s ? (s.branch ?? "detached HEAD") : "…"}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10.5px]">
        {!s && <span className="text-faint">Reading…</span>}
        {clean && <span className="flex items-center gap-1 text-success"><Check size={10} />Clean</span>}
        {chips.map(([label, n, tone]) => (
          <span key={label} className={cn("flex items-center gap-1", tone)}>
            {label === "conflicts" && <TriangleAlert size={10} />}
            <span className="font-mono font-medium">{n}</span> {label}
          </span>
        ))}
        {s?.lastCommit && <span className="ml-auto truncate text-faint" title={s.lastCommit.subject}>{timeAgo(s.lastCommit.time)}</span>}
      </div>
    </button>
  );
}

/** Sidebar section: git state of every project in the workspace. */
export function GitOverview({ projects }: { projects: Project[] }) {
  return (
    <div className="space-y-1.5 px-1">
      {projects.map((p) => (
        <Card key={p.id} project={p} />
      ))}
    </div>
  );
}
