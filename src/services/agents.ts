import { invoke } from "@tauri-apps/api/core";

export const agentService = {
  /** Absolute path of the CLI via the user's login shell, or null if not installed. */
  resolveExecutable: (name: string) => invoke<string | null>("resolve_executable", { name }),
};

export interface ChatSummary {
  id: string;
  title: string;
  updatedAt: number;
  messages: number;
}

export const listAgentChats = (kind: string, cwd: string) => invoke<ChatSummary[]>("list_agent_chats", { kind, cwd });

export type TimelineKind = "prompt" | "command" | "edit" | "read" | "search" | "agent" | "tool" | "reply";

export interface TimelineEvent {
  at: string;
  kind: TimelineKind;
  tool: string | null;
  title: string;
  detail: string | null;
  path: string | null;
  error: boolean;
  /** Pasted images still in Claude's cache. */
  images?: string[];
}

export const timelineService = {
  events: (cwd: string, sessionId: string) => invoke<TimelineEvent[]>("agent_timeline", { cwd, sessionId }),
  sessionWithPrompt: (cwd: string, sinceMs: number, typed: string) => invoke<string | null>("claude_session_with_prompt", { cwd, sinceMs, typed }),
  sessionsSince: (cwd: string, since: string) => invoke<{ id: string; firstAt: string }[]>("claude_sessions_since", { cwd, since }),
};
