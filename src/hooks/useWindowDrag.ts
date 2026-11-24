import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "../lib/platform";

const INTERACTIVE = "button, a, input, textarea, select, [role=tab], [role=menuitem], [data-no-drag]";

/**
 * Makes a bar behave like a native title bar: drag to move the window,
 * double-click to maximize/restore. Clicks on controls inside still work.
 */
export const windowDragProps = {
  onMouseDown(e: React.MouseEvent) {
    if (!isTauri || e.button !== 0 || (e.target as HTMLElement).closest(INTERACTIVE)) return;
    if (e.detail === 2) void getCurrentWindow().toggleMaximize();
    else void getCurrentWindow().startDragging();
  },
};
