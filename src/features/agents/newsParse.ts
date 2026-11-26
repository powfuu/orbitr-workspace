/** Pure parsers for agent release notes (tested separately). */

export interface ReleaseNotes {
  version: string | null;
  date: string | null;
  highlights: string[];
}

const clean = (l: string) =>
  l
    .replace(/^\s*[-*]\s+/, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();

const bullets = (md: string, max: number) =>
  md
    .split("\n")
    .filter((l) => /^\s*[-*]\s+\S/.test(l))
    .map(clean)
    .filter((l) => l.length > 3)
    .slice(0, max);

/** CHANGELOG.md with "## 1.2.3" sections: the newest section's bullets. */
export function parseChangelog(md: string, max = 6): ReleaseNotes {
  const start = md.search(/^##\s+v?\d/m);
  if (start < 0) return { version: null, date: null, highlights: [] };
  const rest = md.slice(start);
  const header = rest.split("\n", 1)[0]!;
  const next = rest.slice(header.length).search(/^##\s/m);
  const body = next < 0 ? rest.slice(header.length) : rest.slice(header.length, header.length + next);
  return { version: header.match(/v?(\d[\w.-]*)/)?.[1] ?? null, date: header.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null, highlights: bullets(body, max) };
}

/** GitHub "latest release" JSON. */
export function parseGithubRelease(json: string, max = 6): ReleaseNotes {
  const r = JSON.parse(json) as { tag_name?: string; published_at?: string; body?: string };
  return {
    version: r.tag_name?.replace(/^(rust-)?v/, "") ?? null,
    date: r.published_at?.slice(0, 10) ?? null,
    highlights: bullets(r.body ?? "", max),
  };
}

/** Lines that announce models — the part people care about most. */
export const MODEL_RE = /\b(gpt-?\d|o\d\b|gemini[- ]?\d|claude|opus|sonnet|haiku|fable|grok[- ]?\d|qwen[- ]?\d|llama|mistral|deepseek|model)/i;

/** "1.2.10" > "1.2.9". Non-numeric parts are ignored. */
export function isNewer(latest: string, installed: string) {
  const a = latest.split(/[.-]/).map((n) => parseInt(n, 10));
  const b = installed.split(/[.-]/).map((n) => parseInt(n, 10));
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = Number.isNaN(a[i]!) ? 0 : (a[i] ?? 0);
    const y = Number.isNaN(b[i]!) ? 0 : (b[i] ?? 0);
    if (x !== y) return x > y;
  }
  return false;
}
