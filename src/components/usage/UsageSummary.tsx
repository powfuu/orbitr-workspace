import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Bucket, UsageReport } from "../../services/usage";
import { compact, money } from "../../lib/format";
import { timeAgo } from "../../lib/time";
import { cn } from "../../lib/cn";

const PERIODS = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
] as const;

const promptTokens = (b: Bucket) => b.tokens.input + b.tokens.cacheRead + b.tokens.cacheWrite5m + b.tokens.cacheWrite1h;

/** Period picker shared by usage views. */
export function PeriodPicker({ days, onChange }: { days: number; onChange: (d: number) => void }) {
  return (
    <div className="flex rounded-lg bg-bg p-0.5 ring-1 ring-line">
      {PERIODS.map((p) => (
        <button key={p.days} onClick={() => onChange(p.days)} className={cn("h-6 rounded-md px-2.5 text-[11.5px]", days === p.days ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

export function usePeriod(initial = 7) {
  return useState(initial);
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="mt-0.5 truncate font-mono text-[18px] font-medium tracking-tight text-fg">{value}</div>
      {hint && <div className="truncate text-[10.5px] text-faint">{hint}</div>}
    </div>
  );
}

/** Totals, cache efficiency, daily bars and model split for a usage report. */
export function UsageSummary({ report, days }: { report: UsageReport; days: number }) {
  const t = report.total;
  const prompt = promptTokens(t);
  const hit = prompt ? t.tokens.cacheRead / prompt : 0;
  const max = Math.max(...report.byDay.map((d) => d.cost), 0.0001);

  // Fill missing days so the chart has a stable axis.
  const series: { day: string; b?: Bucket }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    series.push({ day: key, b: report.byDay.find((x) => x.key === key) });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(130px,100%),1fr))] gap-4">
        <Stat label="API-equivalent cost" value={money(t.cost)} hint={t.unpriced ? `${t.unpriced} msgs with unknown pricing` : undefined} />
        <Stat label="Tokens" value={compact(prompt + t.tokens.output)} hint={`${compact(t.tokens.output)} output`} />
        <Stat label="Cache hit rate" value={`${Math.round(hit * 100)}%`} hint={`${compact(t.tokens.cacheRead)} read from cache`} />
        <Stat label="Messages" value={t.messages.toLocaleString()} hint={t.lastAt ? `last ${timeAgo(Date.parse(t.lastAt))}` : undefined} />
      </div>

      {days > 1 && (
        <div className="flex h-20 items-end gap-[3px]" aria-label="Daily cost">
          {series.map(({ day, b }, i) => (
            <div key={day} className="group relative flex h-full flex-1 items-end" title={`${day} · ${b ? money(b.cost) : "$0"} · ${b?.messages ?? 0} msgs`}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(b ? (b.cost / max) * 100 : 0, b ? 4 : 1.5)}%` }}
                transition={{ delay: i * 0.015, duration: 0.3, ease: [0.2, 0, 0, 1] }}
                className={cn("w-full rounded-sm", b ? "bg-fg/70 group-hover:bg-fg" : "bg-line")}
              />
            </div>
          ))}
        </div>
      )}

      {report.byModel.length > 0 && (
        <div className="space-y-1.5">
          {report.byModel.map((m) => (
            <div key={m.key} className="flex items-center gap-3 text-[12px]">
              <span className="w-44 shrink-0 truncate font-mono text-[11px] text-fg-2">{m.key}</span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-bg">
                <motion.div initial={{ width: 0 }} animate={{ width: `${t.cost ? (m.cost / t.cost) * 100 : 0}%` }} className="h-full rounded-full bg-fg/70" />
              </div>
              <span className="w-16 text-right font-mono text-[11px] text-fg">{money(m.cost)}</span>
              <span className="w-14 text-right font-mono text-[10.5px] text-faint">{compact(m.messages)} msg</span>
            </div>
          ))}
        </div>
      )}

      <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-faint">
        <Info size={11} className="mt-px shrink-0" />
        From Claude Code's local transcripts, priced at Anthropic API rates (cache writes 1.25×/2×, model-specific cache reads). On a Pro/Max/Team plan you are billed by your plan, not this amount.
      </p>
    </div>
  );
}
