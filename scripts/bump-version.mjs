#!/usr/bin/env node
// Sets the app version everywhere it lives (package.json, tauri.conf.json, Cargo.toml).
// Usage: npm run release:version 0.2.0   (then commit, tag v0.2.0 and push the tag)
import { readFileSync, writeFileSync } from "node:fs";

const v = process.argv[2];
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(v ?? "")) {
  console.error("Usage: npm run release:version X.Y.Z");
  process.exit(1);
}
const at = (p) => new URL(`../${p}`, import.meta.url);
const json = (p, f) => {
  const o = JSON.parse(readFileSync(at(p), "utf8"));
  f(o);
  writeFileSync(at(p), JSON.stringify(o, null, 2) + "\n");
};
json("package.json", (o) => (o.version = v));
json("src-tauri/tauri.conf.json", (o) => (o.version = v));
const cargo = readFileSync(at("src-tauri/Cargo.toml"), "utf8").replace(/^version = ".*"$/m, `version = "${v}"`);
writeFileSync(at("src-tauri/Cargo.toml"), cargo);
console.log(`Version set to ${v}. Next: git commit -am "release: v${v}" && git tag v${v} && git push --follow-tags`);
