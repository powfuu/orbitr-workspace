import { invoke } from "@tauri-apps/api/core";
import { isMajorLab, parseModels, type ModelInfo } from "./modelsParse";

export type ModelView = "trending" | "newest";
const KEY = "orbitr.models";
const TTL = 6 * 3600_000;

/** Popular models from OpenRouter's public catalog (no key): weekly usage ranking or newest. Cached 6 h. */
export async function popularModels(view: ModelView, force = false): Promise<{ models: ModelInfo[]; at: number }> {
  let cache: Record<string, { models: ModelInfo[]; at: number }> = {};
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    /* fresh */
  }
  const hit = cache[view];
  if (!force && hit && Date.now() - hit.at < TTL) return hit;
  const sort = view === "trending" ? "top-weekly" : "newest";
  const all = parseModels(await invoke<string>("agent_news_fetch", { url: `https://openrouter.ai/api/v1/models?sort=${sort}` }));
  const models = (view === "trending" ? all : all.filter((m) => isMajorLab(m.id))).slice(0, 12);
  const entry = { models, at: Date.now() };
  cache[view] = entry;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* non-fatal */
  }
  return entry;
}
