import { invoke } from "@tauri-apps/api/core";
import type { StateStorage } from "zustand/middleware";
import { isTauri } from "../lib/platform";
import { toast } from "../stores/toastStore";

/**
 * Zustand storage backed by JSON files in the app data dir (src-tauri/src/persistence).
 * Writes are debounced per key. Falls back to localStorage in a plain browser.
 * Reads migrate data saved by earlier builds in localStorage.
 */
const timers = new Map<string, number>();
const pending = new Map<string, string>();

function flush(key: string) {
  const value = pending.get(key);
  pending.delete(key);
  timers.delete(key);
  if (value !== undefined) {
    invoke("state_save", { key, value }).catch((e) => {
    console.error(`Failed to save ${key}`, e);
    toast({ kind: "error", title: "Couldn't save workspace state", detail: String(e) });
  });
  }
}

const fileStorage: StateStorage = {
  async getItem(key) {
    const value = await invoke<string | null>("state_load", { key }).catch((e) => {
      console.error(`Failed to load ${key}`, e);
      return null;
    });
    return value ?? localStorage.getItem(key);
  },
  setItem(key, value) {
    pending.set(key, value);
    window.clearTimeout(timers.get(key));
    timers.set(key, window.setTimeout(() => flush(key), 250));
  },
  async removeItem(key) {
    pending.delete(key);
    await invoke("state_remove", { key });
  },
};

export const appStorage: StateStorage = isTauri ? fileStorage : localStorage;

/** Persist any queued writes immediately (e.g. before the window closes). */
export function flushPendingWrites(): Promise<unknown> {
  return Promise.all([...pending.keys()].map((key) => flush(key)));
}
