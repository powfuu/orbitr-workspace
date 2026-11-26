import { ArrowUpCircle, ExternalLink, Newspaper, RefreshCw, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";
import { AGENTS } from "../../features/agents/registry";
import { agentNews, type AgentNews as News } from "../../features/agents/news";
import { isNewer, MODEL_RE } from "../../features/agents/newsParse";
import { useAvailability } from "../../features/agents/availabilityStore";
import { newDefaultTerminal } from "../../features/terminals/newDefaultTerminal";
import { isTauri } from "../../lib/platform";
import { timeAgo } from "../../lib/time";
import { cn } from "../../lib/cn";
import { AgentGlyph } from "../ui/AgentGlyph";
import { IconButton } from "../ui/IconButton";

/** The big three are always shown; other agents only once installed. */
const ALWAYS = ["claude-code", "codex", "gemini"];

/**
 * What's new in each agent: installed vs latest version (one-click update) and the newest
 * release notes — where new models get announced. Cached 6 h, refresh on demand.
 */
export function AgentNews() {
  const paths = useAvailability((s) => s.paths);
  const [items, setItems] = useState<News[] | null>(null);
  const [loading, setLoading] = useState(false);
  const kinds = [...new Set([...ALWAYS, ...Object.keys(paths).filter((k) => paths[k] && AGENTS[k]?.category !== "editor")])];
  const kindsKey = kinds.join(",");

  const load = (force: boolean) => {
    if (!isTauri) return;
    setLoading(true);
    void agentNews(kinds, paths, force)
      .then(setItems)
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => load(false), [kindsKey]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5 term-heading"><Newspaper size={11} /> what's new in your agents</div>
        {items?.[0] && <span className="font-mono text-2xs text-faint">checked {timeAgo(Math.min(...items.map((i) => i.checkedAt)))}</span>}
        <div className="flex-1" />
        <span className={cn(loading && "animate-spin")}>
          <IconButton icon={RefreshCw} size="sm" label="Check now" onClick={() => load(true)} disabled={loading} />
        </span>
      </div>
      {!isTauri ? (
        <div className="text-[12px] text-muted">Release news is checked in the desktop app.</div>
      ) : !items ? (
        <div className="text-[12px] text-muted">Checking the latest releases…</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-3">
          {items.map((n, i) => (
            <motion.div key={n.kind} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.2 }}>
              <Card n={n} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ n }: { n: News }) {
  const def = AGENTS[n.kind];
  const outdated = !!(n.installed && n.latest && isNewer(n.latest, n.installed));
  return (
    <div className={cn("flex h-full flex-col rounded-xl border bg-bg-2 p-3.5", outdated ? "border-warning/40" : "border-line-soft")}>
      <div className="flex items-center gap-2.5">
        <AgentGlyph agent={def} size={22} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-fg">{def?.displayName ?? n.kind}</div>
          <div className="font-mono text-[10.5px] text-faint">
            {n.installed ? `installed ${n.installed}` : "not installed"}
            {n.latest && ` · latest ${n.latest}`}
            {n.date && ` · ${n.date}`}
          </div>
        </div>
        {outdated && n.pkg && (
          <button
            onClick={() => void newDefaultTerminal(undefined, `update ${def?.displayName ?? n.kind}`, `npm install -g ${n.pkg}@latest`)}
            className="flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-fg px-2.5 text-[11.5px] font-medium text-bg hover:bg-fg/85"
          >
            <ArrowUpCircle size={12} /> Update
          </button>
        )}
        {!outdated && n.installed && <span className="shrink-0 font-mono text-[10.5px] text-success">up to date</span>}
      </div>
      {n.highlights.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {n.highlights.map((h, i) => {
            const model = MODEL_RE.test(h);
            return (
              <li key={i} className={cn("flex gap-2 text-[11.5px] leading-snug", model ? "text-fg" : "text-fg-2")}>
                {model ? <Sparkles size={11} className="mt-0.5 shrink-0 text-warning" /> : <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-faint" />}
                <span className="selectable">{h}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-3 text-[11.5px] text-faint">No release notes found.</div>
      )}
      {n.page && (
        <button onClick={() => void openUrl(n.page!)} className="mt-auto flex items-center gap-1 self-start pt-3 font-mono text-[10.5px] text-muted hover:text-fg">
          full changelog <ExternalLink size={10} />
        </button>
      )}
    </div>
  );
}
