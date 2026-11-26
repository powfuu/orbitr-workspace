import assert from "node:assert";
import { test } from "node:test";
import { lineDiff } from "./lineDiff.ts";

test("marks removed, added and unchanged lines", () => {
  const d = lineDiff("a\nb\nc", "a\nB\nc\nd");
  assert.deepEqual(d.map((l) => `${l.kind[0]}${l.text}`), ["sa", "db", "aB", "sc", "ad"]);
});

test("new file is all additions", () => {
  assert.deepEqual(lineDiff("", "x\ny").map((l) => l.kind), ["add", "add"]);
});
