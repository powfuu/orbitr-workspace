/** `{{name}}` placeholders in a snippet, in order of first appearance. */
export function variablesOf(text: string): string[] {
  const seen: string[] = [];
  for (const m of text.matchAll(/\{\{\s*([\w\s-]+?)\s*\}\}/g)) if (!seen.includes(m[1]!)) seen.push(m[1]!);
  return seen;
}

/** Fills placeholders; unknown ones are left as typed so nothing is silently dropped. */
export function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w\s-]+?)\s*\}\}/g, (all, k: string) => (k in values ? values[k]! : all));
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Voice trigger: "snippet <name>", "usa <name>", "ejecuta <name>" or just the exact name.
 * Returns the best snippet whose name matches, or null.
 */
export function matchSpoken<T extends { name: string }>(spoken: string, snippets: T[]): T | null {
  const t = norm(spoken).replace(/^(snippet|usa|usar|ejecuta|lanza|run|use)\s+/, "");
  const exact = snippets.find((s) => norm(s.name) === t);
  if (exact) return exact;
  const prefixed = /^(snippet|usa|usar|ejecuta|lanza|run|use)\s/.test(norm(spoken));
  if (!prefixed) return null; // plain speech is a prompt, not a snippet trigger
  return snippets.find((s) => norm(s.name).startsWith(t) || t.startsWith(norm(s.name))) ?? null;
}
