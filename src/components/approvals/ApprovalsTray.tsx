import { AnimatePresence } from "framer-motion";
import { useActivity } from "../../features/sessions/activityStore";
import { useSessions } from "../../stores/sessionStore";
import { useWorkspaceLayout } from "../../stores/tabStore";
import { useLayout } from "../../stores/layoutStore";
import { ApprovalCard } from "./ApprovalCard";

/** Pending approvals for sessions that aren't on screen, so nothing waits unnoticed. */
export function ApprovalsTray() {
  const byId = useActivity((s) => s.byId);
  const agents = useSessions((s) => s.agents);
  const terminals = useSessions((s) => s.terminals);
  const activeTerminalId = useSessions((s) => s.activeTerminalId);
  const terminalOpen = useLayout((s) => s.terminalOpen);
  const layout = useWorkspaceLayout();

  const visibleAgents = new Set(
    Object.values(layout.panes).map((g) => g.tabs.find((t) => t.id === g.activeTabId)?.target).flatMap((t) => (t?.type === "agent" ? [t.id] : [])),
  );
  const pending = [...agents, ...terminals].filter((s) => {
    if (!byId[s.id]?.prompt) return false;
    const onScreen = visibleAgents.has(s.id) || (terminalOpen && s.id === activeTerminalId);
    return !onScreen;
  });

  return (
    <div className="pointer-events-none fixed right-4 top-14 z-[58] flex flex-col gap-2">
      <AnimatePresence>
        {pending.map((s) => (
          <div key={s.id} className="pointer-events-auto">
            <ApprovalCard id={s.id} name={s.name} prompt={byId[s.id]!.prompt!} compact />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
