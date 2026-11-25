import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-react";
import { customTitleBar } from "../../lib/platform";
import { cn } from "../../lib/cn";

/** Width the caption buttons take in the top-right corner; bars under them pad by this much. */
export const WINDOW_CONTROLS_WIDTH = 138;

/** Pads the top-right bar so its own controls are not hidden under the caption buttons. */
export const windowControlsPad = customTitleBar ? { paddingRight: WINDOW_CONTROLS_WIDTH } : undefined;

/** Minimize / maximize / close for Windows, where the native title bar is removed. */
export function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!customTitleBar) return;
    const win = getCurrentWindow();
    const sync = () => void win.isMaximized().then(setMaximized).catch(() => {});
    sync();
    const unlisten = win.onResized(sync);
    return () => void unlisten.then((f) => f());
  }, []);

  if (!customTitleBar) return null;
  const win = getCurrentWindow();
  const btn = "grid h-full w-[46px] place-items-center text-muted transition-colors hover:text-fg";
  return (
    <div data-no-drag className="fixed right-0 top-0 z-[60] flex h-11" style={{ width: WINDOW_CONTROLS_WIDTH }}>
      <button aria-label="Minimize" title="Minimize" className={cn(btn, "hover:bg-surface")} onClick={() => void win.minimize()}>
        <Minus size={15} strokeWidth={1.5} />
      </button>
      <button
        aria-label={maximized ? "Restore" : "Maximize"}
        title={maximized ? "Restore" : "Maximize"}
        className={cn(btn, "hover:bg-surface")}
        onClick={() => void win.toggleMaximize()}
      >
        {maximized ? <Copy size={12} strokeWidth={1.5} className="-scale-x-100" /> : <Square size={12} strokeWidth={1.5} />}
      </button>
      <button aria-label="Close" title="Close" className={cn(btn, "hover:bg-[#c42b1c] hover:text-white")} onClick={() => void win.close()}>
        <X size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}
