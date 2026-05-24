#!/usr/bin/env node

import { execFileSync } from "node:child_process";

run(["npm", "run", "typecheck"]);
run(["npm", "test"]);
run(["npm", "run", "check:schemas"]);
run(["npm", "run", "build"]);

function run(command) {
  execFileSync(command[0], command.slice(1), {
    stdio: "inherit",
    shell: true
  });
}
