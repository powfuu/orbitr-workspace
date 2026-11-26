import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { AgentIntegrations } from "../agents/AgentIntegrations";
import { IdeIntegrations } from "../agents/IdeIntegrations";
import { AgentNews } from "../agents/AgentNews";
import { PopularModels } from "../agents/PopularModels";
import { SectionNav, type NavSection } from "./SectionNav";

const fade = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.05 * i, duration: 0.3, ease: [0.2, 0, 0, 1] as const },
});

function Page({ command, title, subtitle, sections, children }: { command: string; title: string; subtitle: string; sections: NavSection[]; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-5 pb-12 @lg:px-10">
      <SectionNav page={title.toLowerCase()} sections={sections} />
      <motion.div {...fade(0)} className="mb-8">
        <div className="mb-2 font-mono text-[12px] text-muted">
          <span className="text-success">❯</span> orbitr <span className="text-faint">{command}</span>
        </div>
        <h1 className="font-mono text-[22px] font-semibold tracking-tight text-fg">{title}</h1>
        <p className="mt-1 text-[12.5px] text-muted">{subtitle}</p>
      </motion.div>
      {children}
    </div>
  );
}

/** Agent CLIs and editors you can install, with their install status. */
export function IntegrationsView() {
  return (
    <Page
      command="--integrations"
      title="Integrations"
      subtitle="Agent CLIs and editors: what's installed and one-click installers."
      sections={[
        { id: "int-agents", label: "agents" },
        { id: "int-editors", label: "editors" },
        { id: "int-configs", label: "neovim configs" },
      ]}
    >
      <motion.div {...fade(1)} id="int-agents" className="scroll-mt-14">
        <AgentIntegrations />
      </motion.div>
      <motion.div {...fade(2)} id="int-editors" className="mt-10 scroll-mt-14">
        <IdeIntegrations />
      </motion.div>
    </Page>
  );
}

/** What's new: your agents' releases and the models people are using. */
export function NewsView() {
  return (
    <Page
      command="--news"
      title="News"
      subtitle="New versions of your agents, their latest changes, and the models in use right now."
      sections={[
        { id: "news-agents", label: "agent updates" },
        { id: "news-models", label: "popular models" },
      ]}
    >
      <motion.div {...fade(1)} id="news-agents" className="scroll-mt-14">
        <AgentNews />
      </motion.div>
      <motion.div {...fade(2)} id="news-models" className="mt-10 scroll-mt-14">
        <PopularModels />
      </motion.div>
    </Page>
  );
}
