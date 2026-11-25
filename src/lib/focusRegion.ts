export type Region = "sidebar" | "terminal" | "main";

let last: Region = "main";
const regionOf = (el: Element | null): Region =>
  (el?.closest("[data-region]")?.getAttribute("data-region") as Region | null) ?? "main";

// Clicks on non-focusable areas don't move DOM focus, so remember the last pointer region too.
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", (e) => (last = regionOf(e.target as Element)), true);
  window.addEventListener("focusin", (e) => (last = regionOf(e.target as Element)), true);
}

export const focusedRegion = () => last;
