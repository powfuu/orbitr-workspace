#!/usr/bin/env node
// Points the in-app updater at a GitHub repository's releases.
// Usage: npm run set-release-repo owner/name
import { readFileSync, writeFileSync } from "node:fs";

const repo = process.argv[2];
if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? "")) {
  console.error("Usage: npm run set-release-repo owner/name");
  process.exit(1);
}
const file = new URL("../src-tauri/tauri.conf.json", import.meta.url);
const conf = JSON.parse(readFileSync(file, "utf8"));
conf.plugins.updater.endpoints = [`https://github.com/${repo}/releases/latest/download/latest.json`];
writeFileSync(file, JSON.stringify(conf, null, 2) + "\n");
console.log(`Updater now checks ${conf.plugins.updater.endpoints[0]}`);
