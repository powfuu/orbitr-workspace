/** OpenRouter catalog → the few fields we show. Pure, so it's testable. */
export interface ModelInfo {
  id: string;
  name: string;
  lab: string;
  created: number;
  context: number;
  /** USD per 1M tokens. */
  priceIn: number | null;
  priceOut: number | null;
  blurb: string;
}

export const MAJOR_LABS = ["anthropic", "openai", "google", "x-ai", "meta-llama", "mistralai", "deepseek", "qwen", "moonshotai", "z-ai"];

const LAB_NAMES: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  "x-ai": "xAI",
  "meta-llama": "Meta",
  mistralai: "Mistral",
  deepseek: "DeepSeek",
  qwen: "Qwen",
  moonshotai: "Moonshot",
  "z-ai": "Z.ai",
  meta: "Meta",
  minimax: "MiniMax",
  nvidia: "NVIDIA",
  stepfun: "StepFun",
};

interface Raw {
  id: string;
  name?: string;
  created?: number;
  context_length?: number;
  description?: string;
  pricing?: { prompt?: string; completion?: string };
}

const perM = (p?: string) => {
  const n = Number(p);
  return p === undefined || Number.isNaN(n) || n < 0 ? null : n * 1e6;
};

export function parseModels(json: string): ModelInfo[] {
  const data = (JSON.parse(json) as { data?: Raw[] }).data ?? [];
  return data
    // Skip aliases, ":free" twins and "(batch)" duplicates of the same model.
    .filter((m) => !m.id.startsWith("~") && !m.id.endsWith(":free") && !/\(batch\)/i.test(m.name ?? ""))
    .map((m) => {
      const lab = m.id.split("/")[0] ?? "";
      return {
        id: m.id,
        name: (m.name ?? m.id).replace(/^[^:]+:\s*/, ""),
        lab: LAB_NAMES[lab] ?? lab.charAt(0).toUpperCase() + lab.slice(1),
        created: (m.created ?? 0) * 1000,
        context: m.context_length ?? 0,
        priceIn: perM(m.pricing?.prompt),
        priceOut: perM(m.pricing?.completion),
        blurb: (m.description ?? "").split(/(?<=\.)\s/)[0]?.slice(0, 160) ?? "",
      };
    });
}

export const isMajorLab = (id: string) => MAJOR_LABS.includes(id.split("/")[0] ?? "");

export function formatContext(n: number) {
  return n >= 1_000_000 ? `${Math.round(n / 100_000) / 10}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);
}

export function formatPrice(n: number | null) {
  if (n === null) return "—";
  if (n === 0) return "free";
  return n < 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(n < 10 ? 1 : 0)}`;
}
