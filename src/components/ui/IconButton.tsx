import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { Tooltip } from "./Tooltip";

interface Props {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  side?: "top" | "bottom" | "right" | "left";
}

export function IconButton({ icon: Icon, label, shortcut, onClick, active, disabled, size = "md", side }: Props) {
  const box = size === "sm" ? "h-6 w-6" : "h-7 w-7";
  return (
    <Tooltip label={label} shortcut={shortcut} side={side}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "grid place-items-center rounded-md text-muted transition-colors duration-150",
          "hover:bg-surface hover:text-fg disabled:pointer-events-none disabled:opacity-35",
          active && "bg-surface text-fg",
          box,
        )}
      >
        <Icon size={size === "sm" ? 14 : 15} strokeWidth={1.75} />
      </button>
    </Tooltip>
  );
}
