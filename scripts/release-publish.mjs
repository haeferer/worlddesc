#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const rootDir = process.cwd();
const packages = [
  resolve(rootDir, "packages/world"),
  resolve(rootDir, "packages/llm-runner")
];

for (const packageDir of packages) {
  execFileSync("npm", ["publish", "--access", "public"], {
    cwd: packageDir,
    stdio: "inherit",
    shell: true
  });
}
