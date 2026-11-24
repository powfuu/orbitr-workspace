/** One plan limit as Claude Code's /usage screen reports it. */
export interface PlanLimit {
  /** e.g. "Current session", "Current week (all models)", "Current week (Opus)". */
  label: string;
  percent: number;
  /** Human text from the CLI, e.g. "12:09am (Europe/Madrid)". */
  resets: string | null;
}

/**
 * Reads the limit blocks from a rendered /usage screen:
 *   Current session
 *   ███████████▌   93% used
 *   Resets 12:09am (Europe/Madrid)
 */
export function parseLimits(screen: string[]): PlanLimit[] {
  const out: PlanLimit[] = [];
  const lines = screen.map((l) => l.trim());
  for (let i = 0; i < lines.length; i++) {
    const label = lines[i]!;
    if (!/^Current (session|week)/i.test(label)) continue;
    let percent: number | null = null;
    let resets: string | null = null;
    for (const next of lines.slice(i + 1, i + 4)) {
      const p = /(\d{1,3})%\s*used/i.exec(next);
      if (p) percent = Number(p[1]);
      const r = /^Resets?\s+(.+)$/i.exec(next);
      if (r) resets = r[1]!.trim();
    }
    if (percent !== null) out.push({ label, percent: Math.min(100, percent), resets });
  }
  return out;
}

/** "Current week (all models)" → "Week · all models"; "Current session" → "5-hour session". */
export function shortLabel(label: string): string {
  if (/session/i.test(label)) return "5-hour session";
  const m = /week\s*\(([^)]+)\)/i.exec(label);
  return m ? `Week · ${m[1]}` : label.replace(/^Current\s+/i, "");
}
