import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Blob URLs by path, so the timeline's polling never re-reads an image. Read from Claude's own
// cache on demand: Orbitr never copies or stores the images itself.
const urls = new Map<string, Promise<string | null>>();
const load = (path: string) => {
  let p = urls.get(path);
  if (!p) {
    p = invoke<ArrayBuffer>("claude_cached_image", { path })
      .then((buf) => URL.createObjectURL(new Blob([buf])))
      .catch(() => null);
    urls.set(path, p);
  }
  return p;
};

function useImage(path: string) {
  const [src, setSrc] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    void load(path).then((u) => alive && setSrc(u));
    return () => {
      alive = false;
    };
  }, [path]);
  return src;
}

function Thumb({ path, onOpen }: { path: string; onOpen: (src: string) => void }) {
  const src = useImage(path);
  if (src === null) return null; // gone from Claude's cache since
  return (
    <button
      onClick={() => src && onOpen(src)}
      title="View image"
      className="h-14 w-20 overflow-hidden rounded-md bg-surface ring-1 ring-line transition hover:ring-fg/40"
    >
      {src && <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />}
    </button>
  );
}

/** Images pasted with a prompt: thumbnails that open full size. */
export function PromptImages({ paths }: { paths: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), setOpen(null));
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);
  return (
    <>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {paths.map((p) => <Thumb key={p} path={p} onOpen={setOpen} />)}
      </div>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              role="dialog"
              aria-label="Image"
              className="fixed inset-0 z-[85] grid place-items-center bg-black/75 p-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              onMouseDown={() => setOpen(null)}
            >
              <motion.img
                src={open}
                alt=""
                initial={{ scale: 0.97 }}
                animate={{ scale: 1 }}
                className="max-h-full max-w-full rounded-lg shadow-pop"
                onMouseDown={(e) => e.stopPropagation()}
              />
              <button aria-label="Close" onClick={() => setOpen(null)} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-md bg-surface/80 text-muted hover:text-fg">
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
