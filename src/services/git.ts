import { invoke } from "@tauri-apps/api/core";

export interface FileChange {
  path: string;
  from: string | null;
  index: string;
  worktree: string;
  staged: boolean;
  unstaged: boolean;
  untracked: boolean;
  conflicted: boolean;
}

export interface Commit {
  hash: string;
  short: string;
  author: string;
  time: number;
  subject: string;
  /** Decorations, e.g. "HEAD -> main, origin/main, tag: v1". */
  refs: string;
}

export interface CommitFile {
  path: string;
  status: string;
  additions: number | null;
  deletions: number | null;
}

export interface CommitDetail extends Commit {
  email: string;
  parents: string[];
  body: string;
  files: CommitFile[];
}

export interface Stash {
  index: number;
  message: string;
  time: number;
}

export interface FlowConfig {
  main: string;
  develop: string | null;
}

export type FlowKind = "feature" | "bugfix" | "release" | "hotfix";

export interface GitStatus {
  branch: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
  files: FileChange[];
  lastCommit: Commit | null;
}

/** Typed bridge to src-tauri/src/git (system git CLI, no shell). */
export const gitService = {
  status: (repo: string) => invoke<GitStatus | null>("git_status", { repo }),
  log: (repo: string, limit = 20) => invoke<Commit[]>("git_log", { repo, limit }),
  diff: (repo: string, file: string, staged: boolean, untracked: boolean) => invoke<string>("git_diff", { repo, file, staged, untracked }),
  stage: (repo: string, files: string[]) => invoke<void>("git_stage", { repo, files }),
  unstage: (repo: string, files: string[]) => invoke<void>("git_unstage", { repo, files }),
  commit: (repo: string, message: string) => invoke<void>("git_commit", { repo, message }),
  push: (repo: string) => invoke<string>("git_push", { repo }),
  pull: (repo: string) => invoke<string>("git_pull", { repo }),
};

export interface Branch {
  name: string;
  current: boolean;
  upstream: string | null;
  updatedAt: number;
  /** Commits to push / pull against the upstream (as of the last fetch). */
  ahead: number;
  behind: number;
  /** Upstream deleted on the remote. */
  gone: boolean;
}

export interface Worktree {
  path: string;
  branch: string | null;
  head: string;
  main: boolean;
  locked: boolean;
}

export const branchService = {
  list: (repo: string) => invoke<Branch[]>("git_branches", { repo }),
  switch: (repo: string, branch: string) => invoke<void>("git_switch", { repo, branch }),
  create: (repo: string, branch: string) => invoke<void>("git_create_branch", { repo, branch }),
  worktrees: (repo: string) => invoke<Worktree[]>("git_worktrees", { repo }),
  addWorktree: (repo: string, branch: string, create: boolean) => invoke<string>("git_add_worktree", { repo, branch, create }),
  removeWorktree: (repo: string, path: string, force: boolean) => invoke<void>("git_remove_worktree", { repo, path, force }),
};

export const listFiles = (repo: string) => invoke<string[]>("list_files", { repo });

/** History, branch management, stash and git flow (src-tauri/src/git/extra.rs). */
export const gitMore = {
  logPage: (repo: string, skip: number, limit: number, rev?: string) => invoke<Commit[]>("git_log_page", { repo, skip, limit, rev: rev || null }),
  commitDetail: (repo: string, hash: string) => invoke<CommitDetail>("git_commit_detail", { repo, hash }),
  commitDiff: (repo: string, hash: string, file: string) => invoke<string>("git_commit_diff", { repo, hash, file }),
  remoteBranches: (repo: string) => invoke<string[]>("git_remote_branches", { repo }),
  createBranch: (repo: string, name: string, base: string | null, checkout: boolean) => invoke<void>("git_branch_create", { repo, name, base, checkout }),
  checkoutRemote: (repo: string, remote: string) => invoke<string>("git_checkout_remote", { repo, remote }),
  deleteRemoteBranch: (repo: string, branch: string) => invoke<string>("git_remote_branch_delete", { repo, branch }),
  deleteBranch: (repo: string, name: string, force: boolean) => invoke<void>("git_branch_delete", { repo, name, force }),
  renameBranch: (repo: string, old: string, name: string) => invoke<void>("git_branch_rename", { repo, old, new: name }),
  merge: (repo: string, branch: string, noFf: boolean) => invoke<string>("git_merge", { repo, branch, noFf }),
  mergeAbort: (repo: string) => invoke<void>("git_merge_abort", { repo }),
  fetch: (repo: string) => invoke<string>("git_fetch", { repo }),
  cherryPick: (repo: string, hash: string) => invoke<string>("git_cherry_pick", { repo, hash }),
  revert: (repo: string, hash: string) => invoke<string>("git_revert", { repo, hash }),
  tag: (repo: string, name: string, hash?: string) => invoke<void>("git_tag_create", { repo, name, hash: hash ?? null }),
  stashList: (repo: string) => invoke<Stash[]>("git_stash_list", { repo }),
  stashPush: (repo: string, message: string, untracked: boolean) => invoke<void>("git_stash_push", { repo, message, untracked }),
  stashOp: (repo: string, op: "apply" | "pop" | "drop", index: number) => invoke<void>("git_stash_op", { repo, op, index }),
  flowConfig: (repo: string) => invoke<FlowConfig>("git_flow_config", { repo }),
  flowStart: (repo: string, kind: FlowKind, name: string) => invoke<string>("git_flow_start", { repo, kind, name }),
  pullBranch: (repo: string, branch: string) => invoke<string>("git_pull_branch", { repo, branch }),
  pushBranch: (repo: string, branch: string) => invoke<string>("git_push_branch", { repo, branch }),
  flowFinish: (repo: string, branch: string, tag: boolean) => invoke<string>("git_flow_finish", { repo, branch, tag }),
};

export interface Remote {
  name: string;
  url: string;
}

/** Remotes and HTTPS credentials (passwords go to git's helper — the macOS keychain). */
export const remoteService = {
  list: (repo: string) => invoke<Remote[]>("git_remotes", { repo }),
  setUrl: (repo: string, name: string, url: string) => invoke<void>("git_remote_set_url", { repo, name, url }),
  add: (repo: string, name: string, url: string) => invoke<void>("git_remote_add", { repo, name, url }),
  remove: (repo: string, name: string) => invoke<void>("git_remote_remove", { repo, name }),
  storeCredential: (repo: string, url: string, username: string, password: string) => invoke<void>("git_store_credential", { repo, url, username, password }),
};
