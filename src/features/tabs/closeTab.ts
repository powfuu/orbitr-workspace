import { getActiveTabs, useTabs } from "../../stores/tabStore";
import { useSessions } from "../../stores/sessionStore";
import { projectOfTarget } from "./projectGroups";

/**
 * Closes a tab. If it was an agent you were looking at, land on its project's overview
 * (not on whatever tab happens to be next, like Git).
 */
export function closeTab(tabId: string) {
  const { tabs, activeTabId } = getActiveTabs();
  const tab = tabs.find((t) => t.id === tabId);
  const projectId = tab && tab.target.type === "agent" ? projectOfTarget(tab.target, useSessions.getState().agents) : undefined;
  useTabs.getState().close(tabId);
  if (projectId && tabId === activeTabId) useTabs.getState().open({ type: "project", id: projectId });
}
