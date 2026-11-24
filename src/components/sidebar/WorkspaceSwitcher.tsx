import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronsUpDown, LayoutGrid, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useActiveWorkspace, useWorkspaces } from "../../stores/workspaceStore";
import { useTabs } from "../../stores/tabStore";
import { WorkspaceGlyph } from "../ui/WorkspaceGlyph";
import { cn } from "../../lib/cn";
import { Kbd } from "../ui/Kbd";
import { modKey } from "../../lib/platform";

export function WorkspaceSwitcher() {
  const active = useActiveWorkspace();
  const workspaces = useWorkspaces((s) => s.workspaces);
  const setActive = useWorkspaces((s) => s.setActiveWorkspace);
  const create = useWorkspaces((s) => s.createWorkspace);
  const openTab = useTabs((s) => s.open);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const commit = () => {
    const name = draft?.trim();
    if (name) openTab({ type: "workspace", id: create(name) });
    setDraft(null);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative px-2">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-left transition-colors hover:bg-surface/70"
      >
        <WorkspaceGlyph name={active.name} hue={active.hue} size={22} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium text-fg">{active.name}</span>
          <span className="block text-2xs text-faint">
            {active.projectIds.length} project{active.projectIds.length === 1 ? "" : "s"}
          </span>
        </span>
        <ChevronsUpDown size={13} className="text-faint" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute inset-x-2 top-full z-40 mt-1 origin-top rounded-lg bg-surface p-1 shadow-pop"
          >
            <div className="px-2 pb-1 pt-1.5 text-2xs font-medium uppercase tracking-[0.08em] text-faint">Workspaces</div>
            {workspaces.map((w, i) => (
              <button
                key={w.id}
                onClick={() => {
                  setActive(w.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-fg-2 hover:bg-surface-2 hover:text-fg"
              >
                <WorkspaceGlyph name={w.name} hue={w.hue} size={18} />
                <span className="flex-1 truncate text-left">{w.name}</span>
                {i < 9 && <Kbd>{modKey}⇧{i + 1}</Kbd>}
                <Check size={13} className={cn("text-accent", w.id !== active.id && "invisible")} />
              </button>
            ))}
            <div className="my-1 h-px bg-line-soft" />
            {draft === null ? (
              <>
                <MenuRow icon={<LayoutGrid size={14} />} label="Workspace overview" onClick={() => { openTab({ type: "workspace", id: active.id }); setOpen(false); }} />
                <MenuRow icon={<Plus size={14} />} label="New workspace" onClick={() => setDraft("")} />
              </>
            ) : (
              <input
                autoFocus
                value={draft}
                placeholder="Workspace name"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") { e.stopPropagation(); setDraft(null); }
                }}
                onBlur={commit}
                className="h-7 w-full rounded-md bg-bg-2 px-2 text-[12.5px] text-fg outline-none ring-1 ring-accent/60 placeholder:text-faint"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-fg-2 hover:bg-surface-2 hover:text-fg [&_svg]:text-muted">
      {icon}
      {label}
    </button>
  );
}
