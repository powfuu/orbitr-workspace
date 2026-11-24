import { pty } from "../../services/pty";
import { useSettings } from "../../stores/settingsStore";

/** The user's chosen shell if still installed, else the system default. */
export async function resolveDefaultShell(): Promise<string | undefined> {
  const shells = await pty.listShells();
  const chosen = useSettings.getState().defaultShell;
  return (shells.find((s) => s.path === chosen) ?? shells[0])?.path;
}
