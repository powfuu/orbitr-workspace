import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Plus, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useLayout } from "../../stores/layoutStore";
import { IconButton } from "../ui/IconButton";

interface Props {
  id: string;
  title: string;
  count: number;
  onAdd?: () => void;
  addLabel?: string;
  addDisabled?: boolean;
  children: ReactNode;
  icon?: LucideIcon;
  /** Initial state until the user toggles it (then their choice is remembered). */
  defaultCollapsed?: boolean;
}

export function SidebarSection({ id, title, count, onAdd, addLabel, addDisabled, children, icon: Icon, defaultCollapsed = false }: Props) {
  const collapsed = useLayout((s) => s.collapsedSections[id] ?? defaultCollapsed);
  const setCollapsed = (v: boolean) => useLayout.setState((s) => ({ collapsedSections: { ...s.collapsedSections, [id]: v } }));
  return (
    <section className="px-2 pt-3">
      <div className="group flex h-6 items-center pl-1.5 pr-0.5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          className="flex flex-1 items-center gap-1 font-mono text-[11px] lowercase text-faint hover:text-muted"
        >
          <motion.span animate={{ rotate: collapsed ? 0 : 90 }} transition={{ duration: 0.15 }}>
            <ChevronRight size={11} strokeWidth={2.25} />
          </motion.span>
          {Icon && <Icon size={12} strokeWidth={2} className="ml-0.5 mr-0.5" />}
          {title}
          <span className="ml-1 text-faint/70">[{count}]</span>
        </button>
        {onAdd && (
          <span className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <IconButton icon={Plus} label={addLabel ?? "Add"} size="sm" onClick={onAdd} disabled={addDisabled} side="right" />
          </span>
        )}
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-2 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function SidebarHint({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-1 rounded-md border border-dashed border-line-soft px-2.5 py-2 text-[11.5px] leading-relaxed text-faint">
      {children}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}
