import { timelineService } from "../../services/agents";
import { useSessions } from "../../stores/sessionStore";
import type { AgentSession } from "../../types";
import { useWorkspaces } from "../../stores/workspaceStore";
import { onPromptSubmitted } from "./promptSubmitted";

const watching = new Set<string>();

/**
 * Claude Code creates its transcript when the conversation starts. Find the one this agent
 * created (first entry after launch, not claimed by another agent) and remember its id:
 * the timeline reads it, and restores resume exactly that conversation.
 */
export function bindClaudeSession(agent: AgentSession, cwd: string) {
  // ponytail: polls every 4s until linked; stops when the agent exits.
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
    // A new conversation (first entry after launch), or else a continued one: the newest
    // transcript written since launch that no other agent owns.
    const fresh = (await timelineService.sessionsSince(cwd, since).catch(() => [])).find((s) => !claimed.has(s.id))?.id;
    const touched = fresh ? undefined : (await timelineService.sessionsTouched(cwd, agent.startedAt - 5000).catch(() => [])).find((id) => !claimed.has(id));
    const found = fresh ?? touched;
    if (found) {
      useSessions.getState().updateAgent(agent.id, { chatId: found });
      watching.delete(agent.id);
    } else window.setTimeout(() => void tick(), 4000);
  };
  window.setTimeout(() => void tick(), 3000);
}

/**
 * Follow the conversation you're actually typing into: after each prompt, find the transcript
 * that contains it and rebind if it changed (/clear, resume, another Claude in the same folder).
 */
onPromptSubmitted((sessionId, text) => {
  const agent = useSessions.getState().agents.find((a) => a.id === sessionId);
  if (agent?.kind !== "claude-code" || text.trim().startsWith("/")) return;
  const cwd = agent.cwd ?? useWorkspaces.getState().projects[agent.projectId]?.path;
  if (!cwd) return;
  const look = async (attempt: number) => {
    const found = await timelineService.sessionWithPrompt(cwd, agent.startedAt - 5000, text).catch(() => null);
    if (found) {
      if (useSessions.getState().agents.find((a) => a.id === sessionId)?.chatId !== found) useSessions.getState().updateAgent(sessionId, { chatId: found });
    } else if (attempt < 4) window.setTimeout(() => void look(attempt + 1), 2500);
  };
  window.setTimeout(() => void look(0), 1500);
});
