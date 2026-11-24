/**
 * Fuzzy path scoring for quick-open. Query chars must appear in order; matches in the
 * file name, at word starts and in runs score higher; shorter paths win ties.
 * Returns null when the path doesn't match.
 */
export function fuzzyScore(path: string, query: string): number | null {
  const q = query.toLowerCase().replace(/\s+/g, "");
  if (!q) return 0;
  const p = path.toLowerCase();
  const nameStart = p.lastIndexOf("/") + 1;
  let score = 0;
  let pi = 0;
  let prev = -2;
  for (const ch of q) {
    const i = p.indexOf(ch, pi);
    if (i < 0) return null;
    score += 1;
    if (i === prev + 1) score += 3; // contiguous run
    if (i >= nameStart) score += 2; // in the file name
    if (i === 0 || "/._-".includes(p[i - 1]!)) score += 2; // word start
    prev = i;
    pi = i + 1;
  }
  if (p.slice(nameStart).includes(q)) score += 10; // whole query inside the name
  return score - path.length * 0.01;
}

export function fuzzyFilter(paths: string[], query: string, limit = 60): string[] {
  if (!query.trim()) return paths.slice(0, limit);
  return paths
    .map((p) => [p, fuzzyScore(p, query)] as const)
    .filter((x): x is readonly [string, number] => x[1] !== null)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([p]) => p);
}
