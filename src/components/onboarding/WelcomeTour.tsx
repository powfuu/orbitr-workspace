import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, FolderPlus, Mic, ShieldQuestion, SquareTerminal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useSettings } from "../../stores/settingsStore";
import { useWorkspaces } from "../../stores/workspaceStore";
import { addProjectFromDialog } from "../../features/projects/addProject";
import { agentList } from "../../features/agents/registry";
import { useAgentAvailability } from "../../features/agents/useAgentAvailability";
import { modKey } from "../../lib/platform";
import { cn } from "../../lib/cn";
import { LogoMark } from "../ui/Logo";
import { AgentGlyph } from "../ui/AgentGlyph";
import { Kbd } from "../ui/Kbd";

function Feature({ icon: Icon, title, text }: { icon: typeof Mic; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bg ring-1 ring-line"><Icon size={14} className="text-fg-2" /></span>
      <div>
        <div className="text-[12.5px] font-medium text-fg">{title}</div>
        <div className="text-[12px] leading-relaxed text-muted">{text}</div>
      </div>
    </div>
  );
}

function ProjectStep() {
  const projectMap = useWorkspaces((s) => s.projects);
  const projects = Object.values(projectMap);
  return (
    <div>
      <h2 className="text-[18px] font-semibold text-fg">Add your first project</h2>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">A project is a folder on disk. Agents and terminals start there, and Orbitr shows its git status, conversations and usage.</p>
      <button onClick={() => void addProjectFromDialog()} className="mt-5 flex h-9 items-center gap-2 rounded-lg bg-fg px-3.5 text-[12.5px] font-medium text-bg hover:bg-fg/85">
        <FolderPlus size={14} /> Choose a folder…
      </button>
      {projects.length > 0 && (
        <div className="mt-4 space-y-1">
          {projects.slice(-4).map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-[12.5px] text-fg-2"><Check size={13} className="text-success" />{p.name}<span className="truncate font-mono text-[10.5px] text-faint">{p.path}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentsStep() {
  const availability = useAgentAvailability();
  const installed = agentList.filter((a) => availability?.[a.kind]);
  return (
    <div>
      <h2 className="text-[18px] font-semibold text-fg">Your agents</h2>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
        {availability === undefined ? "Looking for agent CLIs on your PATH…" : installed.length ? `Found ${installed.length} installed. They run as real processes in their own terminal.` : "No agent CLIs found yet. You can install any of them from Home with one click."}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {agentList.slice(0, 8).map((a) => {
          const ok = !!availability?.[a.kind];
          return (
            <div key={a.kind} className={cn("flex items-center gap-2 rounded-lg px-2.5 py-2 ring-1", ok ? "ring-line bg-bg" : "ring-line-soft opacity-50")}>
              <AgentGlyph agent={a} size={18} />
              <span className="flex-1 truncate text-[12px] text-fg-2">{a.displayName}</span>
              {ok && <Check size={12} className="text-success" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STEPS: { key: string; body: () => ReactNode }[] = [
  {
    key: "welcome",
    body: () => (
      <div>
        <div className="mb-5 inline-grid h-12 w-12 place-items-center rounded-xl bg-bg ring-1 ring-line"><LogoMark size={26} /></div>
        <h2 className="text-[22px] font-semibold uppercase tracking-[0.06em] text-fg">Welcome to Orbitr</h2>
        <p className="mt-1.5 text-[12.5px] text-muted">Your agents. Your terminals. One workspace.</p>
        <div className="mt-6 space-y-4">
          <Feature icon={SquareTerminal} title="Real agents, real terminals" text="Claude Code, Codex and others run as native processes, side by side, and come back when you reopen." />
          <Feature icon={ShieldQuestion} title="Never miss a question" text="Orbitr notices when an agent waits for approval or an answer, and lets you reply in one click." />
          <Feature icon={Mic} title="Talk to them" text="Dictate a prompt; it's transcribed on this device and sent when you pause." />
        </div>
      </div>
    ),
  },
  { key: "project", body: () => <ProjectStep /> },
  { key: "agents", body: () => <AgentsStep /> },
  {
    key: "keys",
    body: () => (
      <div>
        <h2 className="text-[18px] font-semibold text-fg">A few keys to remember</h2>
        <div className="mt-5 space-y-2.5">
          {[
            [[modKey, "K"], "Do anything: open, start, switch"],
            [[modKey, "⇧", "V"], "Speak to the focused agent or terminal"],
            [[modKey, "N"], "Start an agent"],
            [[modKey, "\\"], "Split the view"],
            [["?"], "All shortcuts"],
          ].map(([keys, label]) => (
            <div key={label as string} className="flex items-center justify-between rounded-lg bg-bg px-3 py-2 ring-1 ring-line-soft">
              <span className="text-[12.5px] text-fg-2">{label as string}</span>
              <span className="flex gap-1">{(keys as string[]).map((k) => <Kbd key={k}>{k}</Kbd>)}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

/** First-run walkthrough. Re-open from the palette ("Welcome tour"). */
export function WelcomeTour() {
  const onboarded = useSettings((s) => s.onboarded);
  const set = useSettings((s) => s.set);
  const [step, setStep] = useState(0);
  const finish = () => {
    set("onboarded", true);
    setStep(0);
  };
  const last = step === STEPS.length - 1;
  const Body = STEPS[step]!.body;

  return (
    <AnimatePresence>
      {!onboarded && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onKeyDown={(e) => {
            if (e.key === "Escape") finish();
            if (e.key === "ArrowRight" && !last) setStep(step + 1);
            if (e.key === "ArrowLeft" && step > 0) setStep(step - 1);
          }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <motion.div
            role="dialog"
            aria-label="Welcome to Orbitr"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="flex w-[520px] max-w-[92vw] flex-col overflow-hidden rounded-2xl bg-surface shadow-pop"
          >
            <div className="relative min-h-[360px] overflow-hidden p-7">
              <AnimatePresence mode="wait">
                <motion.div key={STEPS[step]!.key} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
                  <Body />
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-3 border-t border-line px-5 py-3">
              <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
                {STEPS.map((s, i) => (
                  <button key={s.key} aria-label={`Step ${i + 1}`} onClick={() => setStep(i)} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-5 bg-fg" : "w-1.5 bg-line hover:bg-faint")} />
                ))}
              </div>
              <button onClick={finish} className="ml-auto h-8 px-2 text-[12px] text-muted hover:text-fg">Skip</button>
              {step > 0 && (
                <button onClick={() => setStep(step - 1)} className="grid h-8 w-8 place-items-center rounded-lg text-muted ring-1 ring-line hover:text-fg" aria-label="Back">
                  <ArrowLeft size={14} />
                </button>
              )}
              <button
                onClick={() => (last ? finish() : setStep(step + 1))}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-fg px-3.5 text-[12.5px] font-medium text-bg hover:bg-fg/85"
              >
                {last ? "Start using Orbitr" : step === 0 ? "Get started" : "Next"}
                {!last && <ArrowRight size={13} />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
