/**
 * Finds what an agent is waiting on by reading its visible screen (plain text rows).
 * Works for any TUI. Formats verified against real Claude Code captures (see fixtures/):
 * - approval: permission menus ("Do you want to proceed?" + numbered Yes/No) and (y/n) prompts
 * - choice:   interactive question menus (numbered options + "Enter to select")
 * - question: the agent finished its turn with a question and the input box is empty-ish
 */
export interface PromptOption {
  /** Keys to send to choose this option. */
  keys: string;
  label: string;
  kind: "approve" | "always" | "deny" | "other";
}

export type PromptKind = "approval" | "choice" | "question";

export interface DetectedPrompt {
  kind: PromptKind;
  question: string;
  /** Lines just above the question (the command/file being approved). */
  context: string[];
  options: PromptOption[];
  /** Stable identity so the same on-screen prompt isn't re-announced. */
  signature: string;
}

const APPROVAL = /(do you want to (proceed|make|create|run|allow|edit|delete|write|apply)|allow (this|command|the)|approve|permission|are you sure|proceed\?)/i;
const NUMBERED = /^\s*(?:[❯›>▶]\s*)?(\d)[.)]\s+(.+?)\s*$/;
const CURSOR = /^\s*[❯›▶]\s*\d[.)]\s/;
const MENU_FOOTER = /(enter to (select|confirm)|to navigate|esc to cancel)/i;
const YES_NO = /[([]\s*(y(?:es)?)\s*\/\s*(n(?:o)?)\s*[)\]]\s*[:?]?\s*$/i;
const RULE = /^[\s─━-]{20,}$/;
const BOX = /^[\s│|┃╭╮╰╯─━┌┐└┘]+|[\s│|┃╭╮╰╯─━┌┐└┘]+$/g;
const MESSAGE = /^\s*⏺\s?/;

function classify(label: string): PromptOption["kind"] {
  const l = label.toLowerCase();
  if (/^no\b|deny|reject|cancel|don't allow|tell .* (what to do|differently)/.test(l)) return "deny";
  if (/(don't|do not) ask again|always|for this session|all edits|allow all/.test(l)) return "always";
  if (/^yes\b|^allow\b|^approve|^proceed|^run\b|^ok\b|^accept/.test(l)) return "approve";
  return "other";
}

// Horizontal rules delimit input boxes: keep them (as a canonical rule) instead of stripping them as box chars.
const clean = (s: string) => (RULE.test(s) ? "─".repeat(20) : s.replace(BOX, "").trimEnd());
const sig = (...parts: (string | string[])[]) => parts.flat().join("|");

/** Interactive or permission menus: numbered options, possibly with description lines between them. */
function detectMenu(tail: string[]): DetectedPrompt | null {
  const optionIdx = tail.map((l, i) => (NUMBERED.test(l) ? i : -1)).filter((i) => i >= 0);
  if (optionIdx.length < 2) return null;
  const first = optionIdx[0]!;
  const last = optionIdx[optionIdx.length - 1]!;
  if (tail.length - last > 8) return null; // the menu must sit at the bottom of the screen
  const interactive = tail.some((l) => CURSOR.test(l)) || tail.slice(last).some((l) => MENU_FOOTER.test(l));

  // Question: nearest line above the first option that asks something.
  let qIdx: number | undefined;
  for (let i = first - 1; i >= Math.max(0, first - 8); i--) {
    const t = tail[i]!.trim();
    if (!t) continue;
    if (APPROVAL.test(t) || t.endsWith("?")) {
      qIdx = i;
      break;
    }
  }
  if (qIdx === undefined && !interactive) return null;
  const question = qIdx !== undefined ? tail[qIdx]!.trim() : "Choose an option";
  if (!interactive && !APPROVAL.test(question)) return null; // a plain numbered list in output isn't a prompt

  const options = optionIdx.map((i) => {
    const [, n, label] = tail[i]!.match(NUMBERED)!;
    return { keys: n!, label: label!.replace(/\s*\(esc\)\s*$/i, "").trim(), kind: classify(label!) };
  });
  const kind: PromptKind = APPROVAL.test(question) ? "approval" : "choice";
  const context = qIdx !== undefined ? tail.slice(Math.max(0, qIdx - 6), qIdx).map((l) => l.trim()).filter((l) => l && !RULE.test(l)) : [];
  return { kind, question, context, options, signature: sig(kind, question, context, options.map((o) => o.label)) };
}

/**
 * The agent's last message ends with a question and its input box is waiting.
 * Offers "opción N"/"option N" mentioned in the text as quick replies.
 */
function detectQuestion(tail: string[]): DetectedPrompt | null {
  // Input box: a rule line followed by a "❯" prompt row, near the bottom.
  const inputIdx = tail.findLastIndex((l, i) => i > 0 && /^\s*❯/.test(l) && RULE.test(tail[i - 1]!));
  if (inputIdx < 0) return null;
  const msgStart = tail.slice(0, inputIdx).findLastIndex((l) => MESSAGE.test(l));
  if (msgStart < 0) return null;
  const body = tail
    .slice(msgStart, inputIdx - 1)
    .map((l) => l.replace(MESSAGE, "").trim())
    .filter((l) => l && !/^[✻✽✢·*]\s/.test(l) && !RULE.test(l));
  const text = body.join(" ");
  const lastSentence = text.split(/(?<=[.!])\s+/).pop()?.trim() ?? "";
  if (!lastSentence.endsWith("?")) return null;

  const options: PromptOption[] = [];
  const re = /(?:opci[oó]n|option)\s*(\d)\s*[:\-–]?\s*([^,;?¿]+?)(?=\s+(?:o|or|y|and)\s+(?:la\s+|the\s+)?(?:opci[oó]n|option)|[,;?]|$)/gi;
  for (const m of text.matchAll(re)) {
    if (!options.some((o) => o.keys === `${m[1]}\r`)) options.push({ keys: `${m[1]}\r`, label: `${m[1]} · ${m[2]!.trim()}`, kind: "other" });
  }
  for (const [, n, label] of body.map((l) => l.match(NUMBERED)).filter(Boolean) as RegExpMatchArray[]) {
    if (!options.some((o) => o.keys === `${n}\r`)) options.push({ keys: `${n}\r`, label: `${n} · ${label}`, kind: "other" });
  }
  return { kind: "question", question: lastSentence, context: body.slice(0, -1).slice(-3), options, signature: sig("q", text) };
}

export function detectPrompt(screen: string[]): DetectedPrompt | null {
  const lines = screen.map(clean);
  let end = lines.length;
  while (end > 0 && !lines[end - 1]!.trim()) end--;
  const tail = lines.slice(Math.max(0, end - 30), end);

  const menu = detectMenu(tail);
  if (menu) return menu;

  const lastLine = tail[tail.length - 1]?.trim() ?? "";
  if (YES_NO.test(lastLine)) {
    const context = tail.slice(-5, -1).map((l) => l.trim()).filter(Boolean);
    return {
      kind: "approval",
      question: lastLine,
      context,
      options: [
        { keys: "y\r", label: "Yes", kind: "approve" },
        { keys: "n\r", label: "No", kind: "deny" },
      ],
      signature: sig("yn", lastLine, context),
    };
  }
  return detectQuestion(tail);
}
