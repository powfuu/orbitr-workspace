import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";

export interface NavSection {
  id: string;
  label: string;
}

/**
 * Sticky bar at the top of a page: "orbitr › page" plus links to the page's sections. Clicking
 * scrolls there; the section you're reading is highlighted as you scroll.
 */
export function SectionNav({ page, sections }: { page: string; sections: NavSection[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  const bar = useRef<HTMLDivElement>(null);
  const ids = sections.map((s) => s.id).join(",");

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
    <div ref={bar} className="sticky top-0 z-20 -mx-5 mb-6 border-b border-line-soft bg-bg-2/85 px-5 backdrop-blur @lg:-mx-10 @lg:px-10">
      <nav aria-label={`${page} sections`} className="no-scrollbar flex h-10 items-center gap-1 overflow-x-auto font-mono text-[11.5px]">
        <span className="text-faint">orbitr</span>
        <ChevronRight size={11} className="shrink-0 text-faint" />
        <span className="mr-3 shrink-0 text-fg">{page}</span>
        <span className="mr-2 h-4 w-px shrink-0 bg-line" />
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => go(s.id)}
            className={cn("relative h-7 shrink-0 rounded-md px-2.5 transition-colors", active === s.id ? "text-fg" : "text-muted hover:text-fg-2")}
          >
            {active === s.id && <motion.span layoutId={`section-nav-${page}`} className="absolute inset-0 rounded-md bg-surface ring-1 ring-line" transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }} />}
            <span className="relative">{s.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
