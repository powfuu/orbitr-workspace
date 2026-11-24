import { create } from "zustand";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getVersion } from "@tauri-apps/api/app";
import tauriConf from "../../../src-tauri/tauri.conf.json";
import { isTauri } from "../../lib/platform";
import { toast } from "../../stores/toastStore";
import { flushPendingWrites } from "../../services/persistence";

/** The release repo is a placeholder until `npm run set-release-repo owner/name`. */
export const updatesConfigured = !tauriConf.plugins.updater.endpoints.some((e) => e.includes("OWNER/REPO"));

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "upToDate"; at: number }
  | { kind: "available"; version: string; notes?: string; date?: string }
  | { kind: "downloading"; done: number; total?: number }
  | { kind: "ready" }
  | { kind: "error"; message: string };

interface UpdateState {
  current: string;
  status: Status;
  check: (manual?: boolean) => Promise<void>;
  install: () => Promise<void>;
}

let pending: Update | null = null;

export const useUpdates = create<UpdateState>()((set, get) => ({
  current: tauriConf.version,
  status: { kind: "idle" },

  async check(manual = false) {
    if (!isTauri || !updatesConfigured) return;
    const s = get().status.kind;
    if (s === "checking" || s === "downloading" || s === "ready") return;
    set({ status: { kind: "checking" } });
    try {
      pending = await check();
      if (pending) {
        set({ status: { kind: "available", version: pending.version, notes: pending.body ?? undefined, date: pending.date ?? undefined } });
        if (!manual) toast({ kind: "info", title: `Orbitr ${pending.version} is available`, detail: "Install it from the status bar or Settings." });
      } else set({ status: { kind: "upToDate", at: Date.now() } });
    } catch (e) {
      set({ status: { kind: "error", message: String(e) } });
      if (manual) toast({ kind: "error", title: "Couldn't check for updates", detail: String(e) });
    }
  },

  async install() {
    if (!pending) return;
    let done = 0;
    set({ status: { kind: "downloading", done: 0 } });
    try {
      await pending.downloadAndInstall((ev) => {
        if (ev.event === "Started") set({ status: { kind: "downloading", done: 0, total: ev.data.contentLength } });
        if (ev.event === "Progress") {
          done += ev.data.chunkLength;
          const total = (get().status as { total?: number }).total;
          set({ status: { kind: "downloading", done, total } });
        }
      });
      set({ status: { kind: "ready" } });
      // Sessions are restored on relaunch; save state first.
      await flushPendingWrites();
      await relaunch();
    } catch (e) {
      set({ status: { kind: "error", message: String(e) } });
      toast({ kind: "error", title: "Update failed", detail: String(e) });
    }
  },
}));

if (isTauri) {
  void getVersion().then((current) => useUpdates.setState({ current }));
  if (updatesConfigured) {
    window.setTimeout(() => void useUpdates.getState().check(), 10_000);
    window.setInterval(() => void useUpdates.getState().check(), 6 * 3600_000);
  }
}
