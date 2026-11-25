import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Kbd } from "./Kbd";

interface Props {
  label: string;
  shortcut?: string;
  side?: "top" | "bottom" | "right" | "left";
  children: ReactNode;
  /** Full-width wrapper (for rows) instead of inline. */
  block?: boolean;
  /** Overrides the wrapper classes (e.g. flex sizing inside a tab strip). */
  className?: string;
}

const GAP = 8;

/**
 * Hover tooltip rendered in a portal at a fixed position, so scroll containers
 * (sidebar, panels) never clip it. Kept inside the window.
 */
export function Tooltip({ label, shortcut, side = "bottom", children, block, className }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const timer = useRef<number>(undefined);

  const show = () => {
    timer.current = window.setTimeout(() => {
      const r = anchor.current?.getBoundingClientRect();
      if (!r) return;
      const point = {
        top: { x: r.left + r.width / 2, y: r.top - GAP },
        bottom: { x: r.left + r.width / 2, y: r.bottom + GAP },
        right: { x: r.right + GAP, y: r.top + r.height / 2 },
        left: { x: r.left - GAP, y: r.top + r.height / 2 },
      }[side];
      setPos(point);
    }, 450);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setPos(null);
  };

  const transform = {
    top: "translate(-50%, -100%)",
    bottom: "translate(-50%, 0)",
    right: "translate(0, -50%)",
    left: "translate(-100%, -50%)",
  }[side];

  return (
    <span ref={anchor} className={className ?? (block ? "relative flex w-full" : "relative inline-flex")} onPointerEnter={show} onPointerLeave={hide} onPointerDown={hide}>
      {children}
      {createPortal(
        <AnimatePresence>
          {pos && (
            <motion.span
              role="tooltip"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ left: Math.min(pos.x, window.innerWidth - 8), top: pos.y, transform }}
              className="pointer-events-none fixed z-[90] flex max-w-[min(520px,90vw)] items-center gap-2 rounded-md bg-surface-2 px-2 py-1 font-mono text-2xs text-fg-2 shadow-pop"
            >
              <span className="break-all">{label}</span>
              {shortcut && <Kbd>{shortcut}</Kbd>}
            </motion.span>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </span>
  );
}
