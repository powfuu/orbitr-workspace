import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useEffect, useRef } from "react";
import { create } from "zustand";

interface Request {
  title: string;
  message: string;
  okLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

const useConfirmStore = create<{ req: Request | null }>()(() => ({ req: null }));

/** In-app replacement for the native confirm dialog, styled like the rest of Orbitr. */
export function confirmDialog({ title, message, okLabel = "OK", danger = true }: { title: string; message: string; okLabel?: string; danger?: boolean }) {
  return new Promise<boolean>((resolve) => {
    useConfirmStore.getState().req?.resolve(false);
    useConfirmStore.setState({ req: { title, message, okLabel, danger, resolve } });
  });
}

export function ConfirmDialog() {
  const req = useConfirmStore((s) => s.req);
  const ok = useRef<HTMLButtonElement>(null);
  const close = (v: boolean) => {
    req?.resolve(v);
    useConfirmStore.setState({ req: null });
  };
  useEffect(() => {
    if (!req) return;
    ok.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  return (
    <AnimatePresence>
      {req && (
        <motion.div
          className="fixed inset-0 z-[95] grid place-items-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onMouseDown={(e) => e.target === e.currentTarget && close(false)}
        >
          <motion.div
            role="dialog"
            aria-label={req.title}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
            className="w-[420px] max-w-full rounded-xl border border-line bg-bg-2 p-5 shadow-pop"
          >
            <div className="mb-2 flex items-center gap-2 font-mono text-[13px] text-fg">
              {req.danger ? <AlertTriangle size={14} className="text-warning" /> : <span className="text-success">❯</span>}
              {req.title}
            </div>
            <p className="selectable whitespace-pre-wrap text-[12.5px] leading-relaxed text-fg-2">{req.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => close(false)} className="h-8 rounded-md px-3.5 text-[12.5px] text-muted ring-1 ring-line hover:bg-surface hover:text-fg">
                Cancel
              </button>
              <button
                ref={ok}
                onClick={() => close(true)}
                className={req.danger ? "h-8 rounded-md bg-error px-3.5 text-[12.5px] font-medium text-white hover:bg-error/85" : "h-8 rounded-md bg-fg px-3.5 text-[12.5px] font-medium text-bg hover:bg-fg/85"}
              >
                {req.okLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
