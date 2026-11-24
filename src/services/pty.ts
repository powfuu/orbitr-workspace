import { Channel, invoke } from "@tauri-apps/api/core";

/** Typed bridge to the Rust PTY engine (src-tauri/src/terminal). */
export type PtyEvent =
  | { event: "output"; data: string }
  | { event: "exit"; data: { code: number | null } };

export interface SpawnOptions {
  program: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  cols: number;
  rows: number;
}

export interface ShellInfo {
  name: string;
  path: string;
}

export const pty = {
  async spawn(options: SpawnOptions, onEvent: (e: PtyEvent) => void) {
    const channel = new Channel<PtyEvent>();
    channel.onmessage = onEvent;
    return invoke<{ id: number; pid: number | null }>("pty_spawn", { options, onEvent: channel });
  },
  write: (id: number, data: string) => invoke<void>("pty_write", { id, data }),
  resize: (id: number, cols: number, rows: number) => invoke<void>("pty_resize", { id, cols, rows }),
  kill: (id: number) => invoke<void>("pty_kill", { id }),
  listShells: () => invoke<ShellInfo[]>("list_shells"),
};
