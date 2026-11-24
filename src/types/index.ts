export type ID = string;

export interface Workspace {
  id: ID;
  name: string;
  /** Hue (0–360) used for the workspace glyph. */
  hue: number;
  projectIds: ID[];
}

export interface Project {
  id: ID;
  name: string;
  path: string;
  workspaceId: ID;
  addedAt: number;
}

export type AgentKind = string;

/** Lifecycle of an underlying OS process. Derived only from reliable signals. */
export type ProcessStatus = "starting" | "running" | "exited" | "failed";

export interface AgentSession {
  id: ID;
  kind: AgentKind;
  name: string;
  projectId: ID;
  workspaceId: ID;
  status: ProcessStatus;
  pid?: number | null;
  exitCode?: number | null;
  startedAt: number;
  /** Past conversation this session resumed, when started from history. */
  chatId?: string;
  /** Working directory when it differs from the project (an isolated git worktree). */
  cwd?: string;
  /** Branch of that worktree. */
  branch?: string;
}

export interface TerminalSession {
  id: ID;
  name: string;
  cwd: string;
  shell: string;
  status: ProcessStatus;
  pid?: number | null;
  exitCode?: number | null;
  /** One-off command run in a login shell before leaving an interactive shell (e.g. an installer). */
  command?: string;
}

/** A UI tab only references content; closing it never kills a process. */
export type TabTarget =
  | { type: "home" }
  | { type: "workspace"; id: ID }
  | { type: "project"; id: ID }
  | { type: "agent"; id: ID }
  | { type: "settings" };

export interface Tab {
  id: ID;
  target: TabTarget;
}
