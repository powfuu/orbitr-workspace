import { ChevronRight, Plus, X } from "lucide-react";
import { useEffect } from "react";
import { useTabs, type TabGroup } from "../../stores/tabStore";
import { useSessions } from "../../stores/sessionStore";
import { useLayout } from "../../stores/layoutStore";
import { lastInProject, projectOfTarget } from "../../features/tabs/projectGroups";
import { AGENTS } from "../../features/agents/registry";
import { cn } from "../../lib/cn";
import { closeTab } from "../../features/tabs/closeTab";
import { AgentGlyph } from "../ui/AgentGlyph";
import { ActivityIconFor } from "../agents/ActivityBadge";
import { PromptChip } from "../approvals/PromptChip";

/** The project's agents/editors, shown inline right after its tab in the strip. */
export function ProjectSubTabs({ group, projectId }: { group: TabGroup; projectId: string }) {
  const agents = useSessions((s) => s.agents);
  const { activate } = useTabs.getState();
  const active = group.tabs.find((t) => t.id === group.activeTabId);
  const activeProject = active ? projectOfTarget(active.target, agents) : undefined;

  useEffect(() => {
    if (activeProject === projectId && active) lastInProject.set(projectId, active.id);
  }, [projectId, activeProject, active]);

  const members = group.tabs.filter((t) => projectOfTarget(t.target, agents) === projectId);
  // Same shape as the main tabs, so agents read as tabs of their project.
  const chip = "group relative mb-[-1px] flex h-8 shrink-0 cursor-default items-center gap-2 rounded-t-md pl-3 pr-1.5 font-mono text-[12px] transition-colors";

  return (
    <div className="flex shrink-0 items-end gap-0.5 self-stretch">
      {/* project › its tabs */}
      <ChevronRight size={13} className="mb-2.5 shrink-0 text-faint" />
      {members
        .filter((t) => t.target.type === "agent")
        .map((t) => {
          const a = agents.find((x) => x.id === (t.target as { id: string }).id);
          if (!a) return null;
          const on = t.id === group.activeTabId;
          return (
            <div
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => activate(t.id)}
              onAuxClick={(e) => e.button === 1 && closeTab(t.id)}
              className={cn(chip, on ? "bg-bg-2 text-fg shadow-[inset_0_1px_0_0_#ffffff0f,0_0_0_1px_var(--color-line-soft)]" : "text-muted hover:bg-bg-2/60 hover:text-fg-2")}
            >
              {on && <span className="absolute left-1/2 top-0 h-[2px] w-6 -translate-x-1/2 rounded-b-full bg-accent" />}
              <AgentGlyph agent={AGENTS[a.kind]} size={13} status={a.status} />
              <span className="max-w-44 truncate">{a.name.replace(/\s·\s.*$/, "")}</span>
              <ActivityIconFor id={a.id} status={a.status} size={10} />
              <PromptChip id={a.id} />
              <button
                aria-label={`Close ${a.name}`}
                title="Close tab (the agent keeps running)"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.id);
                }}
                className={cn("grid h-5 w-5 place-items-center rounded text-faint hover:bg-surface hover:text-fg", on ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
      <button
        onClick={() => useLayout.getState().setPaletteOpen(true, "Start ")}
        title="Start an agent"
        className="mb-1.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-faint hover:bg-surface/60 hover:text-fg"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}
