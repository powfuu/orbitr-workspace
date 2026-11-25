import { useVim } from "../../features/vim/vimStore";

/** Vimium-style labels over every clickable element (Vim mode, `f`). */
export function VimHints() {
  const hints = useVim((v) => v.hints);
  const typed = useVim((v) => v.typed);
  if (!hints) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      {hints
        .filter((h) => h.label.startsWith(typed))
        .map((h) => (
          <span
            key={h.label}
            style={{ left: h.x, top: h.y }}
            className="absolute rounded-sm bg-warning px-1 font-mono text-[10.5px] font-bold uppercase leading-4 text-black shadow-pop"
          >
            <span className="opacity-40">{typed}</span>
            {h.label.slice(typed.length)}
          </span>
        ))}
    </div>
  );
}
