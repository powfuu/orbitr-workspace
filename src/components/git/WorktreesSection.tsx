import { FolderGit2, SquareTerminal, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { confirmDialog } from "../ui/ConfirmDialog";
import { branchService, type Worktree } from "../../services/git";
import { useSessions } from "../../stores/sessionStore";
import { toast } from "../../stores/toastStore";
import { newDefaultTerminal } from "../../features/terminals/newDefaultTerminal";
import { removeAgent } from "../../features/agents/agentActions";
import { AGENTS } from "../../features/agents/registry";
import { tildify } from "../../lib/platform";
import { usePlatformInfo } from "../../hooks/usePlatformInfo";
import { AgentGlyph } from "../ui/AgentGlyph";
import { IconButton } from "../ui/IconButton";

/** Linked worktrees of the repo, with the agents running in each. */
export function WorktreesSection({ repo }: { repo: string }) {
  const [list, setList] = useState<Worktree[]>([]);
  const agents = useSessions((s) => s.agents);
  const home = usePlatformInfo()?.homeDir ?? undefined;

  const load = useCallback(() => void branchService.worktrees(repo).then(setList).catch(() => setList([])), [repo]);
  useEffect(() => {
    load();
    const t = window.setInterval(load, 5000);
    return () => window.clearInterval(t);
  }, [load, agents.length]);

  const extra = list.filter((w) => !w.main);
  if (extra.length === 0) return null;

  const remove = async (w: Worktree) => {
    const inside = agents.filter((a) => a.cwd === w.path);
    const msg = `Remove worktree ${w.branch ?? w.head}? Its folder is deleted; the branch is kept.` + (inside.length ? ` ${inside.length} agent(s) running there will be stopped.` : "");
    if (!(await confirmDialog({ title: "Remove worktree", message: msg, okLabel: "Remove" }))) return;
    await Promise.all(inside.map((a) => removeAgent(a.id)));
    try {
      await branchService.removeWorktree(repo, w.path, false);
    } catch (e) {
      const force = await confirmDialog({ title: "Worktree has changes", message: `${String(e)}\n\nForce removal and discard uncommitted changes?`, okLabel: "Discard & remove" });
      if (!force) return;
      await branchService.removeWorktree(repo, w.path, true).catch((err) => toast({ kind: "error", title: "Couldn't remove worktree", detail: String(err) }));
    }
    load();
  };

  return (
    <div className="border-t border-line-soft py-2">
      <div className="px-4 pb-1 term-heading">Worktrees · {extra.length}</div>
      {extra.map((w) => {
        const inside = agents.filter((a) => a.cwd === w.path);
        return (
          <div key={w.path} className="group flex h-8 items-center gap-2.5 px-4 text-[12px]">
            <FolderGit2 size={13} className="shrink-0 text-muted" />
            <span className="font-mono text-fg">{w.branch ?? `(${w.head})`}</span>
            <span className="selectable min-w-0 flex-1 truncate font-mono text-[10.5px] text-faint">{tildify(w.path, home)}</span>
            <span className="flex gap-1">{inside.map((a) => <AgentGlyph key={a.id} agent={AGENTS[a.kind]} size={16} status={a.status} />)}</span>
            <span className="flex opacity-0 group-hover:opacity-100">
              <IconButton icon={SquareTerminal} size="sm" label="Open terminal here" onClick={() => void newDefaultTerminal(w.path, w.branch ?? undefined)} />
              <IconButton icon={Trash2} size="sm" label="Remove worktree" onClick={() => void remove(w)} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
