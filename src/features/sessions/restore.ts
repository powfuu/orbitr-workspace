import { useAvailability } from "../agents/availabilityStore";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSessions } from "../../stores/sessionStore";
import { useSettings } from "../../stores/settingsStore";
import { useTabs } from "../../stores/tabStore";
import { flushPendingWrites } from "../../services/persistence";
import { isTauri } from "../../lib/platform";
import { terminalRegistry } from "../terminals/terminalRegistry";
import { launchTerminal } from "../terminals/terminalActions";
import { launchAgent } from "../agents/agentActions";
import { AGENTS, isEditor } from "../agents/registry";

const KEY = "orbitr.scrollback";
const banner = (s: string) => `\r\n\x1b[2m── ${s} ──\x1b[0m\r\n\r\n`;

async function saveScrollback() {
  const { agents, terminals } = useSessions.getState();
  const data = Object.fromEntries(
    [...agents, ...terminals].map((s) => [s.id, terminalRegistry.serialize(s.id) ?? ""]).filter(([, v]) => v),
  );
  await invoke("state_save", { key: KEY, value: JSON.stringify(data) });
}

/**
 * Processes don't survive a restart, so every persisted session is relaunched:
 * shells in the same folder, agents with their CLI's "continue" flag when it has one.
 * The previous screen is replayed above so nothing visibly disappears.
 */
export async function restoreSessions() {
  if (!isTauri) return;
  if (!useSettings.getState().restoreOnLaunch) {
    // Start clean: drop the previous run's sessions (tabs to them close too).
    useTabs.getState().closeWhere((t) => t.type === "agent");
    useSessions.setState({ agents: [], terminals: [], activeTerminalId: null });
    await registerCloseHandler();
    return;
  }
  const raw = await invoke<string | null>("state_load", { key: KEY }).catch(() => null);
  const scrollback: Record<string, string> = raw ? JSON.parse(raw) : {};
  const { agents, terminals, updateTerminal } = useSessions.getState();

  const replay = (id: string) => {
    const term = terminalRegistry.create(id);
    const prev = scrollback[id];
    if (prev) term.write(prev + banner(`restored · ${new Date().toLocaleTimeString()}`));
  };

  for (const t of terminals) {
    replay(t.id);
    // Never re-run one-off commands such as installers; restore a plain shell instead.
    const plain = { ...t, command: undefined, status: "starting" as const };
    updateTerminal(t.id, plain);
    void launchTerminal(plain);
  }
  // Don't relaunch agents whose CLI isn't installed any more: they'd only fail with
  // "not found on PATH" on every start. They stay as stopped tabs you can close.
  await useAvailability.getState().refresh().catch(() => undefined);
  const paths = useAvailability.getState().paths;
  for (const a of agents) {
    const def = AGENTS[a.kind];
    if (def && paths[a.kind] === null && def.executable !== "git") {
      replay(a.id);
      useSessions.getState().updateAgent(a.id, { status: "exited" });
      continue;
    }
    // Full-screen editors redraw themselves; replaying their old screen only leaves debris.
    if (isEditor(a.kind)) terminalRegistry.create(a.id);
    else replay(a.id);
    void launchAgent(a, a.chatId ?? true);
  }

  await registerCloseHandler();
}

/** Save screens and pending state right before the window closes. */
function registerCloseHandler() {
  return getCurrentWindow().onCloseRequested(async () => {
    await Promise.allSettled([saveScrollback(), flushPendingWrites()]);
  });
}
