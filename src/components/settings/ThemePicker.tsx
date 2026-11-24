import { Check, Monitor } from "lucide-react";
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

export function ThemePicker() {
  const theme = useSettings((s) => s.theme);
  const set = useSettings((s) => s.set);
  const card = (id: string, name: string, body: React.ReactNode) => (
    <button
      key={id}
      onClick={() => set("theme", id)}
      aria-pressed={theme === id}
      className={cn("rounded-lg p-1.5 text-left ring-1 transition-colors", theme === id ? "ring-accent" : "ring-line-soft hover:ring-line")}
    >
      {body}
      <div className="mt-1.5 flex items-center gap-1.5 px-0.5 text-[12px] text-fg-2">
        {name}
        {theme === id && <Check size={12} className="ml-auto text-accent" />}
      </div>
    </button>
  );
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5 p-4">
      {THEMES.map((t) => card(t.id, t.name, <Preview t={t} />))}
      {card(
        "system",
        "Match system",
        <div className="grid h-16 grid-cols-2 overflow-hidden rounded-md ring-1 ring-line">
          <div className="grid place-items-center" style={{ background: THEMES.find((t) => t.id === "paper")!.colors.bg }}>
            <Monitor size={14} color="#141414" />
          </div>
          <div className="grid place-items-center bg-black">
            <Monitor size={14} color="#ffffff" />
          </div>
        </div>,
      )}
    </div>
  );
}
