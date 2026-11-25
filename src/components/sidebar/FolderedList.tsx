import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Folder as FolderIcon, FolderOpen, Pencil, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { SESSION_MIME, useFolders, useRenaming, type FolderSection } from "../../features/sidebar/folderStore";
import { cn } from "../../lib/cn";
import { ContextMenu } from "../ui/ContextMenu";

/**
 * Sessions of one sidebar section grouped into the user's folders. Drag a session onto a
 * folder to file it, or onto the loose area to take it out. Folders persist until deleted.
 */
export function FolderedList({ section, items }: { section: FolderSection; items: { id: string; node: ReactNode }[] }) {
  const folders = useFolders((f) => f.folders).filter((f) => f.section === section);
  const placement = useFolders((f) => f.placement);
  const { place, toggle, rename, remove } = useFolders.getState();
  const renamingId = useRenaming((r) => r.id);
  const setRenaming = useRenaming((r) => r.set);
  const [over, setOver] = useState<string | null>(null);

  const folderIds = new Set(folders.map((f) => f.id));
  const inFolder = (fid: string) => items.filter((i) => placement[i.id] === fid);
  const loose = items.filter((i) => !placement[i.id] || !folderIds.has(placement[i.id]!));

  const dropProps = (target: string | null) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(SESSION_MIME)) return;
      e.preventDefault();
      setOver(target ?? "loose");
    },
    onDragLeave: () => setOver(null),
    onDrop: (e: React.DragEvent) => {
      const id = e.dataTransfer.getData(SESSION_MIME);
      setOver(null);
      if (!id) return;
      e.preventDefault();
      place(id, target);
    },
  });

  return (
    <div>
      {folders.map((f) => {
        const children = inFolder(f.id);
        return (
          <div key={f.id} {...dropProps(f.id)} className={cn("rounded-md transition-colors", over === f.id && "bg-accent/10 ring-1 ring-accent/40")}>
            <ContextMenu
              items={[
                { label: "Rename folder", icon: Pencil, onSelect: () => setRenaming(f.id) },
                { label: "Delete folder (keeps its sessions)", icon: Trash2, danger: true, onSelect: () => remove(f.id) },
              ]}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => renamingId !== f.id && toggle(f.id)}
                onDoubleClick={() => setRenaming(f.id)}
                onKeyDown={(e) => e.key === "Enter" && renamingId !== f.id && toggle(f.id)}
                className="group flex h-7 w-full cursor-default items-center gap-1.5 rounded-md px-2 text-[12.5px] text-fg-2 hover:bg-surface/60"
              >
                <motion.span animate={{ rotate: f.collapsed ? 0 : 90 }} transition={{ duration: 0.15 }} className="flex text-faint">
                  <ChevronRight size={11} strokeWidth={2.25} />
                </motion.span>
                {f.collapsed ? <FolderIcon size={13} className="text-muted" /> : <FolderOpen size={13} className="text-muted" />}
                {renamingId === f.id ? (
                  <input
                    autoFocus
                    aria-label="Folder name"
                    defaultValue={f.name}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.target.select()}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v) rename(f.id, v);
                      setRenaming(null);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    className="min-w-0 flex-1 rounded bg-bg px-1 text-fg outline-none ring-1 ring-accent/50"
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                )}
                <span className="font-mono text-[10.5px] text-faint">{children.length}</span>
                <button
                  aria-label={`Delete folder ${f.name}`}
                  title="Delete folder (keeps its sessions)"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(f.id);
                  }}
                  className="grid h-5 w-5 place-items-center rounded text-faint opacity-0 hover:bg-error/15 hover:text-error group-hover:opacity-100"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </ContextMenu>
            <AnimatePresence initial={false}>
              {!f.collapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
                  className="overflow-hidden border-l border-line-soft ml-3.5 pl-1.5"
                >
                  {children.length === 0 ? <div className="px-2 py-1.5 text-[11px] text-faint">Drag sessions here.</div> : children.map((c) => <div key={c.id}>{c.node}</div>)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      <div {...dropProps(null)} className={cn("min-h-2 rounded-md transition-colors", over === "loose" && "bg-accent/10 ring-1 ring-accent/40")}>
        {loose.map((c) => <div key={c.id}>{c.node}</div>)}
      </div>
    </div>
  );
}
