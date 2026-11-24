import { isTauri } from "../../lib/platform";
import { createTerminal } from "./terminalActions";
import { resolveDefaultShell } from "./defaultShell";

/** Opens the preferred shell, optionally in a given folder. */
export async function newDefaultTerminal(cwd?: string, name?: string) {
  if (!isTauri) return;
  const shell = await resolveDefaultShell();
  if (shell) await createTerminal({ shell, cwd, name });
}
