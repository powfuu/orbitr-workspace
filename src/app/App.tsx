import { MotionConfig } from "framer-motion";
import { AppShell } from "../components/layout/AppShell";
import { VimHints } from "../components/vim/VimHints";
import { VimCursor } from "../components/vim/VimCursor";
import { useGlobalShortcuts } from "../hooks/useGlobalShortcuts";
import { useVimMode } from "../features/vim/useVimMode";

export function App() {
  useVimMode(); // before global shortcuts so NORMAL-mode keys win
  useGlobalShortcuts();
  return (
    <MotionConfig reducedMotion="user">
      <AppShell />
      <VimHints />
      <VimCursor />
    </MotionConfig>
  );
}
