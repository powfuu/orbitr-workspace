import { motion } from "framer-motion";
import { useActivity } from "../../features/sessions/activityStore";
import type { PromptKind } from "../../features/approvals/detectPrompt";
import type { ID } from "../../types";

export const PROMPT_LABEL: Record<PromptKind, { short: string; long: string }> = {
  approval: { short: "Approve", long: "Needs approval" },
  choice: { short: "Choose", long: "Choose an option" },
  question: { short: "Answer", long: "Waiting for your answer" },
};

export const usePromptKind = (id: ID) => useActivity((s) => s.byId[id]?.prompt?.kind);

/** Pulsing amber chip shown on tabs and sidebar rows while a session waits on you. */
export function PromptChip({ id }: { id: ID }) {
  const kind = usePromptKind(id);
  if (!kind) return null;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: [1, 0.55, 1], scale: 1 }}
      transition={{ opacity: { duration: 1.4, repeat: Infinity }, scale: { duration: 0.15 } }}
      title={PROMPT_LABEL[kind].long}
      className="shrink-0 rounded-full bg-warning px-1.5 py-px font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-black"
    >
      {PROMPT_LABEL[kind].short}
    </motion.span>
  );
}
