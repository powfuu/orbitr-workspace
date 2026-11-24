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
}

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
