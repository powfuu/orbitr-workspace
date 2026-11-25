import { AnimatePresence, motion } from "framer-motion";
import { Check, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { THEMES } from "../../features/theme/themes";
import { useSettings } from "../../stores/settingsStore";
import { cn } from "../../lib/cn";

/** "Match system": pick which theme the app uses in OS dark mode and in light mode. */
export function SystemThemeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [dark, setDark] = useState(() => useSettings.getState().systemDark);
  const [light, setLight] = useState(() => useSettings.getState().systemLight);

  // Re-open with what's saved, marked.
  useEffect(() => {
    if (!open) return;
    setDark(useSettings.getState().systemDark);
    setLight(useSettings.getState().systemLight);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const save = () => {
    const { set } = useSettings.getState();
    set("systemDark", dark);
    set("systemLight", light);
    set("theme", "system");
    onClose();
  };

  const column = (mode: "dark" | "light", value: string, pick: (id: string) => void) => (
    <div className="min-w-0 flex-1">
      <div className="mb-2 flex items-center gap-1.5 term-heading">
        {mode === "dark" ? <Moon size={11} /> : <Sun size={11} />} {mode} mode
      </div>
      <div className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
        {THEMES.filter((t) => t.mode === mode).map((t) => (
          <button
            key={t.id}
            onClick={() => pick(t.id)}
            className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-mono text-[12px]", value === t.id ? "bg-surface text-fg ring-1 ring-accent/60" : "text-fg-2 hover:bg-surface/60")}
          >
            <span className="flex h-3.5 w-7 shrink-0 overflow-hidden rounded-sm ring-1 ring-line">
              <span className="flex-1" style={{ background: t.colors.bg }} />
              <span className="w-1.5" style={{ background: t.colors.accent }} />
              <span className="w-1.5" style={{ background: t.terminal.green }} />
            </span>
            <span className="truncate">{t.name}</span>
            {value === t.id && <Check size={12} className="ml-auto shrink-0 text-accent" />}
          </button>
        ))}
      </div>
    </div>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-label="Match system themes"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className="w-[560px] max-w-full rounded-xl border border-line bg-bg-2 p-5 shadow-pop"
          >
            <div className="mb-1 font-mono text-[13px] text-fg"><span className="text-success">❯</span> match system</div>
            <p className="mb-4 text-[11.5px] text-muted">Orbitr switches between these two when macOS changes between dark and light.</p>
            <div className="flex flex-col gap-5 sm:flex-row">
              {column("dark", dark, setDark)}
              {column("light", light, setLight)}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="h-7 rounded-md px-3 text-[12px] text-muted ring-1 ring-line hover:text-fg">Cancel</button>
              <button onClick={save} className="h-7 rounded-md bg-fg px-3 text-[12px] font-medium text-bg hover:bg-fg/85">Save</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
