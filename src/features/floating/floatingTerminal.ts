import { create } from "zustand";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "../../lib/platform";
import { spawnPty } from "../sessions/ptySession";
import { resolveDefaultShell } from "../terminals/defaultShell";
import { terminalRegistry } from "../terminals/terminalRegistry";
import type { ProcessStatus } from "../../types";

/** One app-wide scratch terminal: ⌘N pops it up, ⌘⇧N makes it full screen. Lives until the app quits. */
export const FLOATING_ID = "floating-terminal";

interface FloatingState {
  open: boolean;
  full: boolean;
  status: ProcessStatus | null;
}

export const useFloating = create<FloatingState>()(() => ({ open: false, full: false, status: null }));

/** Starts the shell the first time it's shown (and again if it was exited). Keeps its cwd across opens. */
export async function ensureFloatingShell() {
  const { status } = useFloating.getState();
  if (!isTauri || status === "running" || status === "starting") return;
  const shell = await resolveDefaultShell();
  if (!shell) return;
  if (status) terminalRegistry.get(FLOATING_ID)?.reset();
  await spawnPty(FLOATING_ID, { program: shell }, (u) => useFloating.setState({ status: u.status }), { quiet: true });
}

function setFull(full: boolean) {
  if (useFloating.getState().full === full) return;
  useFloating.setState({ full });
  if (isTauri) void getCurrentWindow().setFullscreen(full).catch(() => undefined);
}

/** ⌘N: popup on/off. ⌘⇧N: full screen on/off (opening it if needed). */
export function toggleFloating(full = false) {
  const s = useFloating.getState();
  if (full) {
    if (s.open && s.full) return hideFloating();
    useFloating.setState({ open: true });
    return setFull(true);
  }
  if (s.open) return hideFloating();
  useFloating.setState({ open: true });
}

export function hideFloating() {
  setFull(false);
  useFloating.setState({ open: false });
}
