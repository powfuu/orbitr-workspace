import { useTabs } from "../../stores/tabStore";
import { cn } from "../../lib/cn";
import type { ID } from "../../types";

/** Drag handle between two split children. Updates the split ratio relative to the parent box. */
export function SplitDivider({ splitId, dir }: { splitId: ID; dir: "row" | "column" }) {
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const parent = e.currentTarget.parentElement!.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const ratio = dir === "row" ? (ev.clientX - parent.left) / parent.width : (ev.clientY - parent.top) / parent.height;
      useTabs.getState().resize(splitId, ratio);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
    };
    document.body.style.cursor = dir === "row" ? "col-resize" : "row-resize";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div
      role="separator"
      aria-orientation={dir === "row" ? "vertical" : "horizontal"}
      onPointerDown={onPointerDown}
      onDoubleClick={() => useTabs.getState().resize(splitId, 0.5)}
      className={cn("group relative z-20 shrink-0 bg-line-soft", dir === "row" ? "w-px cursor-col-resize" : "h-px cursor-row-resize")}
    >
      <span className={cn("absolute", dir === "row" ? "inset-y-0 -left-1 -right-1" : "inset-x-0 -top-1 -bottom-1")} />
      <span
        className={cn(
          "absolute bg-white opacity-0 transition-opacity delay-75 group-hover:opacity-60 group-active:opacity-100",
          dir === "row" ? "inset-y-0 left-0 w-px" : "inset-x-0 top-0 h-px",
        )}
      />
    </div>
  );
}
