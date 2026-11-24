import { detectPrompt } from "./detectPrompt.ts";
import assert from "node:assert";
import { test } from "node:test";

const claude = [
  "╭──────────────────────────────────────────────╮",
  "│ Bash command                                  │",
  "│                                               │",
  "│   rm -rf node_modules && npm install          │",
  "│   Reinstall dependencies                      │",
  "│                                               │",
  "│ Do you want to proceed?                       │",
  "│ ❯ 1. Yes                                      │",
  "│   2. Yes, and don't ask again for npm commands in /app │",
  "│   3. No, and tell Claude what to do differently (esc) │",
  "╰──────────────────────────────────────────────╯",
  "", "",
];

test("detects approval prompts", () => {

const p = detectPrompt(claude)!;
  assert.ok(p, "claude prompt");
assert.equal(p.question, "Do you want to proceed?");
assert.deepEqual(p.options.map((o) => [o.keys, o.kind]), [["1", "approve"], ["2", "always"], ["3", "deny"]]);
assert.ok(p.context.includes("rm -rf node_modules && npm install"));

const yn = ["Overwrite package.json? (y/n)"];
assert.deepEqual(detectPrompt(yn)!.options.map((o) => o.keys), ["y\r", "n\r"]);
assert.ok(detectPrompt(["The installer asks [Y/n]"]));

// Normal numbered output (no question) must not trigger.
assert.equal(detectPrompt(["Steps:", "1. install", "2. build", "3. test", "$ "]), null);
// A question far above an unrelated list must not trigger.
assert.equal(detectPrompt(["Do you want to proceed?", "", "", "", "", "1. a", "2. b"]), null);
assert.equal(detectPrompt(["❯ ls", "file.txt"]), null);
});

import { optionFromSpeech } from "./speech.ts";

test("maps spoken replies to options", () => {
  const p = detectPrompt(claude)!;
  assert.equal(optionFromSpeech("sí", p)?.keys, "1");
  assert.equal(optionFromSpeech("vale, hazlo", p)?.keys, "1");
  assert.equal(optionFromSpeech("sí, y no me preguntes más", p)?.keys, "2");
  assert.equal(optionFromSpeech("siempre", p)?.keys, "2");
  assert.equal(optionFromSpeech("no", p)?.keys, "3");
  assert.equal(optionFromSpeech("dos", p)?.keys, "2");
  assert.equal(optionFromSpeech("revisa el archivo primero", p), null);
});
