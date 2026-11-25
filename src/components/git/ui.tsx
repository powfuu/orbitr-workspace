import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";

/** Small text button used across the Git views. `danger` asks for a second click. */
export function GitButton({ children, onClick, disabled, primary, danger, title }: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
  title?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 2500);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (danger && !armed) return setArmed(true);
        setArmed(false);
        onClick();
      }}
      className={cn(
        "flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded px-2 text-[11px] transition-colors disabled:opacity-40",
        armed ? "bg-error text-white" : primary ? "bg-fg text-bg hover:bg-fg/85" : danger ? "text-error ring-1 ring-error/40 hover:bg-error/10" : "text-fg-2 ring-1 ring-line hover:bg-surface hover:text-fg",
      )}
    >
      {armed ? "confirm?" : children}
    </button>
  );
}

/** Branch/tag decorations from `%D` as chips: at most two, each truncated, the rest as "+n". */
export function RefChips({ refs }: { refs: string }) {
  if (!refs) return null;
  const all = refs.split(", ");
  const shown = all.slice(0, 2);
  return (
    <span className="flex min-w-0 max-w-[45%] shrink items-center gap-1 overflow-hidden" title={all.join("\n")}>
      {shown.map((r) => {
        const head = r.startsWith("HEAD -> ");
        const tag = r.startsWith("tag: ");
        const name = r.replace("HEAD -> ", "").replace("tag: ", "");
        return (
          <span
            key={r}
            className={cn(
              "min-w-0 max-w-[16rem] truncate rounded-sm px-1.5 font-mono text-[10px] leading-4",
              head ? "shrink-0 bg-accent text-bg" : tag ? "bg-warning/15 text-warning" : name.includes("/") ? "bg-surface-2 text-muted" : "bg-success/15 text-success",
            )}
          >
            {tag ? `⌂ ${name}` : name}
          </span>
        );
      })}
      {all.length > 2 && <span className="shrink-0 font-mono text-[10px] text-faint">+{all.length - 2}</span>}
    </span>
  );
}

export function TextInput({ value, onChange, onEnter, onCancel, placeholder, className, autoFocus }: {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  /** Escape or leaving the field (for inline edits). */
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onEnter?.();
        if (e.key === "Escape" && onCancel) {
          e.stopPropagation();
          onCancel();
        }
      }}
      onBlur={onCancel}
      placeholder={placeholder}
      className={cn("h-7 min-w-0 rounded-md bg-bg px-2 font-mono text-[12px] text-fg outline-none ring-1 ring-line-soft placeholder:font-sans placeholder:text-faint focus:ring-fg/30", className)}
    />
  );
}

/** Sourcetree-style sync badges: ↑ to push, ↓ to pull. */
export function SyncBadges({ ahead, behind, gone }: { ahead: number; behind: number; gone?: boolean }) {
  if (gone) return <span className="shrink-0 rounded-sm bg-error/15 px-1.5 font-mono text-[10px] leading-4 text-error" title="Upstream branch was deleted on the remote">gone</span>;
  if (!ahead && !behind) return null;
  return (
    <span className="flex shrink-0 items-center gap-1 font-mono text-[10.5px] leading-4">
      {ahead > 0 && <span className="rounded-sm bg-fg/10 px-1.5 text-fg" title={`${ahead} commit${ahead === 1 ? "" : "s"} to push`}>↑{ahead}</span>}
      {behind > 0 && <span className="rounded-sm bg-warning/15 px-1.5 text-warning" title={`${behind} commit${behind === 1 ? "" : "s"} to pull`}>↓{behind}</span>}
    </span>
  );
}
