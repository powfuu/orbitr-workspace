import { AnimatePresence, motion } from "framer-motion";
import { Columns2, PanelLeftOpen, PanelRightOpen, Rows2, X } from "lucide-react";
import { useState } from "react";
import { windowDragProps } from "../../hooks/useWindowDrag";
import { useTabs, type TabGroup } from "../../stores/tabStore";
import { useWorkspaces } from "../../stores/workspaceStore";
import { useSessions } from "../../stores/sessionStore";
import { useLayout } from "../../stores/layoutStore";
import { describeTab } from "../../features/tabs/describeTab";
import { TAB_MIME, useTabDrag } from "../../features/panes/dragState";
import { isMac, modKey } from "../../lib/platform";
import { cn } from "../../lib/cn";
import type { ID } from "../../types";
import { IconButton } from "../ui/IconButton";
import { ContextMenu } from "../ui/ContextMenu";
import { VoiceButton } from "../voice/VoiceButton";
import { ActivityIconFor } from "../agents/ActivityBadge";

interface Props {
  paneId: ID;
  group: TabGroup;
  focused: boolean;
  multi: boolean;
  /** Top-left pane hosts the "show sidebar" control and clears the macOS traffic lights. */
  topLeft: boolean;
  /** Top-right pane hosts the mic and terminal-panel controls. */
  topRight: boolean;
}

export function PaneTabBar({ paneId, group, focused, multi, topLeft, topRight }: Props) {
  const { activate, close, split, moveTab } = useTabs.getState();
  const workspaces = useWorkspaces((s) => s.workspaces);
  const projects = useWorkspaces((s) => s.projects);
  const agents = useSessions((s) => s.agents);
  const { sidebarOpen, terminalOpen, toggleSidebar, toggleTerminal } = useLayout();
  const setDrag = useTabDrag((s) => s.set);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const onDrop = (e: React.DragEvent, index?: number) => {
    const tabId = e.dataTransfer.getData(TAB_MIME);
    setDropIndex(null);
    if (!tabId) return;
    e.preventDefault();
    e.stopPropagation();
    moveTab(tabId, paneId, index);
  };
  const allowDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(TAB_MIME)) e.preventDefault();
  };

  return (
    <div
      {...windowDragProps}
      onDragOver={allowDrop}
      onDragLeave={() => setDropIndex(null)}
      onDrop={(e) => onDrop(e)}
      className={cn(
        "flex h-11 shrink-0 items-end gap-1 border-b border-line-soft bg-bg pr-2",
        topLeft && !sidebarOpen && isMac ? "pl-[84px]" : "pl-2",
      )}
    >
      {topLeft && !sidebarOpen && (
        <div className="mb-2">
          <IconButton icon={PanelLeftOpen} label="Show sidebar" shortcut={`${modKey}B`} onClick={toggleSidebar} size="sm" />
        </div>
      )}
      <div role="tablist" className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto [scrollbar-width:none]">
        <AnimatePresence initial={false}>
          {group.tabs.map((tab, i) => {
            const { title, icon: Icon } = describeTab(tab.target, { workspaces, projects, agents });
            const active = tab.id === group.activeTabId;
            const agent = tab.target.type === "agent" ? agents.find((a) => a.id === (tab.target as { id: string }).id) : undefined;
            return (
              <motion.div
                key={tab.id}
                layout="position"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ duration: 0.16 }}
                className="relative mb-[-1px] flex shrink-0"
              >
                {dropIndex === i && <span className="absolute -left-[2px] bottom-1 top-1 z-10 w-[2px] rounded-full bg-white" />}
                <ContextMenu
                  items={[
                    { label: "Split right", icon: Columns2, onSelect: () => split(paneId, "right", tab.id) },
                    { label: "Split down", icon: Rows2, onSelect: () => split(paneId, "bottom", tab.id) },
                    { label: "Close tab", icon: X, onSelect: () => close(tab.id) },
                  ]}
                >
                  <div
                    role="tab"
                    aria-selected={active}
                    tabIndex={0}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(TAB_MIME, tab.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDrag(tab.id);
                    }}
                    onDragEnd={() => setDrag(null)}
                    onDragOver={(e) => {
                      allowDrop(e);
                      setDropIndex(i);
                    }}
                    onDrop={(e) => onDrop(e, i)}
                    onClick={() => activate(tab.id)}
                    onAuxClick={(e) => e.button === 1 && close(tab.id)}
                    onKeyDown={(e) => e.key === "Enter" && activate(tab.id)}
                    className={cn(
                      "group relative flex h-8 min-w-0 max-w-52 cursor-default items-center gap-2 rounded-t-lg pl-3 pr-1.5 text-[12.5px]",
                      active ? "bg-bg-2 text-fg" : "text-muted hover:bg-bg-2/50 hover:text-fg-2",
                    )}
                  >
                    {active && (
                      <span className={cn("absolute inset-x-0 top-0 h-[1.5px] rounded-full", focused || !multi ? "bg-accent" : "bg-faint")} />
                    )}
                    {active && <span className="pointer-events-none absolute inset-0 rounded-t-lg border border-b-0 border-line-soft" />}
                    {agent ? (
                      <ActivityIconFor id={agent.id} status={agent.status} size={12} />
                    ) : (
                      <Icon size={13} strokeWidth={1.75} className={active && focused ? "text-accent" : ""} />
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
                  </div>
                </ContextMenu>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <div className="mb-2 flex items-center gap-0.5">
        <IconButton icon={Columns2} label="Split right" shortcut={`${modKey}\\`} size="sm" onClick={() => split(paneId, "right")} />
        {topRight && <VoiceButton />}
        {topRight && !terminalOpen && (
          <IconButton icon={PanelRightOpen} label="Show terminal panel" shortcut={`${modKey}J`} onClick={toggleTerminal} size="sm" />
        )}
      </div>
    </div>
  );
}
