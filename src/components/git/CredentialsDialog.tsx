import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, KeyRound, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { newDefaultTerminal } from "../../features/terminals/newDefaultTerminal";
import { useEffect, useState } from "react";
import { create } from "zustand";

export type CredentialChoice = { username: string; password: string } | "browser" | null;

interface Request {
  host: string;
  username: string;
  resolve: (v: CredentialChoice) => void;
}

const useCredStore = create<{ req: Request | null }>()(() => ({ req: null }));

/** Asks for a remote's username + password/token in Orbitr's own style. */
export function askCredentials(host: string, username: string) {
  return new Promise<CredentialChoice>((resolve) => {
    useCredStore.getState().req?.resolve(null);
    useCredStore.setState({ req: { host, username, resolve } });
  });
}

const HINT: Record<string, string> = {
  "bitbucket.org": "Bitbucket needs an app password or API token (Personal settings → App passwords), not your Atlassian password.",
  "github.com": "GitHub needs a personal access token with repo access, not your account password.",
  "gitlab.com": "GitLab needs a personal access token with write_repository.",
};

export function CredentialsDialog() {
  const req = useCredStore((s) => s.req);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [manual, setManual] = useState(false);
  const [gcm, setGcm] = useState<boolean | null>(null);
  const [installing, setInstalling] = useState(false);
  const checkGcm = () => void invoke<boolean>("git_gcm_installed").then(setGcm).catch(() => setGcm(false));
  useEffect(() => {
    if (!req) return;
    setUsername(req.username);
    setPassword("");
    setManual(false);
    setInstalling(false);
    checkGcm();
  }, [req]);
  // After installing in the terminal, notice it as soon as the user comes back.
  useEffect(() => {
    if (!req || gcm) return;
    window.addEventListener("focus", checkGcm);
    const t = window.setInterval(checkGcm, 3000);
    return () => {
      window.removeEventListener("focus", checkGcm);
      window.clearInterval(t);
    };
  }, [req, gcm]);
  const close = (v: CredentialChoice) => {
    req?.resolve(v);
    useCredStore.setState({ req: null });
  };
  const submit = () => username.trim() && password && close({ username: username.trim(), password });

  return (
    <AnimatePresence>
      {req && (
        <motion.div
          className="fixed inset-0 z-[95] grid place-items-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onMouseDown={(e) => e.target === e.currentTarget && close(null)}
          onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), close(null))}
        >
          <motion.form
            role="dialog"
            aria-label={`Sign in to ${req.host}`}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="w-[420px] max-w-full rounded-xl border border-line bg-bg-2 p-5 shadow-pop"
          >
            <div className="mb-1 flex items-center gap-2 font-mono text-[13px] text-fg">
              <KeyRound size={14} className="text-muted" /> sign in to {req.host}
            </div>
            <p className="mb-4 text-[11.5px] leading-relaxed text-muted">
              Git needs permission to use this remote. Sign in on {req.host} in your browser — the access token is saved in the macOS keychain, so you won't be asked again.
            </p>
            {gcm ? (
              <button type="button" onClick={() => close("browser")} className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-fg text-[12.5px] font-medium text-bg hover:bg-fg/85">
                <ExternalLink size={13} /> Continue in browser
              </button>
            ) : gcm === false ? (
              <div className="rounded-lg bg-surface/70 p-3 text-[11.5px] text-fg-2">
                Browser sign-in uses Git Credential Manager (by Microsoft, the same one Sourcetree and Visual Studio use). Install it once:
                <button
                  type="button"
                  disabled={installing}
                  onClick={() => {
                    setInstalling(true);
                    void newDefaultTerminal(undefined, "install Git Credential Manager", "brew install --cask git-credential-manager");
                  }}
                  className="mt-2 flex h-8 w-full items-center justify-center gap-2 rounded-md bg-fg text-[12px] font-medium text-bg hover:bg-fg/85 disabled:opacity-60"
                >
                  {installing ? <><Loader2 size={12} className="animate-spin" /> Installing in the terminal… (you may be asked for your Mac password)</> : "Install (Homebrew)"}
                </button>
              </div>
            ) : (
              <div className="flex justify-center py-2"><Loader2 size={13} className="animate-spin text-faint" /></div>
            )}
            <button type="button" onClick={() => setManual((m) => !m)} className="mt-3 text-[11px] text-faint underline-offset-2 hover:text-fg-2 hover:underline">
              {manual ? "hide" : "use an app password / token instead"}
            </button>
            {manual && (
              <div className="mt-3">
                <label className="mb-3 block">
                  <span className="mb-1 block text-[11px] text-faint">Username</span>
                  <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username"
                    className="h-8 w-full rounded-md bg-bg px-2.5 font-mono text-[12.5px] text-fg outline-none ring-1 ring-line-soft focus:ring-fg/30" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-faint">App password or token</span>
                  <input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                    className="h-8 w-full rounded-md bg-bg px-2.5 font-mono text-[12.5px] text-fg outline-none ring-1 ring-line-soft focus:ring-fg/30" />
                </label>
                {HINT[req.host] && <p className="mt-2 text-[11px] leading-relaxed text-faint">{HINT[req.host]}</p>}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => close(null)} className="h-8 rounded-md px-3.5 text-[12.5px] text-muted ring-1 ring-line hover:bg-surface hover:text-fg">
                Cancel
              </button>
              {manual && (
                <button type="submit" disabled={!username.trim() || !password} className="h-8 rounded-md bg-fg px-3.5 text-[12.5px] font-medium text-bg hover:bg-fg/85 disabled:opacity-40">
                  Save & retry
                </button>
              )}
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
