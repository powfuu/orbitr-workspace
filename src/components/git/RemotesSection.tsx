import { Globe, KeyRound, Pencil, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { remoteService, type Remote } from "../../services/git";
import { useGitRun } from "../../features/git/gitRun";
import { askCredentials } from "./CredentialsDialog";
import { GitButton, TextInput } from "./ui";

/** View and edit remotes (e.g. point origin elsewhere), and save credentials for HTTPS ones. */
export function RemotesSection({ repo }: { repo: string }) {
  const [list, setList] = useState<Remote[]>([]);
  const [editing, setEditing] = useState<{ name: string; url: string } | null>(null);
  const [adding, setAdding] = useState<{ name: string; url: string } | null>(null);
  /** Remote name → can already authenticate (checked quietly, no prompts). */
  const [signedIn, setSignedIn] = useState<Record<string, boolean>>({});
  const { busy, run } = useGitRun(repo);
  const reload = () =>
    void remoteService
      .list(repo)
      .then((l) => {
        setList(l);
        for (const r of l.filter((x) => /^https?:\/\//.test(x.url))) {
          void invoke<boolean>("git_remote_signed_in", { repo, name: r.name }).then((ok) => setSignedIn((m) => ({ ...m, [r.name]: ok })));
        }
      })
      .catch(() => setList([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [repo]);
  const act = (label: string, fn: () => Promise<unknown>, ok: string) => run(label, fn, ok).then(reload);

  const signIn = async (r: Remote) => {
    const authority = r.url.replace(/^https?:\/\//, "").split("/")[0] ?? "";
    const host = authority.split("@").pop() ?? authority;
    const creds = await askCredentials(host, authority.includes("@") ? authority.split("@")[0]!.split(":")[0]! : "");
    if (creds === "browser") void act("browser sign-in", () => invoke("git_browser_login", { repo, remote: r.name }), `Signed in to ${host}`);
    else if (creds && creds !== "installing") void act("save credentials", () => remoteService.storeCredential(repo, r.url, creds.username, creds.password), `Credentials saved for ${host}`);
  };

  return (
    <section className="border-b border-line-soft px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex items-center gap-1.5 term-heading"><Globe size={11} /> remotes</span>
        <span className="ml-auto">
          <GitButton disabled={!!busy} onClick={() => setAdding({ name: "", url: "" })}><Plus size={11} /> add remote</GitButton>
        </span>
      </div>
      <div className="divide-y divide-line-soft rounded-lg border border-line-soft">
        {list.length === 0 && !adding && <div className="px-3 py-2 text-[12px] text-muted">No remotes.</div>}
        {list.map((r) => (
          <div key={r.name} className="group flex min-h-9 flex-wrap items-center gap-2 px-3 py-1.5">
            <span className="w-16 shrink-0 font-mono text-[12px] text-fg">{r.name}</span>
            {editing?.name === r.name ? (
              <>
                <TextInput autoFocus value={editing.url} onChange={(url) => setEditing({ name: r.name, url })} className="min-w-[16rem] flex-1"
                  onEnter={() => void act("set URL", () => remoteService.setUrl(repo, r.name, editing.url.trim()), `${r.name} → ${editing.url.trim()}`).then(() => setEditing(null))} />
                <GitButton primary disabled={!!busy || !editing.url.trim()} onClick={() => void act("set URL", () => remoteService.setUrl(repo, r.name, editing.url.trim()), `${r.name} → ${editing.url.trim()}`).then(() => setEditing(null))}>save</GitButton>
                <GitButton onClick={() => setEditing(null)}>cancel</GitButton>
              </>
            ) : (
              <>
                <span className="selectable min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted" title={r.url}>{r.url}</span>
                <span className="flex gap-1">
                  {/^https?:\/\//.test(r.url) && signedIn[r.name] && (
                    <span className="flex items-center gap-1 px-1 font-mono text-[10.5px] text-success" title="Credentials found — push and pull work without asking">
                      <KeyRound size={11} /> signed in
                    </span>
                  )}
                  {/^https?:\/\//.test(r.url) && signedIn[r.name] === false && <GitButton disabled={!!busy} title="Save username + password/token in the keychain" onClick={() => void signIn(r)}><KeyRound size={11} /> sign in</GitButton>}
                  <GitButton disabled={!!busy} onClick={() => setEditing({ name: r.name, url: r.url })}><Pencil size={11} /> edit URL</GitButton>
                  <GitButton danger disabled={!!busy} onClick={() => void act("remove remote", () => remoteService.remove(repo, r.name), `Removed ${r.name}`)}>remove</GitButton>
                </span>
              </>
            )}
          </div>
        ))}
        {adding && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-2">
            <TextInput autoFocus value={adding.name} onChange={(name) => setAdding({ ...adding, name })} placeholder="name (upstream)" className="w-32" />
            <TextInput value={adding.url} onChange={(url) => setAdding({ ...adding, url })} placeholder="https://… or git@…" className="min-w-[16rem] flex-1" />
            <GitButton primary disabled={!!busy || !adding.name.trim() || !adding.url.trim()} onClick={() => void act("add remote", () => remoteService.add(repo, adding.name.trim(), adding.url.trim()), `Added ${adding.name.trim()}`).then(() => setAdding(null))}>add</GitButton>
            <GitButton onClick={() => setAdding(null)}>cancel</GitButton>
          </div>
        )}
      </div>
    </section>
  );
}
