import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSessions } from "../../stores/sessionStore";
import { closeTerminal } from "../../features/terminals/terminalActions";
import { cn } from "../../lib/cn";
import { StatusDot } from "../ui/StatusDot";
import { PromptChip } from "../approvals/PromptChip";
import { Tooltip } from "../ui/Tooltip";
import { cwdFull } from "../../features/terminals/terminalContext";

export function TerminalTabs() {
  const { terminals, activeTerminalId, setActiveTerminal, updateTerminal } = useSessions();
  const [editing, setEditing] = useState<string | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  // Keep the active tab visible when there are more tabs than fit.
  useEffect(() => {
    strip.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  }, [activeTerminalId, terminals.length]);

  return (
    <div ref={strip} onWheel={(e) => { if (strip.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) strip.current.scrollLeft += e.deltaY; }} role="tablist" className="flex h-9 shrink-0 items-stretch gap-px overflow-x-auto border-b border-line-soft px-1 [scrollbar-width:none]">
      <AnimatePresence initial={false}>
        {terminals.map((t, i) => {
          const active = t.id === activeTerminalId;
          return (
            <Tooltip key={t.id} className="relative flex min-w-[128px] max-w-56 flex-1 basis-0" label={`${cwdFull(t.cwd)}${t.pid ? `  ·  pid ${t.pid}` : ""}`}>
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, width: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.14 }}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTerminal(t.id)}
              onDoubleClick={() => setEditing(t.id)}
              onAuxClick={(e) => e.button === 1 && void closeTerminal(t.id)}
              className={cn(
                "group relative flex h-full w-full min-w-0 cursor-default items-center gap-1.5 px-2 font-mono text-[11px] transition-colors",
                active ? "bg-surface/70 text-fg" : "text-faint hover:bg-surface/30 hover:text-fg-2",
              )}
            >
              {active && (
                <motion.span layoutId="term-tab" className="absolute inset-x-0 bottom-0 h-[2px] bg-accent" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
              )}
              <span className="relative"><StatusDot status={t.status} /></span>
              {i < 9 && <span className="relative text-[10px] text-faint">{i + 1}</span>}
              {editing === t.id ? (
                <input
                  autoFocus
                  defaultValue={t.name}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => { updateTerminal(t.id, { name: e.target.value.trim() || t.name }); setEditing(null); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="relative w-full min-w-0 bg-transparent outline-none"
                />
              ) : (
                <span className={cn("relative min-w-0 flex-1 truncate", t.status === "exited" && "text-faint line-through decoration-faint/50")}>{t.name}</span>
              )}
              <span className="relative"><PromptChip id={t.id} /></span>
              <button
                aria-label={`Close ${t.name}`}
                onClick={(e) => { e.stopPropagation(); void closeTerminal(t.id); }}
                className={cn("relative grid h-4 w-4 shrink-0 place-items-center rounded text-faint hover:bg-surface-2 hover:text-fg", !active && "opacity-0 group-hover:opacity-100")}
              >
                <X size={10} />
              </button>
            </motion.div>
            </Tooltip>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
