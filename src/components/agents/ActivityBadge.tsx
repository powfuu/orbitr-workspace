import { AnimatePresence, motion } from "framer-motion";
import { BellRing, CircleCheck, Hourglass, Loader2, PencilLine, Power, TriangleAlert } from "lucide-react";
import { useActivity } from "../../features/sessions/activityStore";
import type { ID, ProcessStatus } from "../../types";
import { cn } from "../../lib/cn";

export interface Described {
  key: string;
  label: string;
  icon: typeof Loader2;
  tone: string;
  spin?: boolean;
  pulse?: boolean;
}

/** Most important state first: process lifecycle, then attention, work, draft, idle. */
export function useDescribedActivity(id: ID, status: ProcessStatus): Described {
  const a = useActivity((s) => s.byId[id]);
  if (status === "starting") return { key: "starting", label: "Starting", icon: Loader2, tone: "text-warning", spin: true };
  if (status === "failed") return { key: "failed", label: "Crashed", icon: TriangleAlert, tone: "text-error" };
  if (status === "exited") return { key: "exited", label: "Stopped", icon: Power, tone: "text-faint" };
  if (a?.attention) return { key: "attention", label: "Needs you", icon: BellRing, tone: "text-warning", pulse: true };
  if (a?.phase === "working") return { key: "working", label: "Working", icon: Loader2, tone: "text-fg", spin: true };
  if (a?.draft) return { key: "draft", label: `Draft · ${a.draft}`, icon: PencilLine, tone: "text-fg-2" };
  if (a?.unread) return { key: "done", label: "Done · unread", icon: CircleCheck, tone: "text-success", pulse: true };
  return { key: "idle", label: "Waiting for input", icon: Hourglass, tone: "text-muted" };
}

/** Full pill (agent header). */
export function ActivityBadge({ id, status }: { id: ID; status: ProcessStatus }) {
  const d = useDescribedActivity(id, status);
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full border border-line px-2.5 font-mono text-[10.5px] uppercase tracking-[0.08em]", d.tone)}>
      <ActivityIcon d={d} size={11} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={d.label} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.12 }}>
          {d.label}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Compact icon-only form with tooltip text (sidebar, tabs). */
export function ActivityIcon({ d, size = 12 }: { d: Described; size?: number }) {
  return (
    <motion.span
      className={cn("inline-grid place-items-center", d.tone)}
      animate={d.pulse ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
      transition={d.pulse ? { duration: 1.6, repeat: Infinity } : undefined}
      title={d.label}
    >
      <d.icon size={size} strokeWidth={2} className={d.spin ? "animate-spin" : undefined} />
    </motion.span>
  );
}

export function ActivityIconFor({ id, status, size }: { id: ID; status: ProcessStatus; size?: number }) {
  return <ActivityIcon d={useDescribedActivity(id, status)} size={size} />;
}

/** Short secondary line: task title the agent set, else the activity label. */
export function useActivitySubtitle(id: ID): string | undefined {
  return useActivity((s) => s.byId[id]?.title);
}
