import "dotenv/config";

import { buildHelpText, parseReplArgs } from "./config.js";
import { buildRunnerSystemPrompt } from "./promptAssembly.js";
import { runConsoleRepl } from "./repl.js";

async function main(): Promise<void> {
  try {
    const config = parseReplArgs(process.argv.slice(2));
    if (config.printSystemPrompt) {
      process.stdout.write(`${await buildRunnerSystemPrompt(config)}\n`);
      return;
    }
    await runConsoleRepl(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    if (!message.includes("Usage: worlddesc-llm-repl")) {
      process.stderr.write(`${buildHelpText()}\n`);
    }
    process.exitCode = 1;
  }
}

void main();
