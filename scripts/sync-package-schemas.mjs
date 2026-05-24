#!/usr/bin/env node

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "schema");
const targetDir = path.join(rootDir, "packages", "world", "schema");
const checkOnly = process.argv.includes("--check");

mkdirSync(targetDir, { recursive: true });

const schemaFiles = readdirSync(sourceDir)
  .filter((entry) => statSync(path.join(sourceDir, entry)).isFile())
  .filter((entry) => entry.endsWith(".json"))
  .sort();

const driftedFiles = [];

for (const filename of schemaFiles) {
  const sourcePath = path.join(sourceDir, filename);
  const targetPath = path.join(targetDir, filename);
  const sourceContent = readFileSync(sourcePath, "utf8");
  let targetContent = "";

  try {
    targetContent = readFileSync(targetPath, "utf8");
  } catch {
    targetContent = "";
  }

  if (targetContent === sourceContent) {
    continue;
  }

  if (checkOnly) {
    driftedFiles.push(filename);
    continue;
  }

  writeFileSync(targetPath, sourceContent, "utf8");
  console.log(`Synced schema ${filename}`);
}

if (checkOnly && driftedFiles.length > 0) {
  console.error("Package schemas are out of sync:");
  for (const filename of driftedFiles) {
    console.error(`- ${filename}`);
  }
  process.exit(1);
}

if (checkOnly) {
  console.log("Package schemas are in sync.");
}
