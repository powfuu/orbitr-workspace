import { Archive } from "lucide-react";
import { useEffect, useState } from "react";
import { gitMore, type Stash } from "../../services/git";
import { useGitRun } from "../../features/git/gitRun";
import { useGit } from "../../features/git/gitStore";
import { timeAgo } from "../../lib/time";
import { GitButton, TextInput } from "./ui";

/** Save work in progress aside and bring it back. */
export function StashView({ repo }: { repo: string }) {
  const fingerprint = useGit((g) => g.byPath[repo]?.files.length ?? 0);
  const dirty = fingerprint > 0;
  const [list, setList] = useState<Stash[]>([]);
  const [message, setMessage] = useState("");
  const [untracked, setUntracked] = useState(true);
  const { busy, run } = useGitRun(repo);
  const reload = () => void gitMore.stashList(repo).then(setList).catch(() => setList([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [repo, fingerprint]);
  const act = (label: string, fn: () => Promise<unknown>, ok: string) => run(label, fn, ok).then(reload);
  const push = () => void act("stash", () => gitMore.stashPush(repo, message, untracked), "Stashed").then(() => setMessage(""));

  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <div className="mb-2 term-heading">Stash changes</div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <TextInput value={message} onChange={setMessage} onEnter={push} placeholder="message (optional)" className="w-72" />
        <label className="flex items-center gap-1.5 text-[11.5px] text-fg-2">
          <input type="checkbox" checked={untracked} onChange={(e) => setUntracked(e.target.checked)} className="accent-fg" /> include new files
        </label>
        <GitButton primary disabled={!dirty || !!busy} onClick={push}><Archive size={11} /> stash</GitButton>
        {!dirty && <span className="text-[11px] text-faint">Nothing to stash.</span>}
      </div>
      <div className="mb-2 term-heading">Stashes {list.length > 0 && <span className="font-mono normal-case tracking-normal">{list.length}</span>}</div>
      {list.length === 0 ? (
        <div className="text-[12px] text-muted">No stashes.</div>
      ) : (
        <div className="divide-y divide-line-soft rounded-lg border border-line-soft">
          {list.map((s) => (
            <div key={s.index} className="group flex min-h-9 flex-wrap items-center gap-2 px-3 py-1.5">
              <span className="font-mono text-[10.5px] text-faint">{`stash@{${s.index}}`}</span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-fg-2" title={s.message}>{s.message}</span>
              <span className="font-mono text-[10.5px] text-faint">{timeAgo(s.time)}</span>
              <span className="flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                <GitButton disabled={!!busy} onClick={() => void act("stash pop", () => gitMore.stashOp(repo, "pop", s.index), "Popped stash")}>pop</GitButton>
                <GitButton disabled={!!busy} onClick={() => void act("stash apply", () => gitMore.stashOp(repo, "apply", s.index), "Applied stash")}>apply</GitButton>
                <GitButton danger disabled={!!busy} onClick={() => void act("stash drop", () => gitMore.stashOp(repo, "drop", s.index), "Dropped stash")}>drop</GitButton>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
