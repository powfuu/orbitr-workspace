import type { AgentDefinition } from "../../features/agents/registry";
import type { ProcessStatus } from "../../types";
import { cn } from "../../lib/cn";

/**
 * Bare brand icon (no tile). Static on purpose: activity is shown next to it
 * (ActivityIcon), so the logo itself never spins or pulses. Dimmed when stopped.
 */
export function AgentGlyph({ agent, size = 18, status }: { agent?: AgentDefinition; size?: number; status?: ProcessStatus }) {
  const stopped = status === "exited" || status === "failed";
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center transition-opacity", stopped && "opacity-50")}
      style={{ width: size, height: size }}
    >
      {agent ? (
        <img src={agent.icon} alt="" draggable={false} className={cn(agent.mono && "mono-icon")} style={{ width: size, height: size }} />
      ) : (
        <span className="font-mono text-faint" style={{ fontSize: size * 0.5 }}>?</span>
      )}
    </span>
  );
}
