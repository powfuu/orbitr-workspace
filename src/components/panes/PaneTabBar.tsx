import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Columns2, Folder, Maximize2, PanelLeftOpen, PanelRightOpen, Rows2, X } from "lucide-react";
import { toggleFocusMode } from "../../features/layout/focusMode";
import { Fragment, useEffect, useRef, useState } from "react";
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
import { windowControlsPad } from "../layout/WindowControls";
import { ContextMenu } from "../ui/ContextMenu";
import { VoiceButton } from "../voice/VoiceButton";
import { ActivityIconFor } from "../agents/ActivityBadge";
import { AgentGlyph } from "../ui/AgentGlyph";
import { AGENTS } from "../../features/agents/registry";
import { PromptChip } from "../approvals/PromptChip";
import { useActivity } from "../../features/sessions/activityStore";
import { isSidebarTab, projectOfTarget } from "../../features/tabs/projectGroups";
import { ProjectSubTabs } from "./ProjectSubTabs";

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
  const { sidebarOpen, terminalOpen, toggleSidebar, toggleTerminal, focusMode } = useLayout();
  const setDrag = useTabDrag((s) => s.set);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const closable = (t: { target: { type: string } }) => t.target.type !== "home" || multi;
  const byId = useActivity((s) => s.byId);
  const strip = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const measure = () => {
    const el = strip.current;
    if (el) setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  };
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Keep the active tab in view when switching or when tabs open/close.
  useEffect(() => {
    strip.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: "nearest", block: "nearest" });
    measure();
  }, [group.activeTabId, group.tabs.length]);
  const nudge = (dir: 1 | -1) => strip.current?.scrollBy({ left: dir * strip.current.clientWidth * 0.7, behavior: "smooth" });
  const waiting = new Set(Object.keys(byId).filter((k) => byId[k]?.prompt));

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

  if (focusMode) return null;
  return (
    <div
      {...windowDragProps}
      onDragOver={allowDrop}
      onDragLeave={() => setDropIndex(null)}
      onDrop={(e) => onDrop(e)}
      style={topRight && !terminalOpen ? windowControlsPad : undefined}
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
      <div className="relative flex min-w-0 flex-1 self-stretch">
      <div
        ref={strip}
        role="tablist"
        onScroll={measure}
        onWheel={(e) => {
          if (strip.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) strip.current.scrollLeft += e.deltaY;
        }}
        className="no-scrollbar flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto"
      >
        {/* popLayout: a closing tab leaves the layout immediately so neighbours slide in with no gap. */}
        <AnimatePresence initial={false} mode="popLayout">
          {group.tabs.map((tab, i) => {
            // Dashboard and Git views live in the sidebar instead of the tab strip.
            if (isSidebarTab(tab.target)) return null;
            // One tab per project: its overview and its agents share it (sub-tabs inside).
            const projectId = projectOfTarget(tab.target, agents);
            const members = projectId ? group.tabs.filter((t) => projectOfTarget(t.target, agents) === projectId) : [tab];
            if (projectId && members[0]!.id !== tab.id) return null;
            const described = describeTab(tab.target, { workspaces, projects, agents });
            const title = projectId ? (projects[projectId]?.name ?? described.title) : described.title;
            const Icon = projectId ? Folder : described.icon;
            const inGroup = members.some((t) => t.id === group.activeTabId);
            const active = projectId ? inGroup && group.tabs.find((t) => t.id === group.activeTabId)?.target.type === "project" : inGroup;
            const groupAgents = members.flatMap((t) => (t.target.type === "agent" ? agents.filter((a) => a.id === (t.target as { id: string }).id) : []));
            const agent = projectId ? undefined : tab.target.type === "agent" ? agents.find((a) => a.id === (tab.target as { id: string }).id) : undefined;
            const anyWaiting = groupAgents.some((a) => waiting.has(a.id));
            // Clicking a project's tab shows its overview; its agents sit right next to it.
            const goTo = () => {
              if (!projectId) return activate(tab.id);
              const overview = members.find((t) => t.target.type === "project");
              if (overview) activate(overview.id);
              else useTabs.getState().open({ type: "project", id: projectId });
            };
            const closeAll = () => members.forEach((t) => close(t.id));
            const tabEl = (
              <motion.div
                key={tab.id}
                layout="position"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.08, ease: [0.4, 0, 1, 1] } }}
                transition={{ type: "spring", stiffness: 700, damping: 45, mass: 0.5 }}
                className="relative mb-[-1px] flex shrink-0"
              >
                {dropIndex === i && <span className="absolute -left-[2px] bottom-1 top-1 z-10 w-[2px] rounded-full bg-fg" />}
                <ContextMenu
                  items={[
                    { label: "Split right", icon: Columns2, onSelect: () => split(paneId, "right", tab.id) },
                    { label: "Split down", icon: Rows2, onSelect: () => split(paneId, "bottom", tab.id) },
                    ...(closable(tab) ? [{ label: members.length > 1 ? `Close ${title} (${members.length} tabs)` : "Close tab", icon: X, onSelect: closeAll }] : []),
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
                    onClick={goTo}
                    onAuxClick={(e) => e.button === 1 && closable(tab) && closeAll()}
                    onKeyDown={(e) => e.key === "Enter" && goTo()}
                    className={cn(
                      "group relative flex h-8 min-w-0 max-w-56 cursor-default items-center gap-2 rounded-t-md pl-3 pr-1.5 font-mono text-[12px] transition-colors duration-150",
                      active ? "text-fg" : "text-muted hover:text-fg-2",
                      ((agent && waiting.has(agent.id)) || anyWaiting) && "bg-warning/10 text-fg ring-1 ring-inset ring-warning/40",
                    )}
                  >
                    {/* One shared background per pane that glides between tabs; merges into the content below. */}
                    {active && (
                      <motion.span
                        layoutId={`tab-active-${paneId}`}
                        transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
                        className="absolute inset-0 -z-0 rounded-t-md bg-bg-2 shadow-[inset_0_1px_0_0_#ffffff0f,0_0_0_1px_var(--color-line-soft)]"
                      >
                        <span
                          className={cn(
                            "absolute left-1/2 top-0 h-[2px] w-6 -translate-x-1/2 rounded-b-full transition-colors",
                            focused || !multi ? "bg-accent" : "bg-faint",
                          )}
                        />
                      </motion.span>
                    )}
                    {!active && <span className="pointer-events-none absolute inset-x-1 inset-y-1 rounded-md bg-bg-2/0 transition-colors group-hover:bg-bg-2/60" />}
                    <span className="relative flex min-w-0 items-center gap-2">
                    {agent ? (
                      <AgentGlyph agent={AGENTS[agent.kind]} size={14} status={agent.status} />
                    ) : (
                      <Icon size={13} strokeWidth={1.75} className={active && focused ? "text-accent" : ""} />
                    )}
                    <span className="truncate">{title}</span>
                    {agent && <ActivityIconFor id={agent.id} status={agent.status} size={10} />}
                    {agent && <PromptChip id={agent.id} />}
                    {closable(tab) && <button
                      aria-label={`Close ${title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        closeAll();
                      }}
                      className={cn(
                        "grid h-5 w-5 place-items-center rounded text-faint hover:bg-surface hover:text-fg",
                        active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                      )}
                    >
                      <X size={12} />
                    </button>}
                    </span>
                  </div>
                </ContextMenu>
              </motion.div>
            );
            return (
              <Fragment key={tab.id}>
                {tabEl}
                {projectId && members.some((t) => t.target.type === "agent") && <ProjectSubTabs group={group} projectId={projectId} />}
              </Fragment>
            );
          })}
        </AnimatePresence>
      </div>
      {(["left", "right"] as const).map((side) =>
        edges[side] ? (
          <button
            key={side}
            aria-label={`More tabs ${side}`}
            onClick={() => nudge(side === "left" ? -1 : 1)}
            className={cn(
              "absolute bottom-0 top-0 z-20 flex w-9 items-center text-muted hover:text-fg",
              side === "left" ? "left-0 justify-start bg-gradient-to-r pl-1" : "right-0 justify-end bg-gradient-to-l pr-1",
              "from-bg via-bg/90 to-transparent",
            )}
          >
            {side === "left" ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : null,
      )}
      </div>
      <div className="mb-2 flex items-center gap-0.5">
        <IconButton icon={Maximize2} label="Full screen" shortcut={`${modKey}${isMac ? "⇧↩" : "+Shift+Enter"}`} size="sm" onClick={() => toggleFocusMode(true)} />
        <IconButton icon={Columns2} label="Split right" shortcut={`${modKey}\\`} size="sm" onClick={() => split(paneId, "right")} />
        {topRight && <VoiceButton />}
        {topRight && !terminalOpen && (
          <IconButton icon={PanelRightOpen} label="Show terminal panel" shortcut={`${modKey}J`} onClick={toggleTerminal} size="sm" />
        )}
      </div>
    </div>
  );
}
