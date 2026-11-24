import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useToasts } from "../../stores/toastStore";
import { cn } from "../../lib/cn";

const icons = { info: Info, success: CircleCheck, error: CircleAlert };
const tones = { info: "text-fg-2", success: "text-success", error: "text-error" };

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-9 right-4 z-[60] flex w-80 flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = icons[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 500, damping: 36 }}
              className="pointer-events-auto flex items-start gap-2.5 rounded-xl bg-surface p-3 shadow-pop"
            >
              <Icon size={15} className={cn("mt-px shrink-0", tones[t.kind])} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-fg">{t.title}</div>
                {t.detail && <div className="selectable mt-0.5 break-words text-[11.5px] text-muted">{t.detail}</div>}
              </div>
              <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="text-faint hover:text-fg">
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
