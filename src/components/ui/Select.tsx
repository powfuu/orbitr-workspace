import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";

export interface SelectOption<V extends string> {
  value: V;
  label: string;
  /** Secondary text on the right (e.g. a path). */
  hint?: string;
  /** Options with the same group are listed under a small heading. */
  group?: string;
  /** Rendered next to the label (also used for the trigger). */
  icon?: ReactNode;
  /** CSS font-family to preview the label in (font pickers). */
  fontFamily?: string;
}

interface Props<V extends string> {
  value: V;
  options: SelectOption<V>[];
  onChange: (v: V) => void;
  ariaLabel: string;
  className?: string;
  /** Show a filter field; defaults to on for long lists. */
  searchable?: boolean;
}

const MENU_MAX = 320;

/**
 * Themed dropdown replacing the native <select> (whose popup is drawn by the OS and
 * ignores the app's look). Keyboard: ↑/↓, Home/End, type to filter, Enter, Esc.
 * Rendered in a portal and flipped above the trigger when there is no room below.
 */
export function Select<V extends string>({ value, options, onChange, ariaLabel, className, searchable }: Props<V>) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; up: boolean } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const search = searchable ?? options.length > 8;
  const current = options.find((o) => o.value === value);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => `${o.label} ${o.hint ?? ""} ${o.group ?? ""}`.toLowerCase().includes(t)) : options;
  }, [options, q]);

  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const r = trigger.current.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < MENU_MAX + 16 && r.top > window.innerHeight - r.bottom;
    setPos({ left: Math.min(r.left, window.innerWidth - Math.max(r.width, 240) - 8), top: up ? r.top - 6 : r.bottom + 6, width: Math.max(r.width, 240), up });
    setActive(Math.max(0, shown.findIndex((o) => o.value === value)));
    setQ("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!list.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) setOpen(false);
    };
    const onScroll = (e: Event) => !list.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", () => setOpen(false), { once: true });
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (o?: SelectOption<V>) => {
    if (!o) return;
    onChange(o.value);
    setOpen(false);
    trigger.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(shown.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); pick(shown[active]); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); trigger.current?.focus(); }
  };

  let lastGroup: string | undefined;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen(true);
          } else if (open) onKey(e);
        }}
        className={cn(
          "flex h-7 min-w-0 items-center gap-2 rounded-md bg-bg px-2 text-left text-[12px] text-fg ring-1 ring-line transition-colors hover:ring-faint focus-visible:ring-accent/60",
          className,
        )}
      >
        {current?.icon}
        <span className="min-w-0 flex-1 truncate" style={current?.fontFamily ? { fontFamily: current.fontFamily } : undefined}>{current?.label ?? "Select…"}</span>
        <ChevronsUpDown size={12} className="shrink-0 text-faint" />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={list}
              role="listbox"
              aria-label={ariaLabel}
              initial={{ opacity: 0, y: pos.up ? 4 : -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              transition={{ duration: 0.14, ease: [0.2, 0, 0, 1] }}
              style={{ left: pos.left, width: pos.width, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
              className={cn("fixed z-[80] flex flex-col overflow-hidden rounded-xl bg-surface shadow-pop", pos.up ? "origin-bottom" : "origin-top")}
              onKeyDown={onKey}
            >
              {search && (
                <label className="flex h-9 shrink-0 items-center gap-2 border-b border-line px-3">
                  <Search size={12} className="text-faint" />
                  <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} placeholder="Filter…" className="min-w-0 flex-1 bg-transparent text-[12px] text-fg outline-none placeholder:text-faint" />
                </label>
              )}
              <div className="overflow-y-auto p-1" style={{ maxHeight: MENU_MAX }} tabIndex={search ? -1 : 0} ref={(el) => { if (el && !search) el.focus(); }}>
                {shown.length === 0 && <div className="px-3 py-4 text-center text-[12px] text-muted">No matches</div>}
                {shown.map((o, i) => {
                  const heading = o.group && o.group !== lastGroup ? o.group : null;
                  lastGroup = o.group;
                  return (
                    <div key={o.value}>
                      {heading && <div className="px-2.5 pb-1 pt-2 text-2xs font-medium uppercase tracking-[0.08em] text-faint">{heading}</div>}
                      <button
                        type="button"
                        role="option"
                        aria-selected={o.value === value}
                        data-i={i}
                        onPointerMove={() => setActive(i)}
                        onClick={() => pick(o)}
                        className={cn("flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-[12.5px]", i === active ? "bg-surface-2 text-fg" : "text-fg-2")}
                      >
                        {o.icon}
                        <span className="min-w-0 flex-1 truncate" style={o.fontFamily ? { fontFamily: o.fontFamily } : undefined}>{o.label}</span>
                        {o.hint && <span className="max-w-[45%] truncate font-mono text-[10.5px] text-faint">{o.hint}</span>}
                        <Check size={12} className={cn("shrink-0 text-accent", o.value !== value && "invisible")} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
