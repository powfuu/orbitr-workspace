import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CornerDownLeft, Send, TextQuote } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { create } from "zustand";
import { useSnippets, type Snippet } from "../../features/snippets/snippetStore";
import { variablesOf } from "../../features/snippets/template";
import { sendSnippet } from "../../features/snippets/sendSnippet";
import { resolveVoiceTarget } from "../../features/voice/voiceStore";
import { fuzzyFilter } from "../../features/editors/fuzzy";
import { modKey } from "../../lib/platform";
import { cn } from "../../lib/cn";
import { Kbd } from "../ui/Kbd";

export const useSnippetPicker = create<{ open: boolean; set: (open: boolean) => void }>()((set) => ({ open: false, set: (open) => set({ open }) }));

/** Mod+; — pick a saved prompt, fill its {{variables}}, send it to the focused session. */
export function SnippetPicker() {
  const { open, set } = useSnippetPicker();
  const snippets = useSnippets((s) => s.snippets);
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<Snippet | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const target = open ? resolveVoiceTarget() : null;
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setI(0);
      setChosen(null);
      setValues({});
    }
  }, [open]);

  const byName = useMemo(() => new Map(snippets.map((s) => [s.name, s])), [snippets]);
  const shown = useMemo(() => fuzzyFilter(snippets.map((s) => s.name), q).map((n) => byName.get(n)!), [snippets, q, byName]);
  const vars = chosen ? variablesOf(chosen.text) : [];

  const close = () => set(false);
  const go = (s?: Snippet) => {
    if (!s) return;
    if (variablesOf(s.text).length) {
      setChosen(s);
      window.setTimeout(() => firstField.current?.focus(), 30);
    } else {
      close();
      void sendSnippet(s);
    }
  };
  const submit = () => {
    if (!chosen) return;
    close();
    void sendSnippet(chosen, values);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex justify-center bg-black/40 pt-[14vh] backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} onPointerDown={close}>
          <motion.div
            role="dialog"
            aria-label="Snippets"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 520, damping: 36 }}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Escape" && (chosen ? setChosen(null) : close())}
            className="h-fit w-[560px] max-w-[90vw] overflow-hidden rounded-2xl bg-surface shadow-pop"
          >
            {!chosen ? (
              <>
                <div className="flex h-12 items-center gap-3 border-b border-line px-4">
                  <TextQuote size={15} className="text-muted" />
                  <input
                    autoFocus
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setI(0); }}
                    placeholder="Send a snippet…"
                    className="flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-faint"
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(x + 1, shown.length - 1)); }
                      if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
                      if (e.key === "Enter") go(shown[i]);
                    }}
                  />
                  <span className="max-w-44 truncate text-[11px] text-faint">{target ? `→ ${target.name}` : "no session focused"}</span>
                </div>
                <div className="max-h-80 overflow-y-auto p-1.5">
                  {shown.length === 0 && <div className="px-3 py-6 text-center text-[12.5px] text-muted">No snippets. Add them in Settings → Snippets.</div>}
                  {shown.map((s, idx) => (
                    <button key={s.id} onPointerMove={() => setI(idx)} onClick={() => go(s)} className={cn("flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left", idx === i && "bg-surface-2")}>
                      <span className="text-[13px] text-fg">{s.name}</span>
                      <span className="line-clamp-1 text-[11.5px] text-muted">{s.text}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <div className="flex h-12 items-center gap-2 border-b border-line px-3">
                  <button type="button" aria-label="Back" onClick={() => setChosen(null)} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"><ArrowLeft size={14} /></button>
                  <span className="text-[13px] font-medium text-fg">{chosen.name}</span>
                </div>
                <div className="space-y-3 p-4">
                  {vars.map((v, idx) => (
                    <label key={v} className="block">
                      <span className="mb-1 block font-mono text-[11px] text-muted">{v}</span>
                      <input
                        ref={idx === 0 ? firstField : undefined}
                        value={values[v] ?? ""}
                        onChange={(e) => setValues((x) => ({ ...x, [v]: e.target.value }))}
                        className="h-8 w-full rounded-md bg-bg px-2.5 text-[13px] text-fg outline-none ring-1 ring-line focus:ring-accent/60"
                      />
                    </label>
                  ))}
                  <div className="selectable rounded-md bg-bg px-3 py-2 text-[12px] leading-relaxed text-fg-2">
                    {chosen.text.split(/(\{\{\s*[\w\s-]+?\s*\}\})/g).map((part, k) => {
                      const m = /^\{\{\s*([\w\s-]+?)\s*\}\}$/.exec(part);
                      return m ? <span key={k} className={values[m[1]!] ? "text-fg" : "text-warning"}>{values[m[1]!] || part}</span> : <span key={k}>{part}</span>;
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-line px-4 py-2.5">
                  <span className="truncate text-[11px] text-faint">{target ? `→ ${target.name}` : "no session focused"}</span>
                  <button type="submit" className="ml-auto flex h-8 items-center gap-1.5 rounded-lg bg-fg px-3 text-[12.5px] font-medium text-bg hover:bg-fg/85">
                    <Send size={12} /> Send <Kbd><CornerDownLeft size={10} /></Kbd>
                  </button>
                </div>
              </form>
            )}
            <div className="flex h-8 items-center gap-3 border-t border-line px-4 text-2xs text-faint">
              <span>Say a snippet's name by voice ({modKey}⇧V) to send it</span>
              <span className="ml-auto"><Kbd>{modKey};</Kbd></span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
