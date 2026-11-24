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

const slide = { type: "spring", stiffness: 420, damping: 42 } as const;

export function AppShell() {
  const { sidebarOpen, terminalOpen, sidebarWidth, terminalWidth, setSidebarWidth, setTerminalWidth } = useLayout();
  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div key="sidebar" className="flex shrink-0 overflow-hidden" initial={{ width: 0 }} animate={{ width: sidebarWidth + 1 }} exit={{ width: 0 }} transition={slide}>
              <div style={{ width: sidebarWidth }} className="shrink-0"><ErrorBoundary label="Sidebar"><Sidebar /></ErrorBoundary></div>
              <ResizeHandle width={sidebarWidth} onChange={setSidebarWidth} dir={1} label="Resize sidebar" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="min-w-0 flex-1"><ErrorBoundary label="Workspace"><CenterWorkspace /></ErrorBoundary></div>

        <AnimatePresence initial={false}>
          {terminalOpen && (
            <motion.div key="terminal" className="flex shrink-0 overflow-hidden" initial={{ width: 0 }} animate={{ width: terminalWidth + 1 }} exit={{ width: 0 }} transition={slide}>
              <ResizeHandle width={terminalWidth} onChange={setTerminalWidth} dir={-1} label="Resize terminal panel" />
              <div style={{ width: terminalWidth }} className="shrink-0"><ErrorBoundary label="Terminal panel"><TerminalPanel /></ErrorBoundary></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <StatusBar />
      <CommandPalette />
      <Toaster />
      <ErrorBoundary label="Quick open"><QuickOpen /></ErrorBoundary>
      <ErrorBoundary label="Snippets"><SnippetPicker /></ErrorBoundary>
      <ErrorBoundary label="Shortcuts"><ShortcutSheet /></ErrorBoundary>
      <ErrorBoundary label="Welcome"><WelcomeTour /></ErrorBoundary>
      <ErrorBoundary label="Voice"><VoiceIndicator /></ErrorBoundary>
      <ErrorBoundary label="Approvals"><ApprovalsTray /></ErrorBoundary>
    </div>
  );
}
