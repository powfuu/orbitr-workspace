import { BarChart3 } from "lucide-react";
import { useUsage } from "../../features/usage/useUsage";
import { compact, money } from "../../lib/format";
import { timeAgo } from "../../lib/time";
import { EmptyLine, Panel } from "../workspace/primitives";
import { PlanLimits } from "./PlanLimits";
import { AgentGlyph } from "../ui/AgentGlyph";
import { AGENTS } from "../../features/agents/registry";
import { PeriodPicker, UsageSummary, usePeriod } from "./UsageSummary";

/** Claude Code usage for one project, with the most expensive sessions. */
export function ProjectUsage({ path }: { path: string }) {
  const [days, setDays] = usePeriod(7);
  const report = useUsage(path, days);
  // Only shown when this folder has any Claude Code usage in the last 30 days.
  const recent = useUsage(path, 30);
  if (!recent || recent.total.messages === 0) return null;

  return (
    <Panel title="Claude Code usage" icon={<AgentGlyph agent={AGENTS["claude-code"]} size={16} />} className="col-span-full">
      <div className="-mx-4 -mt-4 mb-4 border-b border-line-soft px-4 py-3">
        <PlanLimits />
      </div>
      <div className="mb-4 flex justify-end">
        <PeriodPicker days={days} onChange={setDays} />
      </div>
      {!report ? (
        <EmptyLine icon={BarChart3}>Reading usage…</EmptyLine>
      ) : report.total.messages === 0 ? (
        <EmptyLine icon={BarChart3}>No Claude Code usage in this folder for this period.</EmptyLine>
      ) : (
        <>
          <UsageSummary report={report} days={days} />
          <div className="mt-4 border-t border-line-soft pt-3">
            <div className="mb-1 term-heading">Sessions</div>
            {report.bySession.slice(0, 8).map((s) => (
              <div key={s.key} className="flex h-7 items-center gap-3 text-[12px]">
                <span className="selectable font-mono text-[11px] text-fg-2">{s.key.slice(0, 8)}</span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-faint">{compact(s.messages)} msgs · {compact(s.tokens.output)} output tokens</span>
                <span className="font-mono text-[11px] text-fg">{money(s.cost)}</span>
                <span className="w-20 text-right font-mono text-[10.5px] text-faint">{timeAgo(Date.parse(s.lastAt))}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
