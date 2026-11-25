import { getCurrentWindow } from "@tauri-apps/api/window";
import { useLayout } from "../../stores/layoutStore";
import { isTauri } from "../../lib/platform";

/** Full screen for the centre pane: hides sidebar, terminal panel, tab bars and status bar, and makes the window full screen. */
export function toggleFocusMode(on = !useLayout.getState().focusMode) {
  useLayout.setState({ focusMode: on });
  if (isTauri) void getCurrentWindow().setFullscreen(on).catch(() => undefined);
}
