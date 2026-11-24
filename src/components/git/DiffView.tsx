import { cn } from "../../lib/cn";

const MAX_LINES = 2000;

/** Unified diff with per-line colouring. Text stays selectable. */
export function DiffView({ diff }: { diff: string }) {
  const lines = diff.split("\n");
  const shown = lines.slice(0, MAX_LINES);
  if (!diff.trim()) return <div className="p-4 text-[12px] text-muted">No textual changes (binary file or mode change).</div>;
  return (
    <pre className="selectable overflow-auto font-mono text-[11.5px] leading-[1.55]">
      {shown.map((l, i) => {
        const tone = l.startsWith("+++") || l.startsWith("---") || l.startsWith("diff ") || l.startsWith("index ")
          ? "text-faint"
          : l.startsWith("@@")
            ? "bg-white/[0.04] text-muted"
            : l.startsWith("+")
              ? "bg-success/10 text-success"
              : l.startsWith("-")
                ? "bg-error/10 text-error"
                : "text-fg-2";
        return (
          <div key={i} className={cn("px-4", tone)}>
            {l || " "}
          </div>
        );
      })}
      {lines.length > MAX_LINES && <div className="px-4 py-2 text-faint">… {lines.length - MAX_LINES} more lines</div>}
    </pre>
  );
}
