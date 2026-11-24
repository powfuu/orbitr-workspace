import type { TabTarget } from "../../types";
import { HomeView } from "../../components/workspace/HomeView";
import { ProjectView } from "../../components/workspace/ProjectView";
import { WorkspaceView } from "../../components/workspace/WorkspaceView";
import { AgentView } from "../../components/agents/AgentView";
import { SettingsView } from "../../components/settings/SettingsView";
import { GitView } from "../../components/git/GitView";

export function renderTarget(t: TabTarget) {
  switch (t.type) {
    case "home": return <HomeView />;
    case "workspace": return <WorkspaceView id={t.id} />;
    case "project": return <ProjectView id={t.id} />;
    case "agent": return <AgentView id={t.id} />;
    case "settings": return <SettingsView />;
    case "git": return <GitView id={t.id} />;
  }
}
