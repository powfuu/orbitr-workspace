import { AlertTriangle, Check, Columns2, FileCode2, GitMerge } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { gitMore, gitService, type FileChange } from "../../services/git";
import { useGit } from "../../features/git/gitStore";
import { useGitRun } from "../../features/git/gitRun";
import { openInEditor, openVimDiff, projectIdForPath } from "../../features/editors/openInEditor";
import { confirmDialog } from "../ui/ConfirmDialog";
import { cn } from "../../lib/cn";
import { GitButton } from "./ui";

/**
 * Shown while a merge is in progress: what's being merged, every conflicted file with ways to
 * resolve it, and the two ways out (finish once all are resolved, or abort).
 */
export function MergeBanner({ repo }: { repo: string }) {
  const files = useGit((g) => g.byPath[repo]?.files ?? []);
  const conflicted = files.filter((f) => f.conflicted);
  const fingerprint = files.map((f) => f.path + f.index + f.worktree).join("|");
  const [merge, setMerge] = useState<{ message: string } | null>(null);
  const { busy, run } = useGitRun(repo);

  useEffect(() => {
    void invoke<{ message: string } | null>("git_merge_state", { repo }).then(setMerge).catch(() => setMerge(null));
  }, [repo, fingerprint]);

  if (!merge && conflicted.length === 0) return null;
  const done = conflicted.length === 0;
  const projectId = projectIdForPath(repo);

  const abort = async () => {
    const ok = await confirmDialog({ title: "Abort merge", message: "Throw away this merge and go back to how the branch was before it? Conflict resolutions you made are lost.", okLabel: "Abort merge" });
    if (ok) void run("abort merge", () => gitMore.mergeAbort(repo), "Merge aborted");
  };

  return (
    <div className={cn("border-b px-4 py-3", done ? "border-success/30 bg-success/[0.06]" : "border-error/40 bg-error/[0.08]")}>
      <div className="flex flex-wrap items-center gap-2">
        {done ? <GitMerge size={15} className="text-success" /> : <AlertTriangle size={15} className="text-error" />}
        <span className={cn("font-mono text-[12.5px] font-semibold", done ? "text-success" : "text-error")}>
          {done ? "Conflicts resolved — finish the merge" : `${conflicted.length} merge conflict${conflicted.length === 1 ? "" : "s"}`}
        </span>
        {merge && <span className="min-w-0 truncate font-mono text-[11.5px] text-fg-2">{merge.message}</span>}
        <span className="ml-auto flex gap-1.5">
          <GitButton danger disabled={!!busy} onClick={() => void abort()}>abort merge</GitButton>
          <GitButton primary disabled={!!busy || !done} title={done ? "Commit the merge" : "Resolve every conflict first"} onClick={() => void run("finish merge", () => invoke("git_merge_continue", { repo }), "Merge finished")}>
            <Check size={11} /> finish merge
          </GitButton>
        </span>
      </div>
      {conflicted.length > 0 && (
        <>
          <p className="mt-1.5 text-[11.5px] text-muted">
            These files changed in both branches. Open each one, keep what you want between the <span className="font-mono">{"<<<<<<<"}</span> / <span className="font-mono">{">>>>>>>"}</span> markers, then mark it resolved.
          </p>
          <div className="mt-2 divide-y divide-error/20 rounded-lg border border-error/30 bg-bg/60">
            {conflicted.map((f: FileChange) => (
              <div key={f.path} className="flex flex-wrap items-center gap-2 px-3 py-1.5">
                <AlertTriangle size={12} className="shrink-0 text-error" />
                <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-fg" title={f.path}>{f.path}</span>
                <span className="flex gap-1">
                  <GitButton onClick={() => void openInEditor({ projectId, file: f.path })}><FileCode2 size={11} /> open in Vim</GitButton>
                  {projectId && <GitButton onClick={() => void openVimDiff(projectId, f.path, false)}><Columns2 size={11} /> vimdiff</GitButton>}
                  <GitButton primary disabled={!!busy} onClick={() => void run("mark resolved", () => gitService.stage(repo, [f.path]), `${f.path.split("/").pop()} resolved`)}>
                    <Check size={11} /> mark resolved
                  </GitButton>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
