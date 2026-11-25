import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Monitor } from "lucide-react";
import { useState } from "react";
import { SystemThemeDialog } from "./SystemThemeDialog";
import { themeById } from "../../features/theme/themes";
import { THEMES, type ThemeDef } from "../../features/theme/themes";
import { useSettings } from "../../stores/settingsStore";
import { cn } from "../../lib/cn";

/** Miniature of the app in a theme's colours: sidebar, tab, terminal line. */
function Preview({ t }: { t: ThemeDef }) {
  const c = t.colors;
  return (
    <div className="flex h-16 overflow-hidden rounded-md" style={{ background: c.bg, boxShadow: `0 0 0 1px ${c.line}` }}>
      <div className="w-1/4 space-y-1 p-1.5" style={{ background: c["bg-2"], borderRight: `1px solid ${c["line-soft"]}` }}>
        <div className="h-1 w-3/4 rounded-full" style={{ background: c.fg }} />
        <div className="h-1 w-1/2 rounded-full" style={{ background: c.muted }} />
        <div className="h-1 w-2/3 rounded-full" style={{ background: c.faint }} />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex h-3 items-end gap-1 px-1.5" style={{ borderBottom: `1px solid ${c["line-soft"]}` }}>
          <div className="h-2 w-6 rounded-t-sm" style={{ background: c["bg-2"], borderTop: `1px solid ${c.accent}` }} />
          <div className="h-1 w-4 rounded-full" style={{ background: c.faint }} />
        </div>
        <div className="flex-1 space-y-1 p-1.5 font-mono" style={{ background: t.terminal.background }}>
          <div className="flex gap-1">
            <div className="h-1 w-2 rounded-full" style={{ background: t.terminal.green }} />
            <div className="h-1 w-8 rounded-full" style={{ background: t.terminal.foreground }} />
          </div>
          <div className="flex gap-1">
            <div className="h-1 w-5 rounded-full" style={{ background: t.terminal.blue }} />
            <div className="h-1 w-3 rounded-full" style={{ background: t.terminal.yellow }} />
            <div className="h-1 w-4 rounded-full" style={{ background: t.terminal.red }} />
          </div>
        </div>
      </div>
    </div>
  );
}

const COLLAPSED = 7;

export function ThemePicker() {
  const theme = useSettings((s) => s.theme);
  const set = useSettings((s) => s.set);
  const [open, setOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
  const pair = useSettings((s) => `${themeById(s.systemDark).name} · ${themeById(s.systemLight).name}`);
  // Collapsed: the first few, plus the current one so it's always visible.
  const shown = open ? THEMES : THEMES.filter((t, i) => i < COLLAPSED || t.id === theme);
  const card = (id: string, name: string, body: React.ReactNode) => (
    <motion.button
      key={id}
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      onClick={() => (id === "system" ? setSystemOpen(true) : set("theme", id))}
      aria-pressed={theme === id}
      className={cn("rounded-lg p-1.5 text-left ring-1 transition-colors", theme === id ? "ring-accent" : "ring-line-soft hover:ring-line")}
    >
      {body}
      <div className="mt-1.5 flex items-center gap-1.5 px-0.5 text-[12px] text-fg-2">
        {name}
        {theme === id && <Check size={12} className="ml-auto text-accent" />}
      </div>
    </motion.button>
  );
  return (
    <div className="p-4">
    <motion.div layout className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5">
      <AnimatePresence initial={false} mode="popLayout">
      {shown.map((t) => card(t.id, t.name, <Preview t={t} />))}
      {card(
        "system",
        theme === "system" ? `System · ${pair}` : "Match system",
        <div className="grid h-16 grid-cols-2 overflow-hidden rounded-md ring-1 ring-line">
          <div className="grid place-items-center" style={{ background: THEMES.find((t) => t.id === "paper")!.colors.bg }}>
            <Monitor size={14} color="#141414" />
          </div>
          <div className="grid place-items-center bg-black">
            <Monitor size={14} color="#ffffff" />
          </div>
        </div>,
      )}
      </AnimatePresence>
    </motion.div>
    <motion.button
      layout
      onClick={() => setOpen(!open)}
      className="mx-auto mt-3 flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[11.5px] text-muted ring-1 ring-line-soft hover:text-fg"
    >
      {open ? "show less" : `show all ${THEMES.length} themes`}
      <motion.span animate={{ rotate: open ? 180 : 0 }} className="flex"><ChevronDown size={12} /></motion.span>
    </motion.button>
    <SystemThemeDialog open={systemOpen} onClose={() => setSystemOpen(false)} />
    </div>
  );
}
