import { AnimatePresence, motion } from "framer-motion";
import { windowDragProps } from "../../hooks/useWindowDrag";
import { PanelLeftOpen, PanelRightOpen, X } from "lucide-react";
import { useActiveTabs, useTabs } from "../../stores/tabStore";
import { useWorkspaces } from "../../stores/workspaceStore";
import { useSessions } from "../../stores/sessionStore";
import { useLayout } from "../../stores/layoutStore";
import { describeTab } from "../../features/tabs/describeTab";
import { isMac, modKey } from "../../lib/platform";
import { cn } from "../../lib/cn";
import { IconButton } from "../ui/IconButton";
import { VoiceButton } from "../voice/VoiceButton";
import { ActivityIconFor } from "../agents/ActivityBadge";

export function TabBar() {
  const { tabs, activeTabId } = useActiveTabs();
  const { activate, close } = useTabs.getState();
  const workspaces = useWorkspaces((s) => s.workspaces);
  const projects = useWorkspaces((s) => s.projects);
  const agents = useSessions((s) => s.agents);
  const agentOf = (id: string) => agents.find((a) => a.id === id);
  const { sidebarOpen, terminalOpen, toggleSidebar, toggleTerminal } = useLayout();

  return (
    <div {...windowDragProps}
      className={cn(
        "flex h-11 shrink-0 items-end gap-1 border-b border-line-soft bg-bg pr-2",
        !sidebarOpen && isMac ? "pl-[84px]" : "pl-2",
      )}
    >
      {!sidebarOpen && (
        <div className="mb-2">
          <IconButton icon={PanelLeftOpen} label="Show sidebar" shortcut={`${modKey}B`} onClick={toggleSidebar} size="sm" />
        </div>
      )}
      <div role="tablist" className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto [scrollbar-width:none]">
        <AnimatePresence initial={false}>
          {tabs.map((tab) => {
            const { title, icon: Icon } = describeTab(tab.target, { workspaces, projects, agents });
            const active = tab.id === activeTabId;
            return (
              <motion.div
                key={tab.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, width: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.16 }}
                role="tab"
                aria-selected={active}
                tabIndex={0}
                onClick={() => activate(tab.id)}
                onAuxClick={(e) => e.button === 1 && close(tab.id)}
                onKeyDown={(e) => e.key === "Enter" && activate(tab.id)}
                className={cn(
                  "group relative mb-[-1px] flex h-8 min-w-0 max-w-52 shrink-0 cursor-default items-center gap-2 rounded-t-lg pl-3 pr-1.5 text-[12.5px]",
                  active ? "bg-bg-2 text-fg" : "text-muted hover:bg-bg-2/50 hover:text-fg-2",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tab-active"
                    className="absolute inset-x-0 top-0 h-[1.5px] rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                {active && <span className="pointer-events-none absolute inset-0 rounded-t-lg border border-b-0 border-line-soft" />}
                {tab.target.type === "agent" && agentOf(tab.target.id) ? (
                  <ActivityIconFor id={tab.target.id} status={agentOf(tab.target.id)!.status} size={12} />
                ) : (
                  <Icon size={13} strokeWidth={1.75} className={active ? "text-accent" : ""} />
                )}
                <span className="truncate">{title}</span>
                <button
                  aria-label={`Close ${title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    close(tab.id);
                  }}
                  className={cn(
                    "grid h-5 w-5 place-items-center rounded text-faint hover:bg-surface hover:text-fg",
                    active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  )}
                >
                  <X size={12} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <div className="mb-2 mr-1"><VoiceButton /></div>
      {!terminalOpen && (
        <div className="mb-2">
          <IconButton icon={PanelRightOpen} label="Show terminal panel" shortcut={`${modKey}J`} onClick={toggleTerminal} size="sm" />
        </div>
      )}
    </div>
  );
}
