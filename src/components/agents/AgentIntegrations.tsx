import { motion } from "framer-motion";
import { CircleCheck, Download, ExternalLink, RefreshCw } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { agentList, type AgentDefinition } from "../../features/agents/registry";
import { useAgentAvailability } from "../../features/agents/useAgentAvailability";
import { useAvailability } from "../../features/agents/availabilityStore";
import { installAgent, installCommand } from "../../features/agents/installAgent";
import { isTauri } from "../../lib/platform";
import { cn } from "../../lib/cn";
import { AgentGlyph } from "../ui/AgentGlyph";
import { IconButton } from "../ui/IconButton";

/** Every supported agent CLI with its real install state and a one-click installer. */
export function AgentIntegrations({ title = "Agent integrations", list = agentList }: { title?: string; list?: AgentDefinition[] }) {
  const availability = useAgentAvailability();
  const checking = useAvailability((s) => s.checking);
  const refresh = useAvailability((s) => s.refresh);
  const installed = list.filter((a) => availability?.[a.kind]).length;

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="term-heading">{title}</div>
        {availability && <span className="font-mono text-2xs text-faint">{installed}/{list.length} installed</span>}
        <div className="flex-1" />
        <span className={cn(checking && "animate-spin")}>
          <IconButton icon={RefreshCw} label="Re-check installed" size="sm" onClick={() => void refresh()} disabled={checking} />
        </span>
      </div>
      <div className="divide-y divide-line-soft overflow-hidden rounded-xl border border-line-soft bg-bg-2">
        {list.map((a, i) => {
          const path = availability?.[a.kind];
          const cmd = installCommand(a);
          return (
            <motion.div
              key={a.kind}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="group flex items-center gap-3 px-4 py-2.5"
            >
              <AgentGlyph agent={a} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-fg">{a.displayName}</span>
                  <span className="text-[11px] text-faint">{a.vendor}</span>
                </div>
                <div className="truncate font-mono text-[10.5px] text-faint" title={path ?? cmd}>
                  {path ?? (cmd ? `$ ${cmd}` : "No installer for this platform")}
                </div>
              </div>
              {availability === undefined ? (
                <span className="font-mono text-[10.5px] text-faint">{isTauri ? "checking…" : "desktop only"}</span>
              ) : path ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-success">
                  <CircleCheck size={11} /> Installed
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-faint">Not installed</span>
                  {cmd ? (
                    <button
                      onClick={() => void installAgent(a)}
                      className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-fg px-2.5 text-[12px] font-medium text-bg hover:bg-fg/85"
                    >
                      <Download size={12} /> Install
                    </button>
                  ) : (
                    <IconButton icon={ExternalLink} label="Install instructions" size="sm" onClick={() => void openUrl(a.docsUrl)} />
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-faint">Install runs the official command in a visible terminal. Status refreshes when it finishes or the window regains focus.</p>
    </div>
  );
}
