import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, FileCode2, Folder } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { listFiles } from "../../services/git";
import { useWorkspaces } from "../../stores/workspaceStore";
import { contextProject, openInEditor } from "../../features/editors/openInEditor";
import { fuzzyFilter } from "../../features/editors/fuzzy";
import { isTauri, modKey } from "../../lib/platform";
import { cn } from "../../lib/cn";
import { Kbd } from "../ui/Kbd";
import type { ID } from "../../types";

export const useQuickOpen = create<{ projectId: ID | null; open: () => void; close: () => void }>()((set) => ({
  projectId: null,
  open: () => set({ projectId: contextProject() }),
  close: () => set({ projectId: null }),
}));

const cache = new Map<string, string[]>();

/** Mod+P: fuzzy-find a project file and open it in Vim. */
export function QuickOpen() {
  const { projectId, close } = useQuickOpen();
  const project = useWorkspaces((s) => (projectId ? s.projects[projectId] : undefined));
  const [files, setFiles] = useState<string[] | null>(null);
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!project) return;
    setQ("");
    setI(0);
    setFiles(cache.get(project.path) ?? null);
    if (isTauri) {
      void listFiles(project.path).then((f) => {
        cache.set(project.path, f);
        setFiles(f);
      }).catch(() => setFiles([]));
    } else setFiles([]);
  }, [project]);

  const shown = useMemo(() => fuzzyFilter(files ?? [], q), [files, q]);
  useEffect(() => {
    setI(0);
  }, [q]);

  const pick = (file?: string) => {
    if (!project || !file) return;
    close();
    // "path:42" jumps to line 42.
    const m = /^(.*?):(\d+)$/.exec(q.trim());
    void openInEditor({ projectId: project.id, file, line: m && file.includes(m[1]!.split("/").pop()!) ? Number(m[2]) : undefined });
  };

  const highlight = (path: string) => {
    const name = path.lastIndexOf("/") + 1;
    return (
      <>
        <span className="text-fg">{path.slice(name)}</span>
        <span className="ml-2 text-faint">{path.slice(0, name).replace(/\/$/, "")}</span>
      </>
    );
  };

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-center bg-black/40 pt-[14vh] backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onPointerDown={close}
        >
          <motion.div
            role="dialog"
            aria-label="Open file in Vim"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 520, damping: 36 }}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-fit w-[600px] max-w-[90vw] overflow-hidden rounded-2xl bg-surface shadow-pop"
          >
            <div className="flex h-12 items-center gap-3 border-b border-line px-4">
              <FileCode2 size={15} className="text-muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                spellCheck={false}
                placeholder="Open file in Vim…  (name, or name:line)"
                className="flex-1 bg-transparent font-mono text-[13px] text-fg outline-none placeholder:font-sans placeholder:text-faint"
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) { e.preventDefault(); setI((x) => Math.min(x + 1, shown.length - 1)); }
                  if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
                  if (e.key === "Enter") pick(shown[i] ?? (q.includes(":") ? shown[0] : undefined));
                  if (e.key === "Escape") close();
                }}
              />
              <span className="flex items-center gap-1 text-[11px] text-faint"><Folder size={11} />{project.name}</span>
            </div>
            <div className="max-h-96 overflow-y-auto p-1.5">
              {files === null && <div className="px-3 py-6 text-center text-[12.5px] text-muted">Listing files…</div>}
              {files !== null && shown.length === 0 && <div className="px-3 py-6 text-center text-[12.5px] text-muted">{isTauri ? "No matching files" : "File search works in the desktop app"}</div>}
              {shown.map((f, idx) => (
                <button
                  key={f}
                  onPointerMove={() => setI(idx)}
                  onClick={() => pick(f)}
                  className={cn("flex h-8 w-full items-center gap-2.5 rounded-lg px-3 text-left font-mono text-[12px]", idx === i ? "bg-surface-2" : "")}
                >
                  <FileCode2 size={13} className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate">{highlight(f)}</span>
                </button>
              ))}
            </div>
            <div className="flex h-9 items-center gap-3 border-t border-line px-4 text-2xs text-faint">
              <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> or <Kbd>⌃N</Kbd><Kbd>⌃P</Kbd></span>
              <span className="flex items-center gap-1"><Kbd><CornerDownLeft size={10} /></Kbd> open in Vim</span>
              <span className="ml-auto">{files ? `${files.length.toLocaleString()} files` : ""} · <Kbd>{modKey}P</Kbd></span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
