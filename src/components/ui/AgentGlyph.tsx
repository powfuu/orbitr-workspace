import { motion } from "framer-motion";
import type { AgentDefinition } from "../../features/agents/registry";
import type { ProcessStatus } from "../../types";
import { cn } from "../../lib/cn";

/**
 * Brand icon in a tile. Animates with the process: a breathing halo while
 * running, an orbiting ring while starting.
 */
export function AgentGlyph({ agent, size = 18, status }: { agent?: AgentDefinition; size?: number; status?: ProcessStatus }) {
  const running = status === "running";
  const starting = status === "starting";
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {running && (
        <motion.span
          className="absolute inset-0 rounded-[30%] bg-white/25 blur-[3px]"
          animate={{ opacity: [0.15, 0.55, 0.15], scale: [0.9, 1.12, 0.9] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {starting && (
        <motion.span
          className="absolute -inset-[2px] rounded-[32%] border border-transparent border-t-white/80"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
      )}
      <span className="relative grid h-full w-full place-items-center rounded-[28%] bg-surface ring-1 ring-line">
        {agent ? (
          <motion.img
            src={agent.icon}
            alt=""
            draggable={false}
            className={cn(agent.mono && "invert")}
            style={{ width: size * 0.62, height: size * 0.62 }}
            animate={running ? { rotate: [0, -6, 6, 0] } : { rotate: 0 }}
            transition={running ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
          />
        ) : (
          <span className="font-mono text-faint" style={{ fontSize: size * 0.5 }}>?</span>
        )}
      </span>
    </span>
  );
}
