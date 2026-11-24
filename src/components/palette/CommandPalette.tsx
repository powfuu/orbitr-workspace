import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLayout } from "../../stores/layoutStore";
import { useCommands } from "../../features/commands/useCommands";
import { cn } from "../../lib/cn";
import { Kbd } from "../ui/Kbd";

export function CommandPalette() {
  const open = useLayout((s) => s.paletteOpen);
  const setOpen = useLayout((s) => s.setPaletteOpen);
  const initialQuery = useLayout((s) => s.paletteQuery);
  const commands = useCommands();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? commands.filter((c) => `${c.group} ${c.title}`.toLowerCase().includes(q)) : commands;
  }, [commands, query]);

  useEffect(() => {
    if (open) { setQuery(initialQuery); setIndex(0); }
  }, [open, initialQuery]);
  useEffect(() => setIndex(0), [query]);

  const run = (i: number) => {
    const cmd = results[i];
    if (!cmd) return;
    setOpen(false);
    cmd.run();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-center bg-black/40 pt-[14vh] backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onPointerDown={() => setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
            transition={{ type: "spring", stiffness: 520, damping: 36 }}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-fit w-[560px] max-w-[90vw] overflow-hidden rounded-2xl bg-surface shadow-pop"
          >
            <div className="flex h-12 items-center gap-3 border-b border-line px-4">
              <Search size={15} className="text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search…"
                className="flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-faint"
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
                  if (e.key === "Enter") run(index);
                  if (e.key === "Escape") setOpen(false);
                }}
              />
              <Kbd>esc</Kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-1.5">
              {results.length === 0 && <div className="px-3 py-6 text-center text-[12.5px] text-muted">No matching commands</div>}
              {results.map((c, i) => (
                <button
                  key={c.id}
                  onPointerMove={() => setIndex(i)}
                  onClick={() => run(i)}
                  className={cn("relative flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px]", i === index ? "text-fg" : "text-fg-2")}
                >
                  {i === index && <motion.span layoutId="palette-active" className="absolute inset-0 rounded-lg bg-surface-2" transition={{ duration: 0.1 }} />}
                  <c.icon size={15} strokeWidth={1.75} className="relative text-muted" />
                  <span className="relative flex-1 truncate">{c.title}</span>
                  <span className="relative text-2xs text-faint">{c.group}</span>
                  {c.shortcut && <span className="relative"><Kbd>{c.shortcut}</Kbd></span>}
                </button>
              ))}
            </div>
            <div className="flex h-9 items-center gap-3 border-t border-line px-4 text-2xs text-faint">
              <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
              <span className="flex items-center gap-1"><Kbd><CornerDownLeft size={10} /></Kbd> run</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
