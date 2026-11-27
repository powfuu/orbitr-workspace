import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { create } from "zustand";

interface Request {
  title: string;
  message: string;
  okLabel: string;
  danger: boolean;
  options: Choice[];
  resolve: (checks: Record<string, boolean> | null) => void;
}

export interface Choice {
  id: string;
  label: string;
  hint?: string;
}

const useConfirmStore = create<{ req: Request | null }>()(() => ({ req: null }));

/** In-app replacement for the native confirm dialog, styled like the rest of Orbitr. */
export function confirmDialog(opts: { title: string; message: string; okLabel?: string; danger?: boolean }) {
  return confirmChoices({ ...opts, options: [] }).then((r) => r !== null);
}

/** Confirm with optional checkboxes; resolves to the ticked ones, or null if cancelled. */
export function confirmChoices({ title, message, okLabel = "OK", danger = true, options }: { title: string; message: string; okLabel?: string; danger?: boolean; options: Choice[] }) {
  return new Promise<Record<string, boolean> | null>((resolve) => {
    useConfirmStore.getState().req?.resolve(null);
    useConfirmStore.setState({ req: { title, message, okLabel, danger, options, resolve } });
  });
}

export function ConfirmDialog() {
  const req = useConfirmStore((s) => s.req);
  const ok = useRef<HTMLButtonElement>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const close = (v: boolean) => {
    req?.resolve(v ? checks : null);
    useConfirmStore.setState({ req: null });
  };
  useEffect(() => {
    if (!req) return;
    setChecks({});
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
            className="w-[420px] max-w-full rounded-xl bg-bg-2 p-5 ring-1 ring-white/[0.04] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85)]"
          >
            <div className="mb-2 flex items-center gap-2 font-mono text-[13px] text-fg">
              {req.danger ? <AlertTriangle size={14} className="text-warning" /> : <span className="text-success">❯</span>}
              {req.title}
            </div>
            <p className="selectable whitespace-pre-wrap text-[12.5px] leading-relaxed text-fg-2">{req.message}</p>
            {req.options.length > 0 && (
              <div className="mt-4 space-y-2">
                {req.options.map((o) => (
                  <label key={o.id} className="flex cursor-pointer items-start gap-2.5 text-[12.5px] text-fg-2">
                    <input type="checkbox" checked={!!checks[o.id]} onChange={(e) => setChecks((c) => ({ ...c, [o.id]: e.target.checked }))} className="mt-0.5 accent-fg" />
                    <span>
                      {o.label}
                      {o.hint && <span className="block text-[11.5px] text-faint">{o.hint}</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}
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
