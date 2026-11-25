import { useState } from "react";
import { toast } from "../../stores/toastStore";
import { useGit } from "./gitStore";
import { withAuth } from "./withAuth";

/** Runs a git action with a busy flag, a toast on success/failure and a status refresh after. */
export function useGitRun(repo: string) {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async <T,>(label: string, fn: () => Promise<T>, ok?: string | ((r: T) => string)): Promise<T | undefined> => {
    setBusy(label);
    try {
      const r = await withAuth(repo, fn);
      if (ok) toast({ kind: "success", title: typeof ok === "function" ? ok(r) : ok });
      return r;
    } catch (e) {
      toast({ kind: "error", title: `${label} failed`, detail: String(e) });
      return undefined;
    } finally {
      setBusy(null);
      void useGit.getState().refresh(repo);
    }
  };
  return { busy, run };
}
