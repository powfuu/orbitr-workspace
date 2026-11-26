import { motion } from "framer-motion";
import { Flame, RefreshCw, Sparkles } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { popularModels, type ModelView } from "../../features/agents/models";
import { formatContext, formatPrice, type ModelInfo } from "../../features/agents/modelsParse";
import { isTauri } from "../../lib/platform";
import { timeAgo } from "../../lib/time";
import { cn } from "../../lib/cn";
import { IconButton } from "../ui/IconButton";
import { LabIcon } from "./LabIcon";

const VIEWS: { id: ModelView; label: string; icon: typeof Flame; hint: string }[] = [
  { id: "trending", label: "trending this week", icon: Flame, hint: "Most used models this week across OpenRouter" },
  { id: "newest", label: "new from major labs", icon: Sparkles, hint: "Latest releases from Anthropic, OpenAI, Google, xAI, Meta, Mistral, DeepSeek, Qwen…" },
];

/** Popular and new models (OpenRouter public catalog, no key). Click one for its page. */
export function PopularModels() {
  const [view, setView] = useState<ModelView>("trending");
  const [data, setData] = useState<{ models: ModelInfo[]; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Switching views must not shorten the page (that yanks the scroll up): keep the tallest height seen.
  const box = useRef<HTMLDivElement>(null);
  const [minH, setMinH] = useState(0);
  useLayoutEffect(() => {
    const h = box.current?.offsetHeight ?? 0;
    if (h > minH) setMinH(h);
  }, [data, minH]);

  const load = (force: boolean) => {
    if (!isTauri) return;
    setLoading(true);
    setError(null);
    void popularModels(view, force)
      .then(setData, (e) => setError(String(e)))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => load(false), [view]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="shrink-0 term-heading">popular models</div>
        <div className="flex shrink-0 rounded-md bg-bg p-0.5 ring-1 ring-line-soft">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              title={v.hint}
              onClick={() => setView(v.id)}
              className={cn("flex h-6 items-center gap-1.5 rounded px-2 font-mono text-[11px]", view === v.id ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")}
            >
              <v.icon size={11} /> {v.label}
            </button>
          ))}
        </div>
        <span className="min-w-0 flex-1 truncate font-mono text-2xs text-faint">{data && `updated ${timeAgo(data.at)} · via OpenRouter`}</span>
        <span className={cn("shrink-0", loading && "animate-spin")}>
          <IconButton icon={RefreshCw} size="sm" label="Check now" onClick={() => load(true)} disabled={loading} />
        </span>
      </div>
      <div ref={box} style={{ minHeight: minH || undefined }}>
        {!isTauri ? (
          <div className="text-[12px] text-muted">Model rankings are loaded in the desktop app.</div>
        ) : error ? (
          <div className="text-[12px] text-error">{error}</div>
        ) : !data ? (
          <div className="text-[12px] text-muted">Loading models…</div>
        ) : (
          <div className="divide-y divide-line-soft overflow-hidden rounded-xl border border-line-soft bg-bg-2">
            {data.models.map((m, i) => (
              <motion.button
                key={`${view}-${m.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => void openUrl(`https://openrouter.ai/${m.id}`)}
                title={m.blurb || m.name}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface/50"
              >
                <span className="w-5 shrink-0 text-right font-mono text-[11px] text-faint">{i + 1}</span>
                <LabIcon id={m.id} lab={m.lab} size={20} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-[13px] text-fg">{m.name}</span>
                    <span className="shrink-0 text-[11px] text-faint">{m.lab}</span>
                  </div>
                  {m.blurb && <div className="truncate text-[11px] text-muted">{m.blurb}</div>}
                </div>
                <span className="hidden shrink-0 font-mono text-[10.5px] text-faint @md:block" title="Context window">{formatContext(m.context)} ctx</span>
                <span className="hidden w-28 shrink-0 text-right font-mono text-[10.5px] text-faint @lg:block" title="USD per 1M tokens, input / output">
                  {formatPrice(m.priceIn)} / {formatPrice(m.priceOut)}
                </span>
                <span className="w-16 shrink-0 text-right font-mono text-[10.5px] text-faint">{m.created ? timeAgo(m.created) : ""}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
