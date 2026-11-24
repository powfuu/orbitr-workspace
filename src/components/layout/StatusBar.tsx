import { ArrowUpCircle, BarChart3, Cpu, GitBranch } from "lucide-react";
import { useUpdates } from "../../features/updates/updateStore";
import { useUsage } from "../../features/usage/useUsage";
import { money } from "../../lib/format";
import { useActiveWorkspace } from "../../stores/workspaceStore";
import { useSessions } from "../../stores/sessionStore";
import { usePlatformInfo } from "../../hooks/usePlatformInfo";
import { isTauri } from "../../lib/platform";

export function StatusBar() {
  const workspace = useActiveWorkspace();
  const running = useSessions((s) => s.agents.filter((a) => a.status === "running").length + s.terminals.length);
  const platform = usePlatformInfo();
  const today = useUsage(null, 1);
  const update = useUpdates();
  return (
    <footer className="flex h-6 shrink-0 items-center gap-4 border-t border-line-soft bg-bg px-3 font-mono text-[10.5px] text-faint">
      <span className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${isTauri ? "bg-success" : "bg-warning"}`} />
        {isTauri ? "native runtime" : "browser preview"}
      </span>
      <span className="flex items-center gap-1.5"><GitBranch size={11} />{workspace.name}</span>
      <span className="flex items-center gap-1.5"><Cpu size={11} />{running} process{running === 1 ? "" : "es"}</span>
      {today && today.total.messages > 0 && (
        <span className="flex items-center gap-1.5" title="Claude Code usage today, at API rates">
          <BarChart3 size={11} />
          {money(today.total.cost)} today
        </span>
      )}
      <span className="ml-auto">{platform ? `${platform.os} · ${platform.defaultShell}` : ""}</span>
      {update.status.kind === "available" ? (
        <button onClick={() => void update.install()} className="flex items-center gap-1 rounded bg-white px-1.5 text-black hover:bg-white/85" title="Download, install and restart">
          <ArrowUpCircle size={11} /> Update to {update.status.version}
        </button>
      ) : update.status.kind === "downloading" ? (
        <span>Updating… {update.status.total ? Math.round((update.status.done / update.status.total) * 100) + "%" : ""}</span>
      ) : (
        <span>v{update.current}</span>
      )}
    </footer>
  );
}
