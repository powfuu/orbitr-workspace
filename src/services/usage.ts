import { invoke } from "@tauri-apps/api/core";

export interface Tokens {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
}

export interface Bucket {
  key: string;
  tokens: Tokens;
  /** API-equivalent USD (subscription plans are billed differently). */
  cost: number;
  messages: number;
  unpriced: number;
  lastAt: string;
}

export interface UsageReport {
  total: Bucket;
  byDay: Bucket[];
  byModel: Bucket[];
  bySession: Bucket[];
  byProject: Bucket[];
}

/** Claude Code usage parsed from its local transcripts (src-tauri/src/agents/usage.rs). */
export const usageService = {
  project: (cwd: string, since: string) => invoke<UsageReport>("usage_project", { cwd, since }),
  overview: (since: string) => invoke<UsageReport>("usage_overview", { since }),
};

export const sinceDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return d.toISOString().slice(0, 10);
};

/** Claude Code's transcript folder name for a project path (mirrors chats.rs). */
export const claudeFolder = (path: string) => path.replace(/[^a-zA-Z0-9]/g, "-");
