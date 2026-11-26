import { motion, useScroll, useSpring } from "framer-motion";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";

export interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
}

/** Nearest ancestor that actually scrolls (the pane), so progress follows the page. */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if (o === "auto" || o === "scroll") return p;
  }
  return null;
}

/**
 * Sticky bar at the top of a page: "orbitr › page" plus links to its sections. Clicking
 * scrolls there smoothly; the current section is underlined as you scroll, a thin line shows
 * how far down you are, and the bar lifts (shadow) once the page has scrolled.
 */
export function SectionNav({ page, icon: PageIcon, sections }: { page: string; icon: LucideIcon; sections: NavSection[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const [lifted, setLifted] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const ids = sections.map((s) => s.id).join(",");

  useEffect(() => setScroller(scrollParent(bar.current)), []);
  const { scrollYProgress, scrollY } = useScroll({ container: scroller ? { current: scroller } : undefined });
  const progress = useSpring(scrollYProgress, { stiffness: 260, damping: 40, mass: 0.4 });
  useEffect(() => scrollY.on("change", (y) => setLifted(y > 8)), [scrollY]);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    // A section counts as "current" while it crosses the upper third of the view.
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-15% 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const go = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      ref={bar}
      className={cn(
        "sticky top-0 z-20 -mx-5 mb-6 border-b bg-bg-2/85 px-5 backdrop-blur transition-[box-shadow,border-color] duration-200 @lg:-mx-10 @lg:px-10",
        lifted ? "border-line shadow-[0_8px_24px_-16px_rgba(0,0,0,0.9)]" : "border-line-soft",
      )}
    >
      <nav aria-label={`${page} sections`} className="no-scrollbar flex h-11 items-stretch gap-1 overflow-x-auto font-mono text-[11.5px]">
        <span className="flex shrink-0 items-center gap-1.5 text-faint">orbitr</span>
        <span className="flex shrink-0 items-center"><ChevronRight size={11} className="text-faint" /></span>
        <span className="mr-2 flex shrink-0 items-center gap-1.5 text-fg">
          <PageIcon size={13} className="text-muted" /> {page}
        </span>
        <span className="mx-2 my-auto h-4 w-px shrink-0 bg-line" />
        {sections.map((s) => {
          const on = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => go(s.id)}
              className={cn("group relative flex shrink-0 items-center gap-1.5 px-2.5 transition-colors", on ? "text-fg" : "text-muted hover:text-fg-2")}
            >
              <s.icon size={12} className={cn("transition-colors", on ? "text-accent" : "text-faint group-hover:text-muted")} />
              {s.label}
              {on && (
                <motion.span
                  layoutId={`section-nav-${page}`}
                  className="absolute inset-x-1.5 -bottom-px h-[2px] rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 520, damping: 40 }}
                />
              )}
            </button>
          );
        })}
      </nav>
      {/* How far down the page you are. */}
      <motion.div aria-hidden className="absolute inset-x-0 -bottom-px h-px origin-left bg-accent/50" style={{ scaleX: progress }} />
    </div>
  );
}
