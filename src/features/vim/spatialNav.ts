import { clickables } from "./hints";

export type Dir = "h" | "j" | "k" | "l";

const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

/**
 * Nearest clickable in a direction from `from` (or the first one in `scope` when nothing is selected).
 * Score = distance along the direction + 2 × sideways offset, so straight lines win over diagonals.
 */
export function nextInDirection(from: HTMLElement | null, dir: Dir, scope?: Element | null): HTMLElement | null {
  const all = clickables().filter((el) => el !== from && (!scope || scope.contains(el)));
  if (!from || !from.isConnected) {
    // Reading order: rows (centres within 14px count as one row), then left to right.
    return all.sort((a, b) => {
      const ca = center(a.getBoundingClientRect());
      const cb = center(b.getBoundingClientRect());
      return Math.abs(ca.y - cb.y) < 14 ? ca.x - cb.x : ca.y - cb.y;
    })[0] ?? null;
  }
  const r = from.getBoundingClientRect();
  const c = center(r);
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of all) {
    const er = el.getBoundingClientRect();
    const e = center(er);
    const dx = e.x - c.x;
    const dy = e.y - c.y;
    const ahead = dir === "l" ? er.left >= r.right - 4 : dir === "h" ? er.right <= r.left + 4 : dir === "j" ? er.top >= r.bottom - 4 : er.bottom <= r.top + 4;
    if (!ahead) continue;
    const along = dir === "h" || dir === "l" ? Math.abs(dx) : Math.abs(dy);
    const side = dir === "h" || dir === "l" ? Math.abs(dy) : Math.abs(dx);
    const score = along + side * 2;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}
