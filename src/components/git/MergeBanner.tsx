import { AlertTriangle, FileCode2, GitMerge } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { gitMore, type FileChange } from "../../services/git";
import { useGit } from "../../features/git/gitStore";
import { useGitRun } from "../../features/git/gitRun";
import { openInEditor, projectIdForPath } from "../../features/editors/openInEditor";
import { confirmDialog } from "../ui/ConfirmDialog";
import { toast } from "../../stores/toastStore";
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

  // While conflicts remain, notice files you fixed in an editor (no markers left) and mark
  // them resolved automatically, so the list updates live.
  const pending = conflicted.length > 0;
  useEffect(() => {
    if (!pending) return;
    const tick = () =>
      void invoke<string[]>("git_stage_resolved", { repo })
        .then((done) => {
          if (done.length) {
            toast({ kind: "success", title: `Resolved ${done.map((f) => f.split("/").pop()).join(", ")}` });
            void useGit.getState().refresh(repo);
          }
        })
        .catch(() => undefined);
    tick();
    const t = window.setInterval(tick, 2000);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", tick);
    };
  }, [repo, pending]);

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
          {done ? "All conflicts resolved — commit below to finish the merge" : `${conflicted.length} merge conflict${conflicted.length === 1 ? "" : "s"}`}
        </span>
        {merge && <span className="min-w-0 truncate font-mono text-[11.5px] text-fg-2">{merge.message}</span>}
        <span className="ml-auto flex gap-1.5">
          <GitButton danger disabled={!!busy} onClick={() => void abort()}>abort merge</GitButton>
        </span>
      </div>
      {conflicted.length > 0 && (
        <>
          <div className="mt-2.5 divide-y divide-error/20 rounded-lg border border-error/30 bg-bg/60">
            {conflicted.map((f: FileChange) => (
              <div key={f.path} className="flex flex-wrap items-center gap-2 px-3 py-1.5">
                <AlertTriangle size={12} className="shrink-0 text-error" />
                <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-fg" title={f.path}>{f.path}</span>
                <GitButton primary onClick={() => void openInEditor({ projectId, file: f.path })}><FileCode2 size={11} /> open in Vim</GitButton>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
