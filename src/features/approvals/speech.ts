import type { DetectedPrompt, PromptOption } from "./detectPrompt";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w\s]/g, " ").trim();

/**
 * Maps a spoken reply to a prompt option ("sí", "no", "siempre", "dos"…).
 * Returns null when the phrase isn't a recognisable answer, so it is typed as text instead.
 */
export function optionFromSpeech(text: string, prompt: DetectedPrompt): PromptOption | null {
  const t = norm(text);
  const byKind = (k: PromptOption["kind"]) => prompt.options.find((o) => o.kind === k);
  const numbers: Record<string, string> = { uno: "1", one: "1", dos: "2", two: "2", tres: "3", three: "3", cuatro: "4", four: "4" };
  const first = t.split(/\s+/)[0] ?? "";
  const digit = /^\d$/.test(first) ? first : numbers[first] ?? (/^opcion (\w+)/.exec(t)?.[1] && numbers[/^opcion (\w+)/.exec(t)![1]!]);
  if (digit) return prompt.options.find((o) => o.keys.startsWith(digit)) ?? null;
  if (/(siempre|always|no (me )?(vuelvas a )?pregunt|dont ask|don t ask|todas)/.test(t)) return byKind("always") ?? byKind("approve") ?? null;
  if (/^(no|nope|deny|rechaza|rechazar|cancela|cancelar|para|deten)\b/.test(t)) return byKind("deny") ?? null;
  if (/^(si|yes|yeah|vale|ok|okay|dale|aprueba|apruebo|aprobar|adelante|acepta|acepto|hazlo|go|proceed|claro)\b/.test(t)) return byKind("approve") ?? null;
  return null;
}
