import { Fragment, type ReactNode } from "react";
import { useUpdates } from "../../features/updates/updateStore";
import { PlanLimitsCompact } from "../usage/PlanLimits";
import { usePlanLimits } from "../../features/usage/planLimitsStore";
import { useUsage } from "../../features/usage/useUsage";
import { money } from "../../lib/format";
import { useActiveWorkspace } from "../../stores/workspaceStore";
import { useSessions } from "../../stores/sessionStore";
import { usePlatformInfo } from "../../hooks/usePlatformInfo";
import { basename, isTauri } from "../../lib/platform";
import { useSettings } from "../../stores/settingsStore";
import { useVim } from "../../features/vim/vimStore";

/** Segments separated by a thin bar, like a vim/tmux statusline. */
function Segments({ items }: { items: ReactNode[] }) {
  const shown = items.filter(Boolean);
  return (
    <>
      {shown.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-line">│</span>}
          {item}
        </Fragment>
      ))}
    </>
  );
}

export function StatusBar() {
  const workspace = useActiveWorkspace();
  const agents = useSessions((s) => s.agents.filter((a) => a.status === "running").length);
  const terminals = useSessions((s) => s.terminals.length);
  const platform = usePlatformInfo();
  const today = useUsage(null, 1);
  const update = useUpdates();
  const hasLimits = usePlanLimits((l) => l.limits.length > 0);
  const vimMode = useSettings((s) => s.vimMode);
  const mode = useVim((v) => (v.hints ? "HINT" : v.mode === "normal" ? "NORMAL" : "INSERT"));

  return (
    <footer className="flex h-6 shrink-0 items-center gap-2.5 border-t border-line-soft bg-bg pr-3 font-mono text-[10.5px] text-faint">
      {/* Mode block, inverse like vim's NORMAL */}
      <span className={`flex h-full items-center px-2.5 font-semibold tracking-wide ${vimMode && mode !== "INSERT" ? "bg-accent text-bg" : isTauri ? "bg-fg text-bg" : "bg-warning text-black"}`}>
        {vimMode ? mode : isTauri ? "ORBITR" : "PREVIEW"}
      </span>
      <Segments
        items={[
          <span key="ws" className="text-fg-2">{workspace.name}</span>,
          <span key="p">{agents} agent{agents === 1 ? "" : "s"} · {terminals} term</span>,
          today && today.total.messages > 0 && (
            <span key="cost" title="Claude Code usage today, at API rates">{money(today.total.cost)} today</span>
          ),
          hasLimits && <PlanLimitsCompact key="limits" />,
        ]}
      />
      <span className="ml-auto flex items-center gap-2.5">
        <Segments
          items={[
            platform && <span key="sh">{basename(platform.defaultShell)}</span>,
            platform && <span key="os">{platform.os}</span>,
            update.status.kind === "available" ? (
              <button key="up" onClick={() => void update.install()} className="rounded-sm bg-fg px-1.5 text-bg hover:bg-fg/85" title="Download, install and restart">
                update → v{update.status.version}
              </button>
            ) : update.status.kind === "downloading" ? (
              <span key="up">updating {update.status.total ? Math.round((update.status.done / update.status.total) * 100) + "%" : "…"}</span>
            ) : (
              <span key="v">v{update.current}</span>
            ),
          ]}
        />
      </span>
    </footer>
  );
}
