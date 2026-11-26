import claudeIcon from "../../assets/agents/claudecode-color.svg";
import codexIcon from "../../assets/agents/codex-color.svg";
import geminiIcon from "../../assets/agents/geminicli-color.svg";
import grokIcon from "../../assets/agents/grok.svg";
import qwenIcon from "../../assets/agents/qwen-color.svg";
import kimiIcon from "../../assets/agents/kimi-color.svg";
import { cn } from "../../lib/cn";

/** Brand marks we already ship; `mono` ones are single-colour and get inverted on dark themes. */
const ICONS: Record<string, { src: string; mono?: boolean }> = {
  anthropic: { src: claudeIcon },
  openai: { src: codexIcon },
  google: { src: geminiIcon },
  "x-ai": { src: grokIcon, mono: true },
  qwen: { src: qwenIcon },
  moonshotai: { src: kimiIcon },
};

/** Lab logo for a model id ("openai/gpt-6"), or a monogram for labs without a shipped icon. */
export function LabIcon({ id, lab, size = 18 }: { id: string; lab: string; size?: number }) {
  const icon = ICONS[id.split("/")[0] ?? ""];
  if (icon) return <img src={icon.src} alt="" draggable={false} className={cn("shrink-0", icon.mono && "mono-icon")} style={{ width: size, height: size }} />;
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-md bg-surface-2 font-mono font-semibold uppercase text-fg-2"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {lab.charAt(0)}
    </span>
  );
}
