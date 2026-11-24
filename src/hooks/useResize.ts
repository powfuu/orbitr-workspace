import { useCallback } from "react";

/** Pointer-drag resize. `dir` = 1 grows rightwards, -1 grows leftwards. */
export function useResize(width: number, onChange: (w: number) => void, dir: 1 | -1) {
  return useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = width;
      const move = (ev: PointerEvent) => onChange(startW + (ev.clientX - startX) * dir);
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        document.body.style.cursor = "";
      };
      document.body.style.cursor = "col-resize";
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [width, onChange, dir],
  );
}
