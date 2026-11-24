import { motion } from "framer-motion";
import { windowDragProps } from "../../hooks/useWindowDrag";
import { PanelRightClose, Plus, RotateCw, SquareTerminal } from "lucide-react";
import { useSessions } from "../../stores/sessionStore";
import { useLayout } from "../../stores/layoutStore";
import { useShells } from "../../hooks/useShells";
import { newDefaultTerminal } from "../../features/terminals/newDefaultTerminal";
import { createTerminal, restartTerminal } from "../../features/terminals/terminalActions";
import { isTauri, modKey } from "../../lib/platform";
import { IconButton } from "../ui/IconButton";
import { Kbd } from "../ui/Kbd";
import { ShellPicker } from "./ShellPicker";
import { TerminalTabs } from "./TerminalTabs";
import { TerminalView } from "./TerminalView";

export function TerminalPanel() {
  const { terminals, activeTerminalId } = useSessions();
  const toggleTerminal = useLayout((s) => s.toggleTerminal);
  const shells = useShells();
  const active = terminals.find((t) => t.id === activeTerminalId);
  const newDefault = () => void newDefaultTerminal();

  return (
    <aside className="flex h-full flex-col bg-bg">
      <div {...windowDragProps} className="flex h-11 shrink-0 items-center gap-1 border-b border-line-soft px-2">
        <div className="flex items-center gap-2 pl-1.5 font-mono text-[12px] text-fg-2">
          <SquareTerminal size={14} className="text-muted" />
          terminal
          <span className="text-2xs text-faint">[{terminals.length}]</span>
        </div>
        <div className="flex-1" />
        {active && active.status !== "running" && active.status !== "starting" && (
          <IconButton icon={RotateCw} label="Restart session" size="sm" onClick={() => void restartTerminal(active.id)} />
        )}
        <ShellPicker onPick={(shell) => void createTerminal({ shell })} />
        <IconButton icon={Plus} label="New terminal" shortcut={`${modKey}T`} size="sm" onClick={newDefault} disabled={!shells.length} />
        <IconButton icon={PanelRightClose} label="Hide panel" shortcut={`${modKey}J`} onClick={toggleTerminal} size="sm" />
      </div>

      {terminals.length > 0 && <TerminalTabs />}

      <div className="relative min-h-0 flex-1 bg-term">
        {active ? (
          // One mounted view at a time; inactive xterm instances stay alive in the registry.
          <div key={active.id} className="absolute inset-0 py-2 pl-3 pr-1">
            <TerminalView id={active.id} focused />
          </div>
        ) : (
          <EmptyTerminal onCreate={newDefault} ready={isTauri && shells.length > 0} shellName={shells[0]?.name} />
        )}
      </div>
    </aside>
  );
}

/** Empty panel drawn like a fresh shell screen. */
function EmptyTerminal({ onCreate, ready, shellName }: { onCreate: () => void; ready: boolean; shellName?: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 p-4 font-mono text-[12.5px] leading-relaxed">
      <div className="text-faint"># no terminals open</div>
      <div className="text-faint"># {ready ? `${modKey}T or click below to spawn ${shellName ?? "a shell"} in a native PTY` : "terminals need the Orbitr desktop runtime"}</div>
      {ready && (
        <button onClick={onCreate} className="group mt-3 flex items-center gap-2 text-left text-fg-2 hover:text-fg">
          <span className="text-success">❯</span>
          <span>{shellName ?? "shell"}</span>
          <motion.span
            aria-hidden
            className="inline-block h-[1.05em] w-[0.55em] bg-fg-2 group-hover:bg-fg"
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: "linear" }}
          />
          <Kbd>{modKey}T</Kbd>
        </button>
      )}
    </motion.div>
  );
}
