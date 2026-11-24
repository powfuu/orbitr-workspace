import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface MenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
}

/** Wraps children; right-click opens a positioned menu. */
export function ContextMenu({ items, children }: { items: MenuItem[]; children: ReactNode }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", close);
    };
  }, [pos]);

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        setPos({ x: e.clientX, y: e.clientY });
      }}
    >
      {children}
      <AnimatePresence>
        {pos && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.97, y: -2 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            style={{ left: pos.x, top: pos.y }}
            className="fixed z-50 min-w-44 origin-top-left rounded-lg bg-surface p-1 shadow-pop"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {items.map((it) => (
              <button
                key={it.label}
                role="menuitem"
                onClick={() => {
                  setPos(null);
                  it.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px]",
                  it.danger ? "text-error hover:bg-error/10" : "text-fg-2 hover:bg-surface-2 hover:text-fg",
                )}
              >
                <it.icon size={14} strokeWidth={1.75} />
                {it.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
