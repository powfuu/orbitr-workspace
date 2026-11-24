import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface Props {
  icon: ReactNode;
  label: string;
  meta?: ReactNode;
  trailing?: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export function SidebarItem({ icon, label, meta, trailing, active, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[12.5px] transition-colors",
        active ? "text-fg" : "text-fg-2 hover:bg-surface/60 hover:text-fg",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-md bg-surface ring-1 ring-line"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
      <span className="relative flex shrink-0 items-center">{icon}</span>
      <span className="relative min-w-0 flex-1 truncate">{label}</span>
      {meta && <span className="relative truncate font-mono text-[10.5px] text-faint">{meta}</span>}
      {trailing && <span className="relative">{trailing}</span>}
    </button>
  );
}
