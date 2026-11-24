/**
 * Finds an approval/confirmation prompt on a terminal screen (plain text lines,
 * bottom of the viewport). Works from what is visibly rendered, so it handles any
 * TUI: Claude Code / Codex numbered menus and classic (y/n) prompts.
 */
export interface PromptOption {
  /** Keys to send to choose this option. */
  keys: string;
  label: string;
  kind: "approve" | "always" | "deny" | "other";
}

export interface DetectedPrompt {
  question: string;
  /** Lines just above the question (the command/file being approved). */
  context: string[];
  options: PromptOption[];
  /** Stable identity so the same on-screen prompt isn't re-announced. */
  signature: string;
}

const QUESTION = /(do you want to|would you like to|allow (this|command|the)|approve|proceed\?|permission|are you sure|continue\?|confirm)/i;
const NUMBERED = /^\s*(?:[❯›>▶]\s*)?(\d)[.)]\s+(.+?)\s*$/;
const YES_NO = /[([]\s*(y(?:es)?)\s*\/\s*(n(?:o)?)\s*[)\]]\s*[:?]?\s*$/i;
const BOX = /^[\s│|┃╭╮╰╯─━┌┐└┘]+|[\s│|┃╭╮╰╯─━┌┐└┘]+$/g;

function classify(label: string): PromptOption["kind"] {
  const l = label.toLowerCase();
  if (/^no\b|deny|reject|cancel|don't allow|tell .* (what to do|differently)/.test(l)) return "deny";
  if (/(don't|do not) ask again|always|for this session|all edits|allow all/.test(l)) return "always";
  if (/^yes\b|^allow\b|^approve|^proceed|^run\b|^ok\b|^accept/.test(l)) return "approve";
  return "other";
}

const clean = (s: string) => s.replace(BOX, "").trimEnd();

export function detectPrompt(screen: string[]): DetectedPrompt | null {
  const lines = screen.map(clean);
  // Trim trailing empty rows.
  let end = lines.length;
  while (end > 0 && !lines[end - 1]!.trim()) end--;
  const tail = lines.slice(Math.max(0, end - 24), end);

  // 1) Numbered menu with a question just above it.
  const optionIdx = tail.map((l, i) => (NUMBERED.test(l) ? i : -1)).filter((i) => i >= 0);
  if (optionIdx.length >= 2) {
    const first = optionIdx[0]!;
    // Options must be (nearly) contiguous and end near the bottom of the screen.
    const last = optionIdx[optionIdx.length - 1]!;
    if (last - first <= optionIdx.length + 2 && tail.length - last <= 6) {
      const qIdx = [...tail.slice(0, first).keys()].reverse().find((i) => QUESTION.test(tail[i]!));
      if (qIdx !== undefined && first - qIdx <= 3) {
        const options = optionIdx.map((i) => {
          const [, n, label] = tail[i]!.match(NUMBERED)!;
          return { keys: n!, label: label!.replace(/\s*\(esc\)\s*$/i, "").trim(), kind: classify(label!) };
        });
        const context = tail.slice(Math.max(0, qIdx - 6), qIdx).map((l) => l.trim()).filter(Boolean);
        const question = tail[qIdx]!.trim();
        return { question, context, options, signature: question + "|" + context.join("|") + "|" + options.map((o) => o.label).join("|") };
      }
    }
  }

  // 2) Classic "(y/n)" / "[Y/n]" on the last non-empty line.
  const lastLine = tail[tail.length - 1]?.trim() ?? "";
  if (YES_NO.test(lastLine)) {
    const context = tail.slice(-5, -1).map((l) => l.trim()).filter(Boolean);
    return {
      question: lastLine,
      context,
      options: [
        { keys: "y\r", label: "Yes", kind: "approve" },
        { keys: "n\r", label: "No", kind: "deny" },
      ],
      signature: lastLine + "|" + context.join("|"),
    };
  }
  return null;
}
