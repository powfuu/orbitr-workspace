import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, type ReactNode } from "react";
import { Kbd } from "./Kbd";

interface Props {
  label: string;
  shortcut?: string;
  side?: "top" | "bottom" | "right" | "left";
  children: ReactNode;
}

const placement = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
};

export function Tooltip({ label, shortcut, side = "bottom", children }: Props) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number>(undefined);
  const show = () => (timer.current = window.setTimeout(() => setOpen(true), 450));
  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };
  return (
    <span className="relative inline-flex" onPointerEnter={show} onPointerLeave={hide} onPointerDown={hide}>
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className={`pointer-events-none absolute z-50 flex items-center gap-2 whitespace-nowrap rounded-md bg-surface-2 px-2 py-1 text-2xs text-fg-2 shadow-pop ${placement[side]}`}
          >
            {label}
            {shortcut && <Kbd>{shortcut}</Kbd>}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
