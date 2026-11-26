import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Tooltip } from "../ui/Tooltip";
import { SESSION_MIME, useRenaming } from "../../features/sidebar/folderStore";

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
  /** Enables rename (double-click, or the context menu via useRenaming) for this id. */
  renameId?: string;
  onRename?: (name: string) => void;
  /** Session id to drag into a folder. */
  dragId?: string;
}

export function SidebarItem({ icon, label, meta, trailing, active, onClick, onClose, closeLabel = "Close", tooltip, renameId, onRename, dragId }: Props) {
  const renaming = useRenaming((r) => !!renameId && r.id === renameId);
  const setRenaming = useRenaming((r) => r.set);
  const row = (
    <div
      className="group relative w-full"
      draggable={!!dragId && !renaming}
      onDragStart={(e) => {
        if (!dragId) return;
        e.dataTransfer.setData(SESSION_MIME, dragId);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <button
        onClick={onClick}
        onDoubleClick={() => renameId && onRename && setRenaming(renameId)}
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
        {renaming && onRename ? (
          <input
            autoFocus
            aria-label={`Rename ${label}`}
            defaultValue={label}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.target.select()}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== label) onRename(v);
              setRenaming(null);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setRenaming(null);
            }}
            className="relative min-w-0 flex-1 rounded bg-bg px-1 text-fg outline-none ring-1 ring-accent/50"
          />
        ) : (
          <span className="relative min-w-0 flex-1 truncate">{label}</span>
        )}
        <span className={cn("relative flex items-center gap-2", onClose && "group-hover:invisible group-focus-within:invisible")}>
          {meta && <span className="max-w-24 truncate font-mono text-[10.5px] text-faint">{meta}</span>}
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
