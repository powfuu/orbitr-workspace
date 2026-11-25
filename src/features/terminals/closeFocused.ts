import { focusedRegion } from "../../lib/focusRegion";
import { getActiveTabs, useTabs } from "../../stores/tabStore";
import { useSessions } from "../../stores/sessionStore";
import { closeTerminal } from "./terminalActions";

/** ⌘W: sidebar → nothing · terminal panel → active terminal · centre → active tab. */
export function closeFocused() {
  const region = focusedRegion();
  if (region === "sidebar") return;
  if (region === "terminal") {
    const id = useSessions.getState().activeTerminalId;
    if (id) void closeTerminal(id);
    return;
  }
  useTabs.getState().close(getActiveTabs().activeTabId);
}
