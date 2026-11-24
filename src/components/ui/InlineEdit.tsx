import { useState } from "react";
import { cn } from "../../lib/cn";

/** Text that turns into an input on click. Enter/blur commits, Escape cancels. */
export function InlineEdit({ value, onCommit, className, label }: { value: string; onCommit: (v: string) => void; className?: string; label: string }) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} title={`Rename ${label}`} className={cn("max-w-full truncate rounded-md text-left hover:bg-surface/60", className)}>
        {value}
      </button>
    );
  }
  return (
    <input
      autoFocus
      aria-label={`Rename ${label}`}
      defaultValue={value}
      onFocus={(e) => e.target.select()}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (v && v !== value) onCommit(v);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setEditing(false);
      }}
      className={cn("w-full rounded-md bg-transparent outline-none ring-1 ring-line", className)}
    />
  );
}
