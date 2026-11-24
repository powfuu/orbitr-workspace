import { motion } from "framer-motion";
import { Loader2, Mic, MicOff } from "lucide-react";
import { useVoice } from "../../features/voice/voiceStore";
import { modKey } from "../../lib/platform";
import { cn } from "../../lib/cn";
import { Tooltip } from "../ui/Tooltip";

/** Top-right mic toggle. The ring scales with live microphone level. */
export function VoiceButton() {
  const { phase, level, toggle } = useVoice();
  const on = phase !== "off";
  const busy = phase === "downloading" || phase === "loading" || phase === "transcribing";
  const ring = Math.min(1, level * 12);

  return (
    <Tooltip label={on ? "Stop voice input" : "Voice input"} shortcut={`${modKey}⇧V`}>
      <button
        type="button"
        aria-label={on ? "Stop voice input" : "Start voice input"}
        aria-pressed={on}
        onClick={() => void toggle()}
        className={cn(
          "relative grid h-7 w-7 place-items-center rounded-full transition-colors",
          on ? "bg-white text-black" : "text-muted hover:bg-surface hover:text-fg",
        )}
      >
        {on && (
          <motion.span
            className="absolute inset-0 rounded-full ring-2 ring-white/60"
            animate={{ scale: 1 + ring * 0.6, opacity: phase === "speaking" ? 0.9 : 0.35 }}
            transition={{ duration: 0.08 }}
          />
        )}
        {busy ? <Loader2 size={14} className="animate-spin" /> : on ? <Mic size={14} strokeWidth={2.25} /> : <MicOff size={14} strokeWidth={1.75} />}
      </button>
    </Tooltip>
  );
}
