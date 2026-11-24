import type { AgentDefinition } from "../../features/agents/registry";
import type { ProcessStatus } from "../../types";
import { cn } from "../../lib/cn";

/**
 * Brand icon in a tile. Static on purpose: activity is shown next to it
 * (ActivityIcon), so the logo itself never spins or pulses. Dimmed when stopped.
 */
export function AgentGlyph({ agent, size = 18, status }: { agent?: AgentDefinition; size?: number; status?: ProcessStatus }) {
  const stopped = status === "exited" || status === "failed";
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center rounded-[28%] bg-surface ring-1 ring-line transition-opacity", stopped && "opacity-50")}
      style={{ width: size, height: size }}
    >
      {agent ? (
        <img src={agent.icon} alt="" draggable={false} className={cn(agent.mono && "invert")} style={{ width: size * 0.62, height: size * 0.62 }} />
      ) : (
        <span className="font-mono text-faint" style={{ fontSize: size * 0.5 }}>?</span>
      )}
    </span>
  );
}
