import type { ID } from "../types";

/** Binary split tree. Leaves are panes; each split divides its area between `a` and `b`. */
export type LayoutNode =
  | { type: "pane"; id: ID }
  | { type: "split"; id: ID; dir: "row" | "column"; ratio: number; a: LayoutNode; b: LayoutNode };

export type Side = "left" | "right" | "top" | "bottom";

export function leaves(n: LayoutNode): ID[] {
  return n.type === "pane" ? [n.id] : [...leaves(n.a), ...leaves(n.b)];
}

/** Replaces pane `paneId` with a split holding it and `newPane` on the given side. */
export function splitAt(n: LayoutNode, paneId: ID, newPane: ID, side: Side, splitId: ID): LayoutNode {
  if (n.type === "pane") {
    if (n.id !== paneId) return n;
    const fresh: LayoutNode = { type: "pane", id: newPane };
    const dir = side === "left" || side === "right" ? "row" : "column";
    const first = side === "left" || side === "top";
    return { type: "split", id: splitId, dir, ratio: 0.5, a: first ? fresh : n, b: first ? n : fresh };
  }
  return { ...n, a: splitAt(n.a, paneId, newPane, side, splitId), b: splitAt(n.b, paneId, newPane, side, splitId) };
}

/** Removes a pane; its sibling takes the parent split's place. */
export function removePane(n: LayoutNode, paneId: ID): LayoutNode {
  if (n.type === "pane") return n;
  if (n.a.type === "pane" && n.a.id === paneId) return n.b;
  if (n.b.type === "pane" && n.b.id === paneId) return n.a;
  return { ...n, a: removePane(n.a, paneId), b: removePane(n.b, paneId) };
}

export function setRatio(n: LayoutNode, splitId: ID, ratio: number): LayoutNode {
  if (n.type === "pane") return n;
  if (n.id === splitId) return { ...n, ratio: Math.min(0.85, Math.max(0.15, ratio)) };
  return { ...n, a: setRatio(n.a, splitId, ratio), b: setRatio(n.b, splitId, ratio) };
}

/** The pane at the top-right corner (hosts window-level controls). */
export function topRight(n: LayoutNode): ID {
  return n.type === "pane" ? n.id : topRight(n.dir === "row" ? n.b : n.a);
}

export function topLeft(n: LayoutNode): ID {
  return n.type === "pane" ? n.id : topLeft(n.a);
}
