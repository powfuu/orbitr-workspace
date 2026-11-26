import { Plus, X } from "lucide-react";
import { useEffect } from "react";
import { useTabs, type TabGroup } from "../../stores/tabStore";
import { useSessions } from "../../stores/sessionStore";
import { useLayout } from "../../stores/layoutStore";
import { lastInProject, projectOfTarget } from "../../features/tabs/projectGroups";
import { AGENTS } from "../../features/agents/registry";
import { cn } from "../../lib/cn";
import { AgentGlyph } from "../ui/AgentGlyph";
import { ActivityIconFor } from "../agents/ActivityBadge";
import { PromptChip } from "../approvals/PromptChip";

/** The project's agents/editors, shown inline right after its tab in the strip. */
export function ProjectSubTabs({ group, projectId }: { group: TabGroup; projectId: string }) {
  const agents = useSessions((s) => s.agents);
  const { activate, close } = useTabs.getState();
  const active = group.tabs.find((t) => t.id === group.activeTabId);
  const activeProject = active ? projectOfTarget(active.target, agents) : undefined;

  useEffect(() => {
    if (activeProject === projectId && active) lastInProject.set(projectId, active.id);
  }, [projectId, activeProject, active]);

  const members = group.tabs.filter((t) => projectOfTarget(t.target, agents) === projectId);
  const chip = "group relative flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 font-mono text-[11.5px] transition-colors";

  return (
    <div className="mb-1 flex shrink-0 items-center gap-0.5 self-end">
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
              onAuxClick={(e) => e.button === 1 && close(t.id)}
              className={cn(chip, "cursor-default pr-1", on ? "bg-surface text-fg ring-1 ring-line" : "text-muted hover:bg-surface/60 hover:text-fg-2")}
            >
              <AgentGlyph agent={AGENTS[a.kind]} size={13} status={a.status} />
              <span className="max-w-44 truncate">{a.name.replace(/\s·\s.*$/, "")}</span>
              <ActivityIconFor id={a.id} status={a.status} size={10} />
              <PromptChip id={a.id} />
              <button
                aria-label={`Close ${a.name}`}
                title="Close tab (the agent keeps running)"
                onClick={(e) => {
                  e.stopPropagation();
                  close(t.id);
                }}
                className={cn("grid h-5 w-5 place-items-center rounded text-faint hover:bg-surface-2 hover:text-fg", on ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
      <button
        onClick={() => useLayout.getState().setPaletteOpen(true, "Start ")}
        title="Start an agent"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-faint hover:bg-surface/60 hover:text-fg"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}
