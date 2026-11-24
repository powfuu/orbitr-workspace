import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { isTauri } from "../lib/platform";
import { useSettings } from "../stores/settingsStore";

let allowed: Promise<boolean> | null = null;

/** Native notification, only while Orbitr is in the background and the user opted in. */
export async function notify(title: string, body: string) {
  if (!isTauri || document.hasFocus() || !useSettings.getState().notifications) return;
  allowed ??= isPermissionGranted().then((ok) => ok || requestPermission().then((p) => p === "granted"));
  if (await allowed) sendNotification({ title, body });
}
