import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Tooltip } from "../ui/Tooltip";

interface Props {
  icon: ReactNode;
  label: string;
  meta?: ReactNode;
  trailing?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  /** Shows a trash button on hover/focus that replaces the trailing info. */
  onClose?: () => void;
  closeLabel?: string;
  /** Hover tooltip (e.g. a terminal's full path). */
  tooltip?: string;
}

export function SidebarItem({ icon, label, meta, trailing, active, onClick, onClose, closeLabel = "Close", tooltip }: Props) {
  const row = (
    <div className="group relative w-full">
      <button
        onClick={onClick}
        className={cn(
          "relative flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[12.5px] transition-colors",
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
        <span className={cn("relative flex items-center gap-2", onClose && "group-hover:invisible group-focus-within:invisible")}>
          {meta && <span className="truncate font-mono text-[10.5px] text-faint">{meta}</span>}
          {trailing}
        </span>
      </button>
      {onClose && (
        <button
          type="button"
          aria-label={`${closeLabel} ${label}`}
          title={closeLabel}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute right-1 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-faint opacity-0 transition-opacity hover:bg-error/15 hover:text-error focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
  return tooltip ? (
    <Tooltip label={tooltip} side="right" block>
      {row}
    </Tooltip>
  ) : (
    row
  );
}
