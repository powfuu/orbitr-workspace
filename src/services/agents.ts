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
