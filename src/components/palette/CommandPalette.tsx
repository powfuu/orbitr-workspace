import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLayout } from "../../stores/layoutStore";
import { useWorkspaces } from "../../stores/workspaceStore";
import { getActiveTabs } from "../../stores/tabStore";
import { useGit } from "../../features/git/gitStore";
import { useCommands, type Command } from "../../features/commands/useCommands";
import { currentTheme } from "../../features/theme/applyTheme";
import { cn } from "../../lib/cn";
import { useSettings } from "../../stores/settingsStore";
import { terminalFontFamily } from "../../features/terminals/fonts";

/** Groups in order of first appearance, so each "-- group --" header shows once. */
function grouped(commands: Command[]) {
  const order = new Map<string, number>();
  commands.forEach((c) => !order.has(c.group) && order.set(c.group, order.size));
  return [...commands].sort((a, b) => order.get(a.group)! - order.get(b.group)!);
}

/** Prompt context like a powerlevel10k segment line: workspace, project, branch. */
function usePromptContext() {
  const ws = useWorkspaces((s) => s.workspaces.find((w) => w.id === s.activeWorkspaceId));
  const projects = useWorkspaces((s) => s.projects);
  const tab = getActiveTabs().tabs.find((t) => t.id === getActiveTabs().activeTabId)?.target;
  const project = tab && "id" in tab && (tab.type === "project" || tab.type === "git") ? projects[tab.id] : undefined;
  const branch = useGit((g) => (project ? g.byPath[project.path]?.branch : undefined));
  return { ws: ws?.name ?? "orbitr", project: project?.name, branch };
}

/**
 * Mod+K, styled as a zsh prompt with its completion menu: everything Orbitr can do.
 * Typing filters (every word, any order); ↑/↓ or Ctrl-N/P move; Enter runs; Esc closes.
 */
export function CommandPalette() {
  const open = useLayout((s) => s.paletteOpen);
  const setOpen = useLayout((s) => s.setPaletteOpen);
  const initialQuery = useLayout((s) => s.paletteQuery);
  const commands = useCommands();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const ctx = usePromptContext();
  const t = currentTheme().terminal;
  const font = useSettings((s) => s.terminalFont);

  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const hits = words.length
      ? commands.filter((c) => words.every((w) => `${c.title} ${c.group} ${c.keywords ?? ""}`.toLowerCase().includes(w)))
      : commands;
    return grouped(hits);
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setIndex(0);
    }
  }, [open, initialQuery]);
  useEffect(() => {
    setIndex(0);
  }, [query]);
  useEffect(() => {
    list.current?.querySelector(`[data-i="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const run = (i: number) => {
    const cmd = results[i];
    if (!cmd) return;
    setOpen(false);
    cmd.run();
  };
  const move = (d: number) => setIndex((i) => Math.max(0, Math.min(i + d, results.length - 1)));

  let lastGroup = "";
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-center bg-black/50 pt-[12vh] backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          onPointerDown={() => setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.08 } }}
            transition={{ type: "spring", stiffness: 600, damping: 40 }}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-fit w-[640px] max-w-[92vw] overflow-hidden rounded-xl font-mono text-[12.5px] shadow-pop"
            style={{ background: t.background, color: t.foreground, fontFamily: terminalFontFamily(font) }}
          >
            {/* Prompt segments */}
            <div className="flex items-center gap-2 px-4 pt-3 text-[11.5px]">
              <span style={{ color: t.blue }}>{ctx.ws}</span>
              {ctx.project && (
                <>
                  <span className="opacity-40">/</span>
                  <span style={{ color: t.cyan }}>{ctx.project}</span>
                </>
              )}
              {ctx.branch && (
                <span style={{ color: t.magenta }}>
                  on <span className="opacity-80"></span> {ctx.branch}
                </span>
              )}
              <span className="ml-auto opacity-40">orbitr</span>
            </div>

            {/* Prompt line with a block cursor (a hidden input takes the keys) */}
            <label className="relative flex h-10 cursor-text items-center gap-2 px-4">
              <span style={{ color: t.green }} className="font-semibold">❯</span>
              <span className="whitespace-pre">{query}</span>
              <motion.span
                aria-hidden
                className="-ml-2 inline-block h-[1.15em] w-[0.6em] translate-y-[1px]"
                style={{ background: t.cursor }}
                animate={{ opacity: [1, 1, 0, 0] }}
                transition={{ duration: 1.05, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: "linear" }}
              />
              {!query && <span className="-ml-1 opacity-35">type a command…</span>}
              <input
                autoFocus
                aria-label="Command"
                value={query}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n") || (e.key === "Tab" && !e.shiftKey)) { e.preventDefault(); move(1); }
                  if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p") || (e.key === "Tab" && e.shiftKey)) { e.preventDefault(); move(-1); }
                  if (e.ctrlKey && e.key === "u") { e.preventDefault(); setQuery(""); }
                  if (e.key === "Enter") run(index);
                  if (e.key === "Escape") setOpen(false);
                }}
                className="absolute inset-0 w-full cursor-text opacity-0"
              />
            </label>

            {/* Completion menu */}
            <div ref={list} className="max-h-[22rem] overflow-y-auto border-t pb-1.5" style={{ borderColor: `${t.foreground}14` }}>
              {results.length === 0 && (
                <div className="px-4 py-3">
                  <span style={{ color: t.red }}>zsh:</span> command not found: {query}
                </div>
              )}
              {results.map((c, i) => {
                const header = c.group !== lastGroup ? c.group : null;
                lastGroup = c.group;
                const active = i === index;
                return (
                  <div key={c.id}>
                    {header && (
                      <div className="px-4 pb-0.5 pt-2 text-[11px]" style={{ color: t.yellow }}>
                        -- {header.toLowerCase()} --
                      </div>
                    )}
                    <button
                      data-i={i}
                      onPointerMove={() => setIndex(i)}
                      onClick={() => run(i)}
                      className={cn("flex h-7 w-full items-center gap-3 px-4 text-left")}
                      style={active ? { background: t.foreground, color: t.background } : undefined}
                    >
                      <span className="w-3 shrink-0 text-center">{active ? "›" : ""}</span>
                      <span className="min-w-0 flex-1 truncate">{c.title}</span>
                      {c.shortcut && <span className={cn("shrink-0 text-[11px]", !active && "opacity-45")}>{c.shortcut}</span>}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Status line */}
            <div className="flex h-7 items-center gap-4 px-4 text-[10.5px]" style={{ background: `${t.foreground}0d` }}>
              <span style={{ color: t.green }}>{results.length} {results.length === 1 ? "match" : "matches"}</span>
              <span className="opacity-50">↑↓ / ^n ^p / tab move · ⏎ run · ^u clear · esc quit</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
