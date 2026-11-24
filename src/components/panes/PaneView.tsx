import { motion } from "framer-motion";
import { useTabs, type TabGroup } from "../../stores/tabStore";
import { renderTarget } from "../../features/tabs/renderTarget";
import { cn } from "../../lib/cn";
import type { ID } from "../../types";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { PaneTabBar } from "./PaneTabBar";
import { DropZones } from "./DropZones";
import { PaneFocusContext } from "../../features/panes/paneFocus";

interface Props {
  paneId: ID;
  group: TabGroup;
  focused: boolean;
  multi: boolean;
  topLeft: boolean;
  topRight: boolean;
}

export function PaneView({ paneId, group, focused, multi, topLeft, topRight }: Props) {
  const tab = group.tabs.find((t) => t.id === group.activeTabId);
  return (
    <section
      aria-label="Pane"
      onPointerDownCapture={() => useTabs.getState().focusPane(paneId)}
      className="flex h-full min-h-0 min-w-0 flex-col bg-bg"
    >
      <PaneTabBar paneId={paneId} group={group} focused={focused} multi={multi} topLeft={topLeft} topRight={topRight} />
      <div className={cn("@container relative min-h-0 flex-1 overflow-hidden bg-bg-2 transition-opacity", multi && !focused && "opacity-[0.88]")}>
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <PaneFocusContext.Provider value={focused}>
        <ErrorBoundary label="Pane">
          {/* Swap instantly and fade the new view in: waiting for an exit animation left a blank gap. */}
          <motion.div
            key={tab?.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.14, ease: [0.2, 0, 0, 1] }}
            className={tab?.target.type === "agent" || tab?.target.type === "git" ? "relative h-full" : "relative h-full overflow-y-auto"}
          >
            {tab && renderTarget(tab.target)}
          </motion.div>
        </ErrorBoundary>
        </PaneFocusContext.Provider>
        <DropZones paneId={paneId} />
      </div>
    </section>
  );
}
