import { open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "../../lib/platform";
import { useWorkspaces } from "../../stores/workspaceStore";
import { useTabs } from "../../stores/tabStore";

/** Opens the native folder picker and registers the chosen folder as a project. */
export async function addProjectFromDialog(): Promise<void> {
  if (!isTauri) {
    console.warn("Folder picker requires the desktop runtime.");
    return;
  }
  const path = await open({ directory: true, multiple: false, title: "Add project folder" });
  if (typeof path !== "string") return;
  const id = useWorkspaces.getState().addProject(path);
  useTabs.getState().open({ type: "project", id });
}
