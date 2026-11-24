import { motion } from "framer-motion";
import { Bot, Command, FolderPlus, SquareTerminal } from "lucide-react";
import { UsageOverview } from "../usage/UsageOverview";
import { AgentIntegrations } from "../agents/AgentIntegrations";
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
        <div className="relative mb-6 inline-grid h-14 w-14 place-items-center rounded-2xl bg-surface ring-1 ring-line">
          <div className="absolute inset-0 rounded-2xl bg-white/10 blur-xl" />
          <LogoMark size={30} />
        </div>
        <h1 className="text-[20px] @md:text-[26px] @xl:text-[30px] font-semibold uppercase leading-[1.15] tracking-[0.06em] text-fg">
          Your agents. Your terminals.
          <br />
          <span className="text-muted">One workspace.</span>
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
    </div>
  );
}
