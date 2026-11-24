import { timelineService } from "../../services/agents";
import { useSessions } from "../../stores/sessionStore";
import type { AgentSession } from "../../types";

const watching = new Set<string>();

/**
 * Claude Code creates its transcript when the conversation starts. Find the one this agent
 * created (first entry after launch, not claimed by another agent) and remember its id:
 * the timeline reads it, and restores resume exactly that conversation.
 */
export function bindClaudeSession(agent: AgentSession, cwd: string) {
  if (agent.kind !== "claude-code" || agent.chatId || watching.has(agent.id)) return;
  watching.add(agent.id);
  const since = new Date(agent.startedAt - 5000).toISOString();
  const tick = async () => {
    const current = useSessions.getState().agents.find((a) => a.id === agent.id);
    if (!current || current.chatId || current.status === "exited" || current.status === "failed") {
      watching.delete(agent.id);
      return;
    }
    const claimed = new Set(useSessions.getState().agents.map((a) => a.chatId).filter(Boolean));
    const found = (await timelineService.sessionsSince(cwd, since).catch(() => [])).find((s) => !claimed.has(s.id));
    if (found) {
      useSessions.getState().updateAgent(agent.id, { chatId: found.id });
      watching.delete(agent.id);
    } else window.setTimeout(() => void tick(), 4000);
  };
  window.setTimeout(() => void tick(), 3000);
}
