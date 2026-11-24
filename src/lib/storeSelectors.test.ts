import assert from "node:assert";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

/**
 * A Zustand selector that builds a new array/object on every call (filter, map,
 * Object.values…) makes React re-render forever and crash ("getSnapshot should be
 * cached"). Select the stable slice, derive outside the hook. This bit us twice.
 */
const SELECTOR = /use[A-Z][A-Za-z]*\(\(\w+\) => [^)]*(Object\.(values|keys|entries)\(|\.filter\(|\.map\(|\[\.\.\.)/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !f.endsWith(".test.ts") ? [p] : [];
  });
}

test("no store selector returns a freshly built collection", () => {
  const root = new URL("..", import.meta.url).pathname;
  const offenders = files(root).flatMap((f) =>
    readFileSync(f, "utf8")
      .split("\n")
      .map((line, i) => ({ f, i: i + 1, line }))
      .filter(({ line }) => SELECTOR.test(line) && !line.includes(".length")),
  );
  assert.deepEqual(offenders.map((o) => `${o.f.slice(root.length)}:${o.i}`), []);
});
