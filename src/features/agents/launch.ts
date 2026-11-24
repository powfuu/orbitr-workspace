import type { SpawnOptions } from "../../services/pty";
import { resolveDefaultShell } from "../terminals/defaultShell";
import { isMac } from "../../lib/platform";
import type { AgentDefinition } from "./registry";

export const isWindows = navigator.userAgent.includes("Windows");
const quote = (a: string) => (/^[\w@%+=:,./-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`);

/**
 * Runs a command line through the user's login shell so PATH (nvm, Homebrew…)
 * matches a normal terminal. `then` optionally keeps an interactive shell afterwards.
 */
export async function shellCommand(command: string, cwd?: string, keepShell = false): Promise<Omit<SpawnOptions, "cols" | "rows">> {
  if (isWindows) {
    return { program: "powershell.exe", args: ["-NoLogo", ...(keepShell ? ["-NoExit"] : []), "-Command", command], cwd };
  }
  const program = (await resolveDefaultShell()) ?? (isMac ? "/bin/zsh" : "/bin/sh");
  return { program, args: ["-l", "-c", keepShell ? `${command}; exec ${quote(program)} -l` : `exec ${command}`], cwd };
}

/** PTY launch for an agent. `resume`: true = continue the latest conversation, string = reopen that chat id. */
export async function agentSpawnOptions(agent: AgentDefinition, cwd: string, resume: boolean | string = false, extraArgs: string[] = []) {
  const args =
    typeof resume === "string" && agent.resumeChatArgs
      ? agent.resumeChatArgs(resume)
      : resume && agent.resumeArgs
        ? agent.resumeArgs
        : agent.defaultArgs;
  const opts = await shellCommand([agent.executable, ...args, ...extraArgs].map(quote).join(" "), cwd);
  return { ...opts, env: agent.env };
}
