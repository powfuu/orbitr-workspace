import { create } from "zustand";
import { confirmDialog } from "../../components/ui/ConfirmDialog";

export type GitTab = "changes" | "history" | "branches" | "stash";

/** Which tab each repo's Git view shows, so alerts can send you to the right place. */
export const useGitTabs = create<{ byPath: Record<string, GitTab>; set: (path: string, tab: GitTab) => void }>()((set) => ({
  byPath: {},
  set: (path, tab) => set((s) => ({ byPath: { ...s.byPath, [path]: tab } })),
}));

export const isConflictError = (e: unknown) => /conflict|unmerged files|not possible because you have unmerged/i.test(String(e));

/** A git action hit merge conflicts: say so plainly and offer to go resolve them. */
export async function conflictAlert(repo: string, what: string) {
  const go = await confirmDialog({
    title: "Merge conflicts",
    message: `${what}\n\nSome files changed in both branches. Resolve them (each file shows its conflicts), mark them resolved, then finish the merge — or abort it to go back.`,
    okLabel: "Resolve conflicts",
    danger: true,
  });
  if (go) useGitTabs.getState().set(repo, "changes");
}
