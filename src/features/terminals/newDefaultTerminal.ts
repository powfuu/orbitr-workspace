import { isTauri } from "../../lib/platform";
import { platformInfo } from "../../hooks/usePlatformInfo";
import { createTerminal } from "./terminalActions";
import { resolveDefaultShell } from "./defaultShell";
import { contextCwd } from "./terminalContext";

/** Opens the preferred shell in `cwd`, or in the folder of whatever you're looking at. */
export async function newDefaultTerminal(cwd?: string, name?: string, command?: string) {
  if (!isTauri) return;
  const where = cwd ?? contextCwd();
  const [shell] = await Promise.all([resolveDefaultShell(), platformInfo()]);
  if (shell) await createTerminal({ shell, cwd: where, name, command });
}
