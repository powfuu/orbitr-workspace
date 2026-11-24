import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, SquareTerminal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useShells } from "../../hooks/useShells";

/** Split button: "+" spawns the default shell, the chevron picks another one. */
export function ShellPicker({ onPick }: { onPick: (shellPath: string) => void }) {
  const shells = useShells();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={shells.length === 0}
        aria-label="Choose shell"
        className="flex h-6 items-center gap-1 rounded-md px-1.5 font-mono text-[11px] text-muted hover:bg-surface hover:text-fg disabled:opacity-40"
      >
        {shells[0]?.name ?? "shell"}
        <ChevronDown size={11} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full z-40 mt-1 min-w-48 rounded-lg bg-surface p-1 shadow-pop"
          >
            <div className="px-2 pb-1 pt-1.5 text-2xs font-medium uppercase tracking-[0.08em] text-faint">New terminal with</div>
            {shells.map((s, i) => (
              <button
                key={s.path}
                onClick={() => {
                  setOpen(false);
                  onPick(s.path);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-fg-2 hover:bg-surface-2 hover:text-fg"
              >
                <SquareTerminal size={13} className="text-muted" />
                <span className="flex-1 text-left">{s.name}</span>
                <span className="truncate font-mono text-[10px] text-faint">{i === 0 ? "default" : s.path}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
