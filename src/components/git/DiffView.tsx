import { ONE_DARK, extOf, highlight } from "../../lib/syntax";

const MAX_LINES = 2000;

/** Unified diff, One Dark themed with syntax colours. Text stays selectable. */
export function DiffView({ diff }: { diff: string }) {
  const lines = diff.split("\n");
  const shown = lines.slice(0, MAX_LINES);
  if (!diff.trim()) return <div className="p-4 text-[12px] text-muted">No textual changes (binary file or mode change).</div>;
  const file = lines.find((l) => l.startsWith("+++ "))?.replace(/^\+\+\+ (b\/)?/, "") ?? "";
  const ext = extOf(file);
  return (
    <pre className="selectable overflow-auto py-1 font-mono text-[11.5px] leading-[1.55]" style={{ background: ONE_DARK.bg, color: ONE_DARK.text }}>
      {shown.map((l, i) => {
        const meta = l.startsWith("+++") || l.startsWith("---") || l.startsWith("diff ") || l.startsWith("index ") || l.startsWith("new file") || l.startsWith("deleted file");
        if (meta) return <div key={i} className="px-4" style={{ color: ONE_DARK.gutter }}>{l || " "}</div>;
        if (l.startsWith("@@")) return <div key={i} className="px-4" style={{ color: ONE_DARK.hunk, background: "rgba(97,175,239,0.08)" }}>{l}</div>;
        const add = l.startsWith("+");
        const del = l.startsWith("-");
        return (
          <div key={i} className="flex px-4" style={{ background: add ? ONE_DARK.addBg : del ? ONE_DARK.delBg : undefined }}>
            <span className="w-4 shrink-0 select-none" style={{ color: add ? ONE_DARK.add : del ? ONE_DARK.del : ONE_DARK.gutter }}>{add ? "+" : del ? "−" : " "}</span>
            <span className="whitespace-pre">{highlight(add || del || l.startsWith(" ") ? l.slice(1) : l, ext)}</span>
          </div>
        );
      })}
      {lines.length > MAX_LINES && <div className="px-4 py-2" style={{ color: ONE_DARK.comment }}>… {lines.length - MAX_LINES} more lines</div>}
    </pre>
  );
}
