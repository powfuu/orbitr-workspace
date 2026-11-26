import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BarChart3, Blocks, Bot, Newspaper, Columns2, Download, FileCode2, Folder, FolderGit2, FolderPlus,
  FolderSearch, Gauge, GitBranch, Maximize2, Keyboard, LayoutDashboard, LayoutGrid, ListTree, MessagesSquare, Mic, Palette, PanelLeft,
  PanelRight, Pencil, Plus, RefreshCw, RotateCw, Rows2, Search, Settings, Sparkles, Square, SquareTerminal, TextQuote,
  Trash2, X, type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLayout } from "../../stores/layoutStore";
import { getActiveTabs, useTabs } from "../../stores/tabStore";
import { useWorkspaces } from "../../stores/workspaceStore";
import { useSessions } from "../../stores/sessionStore";
import { useSettings } from "../../stores/settingsStore";
import { toast } from "../../stores/toastStore";
import { addProjectFromDialog } from "../projects/addProject";
import { newDefaultTerminal } from "../terminals/newDefaultTerminal";
import { SilentError, withAuth } from "../git/withAuth";
import { toggleFloating } from "../floating/floatingTerminal";
import { toggleFocusMode } from "../layout/focusMode";
import { closeFocused } from "../terminals/closeFocused";
import { closeTerminal, restartTerminal } from "../terminals/terminalActions";
import { AGENTS, agentList, isEditor } from "../agents/registry";
import { removeAgent, restartAgent, startAgent, stopAgent } from "../agents/agentActions";
import { installAgent } from "../agents/installAgent";
import { useAvailability } from "../agents/availabilityStore";
import { openInEditor } from "../editors/openInEditor";
import { deleteWorkspace, removeProject, revealProject } from "../workspaces/manageActions";
import { THEMES } from "../theme/themes";
import { useSnippets } from "../snippets/snippetStore";
import { variablesOf } from "../snippets/template";
import { sendSnippet } from "../snippets/sendSnippet";
import { useVoice } from "../voice/voiceStore";
import { useTerminalSearch } from "../search/searchStore";
import { searchTarget } from "../search/searchTarget";
import { useUpdates } from "../updates/updateStore";
import { usePlanLimits } from "../usage/planLimitsStore";
import { gitService } from "../../services/git";
import { listAgentChats, type ChatSummary } from "../../services/agents";
import { useQuickOpen } from "../../components/editors/QuickOpen";
import { useSnippetPicker } from "../../components/snippets/SnippetPicker";
import { isMac, isTauri, modKey } from "../../lib/platform";
import { timeAgo } from "../../lib/time";

export interface Command {
  id: string;
  title: string;
  group: string;
  icon: LucideIcon;
  shortcut?: string;
  /** Extra words that should match (synonyms, Spanish). */
  keywords?: string;
  run: () => void;
}

const after = (fn: () => void, ms = 160) => window.setTimeout(fn, ms);
const scrollTo = (id: string) => after(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));

function cycleTab(step: 1 | -1) {
  const { tabs, activeTabId } = getActiveTabs();
  const i = tabs.findIndex((t) => t.id === activeTabId);
  const next = tabs[(i + step + tabs.length) % tabs.length];
  if (next) useTabs.getState().activate(next.id);
}

async function gitAction(kind: "pull" | "push", path: string, name: string) {
  try {
    await withAuth(path, () => (kind === "pull" ? gitService.pull(path) : gitService.push(path)));
    toast({ kind: "success", title: `${kind === "pull" ? "Pulled" : "Pushed"} ${name}` });
  } catch (e) {
    if (!(e instanceof SilentError)) toast({ kind: "error", title: `git ${kind} failed in ${name}`, detail: String(e) });
  }
}

/** Recent Claude Code conversations of the workspace's projects, fetched while the palette is open. */
function useRecentChats(open: boolean, projects: { id: string; name: string; path: string }[]) {
  const [chats, setChats] = useState<(ChatSummary & { projectId: string; projectName: string })[]>([]);
  const key = projects.map((p) => p.path).join("|");
  useEffect(() => {
    if (!open || !isTauri) return;
    let alive = true;
    void Promise.all(
      projects.map(async (p) => (await listAgentChats("claude-code", p.path).catch(() => [])).slice(0, 8).map((c) => ({ ...c, projectId: p.id, projectName: p.name }))),
    ).then((all) => alive && setChats(all.flat().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 15)));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);
  return chats;
}

/**
 * Everything Orbitr can do, as palette commands (Mod+K). Only actions that work are listed;
 * per-project and per-session commands are generated from current state.
 */
export function useCommands(): Command[] {
  const { workspaces, projects, activeWorkspaceId } = useWorkspaces();
  const agents = useSessions((s) => s.agents);
  const terminals = useSessions((s) => s.terminals);
  const snippets = useSnippets((s) => s.snippets);
  const installed = useAvailability((s) => s.paths);
  const paletteOpen = useLayout((s) => s.paletteOpen);
  const wsProjects = useMemo(() => Object.values(projects).filter((p) => p.workspaceId === activeWorkspaceId), [projects, activeWorkspaceId]);
  const chats = useRecentChats(paletteOpen, wsProjects);

  return useMemo(() => {
    const layout = useLayout.getState();
    const tabs = useTabs.getState();
    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    const c: Command[] = [];
    const add = (cmd: Command) => c.push(cmd);

    // Navigate
    add({ id: "integrations", title: "Integrations (install agents and editors)", group: "Navigate", icon: Blocks, keywords: "install agents editors neovim", run: () => tabs.open({ type: "integrations" }) });
    add({ id: "news", title: "News (agent updates, popular models)", group: "Navigate", icon: Newspaper, keywords: "models trending updates changelog", run: () => tabs.open({ type: "news" }) });
    add({ id: "dashboard", title: "Go to Dashboard", group: "Navigate", icon: LayoutDashboard, keywords: "home inicio", run: () => tabs.open({ type: "home" }) });
    add({ id: "usage", title: "Show usage and plan limits", group: "Navigate", icon: BarChart3, keywords: "cost tokens limits uso", run: () => { tabs.open({ type: "home" }); scrollTo("dashboard-usage"); } });
    add({ id: "limits-refresh", title: "Refresh plan limits", group: "Navigate", icon: Gauge, keywords: "usage 5h weekly", run: () => void usePlanLimits.getState().refresh() });
    add({ id: "settings", title: "Open settings", group: "Navigate", icon: Settings, shortcut: `${modKey},`, keywords: "preferences ajustes", run: () => tabs.open({ type: "settings" }) });
    for (const sec of ["Appearance", "Terminal", "Sessions", "Voice", "Snippets", "Editor", "Updates", "Agents"]) {
      add({ id: `settings-${sec}`, title: `Settings: ${sec}`, group: "Navigate", icon: Settings, run: () => { tabs.open({ type: "settings" }); scrollTo(`settings-${sec.toLowerCase()}`); } });
    }
    add({ id: "next-tab", title: "Next tab", group: "Navigate", icon: ArrowRight, shortcut: "⌃Tab", run: () => cycleTab(1) });
    add({ id: "prev-tab", title: "Previous tab", group: "Navigate", icon: ArrowLeft, shortcut: "⌃⇧Tab", run: () => cycleTab(-1) });
    add({ id: "floating-terminal", title: "Pop-up terminal", group: "Terminal", icon: SquareTerminal, shortcut: `${modKey}N`, run: () => toggleFloating() });
    add({ id: "floating-terminal-full", title: "Full-screen terminal", group: "Terminal", icon: Maximize2, shortcut: `${modKey}⇧N`, run: () => toggleFloating(true) });
    add({ id: "focus-mode", title: "Toggle full screen", group: "Layout", icon: Maximize2, shortcut: `${modKey}⇧↩`, run: () => toggleFocusMode() });
    add({ id: "close-tab", title: "Close tab", group: "Navigate", icon: X, shortcut: `${modKey}W`, run: closeFocused });

    // Workspace
    add({ id: "ws-new", title: "New workspace", group: "Workspace", icon: Plus, keywords: "create crear", run: () => {
      const id = useWorkspaces.getState().createWorkspace(`Workspace ${workspaces.length + 1}`);
      tabs.open({ type: "workspace", id }, id);
      toast({ kind: "info", title: "Workspace created", detail: "Click its name to rename it." });
    } });
    if (ws) {
      add({ id: "ws-overview", title: `${ws.name}: overview`, group: "Workspace", icon: LayoutGrid, run: () => tabs.open({ type: "workspace", id: ws.id }) });
      add({ id: "ws-rename", title: `Rename workspace “${ws.name}”`, group: "Workspace", icon: Pencil, keywords: "edit editar", run: () => { tabs.open({ type: "workspace", id: ws.id }); after(() => document.querySelector<HTMLButtonElement>('button[title="Rename workspace"]')?.click(), 250); } });
      if (workspaces.length > 1) add({ id: "ws-delete", title: `Delete workspace “${ws.name}”`, group: "Workspace", icon: Trash2, run: () => void deleteWorkspace(ws.id) });
    }
    workspaces.forEach((w, i) => {
      if (w.id !== activeWorkspaceId) add({ id: `ws-${w.id}`, title: `Switch to ${w.name}`, group: "Workspace", icon: LayoutGrid, shortcut: i < 9 ? `${modKey}⇧${i + 1}` : undefined, run: () => useWorkspaces.getState().setActiveWorkspace(w.id) });
    });

    // Projects
    add({ id: "project-add", title: "Add project…", group: "Project", icon: FolderPlus, keywords: "new folder nuevo proyecto", run: addProjectFromDialog });
    ws?.projectIds.forEach((pid, i) => {
      const p = projects[pid];
      if (!p) return;
      add({ id: `pj-${p.id}`, title: `Open ${p.name}`, group: "Project", icon: Folder, shortcut: i < 9 ? `${modKey}${i + 1}` : undefined, run: () => tabs.open({ type: "project", id: p.id }) });
      add({ id: `git-${p.id}`, title: `Git: ${p.name}`, group: "Git", icon: GitBranch, keywords: "changes diff commit", run: () => tabs.open({ type: "git", id: p.id }) });
      add({ id: `pull-${p.id}`, title: `Pull ${p.name}`, group: "Git", icon: ArrowDown, run: () => void gitAction("pull", p.path, p.name) });
      add({ id: `push-${p.id}`, title: `Push ${p.name}`, group: "Git", icon: ArrowUp, run: () => void gitAction("push", p.path, p.name) });
      add({ id: `term-${p.id}`, title: `New terminal in ${p.name}`, group: "Terminal", icon: SquareTerminal, run: () => void newDefaultTerminal(p.path, p.name) });
      add({ id: `vim-${p.id}`, title: `Open Vim in ${p.name}`, group: "Vim", icon: FileCode2, keywords: "nvim neovim editor", run: () => void openInEditor({ projectId: p.id }) });
      add({ id: `log-${p.id}`, title: `Session history: ${p.name}`, group: "Project", icon: ListTree, keywords: "historial log", run: () => tabs.open({ type: "project", id: p.id }) });
      add({ id: `reveal-${p.id}`, title: `${isMac ? "Reveal in Finder" : "Show in Explorer"}: ${p.name}`, group: "Project", icon: FolderSearch, run: () => void revealProject(p.path) });
      add({ id: `rm-${p.id}`, title: `Remove project ${p.name}`, group: "Project", icon: Trash2, run: () => void removeProject(p.id) });
      for (const a of agentList.filter((x) => installed[x.kind])) {
        add({ id: `start-${a.kind}-${p.id}`, title: `Start ${a.displayName} in ${p.name}`, group: "Agent", icon: Bot, run: () => void startAgent(a.kind, p.id) });
        add({ id: `start-wt-${a.kind}-${p.id}`, title: `Start ${a.displayName} in new worktree of ${p.name}`, group: "Agent", icon: FolderGit2, run: () => void startAgent(a.kind, p.id, { worktree: true }) });
      }
    });

    // Conversations
    for (const ch of chats) {
      add({ id: `chat-${ch.id}`, title: `Resume: ${ch.title}`, group: `Conversations · ${ch.projectName}`, icon: MessagesSquare, keywords: `${timeAgo(ch.updatedAt)} claude`, run: () => void startAgent("claude-code", ch.projectId, { chat: { id: ch.id, title: ch.title } }) });
    }

    // Sessions
    for (const a of agents.filter((x) => x.workspaceId === activeWorkspaceId)) {
      const alive = a.status === "running" || a.status === "starting";
      const kind = isEditor(a.kind) ? "Editor" : "Agent";
      add({ id: `go-${a.id}`, title: `Go to ${a.name}`, group: "Sessions", icon: isEditor(a.kind) ? FileCode2 : Bot, run: () => tabs.open({ type: "agent", id: a.id }) });
      if (alive && !isEditor(a.kind)) add({ id: `stop-${a.id}`, title: `Stop ${a.name}`, group: "Sessions", icon: Square, run: () => void stopAgent(a.id) });
      if (!alive) add({ id: `restart-${a.id}`, title: `Restart ${a.name}`, group: "Sessions", icon: RotateCw, run: () => void restartAgent(a.id) });
      add({ id: `end-${a.id}`, title: `${kind === "Editor" ? "Close" : "End"} ${a.name}`, group: "Sessions", icon: Trash2, run: () => void removeAgent(a.id) });
    }
    terminals.forEach((t, i) => {
      add({ id: `goterm-${t.id}`, title: `Go to terminal ${t.name}${t.cwd !== "~" ? ` (${t.cwd.split("/").pop()})` : ""}`, group: "Terminal", icon: SquareTerminal, shortcut: i < 9 ? (isMac ? `⌃${i + 1}` : `Ctrl+Alt+${i + 1}`) : undefined, run: () => { useSessions.getState().setActiveTerminal(t.id); layout.openTerminalPanel(); } });
      if (t.status !== "running") add({ id: `rterm-${t.id}`, title: `Restart terminal ${t.name}`, group: "Terminal", icon: RotateCw, run: () => void restartTerminal(t.id) });
      add({ id: `xterm-${t.id}`, title: `Close terminal ${t.name}`, group: "Terminal", icon: Trash2, run: () => void closeTerminal(t.id) });
    });

    // Tools
    add({ id: "new-terminal", title: "New terminal", group: "Terminal", icon: SquareTerminal, shortcut: `${modKey}T`, keywords: "shell zsh consola", run: () => void newDefaultTerminal() });
    add({ id: "vim-here", title: "Open Vim here", group: "Vim", icon: FileCode2, shortcut: `${modKey}E`, keywords: "nvim neovim editor", run: () => void openInEditor() });
    add({ id: "vim-quick", title: "Open file in Vim…", group: "Vim", icon: FileCode2, shortcut: `${modKey}P`, keywords: "find file buscar archivo", run: () => useQuickOpen.getState().open() });
    add({ id: "find", title: "Find in terminal", group: "Terminal", icon: Search, shortcut: isMac ? `${modKey}F` : "Ctrl⇧F", keywords: "search buscar", run: () => { const id = searchTarget(); if (id) useTerminalSearch.getState().open(id); } });
    add({ id: "voice", title: "Voice input", group: "Voice", icon: Mic, shortcut: `${modKey}⇧V`, keywords: "dictate hablar voz", run: () => void useVoice.getState().toggle() });
    add({ id: "snippets", title: "Send a snippet…", group: "Snippets", icon: TextQuote, shortcut: `${modKey};`, run: () => useSnippetPicker.getState().set(true) });
    for (const sn of snippets) {
      add({ id: `snippet-${sn.id}`, title: `Snippet: ${sn.name}`, group: "Snippets", icon: TextQuote, run: () => (variablesOf(sn.text).length ? useSnippetPicker.getState().set(true) : void sendSnippet(sn)) });
    }

    // View
    add({ id: "sidebar", title: "Toggle sidebar", group: "View", icon: PanelLeft, shortcut: `${modKey}B`, run: layout.toggleSidebar });
    add({ id: "terminal-panel", title: "Toggle terminal panel", group: "View", icon: PanelRight, shortcut: `${modKey}J`, run: layout.toggleTerminal });
    add({ id: "timeline", title: "Toggle agent timeline", group: "View", icon: ListTree, shortcut: `${modKey}⇧L`, run: layout.toggleTimeline });
    add({ id: "split-right", title: "Split pane right", group: "View", icon: Columns2, shortcut: `${modKey}\\`, run: () => tabs.splitFocused("right") });
    add({ id: "split-down", title: "Split pane down", group: "View", icon: Rows2, shortcut: `${modKey}⇧\\`, run: () => tabs.splitFocused("bottom") });
    for (const t of [...THEMES, { id: "system", name: "Match system" }]) {
      add({ id: `theme-${t.id}`, title: `Theme: ${t.name}`, group: "Appearance", icon: Palette, keywords: "color tema dark light", run: () => useSettings.getState().set("theme", t.id) });
    }

    // Agents
    add({ id: "agents-recheck", title: "Re-check installed agents", group: "Agent", icon: RefreshCw, run: () => void useAvailability.getState().refresh() });
    for (const a of agentList.filter((x) => installed[x.kind] === null && (isMac ? x.install.unix : x.install.windows ?? x.install.unix))) {
      add({ id: `install-${a.kind}`, title: `Install ${a.displayName}`, group: "Agent", icon: Download, run: () => void installAgent(AGENTS[a.kind]!) });
    }

    // App
    add({ id: "updates", title: "Check for updates", group: "App", icon: Download, run: () => void useUpdates.getState().check(true) });
    add({ id: "shortcuts", title: "Keyboard shortcuts", group: "Help", icon: Keyboard, shortcut: "?", run: () => layout.setHelpOpen(true) });
    add({ id: "tour", title: "Welcome tour", group: "Help", icon: Sparkles, run: () => useSettings.getState().set("onboarded", false) });

    return c;
  }, [workspaces, projects, activeWorkspaceId, agents, terminals, snippets, installed, chats]);
}
