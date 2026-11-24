import assert from "node:assert";
import { test } from "node:test";
import { fuzzyFilter, fuzzyScore } from "./fuzzy.ts";

const files = [
  "src/components/agents/AgentView.tsx",
  "src/features/agents/agentActions.ts",
  "src/components/git/GitPanel.tsx",
  "README.md",
  "src-tauri/src/agents/usage.rs",
];

test("fuzzy quick-open ranking", () => {
  assert.equal(fuzzyScore("README.md", "xyz"), null);
  assert.equal(fuzzyFilter(files, "agview")[0], "src/components/agents/AgentView.tsx");
  assert.equal(fuzzyFilter(files, "gitpanel")[0], "src/components/git/GitPanel.tsx");
  assert.equal(fuzzyFilter(files, "usage")[0], "src-tauri/src/agents/usage.rs");
  assert.equal(fuzzyFilter(files, "readme")[0], "README.md");
  assert.equal(fuzzyFilter(files, "").length, files.length);
});
