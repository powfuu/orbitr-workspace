import type { IDisposable } from "@xterm/xterm";
import { pty, type SpawnOptions } from "../../services/pty";
import { terminalRegistry } from "../terminals/terminalRegistry";
import { trackActivity } from "./activityTracker";
import { useActivity } from "./activityStore";
import { toast } from "../../stores/toastStore";
import type { ID, ProcessStatus } from "../../types";

/**
 * Binds a UI session id to one xterm instance and, over its lifetime, one or more
 * PTY processes (restart reuses the same xterm). Shared by terminals and agents.
 */
export interface StatusUpdate {
  status: ProcessStatus;
  pid?: number | null;
  exitCode?: number | null;
}

interface Live {
  ptyId: number | null;
  listeners: IDisposable[];
}

const live = new Map<ID, Live>();
const dim = (s: string) => `\r\n\x1b[2m${s}\x1b[0m\r\n`;
const hasFocus = (id: ID) => () =>
  document.hasFocus() && !!document.activeElement?.closest(`[data-session="${id}"]`);

export async function spawnPty(
  id: ID,
  opts: Omit<SpawnOptions, "cols" | "rows">,
  onStatus: (u: StatusUpdate) => void,
): Promise<void> {
  await killPty(id);
  const term = terminalRegistry.get(id) ?? terminalRegistry.create(id);
  const tracker = trackActivity(id, term, hasFocus(id));
  const state: Live = { ptyId: null, listeners: [tracker] };
  live.set(id, state);
  onStatus({ status: "starting", exitCode: null });

  try {
    const { id: ptyId, pid } = await pty.spawn({ ...opts, cols: term.cols, rows: term.rows }, (e) => {
      if (e.event === "output") {
        tracker.onOutput();
        return term.write(e.data);
      }
      if (live.get(id) !== state) return; // superseded by a restart
      state.ptyId = null;
      tracker.dispose();
      useActivity.getState().patch(id, { phase: "idle", draft: 0 });
      const code = e.data.code;
      onStatus({ status: code === 0 || code === null ? "exited" : "failed", exitCode: code });
      term.write(dim(`[process exited${code !== null ? ` with code ${code}` : ""}]`));
    });
    state.ptyId = ptyId;
    state.listeners.push(
      term.onData((d) => {
        tracker.onInput(d);
        void pty.write(ptyId, d).catch(() => undefined);
      }),
      term.onResize(({ cols, rows }) => void pty.resize(ptyId, cols, rows).catch(() => undefined)),
    );
    onStatus({ status: "running", pid });
    void pty.resize(ptyId, term.cols, term.rows).catch(() => undefined);
  } catch (err) {
    toast({ kind: "error", title: `Couldn't start ${opts.program}`, detail: String(err) });
    onStatus({ status: "failed" });
    term.write(`\x1b[31mFailed to start ${opts.program}: ${String(err)}\x1b[0m\r\n`);
  }
}

/** Terminates the process but keeps the xterm (and its scrollback). */
export async function killPty(id: ID) {
  const state = live.get(id);
  if (!state) return;
  live.delete(id);
  state.listeners.forEach((l) => l.dispose());
  useActivity.getState().patch(id, { phase: "idle", draft: 0 });
  if (state.ptyId !== null) await pty.kill(state.ptyId).catch(() => undefined);
}

/** Kills the process and frees the xterm instance. */
export async function disposePty(id: ID) {
  await killPty(id);
  terminalRegistry.dispose(id);
  useActivity.getState().clear(id);
}

/** Clears the screen before a restart so the new process starts clean. */
export function resetScreen(id: ID) {
  terminalRegistry.get(id)?.reset();
}
