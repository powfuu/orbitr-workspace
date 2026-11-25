import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, Search, X } from "lucide-react";
import { SHORTCUTS } from "../../features/shortcuts/shortcuts";
import { useLayout } from "../../stores/layoutStore";
import { Kbd } from "../ui/Kbd";
import { useEffect, useState } from "react";
import { isMac } from "../../lib/platform";

/** Keyboard cheat sheet (? or Mod+/). */
export function ShortcutSheet() {
  const open = useLayout((s) => s.helpOpen);
  const setOpen = useLayout((s) => s.setHelpOpen);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (open) setQ("");
  }, [open]);
  // Matches the label, the group or the keys ("vim", "split", "⌘ k", "tab").
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const groups = SHORTCUTS.map((g) => ({
    ...g,
    items: g.items.filter((s) => {
      const hay = `${g.group} ${s.label} ${s.keys.join(" ")}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    }),
  })).filter((g) => g.items.length > 0);
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
            <label className="flex h-10 items-center gap-2 border-b border-line px-5">
              <Search size={13} className="text-faint" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="search shortcuts — full screen, vim, split…"
                className="min-w-0 flex-1 bg-transparent font-mono text-[12.5px] text-fg outline-none placeholder:text-faint"
              />
            </label>
            <div className="grid max-h-[70vh] grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-x-8 gap-y-5 overflow-y-auto p-5">
              {groups.length === 0 && <div className="text-[12px] text-muted">No shortcut matches “{q}”.</div>}
              {groups.map((g) => (
                <section key={g.group}>
                  <div className="mb-2 term-heading">{g.group}</div>
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
