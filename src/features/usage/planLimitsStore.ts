import { create } from "zustand";
import { Terminal } from "@xterm/xterm";
import { pty } from "../../services/pty";
import { useWorkspaces } from "../../stores/workspaceStore";
import { useAvailability } from "../agents/availabilityStore";
import { shellCommand } from "../agents/launch";
import { isTauri } from "../../lib/platform";
import { parseLimits, type PlanLimit } from "./parseLimits";

/**
 * Plan limits (5-hour session, weekly) are computed server-side; Claude Code shows them
 * in its /usage screen. We run `claude` in a hidden PTY, type /usage, read the rendered
 * screen and kill it. /usage is a local command: nothing is sent to the model.
 * We never answer Claude Code's folder-trust prompt on the user's behalf.
 */
interface LimitsState {
  limits: PlanLimit[];
  at: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const READY = /for shortcuts|\? for|❯/;
const TRUST = /trust (the files|this folder)|do you trust/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function readUsageScreen(cwd: string): Promise<PlanLimit[]> {
  const term = new Terminal({ cols: 120, rows: 60, allowProposedApi: true });
  let raw = "";
  const screen = () => {
    const b = term.buffer.active;
    const rows: string[] = [];
    for (let y = 0; y < b.length; y++) rows.push(b.getLine(y)?.translateToString(true) ?? "");
    return rows;
  };
  const opts = await shellCommand("claude", cwd);
  let exited = false;
  const { id } = await pty.spawn({ ...opts, cols: 120, rows: 60 }, (e) => {
    if (e.event === "output") {
      raw += e.data;
      term.write(e.data);
    } else exited = true;
  });
  const waitFor = async (re: RegExp, ms: number) => {
    const end = Date.now() + ms;
    while (Date.now() < end && !exited) {
      if (re.test(raw)) return true;
      await sleep(150);
    }
    return re.test(raw);
  };
  try {
    if (!(await waitFor(new RegExp(`${READY.source}|${TRUST.source}`, "i"), 20_000))) throw new Error("Claude Code didn't start");
    if (TRUST.test(raw)) throw new Error("Claude Code asks to trust this folder; open it once in a terminal first.");
    await sleep(600);
    for (const ch of "/usage") {
      await pty.write(id, ch);
      await sleep(40);
    }
    await sleep(300);
    await pty.write(id, "\r");
    if (!(await waitFor(/\d{1,3}%\s*used/i, 15_000))) throw new Error("No limits shown by /usage (API key accounts have no plan limits).");
    await sleep(500); // let every block render
    return parseLimits(screen());
  } finally {
    await pty.kill(id).catch(() => undefined);
    term.dispose();
  }
}

/** A folder Claude Code already knows (has transcripts), so no trust prompt; else the first project. */
function pickFolder(): string | null {
  const projects = Object.values(useWorkspaces.getState().projects);
  return projects[0]?.path ?? null;
}

export const usePlanLimits = create<LimitsState>()((set, get) => ({
  limits: [],
  at: null,
  loading: false,
  error: null,
  async refresh() {
    if (!isTauri || get().loading) return;
    if (!useAvailability.getState().paths["claude-code"]) return;
    const cwd = pickFolder();
    if (!cwd) return;
    set({ loading: true });
    try {
      const limits = await readUsageScreen(cwd);
      set({ limits, at: Date.now(), error: null, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },
}));

if (isTauri) {
  window.setTimeout(() => void usePlanLimits.getState().refresh(), 15_000);
  window.setInterval(() => void usePlanLimits.getState().refresh(), 5 * 60_000);
}
