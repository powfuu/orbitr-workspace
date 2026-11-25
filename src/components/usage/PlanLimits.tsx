import { AnimatePresence, motion } from "framer-motion";
import { Gauge, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { refreshIfStale, usePlanLimits } from "../../features/usage/planLimitsStore";
import { shortLabel } from "../../features/usage/parseLimits";
import { timeAgo } from "../../lib/time";
import { cn } from "../../lib/cn";
import { IconButton } from "../ui/IconButton";

const tone = (p: number) => (p >= 90 ? "bg-error" : p >= 70 ? "bg-warning" : "bg-fg");
const text = (p: number) => (p >= 90 ? "text-error" : p >= 70 ? "text-warning" : "text-fg");

/** Claude plan limits: 5-hour session and weekly windows, with reset times. */
export function PlanLimits() {
  const { limits, at, loading, error, refresh } = usePlanLimits();
  // Read as soon as the card is shown (no manual refresh needed).
  useEffect(() => {
    refreshIfStale();
  }, []);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Gauge size={13} className="text-muted" />
        <span className="text-[12.5px] font-medium text-fg">Plan limits</span>
        <span className="ml-auto text-[10.5px] text-faint">{at ? `updated ${timeAgo(at)}` : loading ? "checking…" : ""}</span>
        <span className={cn(loading && "animate-spin")}>
          <IconButton icon={RefreshCw} size="sm" label="Check now (runs /usage in Claude Code)" onClick={() => void refresh()} disabled={loading} />
        </span>
      </div>
      {limits.length === 0 ? (
        <div className="text-[11.5px] text-muted">{error ?? (loading ? "Reading your plan limits…" : "Checking shortly…")}</div>
      ) : (
        limits.map((l) => (
          <div key={l.label}>
            <div className="mb-1 flex items-baseline gap-2 text-[12px]">
              <span className="text-fg-2">{shortLabel(l.label)}</span>
              <span className={cn("ml-auto font-mono font-medium", text(l.percent))}>{l.percent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-bg">
              <motion.div className={cn("h-full rounded-full", tone(l.percent))} initial={{ width: 0 }} animate={{ width: `${l.percent}%` }} transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }} />
            </div>
            {l.resets && <div className="mt-1 text-[10.5px] text-faint">Resets {l.resets}</div>}
          </div>
        ))
      )}
      {error && limits.length > 0 && <div className="text-[10.5px] text-warning">Last check failed: {error}</div>}
    </div>
  );
}

/** Compact status-bar form: "5h 93% · week 55%". */
export function PlanLimitsCompact() {
  const limits = usePlanLimits((s) => s.limits);
  const [open, setOpen] = useState(false);
  const timer = useRef<number>(undefined);
  if (!limits.length) return null;
  // Hover shows the full card (bars, reset times, last check), like the plan popover in Claude.
  const show = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), 150);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), 120);
  };
  return (
    <span className="relative flex items-center" onPointerEnter={show} onPointerLeave={hide}>
      <span className="flex cursor-default items-center gap-2">
        <Gauge size={11} />
        {limits.slice(0, 2).map((l) => (
          <span key={l.label} className={text(l.percent)}>
            {/session/i.test(l.label) ? "5h" : "wk"} {l.percent}%
          </span>
        ))}
      </span>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full left-0 z-50 mb-2 w-80 rounded-xl border border-line bg-surface p-4 font-sans text-left shadow-pop"
          >
            <PlanLimits />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
