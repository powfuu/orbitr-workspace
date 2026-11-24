import assert from "node:assert";
import { test } from "node:test";
import { fill, matchSpoken, variablesOf } from "./template.ts";

test("snippet variables", () => {
  assert.deepEqual(variablesOf("Review {{file}} for {{ focus }} and {{file}}"), ["file", "focus"]);
  assert.equal(fill("Fix {{file}} ({{missing}})", { file: "a.ts" }), "Fix a.ts ({{missing}})");
});

test("voice triggers", () => {
  const s = [{ name: "Revisa tests" }, { name: "Commit convencional" }];
  assert.equal(matchSpoken("snippet revisa tests", s)?.name, "Revisa tests");
  assert.equal(matchSpoken("Revisa tests", s)?.name, "Revisa tests");
  assert.equal(matchSpoken("usa commit", s)?.name, "Commit convencional");
  assert.equal(matchSpoken("revisa los tests del login", s), null, "ordinary dictation is not a trigger");
});
