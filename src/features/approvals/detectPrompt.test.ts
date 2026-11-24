import assert from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { detectPrompt } from "./detectPrompt.ts";
import { optionFromSpeech } from "./speech.ts";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}.txt`, import.meta.url), "utf8").split("\n");

const claudePermission = [
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
  "",
  "",
];

test("permission menu", () => {
  const p = detectPrompt(claudePermission)!;
  assert.equal(p.kind, "approval");
  assert.equal(p.question, "Do you want to proceed?");
  assert.deepEqual(p.options.map((o) => [o.keys, o.kind]), [["1", "approve"], ["2", "always"], ["3", "deny"]]);
  assert.ok(p.context.includes("rm -rf node_modules && npm install"));
});

test("real Claude Code question menu (AskUserQuestion)", () => {
  const p = detectPrompt(fixture("claude-ask-menu"))!;
  assert.equal(p.kind, "choice");
  assert.equal(p.question, "¿Prefieres azul o verde?");
  assert.deepEqual(p.options.slice(0, 2).map((o) => [o.keys, o.label]), [["1", "Azul"], ["2", "Verde"]]);
});

test("real Claude Code plain question at end of turn", () => {
  const p = detectPrompt(fixture("claude-question"))!;
  assert.equal(p.kind, "question");
  assert.match(p.question, /opción 2 Verde esmeralda\?$/);
  assert.deepEqual(p.options.map((o) => o.keys), ["1\r", "2\r"]);
  assert.match(p.options[0]!.label, /Azul cobalto/);
});

test("answered / idle screens are not prompts", () => {
  assert.equal(detectPrompt(fixture("claude-answered")), null);
});

test("y/n prompts", () => {
  assert.deepEqual(detectPrompt(["Overwrite package.json? (y/n)"])!.options.map((o) => o.keys), ["y\r", "n\r"]);
  assert.ok(detectPrompt(["The installer asks [Y/n]"]));
});

test("plain output is not a prompt", () => {
  assert.equal(detectPrompt(["Steps:", "1. install", "2. build", "3. test", "$ "]), null);
  assert.equal(detectPrompt(["Do you want to proceed?", "", "", "", "", "", "", "", "", "", "1. a", "2. b"]), null);
  assert.equal(detectPrompt(["❯ ls", "file.txt"]), null);
});

test("maps spoken replies to options", () => {
  const p = detectPrompt(claudePermission)!;
  assert.equal(optionFromSpeech("sí", p)?.keys, "1");
  assert.equal(optionFromSpeech("vale, hazlo", p)?.keys, "1");
  assert.equal(optionFromSpeech("sí, y no me preguntes más", p)?.keys, "2");
  assert.equal(optionFromSpeech("no", p)?.keys, "3");
  assert.equal(optionFromSpeech("dos", p)?.keys, "2");
  assert.equal(optionFromSpeech("revisa el archivo primero", p), null);
  const menu = detectPrompt(fixture("claude-ask-menu"))!;
  assert.equal(optionFromSpeech("dos", menu)?.keys, "2");
});
