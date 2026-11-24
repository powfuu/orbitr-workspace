import { useWorkspaceLayout, type PaneLayout } from "../../stores/tabStore";
import { topLeft, topRight, type LayoutNode } from "../../stores/paneTree";
import { PaneView } from "../panes/PaneView";
import { SplitDivider } from "../panes/SplitDivider";

function Node({ node, l, tl, tr }: { node: LayoutNode; l: PaneLayout; tl: string; tr: string }) {
  if (node.type === "pane") {
    const group = l.panes[node.id];
    if (!group) return null;
    return (
      <PaneView
        paneId={node.id}
        group={group}
        focused={l.focusedPane === node.id}
        multi={l.layout.type === "split"}
        topLeft={node.id === tl}
        topRight={node.id === tr}
      />
    );
  }
  const row = node.dir === "row";
  return (
    <div className={`flex h-full min-h-0 w-full min-w-0 ${row ? "flex-row" : "flex-col"}`}>
      <div className="min-h-0 min-w-0" style={{ flexBasis: `${node.ratio * 100}%`, flexGrow: 0, flexShrink: 1 }}>
        <Node node={node.a} l={l} tl={tl} tr={tr} />
      </div>
      <SplitDivider splitId={node.id} dir={node.dir} />
      <div className="min-h-0 min-w-0 flex-1">
        <Node node={node.b} l={l} tl={tl} tr={tr} />
      </div>
    </div>
  );
}

/** Center area: the active workspace's split tree of panes. */
export function CenterWorkspace() {
  const l = useWorkspaceLayout();
  return (
    <main className="h-full min-w-0">
      <Node node={l.layout} l={l} tl={topLeft(l.layout)} tr={topRight(l.layout)} />
    </main>
  );
}
