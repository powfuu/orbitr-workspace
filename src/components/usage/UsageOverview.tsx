import { BarChart3 } from "lucide-react";
import { useUsage } from "../../features/usage/useUsage";
import { claudeFolder } from "../../services/usage";
import { useWorkspaces } from "../../stores/workspaceStore";
import { useTabs } from "../../stores/tabStore";
import { money } from "../../lib/format";
import { isTauri } from "../../lib/platform";
import { PeriodPicker, UsageSummary, usePeriod } from "./UsageSummary";
import { PlanLimits } from "./PlanLimits";

/** All Claude Code usage on this machine, by project. */
export function UsageOverview() {
  const [days, setDays] = usePeriod(7);
  const report = useUsage(null, days);
  const projects = useWorkspaces((s) => s.projects);
  const open = useTabs((s) => s.open);
  if (!isTauri) return null;

  const byFolder = new Map(Object.values(projects).map((p) => [claudeFolder(p.path), p]));

  return (
    <div id="dashboard-usage" className="scroll-mt-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="term-heading">Usage</div>
        <div className="flex-1" />
        <PeriodPicker days={days} onChange={setDays} />
      </div>
      <div className="mb-3 rounded-xl border border-line-soft bg-bg-2 p-4">
        <PlanLimits />
      </div>
      <div className="rounded-xl border border-line-soft bg-bg-2 p-4">
        {!report ? (
          <div className="flex items-center gap-2 text-[12px] text-muted"><BarChart3 size={13} /> Reading Claude Code transcripts…</div>
        ) : (
          <>
            <UsageSummary report={report} days={days} />
            {report.byProject.length > 0 && (
              <div className="mt-4 border-t border-line-soft pt-3">
                <div className="mb-1 term-heading">By project</div>
                {report.byProject.slice(0, 6).map((b) => {
                  const p = byFolder.get(b.key);
                  return (
                    <button
                      key={b.key}
                      disabled={!p}
                      onClick={() => p && open({ type: "project", id: p.id })}
                      className="flex h-7 w-full items-center gap-3 rounded-md px-1 text-left text-[12px] enabled:hover:bg-surface/60"
                    >
                      <span className={p ? "truncate text-fg-2" : "truncate font-mono text-[11px] text-faint"}>{p ? p.name : b.key.replace(/^-/, "/").replace(/-/g, "/")}</span>
                      <span className="ml-auto font-mono text-[11px] text-fg">{money(b.cost)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
