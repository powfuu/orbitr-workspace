import { motion } from "framer-motion";
import { Check, CheckCheck, CornerDownLeft, MessageCircleQuestion, Mic, ShieldQuestion, X } from "lucide-react";
import { answerPrompt } from "../../features/approvals/answer";
import type { DetectedPrompt, PromptOption } from "../../features/approvals/detectPrompt";
import { modKey } from "../../lib/platform";
import { cn } from "../../lib/cn";
import type { ID } from "../../types";
import { useSessions } from "../../stores/sessionStore";
import { useTabs } from "../../stores/tabStore";
import { useLayout } from "../../stores/layoutStore";
import { terminalRegistry } from "../../features/terminals/terminalRegistry";

const style: Record<PromptOption["kind"], string> = {
  approve: "bg-white text-black hover:bg-white/85",
  always: "text-fg ring-1 ring-line hover:bg-surface-2",
  deny: "text-error ring-1 ring-error/40 hover:bg-error/10",
  other: "text-fg-2 ring-1 ring-line hover:bg-surface-2",
};
const shortLabel: Partial<Record<PromptOption["kind"], string>> = { approve: "Yes", always: "Always", deny: "No" };
const icon = { approve: Check, always: CheckCheck, deny: X, other: null } as const;

/** Approve / deny an agent's permission request without typing into its TUI. */
export function ApprovalCard({ id, name, prompt, compact }: { id: ID; name: string; prompt: DetectedPrompt; compact?: boolean }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
      transition={{ type: "spring", stiffness: 520, damping: 36 }}
      className={cn(
        "overflow-hidden rounded-xl border border-warning/40 bg-surface shadow-[0_0_0_3px_rgba(224,176,74,0.07)]",
        compact ? "w-[380px] shadow-pop" : "",
      )}
    >
      <div className="flex items-start gap-3 p-3">
        <motion.span
          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-warning/15 text-warning"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          {prompt.kind === "approval" ? <ShieldQuestion size={14} /> : <MessageCircleQuestion size={14} />}
        </motion.span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-[12.5px] font-medium text-fg">{name}</span>
            <span className="text-[11px] text-warning">{{ approval: "needs approval", choice: "asks you to choose", question: "is waiting for your answer" }[prompt.kind]}</span>
          </div>
          <div className="mt-0.5 text-[12.5px] text-fg-2">{prompt.question}</div>
          {prompt.context.length > 0 && (
            <pre className="selectable mt-2 max-h-24 overflow-auto rounded-md bg-bg px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-fg-2">
              {prompt.context.slice(-4).join("\n")}
            </pre>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2">
        {prompt.options.length === 0 && (
          <button onClick={() => focusSession(id)} className="flex h-7 items-center gap-1.5 rounded-md bg-white px-2.5 text-[12px] text-black hover:bg-white/85">
            <CornerDownLeft size={12} /> Reply
          </button>
        )}
        {prompt.options.map((o) => {
          const Icon = icon[o.kind];
          return (
            <button
              key={o.keys}
              onClick={() => void answerPrompt(id, o)}
              title={o.label}
              className={cn("flex h-7 max-w-full items-center gap-1.5 rounded-md px-2.5 text-[12px]", style[o.kind])}
            >
              {Icon && <Icon size={12} />}
              <span className="truncate">{compact ? shortLabel[o.kind] ?? o.label : o.label}</span>
            </button>
          );
        })}
        <span className="ml-auto flex items-center gap-1 text-[10.5px] text-faint">
          <Mic size={10} /> {prompt.kind === "approval" ? "say “sí”, “no” or “siempre”" : prompt.options.length ? "say the number or your answer" : "or just answer by voice"} · {modKey}⇧V
        </span>
      </div>
    </motion.div>
  );
}

/** Brings the session on screen and puts the cursor in it. */
function focusSession(id: ID) {
  const { agents } = useSessions.getState();
  if (agents.some((a) => a.id === id)) useTabs.getState().open({ type: "agent", id });
  else {
    useSessions.getState().setActiveTerminal(id);
    useLayout.getState().openTerminalPanel();
  }
  window.setTimeout(() => terminalRegistry.focus(id), 120);
}
