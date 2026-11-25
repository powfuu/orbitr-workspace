import { useSessions } from "../../stores/sessionStore";
import { useLayout } from "../../stores/layoutStore";
import { uid } from "../../lib/id";
import { basename, isTauri } from "../../lib/platform";
import { disposePty, resetScreen, spawnPty } from "../sessions/ptySession";
import { shellCommand } from "../agents/launch";
import { cwdLabel } from "./terminalContext";
import { useAvailability } from "../agents/availabilityStore";
import type { ID, TerminalSession } from "../../types";

export async function launchTerminal(t: TerminalSession) {
  const cwd = t.cwd === "~" ? undefined : t.cwd;
  const opts = t.command ? await shellCommand(t.command, cwd, true) : { program: t.shell, cwd };
  await spawnPty(t.id, opts, (u) => {
    useSessions.getState().updateTerminal(t.id, u);
    // An installer may have just added an agent CLI.
    if (t.command && u.status !== "running" && u.status !== "starting") void useAvailability.getState().refresh();
  });
}

/** Spawns a real shell in a PTY and shows it in the terminal panel. */
export async function createTerminal({ shell, cwd, name, command }: { shell: string; cwd?: string; name?: string; command?: string }) {
  if (!isTauri) return null;
  // Plain shells are named "zsh - <project or path>"; one-off commands (installers) keep their name.
  const label = command && name ? name : `${basename(shell)} - ${cwdLabel(cwd)}`;
  const t: TerminalSession = { id: uid(), name: label, shell, cwd: cwd ?? "~", status: "starting", command };
  useSessions.getState().addTerminal(t);
  useLayout.getState().openTerminalPanel();
  await launchTerminal(t);
  return t.id;
}

/** Explicitly ends the session: kills the process and frees the xterm instance. */
export async function closeTerminal(id: ID) {
  await disposePty(id);
  useSessions.getState().removeTerminal(id);
}

export async function restartTerminal(id: ID) {
  const t = useSessions.getState().terminals.find((x) => x.id === id);
  if (!t) return;
  resetScreen(id);
  await launchTerminal(t);
}
