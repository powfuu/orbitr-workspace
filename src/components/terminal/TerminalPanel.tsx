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

function EmptyTerminal({ onCreate, ready, shellName }: { onCreate: () => void; ready: boolean; shellName?: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-grid absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center text-center">
        <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-surface text-muted ring-1 ring-line">
          <SquareTerminal size={18} strokeWidth={1.75} />
        </span>
        <div className="text-[13px] font-medium text-fg">No terminals open</div>
        <div className="mt-1 max-w-56 text-[12px] leading-relaxed text-muted">
          {ready ? "Spawn a real shell in a native PTY." : "Terminals need the Orbitr desktop runtime."}
        </div>
        {ready && (
          <button onClick={onCreate} className="mt-4 flex h-8 items-center gap-2 rounded-lg bg-surface px-3 text-[12.5px] text-fg ring-1 ring-line hover:bg-surface-2">
            <Plus size={13} /> New {shellName} terminal <Kbd>{modKey}T</Kbd>
          </button>
        )}
      </div>
    </motion.div>
  );
}
