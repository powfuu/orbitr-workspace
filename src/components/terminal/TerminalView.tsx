import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useTerminalSearch } from "../../features/search/searchStore";
import { TerminalSearchBar } from "./TerminalSearchBar";
import { terminalRegistry } from "../../features/terminals/terminalRegistry";
import type { ID } from "../../types";
import { markSeen } from "../../features/sessions/activityStore";
import { useFocusedSession } from "../../stores/focusStore";

/** Mounts a registry-owned xterm instance and keeps it fitted to its container. */
export function TerminalView({ id, focused }: { id: ID; focused: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    void terminalRegistry.attach(id, el).then(() => focused && terminalRegistry.focus(id));
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => terminalRegistry.fit(id));
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      terminalRegistry.detach(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (focused) terminalRegistry.focus(id);
  }, [focused, id]);

  const searching = useTerminalSearch((s) => s.openFor === id);
  return (
    <div className="relative h-full w-full" data-session={id} onFocusCapture={() => { markSeen(id); useFocusedSession.getState().set(id); }}>
      <div ref={ref} className="h-full w-full" />
      <AnimatePresence>{searching && <TerminalSearchBar id={id} />}</AnimatePresence>
    </div>
  );
}
