import assert from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseLimits, shortLabel } from "./parseLimits.ts";

test("parses plan limits from a real /usage screen", () => {
  const screen = readFileSync(new URL("./fixtures-usage.txt", import.meta.url), "utf8").split("\n");
  const limits = parseLimits(screen);
  assert.deepEqual(limits.map((l) => [l.label, l.percent]), [["Current session", 93], ["Current week (all models)", 55]]);
  assert.equal(limits[0]!.resets, "12:09am (Europe/Madrid)");
  assert.equal(limits[1]!.resets, "Nov 25 at 5:59pm (Europe/Madrid)");
  assert.equal(shortLabel(limits[0]!.label), "5-hour session");
  assert.equal(shortLabel(limits[1]!.label), "Week · all models");
  assert.equal(shortLabel("Current week (Opus)"), "Week · Opus");
});

test("ignores screens without limits", () => {
  assert.deepEqual(parseLimits(["Total cost: $0", "Usage: 0 input"]), []);
});
