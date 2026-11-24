import { Plus, Trash2 } from "lucide-react";
import { useSnippets, type Snippet } from "../../features/snippets/snippetStore";
import { variablesOf } from "../../features/snippets/template";
import { cn } from "../../lib/cn";
import { IconButton } from "../ui/IconButton";

function Row({ s }: { s: Snippet }) {
  const { save, remove } = useSnippets.getState();
  const vars = variablesOf(s.text);
  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex items-center gap-2">
        <input
          value={s.name}
          onChange={(e) => save({ ...s, name: e.target.value })}
          placeholder="Name (say it by voice to send)"
          className="h-7 min-w-0 flex-1 rounded-md bg-bg px-2 text-[12.5px] font-medium text-fg outline-none ring-1 ring-line-soft focus:ring-accent/60"
        />
        <label className="flex shrink-0 items-center gap-1.5 text-[11.5px] text-muted" title="Press Enter after typing it">
          <input type="checkbox" checked={s.submit} onChange={(e) => save({ ...s, submit: e.target.checked })} className="accent-fg" />
          Enter
        </label>
        <IconButton icon={Trash2} size="sm" label="Delete snippet" onClick={() => remove(s.id)} />
      </div>
      <textarea
        value={s.text}
        onChange={(e) => save({ ...s, text: e.target.value })}
        rows={2}
        placeholder="Text to send. Use {{variable}} for values asked when sending."
        className="w-full resize-y rounded-md bg-bg px-2.5 py-2 text-[12.5px] leading-relaxed text-fg-2 outline-none ring-1 ring-line-soft focus:ring-accent/60"
      />
      {vars.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {vars.map((v) => (
            <span key={v} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-fg-2">{`{{${v}}}`}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Settings → Snippets: saved prompts sent with Mod+;, the palette or by voice. */
export function SnippetsSection() {
  const snippets = useSnippets((s) => s.snippets);
  return (
    <>
      {snippets.map((s) => <Row key={s.id} s={s} />)}
      <div className={cn("px-4 py-3", snippets.length > 0 && "border-t border-line-soft")}>
        <button
          onClick={() => useSnippets.getState().save({ name: "New snippet", text: "", submit: true })}
          className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] text-fg ring-1 ring-line hover:bg-surface"
        >
          <Plus size={12} /> Add snippet
        </button>
      </div>
    </>
  );
}
