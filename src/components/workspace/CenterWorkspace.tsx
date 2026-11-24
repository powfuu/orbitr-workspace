import { AnimatePresence, motion } from "framer-motion";
import { useActiveTabs } from "../../stores/tabStore";
import type { TabTarget } from "../../types";
import { TabBar } from "../tabs/TabBar";
import { HomeView } from "./HomeView";
import { ProjectView } from "./ProjectView";
import { WorkspaceView } from "./WorkspaceView";
import { AgentView } from "../agents/AgentView";
import { SettingsView } from "../settings/SettingsView";

function renderTarget(t: TabTarget) {
  switch (t.type) {
    case "home": return <HomeView />;
    case "workspace": return <WorkspaceView id={t.id} />;
    case "project": return <ProjectView id={t.id} />;
    case "agent": return <AgentView id={t.id} />;
    case "settings": return <SettingsView />;
  }
}

export function CenterWorkspace() {
  const { tabs, activeTabId } = useActiveTabs();
  const tab = tabs.find((t) => t.id === activeTabId);
  return (
    <main className="flex h-full min-w-0 flex-col bg-bg">
      <TabBar />
      <div className="relative min-h-0 flex-1 overflow-hidden bg-bg-2">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <AnimatePresence mode="wait">
          <motion.div
            key={tab?.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className={tab?.target.type === "agent" ? "relative h-full" : "relative h-full overflow-y-auto"}
          >
            {tab && renderTarget(tab.target)}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
