import { AnimatePresence, motion } from "framer-motion";
import { useLayout } from "../../stores/layoutStore";
import { Sidebar } from "../sidebar/Sidebar";
import { CenterWorkspace } from "../workspace/CenterWorkspace";
import { TerminalPanel } from "../terminal/TerminalPanel";
import { CommandPalette } from "../palette/CommandPalette";
import { ResizeHandle } from "./ResizeHandle";
import { StatusBar } from "./StatusBar";
import { Toaster } from "../ui/Toaster";
import { ShortcutSheet } from "../help/ShortcutSheet";
import { QuickOpen } from "../editors/QuickOpen";
import { SnippetPicker } from "../snippets/SnippetPicker";
import { WelcomeTour } from "../onboarding/WelcomeTour";
import { ApprovalsTray } from "../approvals/ApprovalsTray";
import { VoiceIndicator } from "../voice/VoiceIndicator";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { FloatingTerminal } from "../floating/FloatingTerminal";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { CredentialsDialog } from "../git/CredentialsDialog";
import { windowDragProps } from "../../hooks/useWindowDrag";
import { Minimize2 } from "lucide-react";
import { toggleFocusMode } from "../../features/layout/focusMode";
import { modKey, isMac } from "../../lib/platform";

const slide = { type: "spring", stiffness: 420, damping: 42 } as const;

export function AppShell() {
  const { sidebarOpen: sidebarPref, terminalOpen: terminalPref, sidebarWidth, terminalWidth, setSidebarWidth, setTerminalWidth, focusMode } = useLayout();
  const sidebarOpen = sidebarPref && !focusMode;
  const terminalOpen = terminalPref && !focusMode;
  return (
    <div className="flex h-full flex-col">
      {/* Full screen hides every bar, so keep a strip to drag the window by (and clear the traffic lights). */}
      {focusMode && <div {...windowDragProps} className="h-7 shrink-0 bg-bg" />}
      <div className="flex min-h-0 flex-1">
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div key="sidebar" className="flex shrink-0 overflow-hidden" initial={{ width: 0 }} animate={{ width: sidebarWidth + 1 }} exit={{ width: 0 }} transition={slide}>
              <div data-region="sidebar" style={{ width: sidebarWidth }} className="shrink-0"><ErrorBoundary label="Sidebar"><Sidebar /></ErrorBoundary></div>
              <ResizeHandle width={sidebarWidth} onChange={setSidebarWidth} dir={1} label="Resize sidebar" />
            </motion.div>
          )}
        </AnimatePresence>

        <div data-region="main" tabIndex={-1} className="min-w-0 flex-1 outline-none"><ErrorBoundary label="Workspace"><CenterWorkspace /></ErrorBoundary></div>

        <AnimatePresence initial={false}>
          {terminalOpen && (
            <motion.div key="terminal" className="flex shrink-0 overflow-hidden" initial={{ width: 0 }} animate={{ width: terminalWidth + 1 }} exit={{ width: 0 }} transition={slide}>
              <ResizeHandle width={terminalWidth} onChange={setTerminalWidth} dir={-1} label="Resize terminal panel" />
              <div data-region="terminal" style={{ width: terminalWidth }} className="shrink-0"><ErrorBoundary label="Terminal panel"><TerminalPanel /></ErrorBoundary></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {!focusMode && <StatusBar />}
      {focusMode && (
        <button
          onClick={() => toggleFocusMode(false)}
          title={`Exit full screen (${modKey}${isMac ? "⇧↩" : "+Shift+Enter"})`}
          className="fixed right-3 top-3 z-50 grid h-7 w-7 place-items-center rounded-md bg-surface/80 text-muted opacity-0 ring-1 ring-line backdrop-blur transition-opacity hover:text-fg hover:opacity-100 focus-visible:opacity-100"
        >
          <Minimize2 size={13} />
        </button>
      )}
      <CommandPalette />
      <Toaster />
      <ErrorBoundary label="Quick open"><QuickOpen /></ErrorBoundary>
      <ErrorBoundary label="Snippets"><SnippetPicker /></ErrorBoundary>
      <ErrorBoundary label="Shortcuts"><ShortcutSheet /></ErrorBoundary>
      <ErrorBoundary label="Welcome"><WelcomeTour /></ErrorBoundary>
      <ErrorBoundary label="Voice"><VoiceIndicator /></ErrorBoundary>
      <ErrorBoundary label="Approvals"><ApprovalsTray /></ErrorBoundary>
      <ErrorBoundary label="Floating terminal"><FloatingTerminal /></ErrorBoundary>
      <ConfirmDialog />
      <CredentialsDialog />
    </div>
  );
}
