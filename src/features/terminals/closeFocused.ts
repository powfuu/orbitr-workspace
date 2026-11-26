import { focusedRegion } from "../../lib/focusRegion";
import { getActiveTabs } from "../../stores/tabStore";
import { useSessions } from "../../stores/sessionStore";
import { closeTerminal } from "./terminalActions";
import { closeTab } from "../tabs/closeTab";
import { hideFloating, useFloating } from "../floating/floatingTerminal";

/** ⌘W: sidebar → nothing · terminal panel → active terminal · centre → active tab. */
export function closeFocused() {
  const region = focusedRegion();
  if (useFloating.getState().open && region === "floating") return hideFloating();
  if (region === "sidebar") return;
  if (region === "terminal") {
    const id = useSessions.getState().activeTerminalId;
    if (id) void closeTerminal(id);
    return;
  }
  const id = getActiveTabs().activeTabId;
  if (id) closeTab(id);
}
