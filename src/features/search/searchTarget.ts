import { useFocusedSession } from "../../stores/focusStore";
import { getActiveTabs } from "../../stores/tabStore";
import { useSessions } from "../../stores/sessionStore";
import { useLayout } from "../../stores/layoutStore";
import type { ID } from "../../types";

const onScreen = (id: ID) => !!document.querySelector(`[data-session="${CSS.escape(id)}"]`);

/** Session to search: the focused terminal/agent, else the agent tab in view, else the panel's terminal. */
export function searchTarget(): ID | null {
  const focused = useFocusedSession.getState().id;
  if (focused && onScreen(focused)) return focused;
  const { tabs, activeTabId } = getActiveTabs();
  const tab = tabs.find((t) => t.id === activeTabId)?.target;
  if (tab?.type === "agent" && onScreen(tab.id)) return tab.id;
  const term = useSessions.getState().activeTerminalId;
  if (term && useLayout.getState().terminalOpen && onScreen(term)) return term;
  return null;
}
