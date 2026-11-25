import { useEffect, useState } from "react";
import { useVim } from "../../features/vim/vimStore";
import { describe } from "../../features/vim/hints";

/** Ring + name over the element the NORMAL-mode cursor is on. Follows it through scroll/resize/animations. */
export function VimCursor() {
  const cursor = useVim((v) => (v.mode === "normal" ? v.cursor : null));
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!cursor) return setRect(null);
    let frame = 0;
    const tick = () => {
      if (!cursor.isConnected) {
        useVim.getState().set({ cursor: null });
        return;
      }
      setRect((prev) => {
        const r = cursor.getBoundingClientRect();
        return prev && prev.x === r.x && prev.y === r.y && prev.width === r.width && prev.height === r.height ? prev : r;
      });
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [cursor]);

  if (!cursor || !rect) return null;
  const above = rect.top > 22;
  return (
    <div className="pointer-events-none fixed inset-0 z-[95]">
      <div
        className="absolute rounded-[5px] ring-2 ring-accent shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-accent)_18%,transparent)] transition-[left,top,width,height] duration-100 ease-out"
        style={{ left: rect.left - 2, top: rect.top - 2, width: rect.width + 4, height: rect.height + 4 }}
      />
      <div
        className="absolute max-w-72 truncate rounded-sm bg-accent px-1.5 font-mono text-[10px] leading-4 text-bg transition-[left,top] duration-100 ease-out"
        style={{ left: Math.max(4, Math.min(rect.left, innerWidth - 300)), top: above ? rect.top - 20 : rect.bottom + 4 }}
      >
        {describe(cursor)}
      </div>
    </div>
  );
}
