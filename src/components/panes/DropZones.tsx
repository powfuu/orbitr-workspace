import { motion } from "framer-motion";
import { useState } from "react";
import { useTabs } from "../../stores/tabStore";
import { TAB_MIME, useTabDrag } from "../../features/panes/dragState";
import type { Side } from "../../stores/paneTree";
import type { ID } from "../../types";

type Zone = Side | "center";

const EDGE = 0.25;
const rects: Record<Zone, string> = {
  left: "inset-y-2 left-2 w-[calc(50%-12px)]",
  right: "inset-y-2 right-2 w-[calc(50%-12px)]",
  top: "inset-x-2 top-2 h-[calc(50%-12px)]",
  bottom: "inset-x-2 bottom-2 h-[calc(50%-12px)]",
  center: "inset-2",
};

/** While a tab is dragged, the pane shows where it would land: an edge splits, the middle moves it here. */
export function DropZones({ paneId }: { paneId: ID }) {
  const dragging = useTabDrag((s) => s.tabId);
  const [zone, setZone] = useState<Zone | null>(null);
  if (!dragging) return null;

  const pick = (e: React.DragEvent): Zone => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const d = { left: x, right: 1 - x, top: y, bottom: 1 - y };
    const [side, dist] = (Object.entries(d) as [Side, number][]).sort((a, b) => a[1] - b[1])[0]!;
    return dist < EDGE ? side : "center";
  };

  return (
    <div
      className="absolute inset-0 z-30"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(TAB_MIME)) return;
        e.preventDefault();
        setZone(pick(e));
      }}
      onDragLeave={() => setZone(null)}
      onDrop={(e) => {
        const tabId = e.dataTransfer.getData(TAB_MIME);
        const z = pick(e);
        setZone(null);
        useTabDrag.getState().set(null);
        if (!tabId) return;
        e.preventDefault();
        const tabs = useTabs.getState();
        if (z === "center") tabs.moveTab(tabId, paneId);
        else tabs.split(paneId, z, tabId);
      }}
    >
      {zone && (
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 600, damping: 40 }}
          className={`pointer-events-none absolute rounded-xl border-2 border-fg/60 bg-fg/[0.06] ${rects[zone]}`}
        />
      )}
    </div>
  );
}
