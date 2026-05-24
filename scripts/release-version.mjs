#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const rootDir = process.cwd();
const packageFiles = [
  resolve(rootDir, "package.json"),
  resolve(rootDir, "packages/world/package.json"),
  resolve(rootDir, "packages/llm-runner/package.json")
];

const bumpType = process.argv[2];
if (!["major", "minor", "patch"].includes(bumpType)) {
  console.error('Usage: npm run release:version -- <major|minor|patch>');
  process.exit(1);
}

const rootPackage = JSON.parse(await readFile(packageFiles[0], "utf8"));
const nextVersion = bumpVersion(rootPackage.version, bumpType);

for (const packageFile of packageFiles) {
  const pkg = JSON.parse(await readFile(packageFile, "utf8"));
  pkg.version = nextVersion;

  if (pkg.dependencies?.["@worlddesc/world"]) {
    pkg.dependencies["@worlddesc/world"] = nextVersion;
  }

  await writeFile(packageFile, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  console.log(`Updated ${packageFile} -> ${nextVersion}`);
}

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split(".").map((part) => Number.parseInt(part, 10));
  if (![major, minor, patch].every(Number.isInteger)) {
    throw new Error(`Invalid semantic version "${version}"`);
  }

  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unsupported bump type "${type}"`);
  }
}
