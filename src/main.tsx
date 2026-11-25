import { useFolders } from "./features/sidebar/folderStore";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { useLayout } from "./stores/layoutStore";
import { useWorkspaces } from "./stores/workspaceStore";
import { useTabs } from "./stores/tabStore";
import { useHistory } from "./stores/historyStore";
import { useSessions } from "./stores/sessionStore";
import { useSettings } from "./stores/settingsStore";
import { useEventLog } from "./features/timeline/eventLog";
import { useSnippets } from "./features/snippets/snippetStore";
import { restoreSessions } from "./features/sessions/restore";
import { initFonts } from "./features/terminals/fonts";
import { initTheme } from "./features/theme/applyTheme";
import { flushPendingWrites } from "./services/persistence";
import "@xterm/xterm/css/xterm.css";
import "./styles/index.css";

// Load persisted state before the first render so the UI never flashes defaults.
await Promise.all([useLayout, useWorkspaces, useTabs, useHistory, useSessions, useSettings, useEventLog, useSnippets, useFolders].map((s) => s.persist.rehydrate()));
initTheme();
window.addEventListener("beforeunload", () => void flushPendingWrites());
void initFonts(useSettings.getState().terminalFont);
void restoreSessions();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
