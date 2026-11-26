import anthropic from "../../assets/labs/anthropic.svg";
import openai from "../../assets/labs/openai.svg";
import gemini from "../../assets/labs/gemini-color.svg";
import xai from "../../assets/labs/xai.svg";
import deepseek from "../../assets/labs/deepseek-color.svg";
import zai from "../../assets/labs/zai.svg";
import minimax from "../../assets/labs/minimax-color.svg";
import moonshot from "../../assets/labs/moonshot.svg";
import meta from "../../assets/labs/meta-color.svg";
import hunyuan from "../../assets/labs/hunyuan-color.svg";
import xiaomi from "../../assets/labs/xiaomimimo.svg";
import mistral from "../../assets/labs/mistral-color.svg";
import qwen from "../../assets/labs/qwen-color.svg";
import baidu from "../../assets/labs/baidu-color.svg";
import nvidia from "../../assets/labs/nvidia-color.svg";
import stepfun from "../../assets/labs/stepfun-color.svg";
import upstage from "../../assets/labs/upstage-color.svg";
import { cn } from "../../lib/cn";

/** Official lab logos (lobe-icons, MIT). `mono` ones are single-colour and get inverted on dark themes. */
const ICONS: Record<string, { src: string; mono?: boolean }> = {
  anthropic: { src: anthropic, mono: true },
  openai: { src: openai, mono: true },
  google: { src: gemini },
  "x-ai": { src: xai, mono: true },
  deepseek: { src: deepseek },
  "z-ai": { src: zai, mono: true },
  minimax: { src: minimax },
  moonshotai: { src: moonshot, mono: true },
  "meta-llama": { src: meta },
  meta: { src: meta },
  tencent: { src: hunyuan },
  xiaomi: { src: xiaomi, mono: true },
  mistralai: { src: mistral },
  qwen: { src: qwen },
  baidu: { src: baidu },
  nvidia: { src: nvidia },
  stepfun: { src: stepfun },
  upstage: { src: upstage },
};

/** Lab logo for a model id ("openai/gpt-6"), or a monogram for labs without a logo. */
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
