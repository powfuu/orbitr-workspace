import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, CaseSensitive, Regex, WholeWord, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ISearchOptions } from "@xterm/addon-search";
import { terminalRegistry } from "../../features/terminals/terminalRegistry";
import { useTerminalSearch } from "../../features/search/searchStore";
import { cn } from "../../lib/cn";
import type { ID } from "../../types";

const decorations: ISearchOptions["decorations"] = {
  matchBackground: "#ffffff33",
  matchBorder: "#ffffff00",
  matchOverviewRuler: "#ffffff88",
  activeMatchBackground: "#f0b95b",
  activeMatchBorder: "#f0b95b",
  activeMatchColorOverviewRuler: "#f0b95b",
};

/** Find-in-terminal over scrollback: live highlights, n/total, case/word/regex toggles. */
export function TerminalSearchBar({ id }: { id: ID }) {
  const close = useTerminalSearch((s) => s.close);
  const input = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState("");
  const [flags, setFlags] = useState({ caseSensitive: false, wholeWord: false, regex: false });
  const [results, setResults] = useState<{ index: number; count: number } | null>(null);
  const [invalid, setInvalid] = useState(false);

  const addon = terminalRegistry.search(id);
  const opts = (incremental = false): ISearchOptions => ({ ...flags, incremental, decorations });

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
    const sub = addon?.onDidChangeResults((r) => setResults(r.resultCount ? { index: r.resultIndex, count: r.resultCount } : { index: -1, count: 0 }));
    return () => {
      sub?.dispose();
      addon?.clearDecorations();
    };
  }, [addon]);

  // Re-run as you type or toggle options.
  useEffect(() => {
    if (!addon) return;
    if (!term) {
      addon.clearDecorations();
      setResults(null);
      setInvalid(false);
      return;
    }
    if (flags.regex) {
      try {
        new RegExp(term);
      } catch {
        setInvalid(true);
        return;
      }
    }
    setInvalid(false);
    addon.findNext(term, opts(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, flags, addon]);

  const step = (dir: 1 | -1) => term && !invalid && (dir === 1 ? addon?.findNext(term, opts()) : addon?.findPrevious(term, opts()));
  const dismiss = () => {
    close();
    terminalRegistry.focus(id);
  };

  const toggle = (k: keyof typeof flags, Icon: typeof Regex, label: string) => (
    <button
      type="button"
      aria-pressed={flags[k]}
      title={label}
      onClick={() => setFlags((f) => ({ ...f, [k]: !f[k] }))}
      className={cn("grid h-6 w-6 place-items-center rounded", flags[k] ? "bg-white text-black" : "text-muted hover:bg-surface-2 hover:text-fg")}
    >
      <Icon size={14} />
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.12 }}
      className="absolute right-3 top-2 z-20 flex max-w-[calc(100%-24px)] items-center gap-1 rounded-lg bg-surface p-1 pl-2.5 shadow-pop"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <input
        ref={input}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            step(e.shiftKey ? -1 : 1);
          }
          if (e.key === "Escape") dismiss();
        }}
        placeholder="Find"
        spellCheck={false}
        className={cn("w-44 min-w-16 shrink bg-transparent font-mono text-[12px] text-fg outline-none placeholder:font-sans placeholder:text-faint", invalid && "text-error")}
      />
      <span className={cn("min-w-14 text-right font-mono text-[10.5px]", results?.count === 0 ? "text-error" : "text-faint")}>
        {invalid ? "bad regex" : results ? (results.count ? `${results.index + 1}/${results.count}` : "no results") : ""}
      </span>
      <div className="mx-1 h-4 w-px bg-line" />
      {toggle("caseSensitive", CaseSensitive, "Match case")}
      {toggle("wholeWord", WholeWord, "Whole word")}
      {toggle("regex", Regex, "Regular expression")}
      <div className="mx-1 h-4 w-px bg-line" />
      <button type="button" title="Previous (⇧↵)" onClick={() => step(-1)} className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-surface-2 hover:text-fg">
        <ArrowUp size={14} />
      </button>
      <button type="button" title="Next (↵)" onClick={() => step(1)} className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-surface-2 hover:text-fg">
        <ArrowDown size={14} />
      </button>
      <button type="button" title="Close (Esc)" onClick={dismiss} className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-surface-2 hover:text-fg">
        <X size={14} />
      </button>
    </motion.div>
  );
}
