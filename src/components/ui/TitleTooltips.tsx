import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const GAP = 8;
const M = 8;

/**
 * Replaces every native `title` tooltip with the app's styled one. On hover the title is moved to
 * `data-tip` (so the OS tooltip never shows) and drawn below the element, or above near the bottom.
 */
export function TitleTooltips() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; above: boolean } | null>(null);
  const [shift, setShift] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer = 0;
    let current: Element | null = null;
    const hide = () => {
      window.clearTimeout(timer);
      current = null;
      setTip(null);
    };
    const over = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.("[title],[data-tip]");
      if (el === current) return;
      hide();
      if (!el) return;
      const title = el.getAttribute("title");
      if (title !== null) {
        el.removeAttribute("title");
        el.setAttribute("data-tip", title);
        // Keep an accessible name for icon-only controls that relied on the title.
        if (!el.getAttribute("aria-label") && !el.textContent?.trim()) el.setAttribute("aria-label", title);
      }
      const text = el.getAttribute("data-tip")?.trim();
      if (!text) return;
      current = el;
      timer = window.setTimeout(() => {
        const r = el.getBoundingClientRect();
        const above = r.bottom + 40 > innerHeight;
        setTip({ text, x: r.left + r.width / 2, y: above ? r.top - GAP : r.bottom + GAP, above });
      }, 450);
    };
    window.addEventListener("pointerover", over, true);
    window.addEventListener("pointerdown", hide, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("blur", hide);
    return () => {
      hide();
      window.removeEventListener("pointerover", over, true);
      window.removeEventListener("pointerdown", hide, true);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("blur", hide);
    };
  }, []);

  // Keep it inside the window.
  useLayoutEffect(() => {
    const r = box.current?.getBoundingClientRect();
    setShift(!r ? 0 : r.right > innerWidth - M ? innerWidth - M - r.right : r.left < M ? M - r.left : 0);
  }, [tip]);

  return (
    <AnimatePresence>
      {tip && (
        <motion.div
          ref={box}
          role="tooltip"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          style={{ left: tip.x + shift, top: tip.y, transform: `translate(-50%, ${tip.above ? "-100%" : "0"})` }}
          className="pointer-events-none fixed z-[100] max-w-[min(360px,calc(100vw-16px))] whitespace-pre-line rounded-md border border-line bg-surface-2 px-2.5 py-1.5 font-mono text-2xs leading-relaxed text-fg-2 shadow-pop"
        >
          {tip.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
