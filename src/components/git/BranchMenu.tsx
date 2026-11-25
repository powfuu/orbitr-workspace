import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, GitBranch, GitBranchPlus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { branchService, type Branch } from "../../services/git";
import { useGit } from "../../features/git/gitStore";
import { toast } from "../../stores/toastStore";
import { timeAgo } from "../../lib/time";
import { cn } from "../../lib/cn";
import { SyncBadges } from "./ui";

/** Current branch as a dropdown: switch to another branch or create one from HEAD. */
export function BranchMenu({ repo, current }: { repo: string; current: string | null }) {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const refresh = useGit((g) => g.refresh);

  useEffect(() => {
    if (!open) return;
    setQ("");
    void branchService.list(repo).then(setBranches).catch(() => setBranches([]));
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open, repo]);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setOpen(false);
    try {
      await fn();
      toast({ kind: "success", title: ok });
    } catch (e) {
      toast({ kind: "error", title: "Branch operation failed", detail: String(e) });
    } finally {
      void refresh(repo);
    }
  };

  const name = q.trim();
  const shown = branches.filter((b) => b.name.toLowerCase().includes(name.toLowerCase()));
  const canCreate = name && !branches.some((b) => b.name === name);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        onClick={() => setOpen((o) => !o)}
        title={current ?? "detached HEAD"}
        className="flex h-7 max-w-full items-center gap-1.5 rounded-md px-2 font-mono text-[12.5px] text-fg hover:bg-surface"
      >
        <GitBranch size={13} className="shrink-0 text-muted" />
        <span className="min-w-0 truncate whitespace-nowrap">{current ?? "detached HEAD"}</span>
        <ChevronDown size={12} className="shrink-0 text-faint" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-40 mt-1 w-80 overflow-hidden rounded-lg bg-surface shadow-pop"
          >
            <label className="flex h-9 items-center gap-2 border-b border-line px-3">
              <Search size={13} className="text-faint" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                  if (e.key === "Enter" && canCreate) void run(() => branchService.create(repo, name), `Created ${name}`);
                  else if (e.key === "Enter" && shown[0] && !shown[0].current) void run(() => branchService.switch(repo, shown[0]!.name), `Switched to ${shown[0].name}`);
                }}
                placeholder="Switch or create branch…"
                className="flex-1 bg-transparent font-mono text-[12px] outline-none placeholder:font-sans placeholder:text-faint"
              />
            </label>
            <div className="max-h-64 overflow-y-auto p-1">
              {canCreate && (
                <button onClick={() => void run(() => branchService.create(repo, name), `Created ${name}`)} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[12.5px] text-fg hover:bg-surface-2">
                  <GitBranchPlus size={13} className="text-success" /> Create <span className="font-mono">{name}</span>
                  <span className="ml-auto text-[10.5px] text-faint">from {current ?? "HEAD"}</span>
                </button>
              )}
              {shown.map((b) => (
                <button
                  key={b.name}
                  disabled={b.current}
                  onClick={() => void run(() => branchService.switch(repo, b.name), `Switched to ${b.name}`)}
                  className={cn("flex h-8 w-full items-center gap-2 rounded-md px-2 text-left", b.current ? "text-fg" : "text-fg-2 hover:bg-surface-2 hover:text-fg")}
                >
                  <Check size={12} className={cn("shrink-0 text-accent", !b.current && "invisible")} />
                  <span className="truncate font-mono text-[12px]">{b.name}</span>
                  <SyncBadges ahead={b.ahead} behind={b.behind} gone={b.gone} />
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-faint">{timeAgo(b.updatedAt)}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
