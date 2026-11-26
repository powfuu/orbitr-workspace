import assert from "node:assert";
import { test } from "node:test";
import { isNewer, MODEL_RE, parseChangelog, parseGithubRelease } from "./newsParse.ts";

test("changelog: newest section only, markdown cleaned", () => {
  const md = "# Changelog\n\n## 2.1.332\n\n- Added **Opus 4.8** support\n- Fixed [a bug](http://x)\n\n## 2.1.331\n\n- old\n";
  const r = parseChangelog(md);
  assert.equal(r.version, "2.1.332");
  assert.deepEqual(r.highlights, ["Added Opus 4.8 support", "Fixed a bug"]);
});

test("github release", () => {
  const r = parseGithubRelease(JSON.stringify({ tag_name: "rust-v0.174.0", published_at: "2026-11-20T10:00:00Z", body: "## New\n* Use gpt-6 by default\n* faster" }));
  assert.equal(r.version, "0.174.0");
  assert.equal(r.date, "2026-11-20");
  assert.deepEqual(r.highlights, ["Use gpt-6 by default", "faster"]);
  assert.ok(MODEL_RE.test(r.highlights[0]!));
});

test("version compare", () => {
  assert.ok(isNewer("2.1.332", "2.1.162"));
  assert.ok(!isNewer("1.0.0", "1.0.0"));
  assert.ok(isNewer("0.10.0", "0.9.9"));
});
