import { FolderOpen } from "lucide-react";
import { useWorkspaces } from "../../stores/workspaceStore";
import { useTabs } from "../../stores/tabStore";
import { usePlatformInfo } from "../../hooks/usePlatformInfo";
import { tildify } from "../../lib/platform";
import type { ID } from "../../types";
import { GitPanel } from "./GitPanel";
import { MissingView } from "../workspace/ProjectView";
import { IconButton } from "../ui/IconButton";

/** Full-size Git for one project (its own tab): large change list and diff. */
export function GitView({ id }: { id: ID }) {
  const project = useWorkspaces((s) => s.projects[id]);
  const home = usePlatformInfo()?.homeDir ?? undefined;
  if (!project) return <MissingView />;
  return (
    <div className="@container flex h-full flex-col bg-bg-2">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line-soft px-4">
        <span className="text-[13px] font-medium text-fg">{project.name}</span>
        <span className="selectable truncate font-mono text-[11px] text-faint">{tildify(project.path, home)}</span>
        <span className="ml-auto">
          <IconButton icon={FolderOpen} size="sm" label="Open project overview" onClick={() => useTabs.getState().open({ type: "project", id })} />
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <GitPanel path={project.path} full />
      </div>
    </div>
  );
}
