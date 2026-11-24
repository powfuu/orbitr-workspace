import { BarChart3, Cpu, GitBranch } from "lucide-react";
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
      <span>v0.1.0</span>
    </footer>
  );
}
