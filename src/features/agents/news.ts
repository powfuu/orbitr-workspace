import { invoke } from "@tauri-apps/api/core";
import { agentList, type AgentDefinition } from "./registry";
import { parseChangelog, parseGithubRelease, type ReleaseNotes } from "./newsParse";

/** Where each agent publishes its release notes. */
const SOURCES: Record<string, { changelog?: string; repo?: string; page: string }> = {
  "claude-code": { changelog: "https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md", page: "https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md" },
  codex: { repo: "openai/codex", page: "https://github.com/openai/codex/releases" },
  gemini: { repo: "google-gemini/gemini-cli", page: "https://github.com/google-gemini/gemini-cli/releases" },
  grok: { repo: "superagent-ai/grok-cli", page: "https://github.com/superagent-ai/grok-cli/releases" },
  opencode: { repo: "sst/opencode", page: "https://github.com/sst/opencode/releases" },
  copilot: { repo: "github/copilot-cli", page: "https://github.com/github/copilot-cli/releases" },
  qwen: { repo: "QwenLM/qwen-code", page: "https://github.com/QwenLM/qwen-code/releases" },
  goose: { repo: "block/goose", page: "https://github.com/block/goose/releases" },
  cline: { repo: "cline/cline", page: "https://github.com/cline/cline/releases" },
};

export interface AgentNews extends ReleaseNotes {
  kind: string;
  /** Latest published version (npm), when it's an npm package. */
  latest: string | null;
  installed: string | null;
  /** npm package, for the one-click update. */
  pkg: string | null;
  page: string | null;
  error: string | null;
  checkedAt: number;
}

const npmPackage = (a: AgentDefinition) => a.install.unix?.match(/npm install -g (\S+)/)?.[1] ?? null;
const fetchText = (url: string) => invoke<string>("agent_news_fetch", { url });

async function load(a: AgentDefinition, installedPath: string | null | undefined): Promise<AgentNews> {
  const src = SOURCES[a.kind];
  const pkg = npmPackage(a);
  const empty: ReleaseNotes = { version: null, date: null, highlights: [] };
  let error: string | null = null;
  const [latest, notes, installed] = await Promise.all([
    pkg ? fetchText(`https://registry.npmjs.org/${pkg}/latest`).then((t) => (JSON.parse(t) as { version?: string }).version ?? null).catch(() => null) : Promise.resolve(null),
    (src?.changelog
      ? fetchText(src.changelog).then((t) => parseChangelog(t))
      : src?.repo
        ? fetchText(`https://api.github.com/repos/${src.repo}/releases/latest`).then((t) => parseGithubRelease(t))
        : Promise.resolve(empty)
    ).catch((e: unknown) => {
      error = String(e);
      return empty;
    }),
    installedPath ? invoke<string>("agent_cli_version", { executable: a.executable }).catch(() => null) : Promise.resolve(null),
  ]);
  return { ...notes, kind: a.kind, latest: latest ?? notes.version, installed, pkg, page: src?.page ?? a.docsUrl, error, checkedAt: Date.now() };
}

const KEY = "orbitr.agentNews";
const TTL = 6 * 3600_000;

/** News for the given agents, cached for 6 hours (force = refresh now). */
export async function agentNews(kinds: string[], paths: Record<string, string | null>, force = false): Promise<AgentNews[]> {
  let cache: Record<string, AgentNews> = {};
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    /* fresh */
  }
  const out = await Promise.all(
    agentList
      .filter((a) => kinds.includes(a.kind))
      .map(async (a) => {
        const hit = cache[a.kind];
        if (!force && hit && Date.now() - hit.checkedAt < TTL && (!paths[a.kind] || hit.installed)) return hit;
        const fresh = await load(a, paths[a.kind]);
        cache[a.kind] = fresh;
        return fresh;
      }),
  );
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* non-fatal */
  }
  return out;
}
