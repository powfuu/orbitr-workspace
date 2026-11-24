import type { PlanLimit } from "./parseLimits";

export interface Alert {
  /** Stable id so each alert fires once per limit window. */
  key: string;
  level: "warn" | "critical" | "full" | "reset";
  title: string;
  body: string;
}

/** Per limit: the highest threshold already announced in the current window. */
export type AlertMemory = Record<string, { window: string; announced: number }>;

const label = (l: PlanLimit) => (/session/i.test(l.label) ? "5-hour session" : l.label.replace(/^Current\s+/i, "").replace(/^week/i, "Weekly"));

/**
 * Decides which alerts to raise for a fresh reading. A "window" is identified by the reset
 * text: when it changes (or usage drops a lot) the limit has reset and the memory clears.
 */
export function evaluateAlerts(limits: PlanLimit[], memory: AlertMemory, thresholds: number[]): { alerts: Alert[]; memory: AlertMemory } {
  const next: AlertMemory = { ...memory };
  const alerts: Alert[] = [];
  const steps = [...thresholds].sort((a, b) => a - b);

  for (const l of limits) {
    const window = l.resets ?? "";
    const prev = memory[l.label];
    const reset = prev && prev.announced > 0 && (prev.window !== window || l.percent + 30 < prev.announced);
    if (reset) {
      alerts.push({ key: `${l.label}|reset|${window}`, level: "reset", title: `${label(l)} reset`, body: `Back to ${l.percent}% used.` });
    }
    const base = !prev || reset ? 0 : prev.announced;
    const crossed = [...steps, 100].filter((t) => l.percent >= t && t > base);
    const top = crossed[crossed.length - 1];
    if (top !== undefined) {
      const level = top >= 100 ? "full" : top >= (steps[steps.length - 1] ?? 95) ? "critical" : "warn";
      alerts.push({
        key: `${l.label}|${top}|${window}`,
        level,
        title: top >= 100 ? `${label(l)} limit reached` : `${label(l)} at ${l.percent}%`,
        body: l.resets ? `Resets ${l.resets}.` : "Resets later.",
      });
    }
    next[l.label] = { window, announced: top ?? (reset ? 0 : base) };
  }
  return { alerts, memory: next };
}
