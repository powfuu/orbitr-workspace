import { useEffect, useState } from "react";
import { sinceDays, usageService, type UsageReport } from "../../services/usage";
import { isTauri } from "../../lib/platform";

/** Usage report for a project (or all projects when `cwd` is null), refreshed every 30s and on focus. */
export function useUsage(cwd: string | null, days: number): UsageReport | null {
  const [report, setReport] = useState<UsageReport | null>(null);
  useEffect(() => {
    if (!isTauri) return;
    let alive = true;
    const load = () => {
      const since = sinceDays(days);
      void (cwd ? usageService.project(cwd, since) : usageService.overview(since)).then((r) => alive && setReport(r)).catch(() => undefined);
    };
    load();
    const t = window.setInterval(load, 30_000);
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      window.clearInterval(t);
      window.removeEventListener("focus", load);
    };
  }, [cwd, days]);
  return report;
}
