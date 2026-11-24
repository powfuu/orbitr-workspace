import { resolveVoiceTarget } from "../voice/voiceStore";
import { sendText } from "../sessions/ptySession";
import { logEvent } from "../timeline/eventLog";
import { toast } from "../../stores/toastStore";
import { fill } from "./template";
import type { Snippet } from "./snippetStore";

/** Types a snippet (variables filled) into the focused agent/terminal; Enter if the snippet says so. */
export async function sendSnippet(snippet: Snippet, values: Record<string, string> = {}) {
  const target = resolveVoiceTarget();
  if (!target) return toast({ kind: "info", title: "No agent or terminal to send to", detail: "Click into one first, then use the snippet." });
  const text = fill(snippet.text, values);
  logEvent(target.id, "voice", `${snippet.name}: ${text}`);
  const ok = await sendText(target.id, text, snippet.submit);
  if (ok) toast({ kind: "success", title: `Sent “${snippet.name}”`, detail: `→ ${target.name}` });
  else toast({ kind: "error", title: `${target.name} is not running` });
}
