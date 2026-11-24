import { MotionConfig } from "framer-motion";
import { AppShell } from "../components/layout/AppShell";
import { useGlobalShortcuts } from "../hooks/useGlobalShortcuts";

export function App() {
  useGlobalShortcuts();
  return (
    <MotionConfig reducedMotion="user">
      <AppShell />
    </MotionConfig>
  );
}
