import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { SHORTCUTS } from "../../features/shortcuts/shortcuts";
import { useLayout } from "../../stores/layoutStore";
import { Kbd } from "../ui/Kbd";
import { useEffect } from "react";
import { isMac } from "../../lib/platform";

/** Keyboard cheat sheet (? or Mod+/). */
export function ShortcutSheet() {
  const open = useLayout((s) => s.helpOpen);
  const setOpen = useLayout((s) => s.setHelpOpen);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={() => setOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-label="Keyboard shortcuts"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 520, damping: 38 }}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-[640px] max-w-[92vw] overflow-hidden rounded-2xl bg-surface shadow-pop"
          >
            <div className="flex h-12 items-center gap-2 border-b border-line px-5">
              <Keyboard size={15} className="text-muted" />
              <span className="text-[13px] font-medium text-fg">Keyboard shortcuts</span>
              <button aria-label="Close" onClick={() => setOpen(false)} className="ml-auto grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-fg">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-x-8 gap-y-5 p-5">
              {SHORTCUTS.map((g) => (
                <section key={g.group}>
                  <div className="mb-2 font-mono text-2xs uppercase tracking-[0.14em] text-faint">{g.group}</div>
                  <ul className="space-y-1.5">
                    {g.items.map((s) => (
                      <li key={s.label} className="flex items-center justify-between gap-3 text-[12.5px] text-fg-2">
                        {s.label}
                        <span className="flex shrink-0 gap-1">{s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            {!isMac && (
              <div className="border-t border-line px-5 py-3 text-[11px] text-faint">
                Inside a terminal, Ctrl+letter keys go to the shell. Use the command palette (Ctrl+K) from outside it instead.
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
