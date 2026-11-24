import { BellRing, CircleCheck, MessageCircleQuestion, PencilLine, Power, ShieldQuestion, TriangleAlert, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { useActivity } from "../../features/sessions/activityStore";
import { PROMPT_LABEL } from "../approvals/PromptChip";
import type { ID, ProcessStatus } from "../../types";
import { cn } from "../../lib/cn";

export interface Described {
  key: string;
  label: string;
  /** null = a dot instead of an icon (activity, not an action). */
  icon: LucideIcon | null;
  dot?: "pulse" | "still";
  tone: string;
  pulse?: boolean;
}

/** Most important state first: process lifecycle, then attention, work, draft, idle. */
export function useDescribedActivity(id: ID, status: ProcessStatus): Described {
  const a = useActivity((s) => s.byId[id]);
  if (status === "starting") return { key: "starting", label: "Starting", icon: null, dot: "still", tone: "text-warning" };
  if (status === "failed") return { key: "failed", label: "Crashed", icon: TriangleAlert, tone: "text-error" };
  if (status === "exited") return { key: "exited", label: "Stopped", icon: Power, tone: "text-faint" };
  if (a?.prompt) {
    const k = a.prompt.kind;
    return { key: k, label: PROMPT_LABEL[k].long, icon: k === "approval" ? ShieldQuestion : MessageCircleQuestion, tone: "text-warning", pulse: true };
  }
  if (a?.attention) return { key: "attention", label: "Needs you", icon: BellRing, tone: "text-warning", pulse: true };
  if (a?.phase === "working") return { key: "working", label: "Working", icon: null, dot: "pulse", tone: "text-fg" };
  if (a?.draft) return { key: "draft", label: `Draft · ${a.draft}`, icon: PencilLine, tone: "text-fg-2" };
  if (a?.unread) return { key: "done", label: "Done · unread", icon: CircleCheck, tone: "text-success", pulse: true };
  // Idle is the normal resting state: no icon in rows and tabs, a quiet "Ready" in the header.
  return { key: "idle", label: "Ready", icon: null, tone: "text-muted" };
}

/** Full pill (agent header). */
export function ActivityBadge({ id, status }: { id: ID; status: ProcessStatus }) {
  const d = useDescribedActivity(id, status);
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-2 font-mono text-[10.5px] uppercase tracking-[0.08em] @xl:px-2.5", d.tone)}>
      <ActivityIcon d={d} size={11} quietIdle={false} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span className="hidden @xl:inline" key={d.label} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.12 }}>
          {d.label}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Compact icon-only form with tooltip text (sidebar, tabs). */
export function ActivityIcon({ d, size = 12, quietIdle = true }: { d: Described; size?: number; quietIdle?: boolean }) {
  if (!d.icon && !d.dot) {
    if (quietIdle) return null;
    return <span title={d.label} className="inline-block h-1.5 w-1.5 rounded-full bg-faint" />;
  }
  if (d.dot) {
    return (
      <span title={d.label} className={cn("relative inline-grid place-items-center", d.tone)} style={{ width: size, height: size }}>
        {d.dot === "pulse" && (
          <motion.span
            className="absolute h-2 w-2 rounded-full bg-current"
            animate={{ scale: [1, 1.9], opacity: [0.35, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
      </span>
    );
  }
  const Icon = d.icon!;
  return (
    <motion.span
      className={cn("inline-grid place-items-center", d.tone)}
      animate={d.pulse ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
      transition={d.pulse ? { duration: 1.6, repeat: Infinity } : undefined}
      title={d.label}
    >
      <Icon size={size} strokeWidth={2} />
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
