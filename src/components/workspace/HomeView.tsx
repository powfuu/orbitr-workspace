import { motion } from "framer-motion";
import { Bot, Command, FolderPlus, SquareTerminal } from "lucide-react";
import { UsageOverview } from "../usage/UsageOverview";
import { AgentIntegrations } from "../agents/AgentIntegrations";
import { IdeIntegrations } from "../agents/IdeIntegrations";
import { addProjectFromDialog } from "../../features/projects/addProject";
import { newDefaultTerminal } from "../../features/terminals/newDefaultTerminal";
import { useLayout } from "../../stores/layoutStore";
import { modKey } from "../../lib/platform";
import { LogoMark } from "../ui/Logo";
import { ActionCard } from "./primitives";

const fade = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.04 * i, duration: 0.35, ease: [0.2, 0, 0, 1] as const },
});

export function HomeView() {
  const setPaletteOpen = useLayout((s) => s.setPaletteOpen);
  return (
    <div className="relative mx-auto flex min-h-full max-w-3xl flex-col justify-center px-5 py-10 @lg:px-10 @lg:py-14">
      <motion.div {...fade(0)} className="mb-10">
        <div className="relative mb-6 inline-grid place-items-center">
          <LogoMark size={44} />
        </div>
        <div className="mb-3 font-mono text-[12px] text-muted">
          <span className="text-success">❯</span> orbitr <span className="text-faint">--welcome</span>
        </div>
        <h1 className="font-mono text-[20px] font-semibold leading-[1.25] tracking-tight text-fg @md:text-[26px] @xl:text-[30px]">
          your agents. your terminals.
          <br />
          <span className="text-muted">one workspace.</span>
          <motion.span
            aria-hidden
            className="ml-1 inline-block h-[0.95em] w-[0.5em] translate-y-[0.12em] bg-fg"
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: "linear" }}
          />
        </h1>
      </motion.div>

      <motion.div {...fade(1)} className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3">
        <ActionCard icon={FolderPlus} title="Add project" description="Anchor sessions to a folder on disk." onClick={addProjectFromDialog} />
        <ActionCard icon={Command} title="Command palette" description="Jump anywhere, run any action." shortcut={`${modKey}K`} onClick={() => setPaletteOpen(true)} />
        <ActionCard icon={Bot} title="Start an agent" description="Claude Code, Codex, Gemini and more, in a real terminal." onClick={() => setPaletteOpen(true, "Start ")} />
        <ActionCard icon={SquareTerminal} title="New terminal" description="Spawn your default shell in the side panel." shortcut={`${modKey}T`} onClick={() => void newDefaultTerminal()} />
      </motion.div>

      <motion.div {...fade(2)} className="mt-10">
        <UsageOverview />
      </motion.div>

      <motion.div {...fade(2)} className="mt-10">
        <AgentIntegrations />
      </motion.div>

      <motion.div {...fade(3)} className="mt-10">
        <IdeIntegrations />
      </motion.div>
    </div>
  );
}
