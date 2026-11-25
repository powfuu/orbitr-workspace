import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../lib/platform";

export interface PlatformInfo {
  os: string;
  defaultShell: string;
  homeDir: string | null;
}

let cached: PlatformInfo | null = null;

export function usePlatformInfo(): PlatformInfo | null {
  const [info, setInfo] = useState(cached);
  useEffect(() => {
    if (cached || !isTauri) return;
    invoke<PlatformInfo>("platform_info")
      .then((i) => setInfo((cached = i)))
      .catch((e) => console.error("platform_info failed", e));
  }, []);
  return info;
}

/** Same info outside React (cached after the first call). */
export async function platformInfo(): Promise<PlatformInfo | null> {
  if (cached || !isTauri) return cached;
  try {
    cached = await invoke<PlatformInfo>("platform_info");
  } catch {
    /* unknown platform details are non-fatal */
  }
  return cached;
}

export const cachedPlatformInfo = () => cached;
