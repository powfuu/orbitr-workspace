import { GitBranch } from "lucide-react";
import { useGit } from "../../features/git/gitStore";

/** Compact branch + change count for a project row. */
export function GitBadge({ path }: { path: string }) {
  const s = useGit((g) => g.byPath[path]);
  if (!s) return null;
  const changes = s.files.length;
  return (
    <span className="flex items-center gap-1 font-mono text-[10px] text-faint" title={`${s.branch ?? "detached"} · ${changes} changed`}>
      <GitBranch size={10} />
      <span className="max-w-20 truncate">{s.branch ?? "detached"}</span>
      {changes > 0 && <span className="rounded bg-warning/15 px-1 text-warning">{changes}</span>}
    </span>
  );
}
