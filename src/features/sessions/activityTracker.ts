import type { Terminal, IDisposable } from "@xterm/xterm";
import { useActivity } from "./activityStore";
import { logEvent } from "../timeline/eventLog";
import { detectPrompt } from "../approvals/detectPrompt";
import { notify } from "../../services/notify";
import { useSessions } from "../../stores/sessionStore";

const nameOf = (id: ID) => {
  const { agents, terminals } = useSessions.getState();
  return [...agents, ...terminals].find((s) => s.id === id)?.name ?? "Orbitr";
};
import type { ID } from "../../types";

const IDLE_AFTER_MS = 1500;
/** Output this soon after a keystroke is treated as echo, not work. */
const ECHO_WINDOW_MS = 250;

/**
 * Watches one session's PTY traffic and keeps its activity record current.
 * Returns hooks for the PTY layer plus disposables for xterm listeners.
 */
export function trackActivity(id: ID, term: Terminal, isFocused: () => boolean) {
  const { patch } = useActivity.getState();
  let lastInput = 0;
  let idleTimer = 0;
  let draft = 0;
  let workingSince = 0;
  let scanTimer = 0;
  let lastSignature = "";

  // Read the visible screen and look for an approval prompt (see detectPrompt).
  const scan = () => {
    const buf = term.buffer.active;
    const rows: string[] = [];
    for (let y = buf.baseY; y < buf.baseY + term.rows; y++) rows.push(buf.getLine(y)?.translateToString(true) ?? "");
    const found = detectPrompt(rows);
    // A trailing "?" only means "waiting for you" once the agent has stopped writing.
    const prompt = found?.kind === "question" && workingSince ? null : found;
    patch(id, { prompt: prompt ?? undefined });
    if (prompt && prompt.signature !== lastSignature) {
      logEvent(id, "waiting", `${{ approval: "Asked for approval", choice: "Asked you to choose", question: "Asked you" }[prompt.kind]}: ${prompt.question}`);
      if (!isFocused()) patch(id, { attention: true });
      const what = { approval: "needs approval", choice: "asks you to choose", question: "is waiting for your answer" }[prompt.kind];
      void notify(`${nameOf(id)} ${what}`, prompt.context[0] && prompt.kind === "approval" ? `${prompt.question} — ${prompt.context[0]}` : prompt.question);
    }
    lastSignature = prompt?.signature ?? "";
  };

  const goIdle = () => {
    const finishedWork = workingSince && Date.now() - workingSince > 2000;
    workingSince = 0;
    patch(id, { phase: "idle", since: Date.now(), ...(finishedWork && !isFocused() ? { unread: true } : {}) });
    scan();
    if (finishedWork && !isFocused()) void notify(nameOf(id), "Finished — waiting for your input");
  };

  const needsYou = (message?: string) => {
    if (isFocused()) return false;
    patch(id, { attention: true });
    void notify(nameOf(id), message || "Needs your attention");
    return false;
  };
  const disposables: IDisposable[] = [
    term.onTitleChange((title) => patch(id, { title: title.trim() || undefined })),
    term.onBell(() => needsYou()),
    // OSC 9 (iTerm/Windows Terminal) and OSC 777;notify;title;body desktop notifications.
    term.parser.registerOscHandler(9, (data) => needsYou(data)),
    term.parser.registerOscHandler(777, (data) => needsYou(data.split(";").slice(2).join(";"))),
  ];

  return {
    disposables,
    onOutput() {
      const now = Date.now();
      window.clearTimeout(scanTimer);
      scanTimer = window.setTimeout(scan, 200);
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(goIdle, IDLE_AFTER_MS);
      if (now - lastInput < ECHO_WINDOW_MS) return;
      if (!workingSince) {
        workingSince = now;
        patch(id, { phase: "working", since: now });
      }
    },
    onInput(data: string) {
      lastInput = Date.now();
      // Approximate the unsent line from keystrokes. Escape sequences (arrows…) are ignored.
      if (data.startsWith("\x1b")) return;
      for (const ch of data) {
        if (ch === "\r" || ch === "\n" || ch === "\x03" || ch === "\x15") draft = 0;
        else if (ch === "\x7f" || ch === "\b") draft = Math.max(0, draft - 1);
        else if (ch === "\x17") draft = 0; // ^W: word delete, approximate
        else if (ch >= " ") draft++;
      }
      patch(id, { draft, attention: false });
    },
    dispose() {
      window.clearTimeout(idleTimer);
      window.clearTimeout(scanTimer);
      patch(id, { prompt: undefined });
      disposables.forEach((d) => d.dispose());
    },
  };
}
