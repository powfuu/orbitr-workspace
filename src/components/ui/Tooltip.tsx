import { AnimatePresence, motion } from "framer-motion";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
  const tip = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);
  // Keep the whole tooltip inside the window instead of letting it squeeze/wrap at the edge.
  useLayoutEffect(() => {
    const r = tip.current?.getBoundingClientRect();
    if (!r) return setShift(0);
    const M = 8;
    setShift(r.right > innerWidth - M ? innerWidth - M - r.right : r.left < M ? M - r.left : 0);
  }, [pos]);

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
    setShift(0);
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
              ref={tip}
              role="tooltip"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ left: pos.x + shift, top: pos.y, transform }}
              className="pointer-events-none fixed z-[90] flex max-w-[calc(100vw-16px)] items-center gap-2 whitespace-nowrap rounded-md border border-line bg-surface-2 px-2.5 py-1.5 font-mono text-2xs text-fg-2 shadow-pop"
            >
              <span className="min-w-0 truncate">
                {label.split("  ·  ").map((part, i) => (
                  <span key={i} className={i ? "text-faint" : undefined}>{i ? `  ·  ${part}` : part}</span>
                ))}
              </span>
              {shortcut && <Kbd>{shortcut}</Kbd>}
            </motion.span>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </span>
  );
}
