import { pty } from "../../services/pty";
import { createTerminal } from "../terminals/terminalActions";
import { isWindows } from "./launch";
import type { AgentDefinition } from "./registry";

export const installCommand = (a: AgentDefinition) => (isWindows ? a.install.windows : a.install.unix);

/** Runs the agent's official installer visibly in a new terminal; the user sees every line. */
export async function installAgent(a: AgentDefinition) {
  const command = installCommand(a);
  if (!command) return;
  const [shell] = await pty.listShells();
  if (shell) await createTerminal({ shell: shell.path, name: `install ${a.executable}`, command });
}
