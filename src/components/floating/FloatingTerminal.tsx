import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, Minimize2, X } from "lucide-react";
import { useEffect } from "react";
import { FLOATING_ID, ensureFloatingShell, hideFloating, toggleFloating, useFloating } from "../../features/floating/floatingTerminal";
import { isMac, isTauri, modKey } from "../../lib/platform";
import { cn } from "../../lib/cn";
import { IconButton } from "../ui/IconButton";
import { TerminalView } from "../terminal/TerminalView";

const shift = isMac ? "⇧" : "+Shift+";

/** Centered scratch terminal (⌘N), or the whole window (⌘⇧N). */
export function FloatingTerminal() {
  const { open, full } = useFloating();

  useEffect(() => {
    if (open) void ensureFloatingShell();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="floating"
          data-region="floating"
          className={cn("fixed inset-0 z-[70] grid place-items-center", !full && "bg-black/45 p-6")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onMouseDown={(e) => e.target === e.currentTarget && hideFloating()}
        >
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className={cn(
              "flex flex-col overflow-hidden bg-term",
              full ? "h-full w-full" : "h-[min(78vh,820px)] w-[min(1180px,92vw)] rounded-xl border border-line shadow-pop",
            )}
          >
            <div className={cn("flex h-9 shrink-0 items-center gap-2 border-b border-line-soft bg-bg px-3 font-mono text-[11.5px]", full && isMac && "pl-20")}>
              <span className="text-success">❯</span>
              <span className="text-fg-2">terminal</span>
              <span className="text-faint">{full ? `${modKey}${shift}N to exit full screen` : `${modKey}N to hide · it keeps running`}</span>
              <div className="flex-1" />
              <IconButton
                icon={full ? Minimize2 : Maximize2}
                label={full ? "Exit full screen" : "Full screen"}
                shortcut={`${modKey}${shift}N`}
                size="sm"
                onClick={() => (full ? toggleFloating(true) : toggleFloating(true))}
              />
              <IconButton icon={X} label="Hide" shortcut={`${modKey}N`} size="sm" onClick={hideFloating} />
            </div>
            <div className="min-h-0 flex-1 p-2">
              {isTauri ? (
                <TerminalView id={FLOATING_ID} focused />
              ) : (
                <div className="p-2 font-mono text-[12px] text-faint"># terminals need the Orbitr desktop runtime</div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
