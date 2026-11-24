import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MousePointerClick, Send, SquareTerminal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { resolveVoiceTarget, useVoice, type VoicePhase } from "../../features/voice/voiceStore";
import { AGENTS } from "../../features/agents/registry";
import { useFocusedSession } from "../../stores/focusStore";
import { useActiveTabs } from "../../stores/tabStore";
import { useSessions } from "../../stores/sessionStore";
import { AgentGlyph } from "../ui/AgentGlyph";

const label: Record<VoicePhase, string> = {
  off: "",
  downloading: "Downloading speech model",
  loading: "Starting microphone",
  listening: "Listening",
  speaking: "Hearing you…",
  transcribing: "Transcribing",
  needsTarget: "Where should this go?",
};

const BARS = 5;
const spring = { type: "spring", stiffness: 480, damping: 34 } as const;

/** Floating voice HUD: waveform + destination while listening; a target picker when nothing is focused. */
export function VoiceIndicator() {
  const { phase, level, download, lastText, lastTarget, stop } = useVoice();
  useFocusedSession((s) => s.id);
  useActiveTabs();
  useSessions((s) => s.agents.length + s.terminals.length);
  const target = resolveVoiceTarget();
  const [sent, setSent] = useState<{ text: string; to: string | null } | null>(null);

  // Brief confirmation after each send (the mic closes right away).
  useEffect(() => {
    if (!lastText) return;
    setSent({ text: lastText, to: lastTarget });
    const t = window.setTimeout(() => setSent(null), 3000);
    return () => window.clearTimeout(t);
  }, [lastText, lastTarget]);

  return (
    <div className="pointer-events-none fixed bottom-10 left-1/2 z-[55] flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence mode="popLayout">
        {phase === "needsTarget" ? (
          <TargetPicker key="picker" />
        ) : phase !== "off" ? (
          <motion.div
            key="hud"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={spring}
            className="pointer-events-auto flex flex-col items-center gap-2"
          >
            {!target && phase !== "downloading" && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-[12px] text-warning"
              >
                <MousePointerClick size={13} />
                No agent or terminal focused — speak anyway, you'll choose where it goes.
              </motion.div>
            )}
            <div className="flex h-10 items-center gap-3 rounded-full bg-surface pl-4 pr-1.5 shadow-pop">
              <div className="flex h-4 items-center gap-[3px]" aria-hidden>
                {Array.from({ length: BARS }, (_, i) => {
                  const h = phase === "speaking" ? Math.max(0.2, Math.min(1, level * 14 * (1 - Math.abs(i - 2) * 0.22))) : 0.2;
                  return <motion.span key={i} className="w-[3px] rounded-full bg-fg" animate={{ height: `${h * 16}px` }} transition={{ duration: 0.08 }} />;
                })}
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-fg">
                {label[phase]}
                {phase === "downloading" && download != null ? ` ${Math.round(download * 100)}%` : ""}
              </span>
              <span className={`flex items-center gap-1.5 text-[12px] ${target ? "text-muted" : "text-warning"}`}>
                <ArrowRight size={12} />
                <span className="max-w-56 truncate">{target ? target.name : "choose after speaking"}</span>
              </span>
              <button aria-label="Stop voice input" onClick={() => void stop()} className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg">
                <X size={13} />
              </button>
            </div>
          </motion.div>
        ) : sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={spring}
            className="flex max-w-[560px] items-center gap-2 rounded-full bg-surface px-4 py-2 text-[12.5px] shadow-pop"
          >
            <Send size={12} className="shrink-0 text-success" />
            <span className="truncate text-fg">“{sent.text}”</span>
            {sent.to && <span className="shrink-0 text-muted">→ {sent.to}</span>}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Shown when a phrase was heard with nothing focused: big, explicit, one click to send. */
function TargetPicker() {
  const { pending, sendPendingTo, discardPending } = useVoice();
  // Select stable arrays, filter outside: a selector returning a new array loops forever.
  const agents = useSessions((s) => s.agents).filter((a) => a.status === "running");
  const terminals = useSessions((s) => s.terminals).filter((t) => t.status === "running");
  const none = agents.length + terminals.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={spring}
      className="pointer-events-auto w-[460px] overflow-hidden rounded-2xl border border-warning/40 bg-surface shadow-[0_0_0_4px_rgba(224,176,74,0.08),0_20px_50px_-10px_#000]"
    >
      <div className="flex items-start gap-3 border-b border-line p-4">
        <motion.span
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-warning/15 text-warning"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          <MousePointerClick size={15} />
        </motion.span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-fg">Nothing was focused — where should this go?</div>
          <div className="selectable mt-1 rounded-md bg-bg px-2.5 py-1.5 text-[12.5px] text-fg-2">“{pending}”</div>
          <div className="mt-1.5 text-[11px] text-muted">Pick a session below, or just click into any agent or terminal.</div>
        </div>
        <button aria-label="Discard" onClick={discardPending} className="text-faint hover:text-fg">
          <X size={14} />
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto p-1.5">
        {none && <div className="px-3 py-4 text-center text-[12px] text-muted">No running agents or terminals. Start one, then click it.</div>}
        {agents.map((a) => (
          <PickRow key={a.id} icon={<AgentGlyph agent={AGENTS[a.kind]} size={18} status={a.status} />} name={a.name} onPick={() => void sendPendingTo(a.id, a.name)} />
        ))}
        {terminals.map((t) => (
          <PickRow key={t.id} icon={<SquareTerminal size={15} className="text-muted" />} name={t.name} onPick={() => void sendPendingTo(t.id, t.name)} />
        ))}
      </div>
    </motion.div>
  );
}

function PickRow({ icon, name, onPick }: { icon: React.ReactNode; name: string; onPick: () => void }) {
  return (
    <button onClick={onPick} className="group flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-[12.5px] text-fg-2 hover:bg-surface-2 hover:text-fg">
      {icon}
      <span className="flex-1 truncate">{name}</span>
      <span className="flex items-center gap-1 text-[11px] text-muted opacity-0 group-hover:opacity-100">
        Send <Send size={11} />
      </span>
    </button>
  );
}
