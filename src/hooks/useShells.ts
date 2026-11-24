import { useEffect, useState } from "react";
import { pty, type ShellInfo } from "../services/pty";
import { isTauri } from "../lib/platform";

let cached: ShellInfo[] | null = null;

/** Installed shells, default first. */
export function useShells(): ShellInfo[] {
  const [shells, setShells] = useState(cached ?? []);
  useEffect(() => {
    if (cached || !isTauri) return;
    pty.listShells().then((s) => setShells((cached = s))).catch((e) => console.error("list_shells failed", e));
  }, []);
  return shells;
}
