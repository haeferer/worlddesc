import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import type { ReplConfig } from "./config.js";
import { createRunnerSession } from "./runnerSession.js";

export async function runConsoleRepl(config: ReplConfig): Promise<void> {
  const session = await createRunnerSession(config);
  const rl = createInterface({ input, output });
  const initialSnapshot = await session.getSnapshot();

  printBanner(config);
  if (initialSnapshot.warnings.narrative.length) {
    for (const warning of initialSnapshot.warnings.narrative) {
      output.write(`[narrative warning] ${warning}\n`);
    }
  }
  if (initialSnapshot.warnings.knowledge.length) {
    for (const warning of initialSnapshot.warnings.knowledge) {
      output.write(`[knowledge warning] ${warning}\n`);
    }
  }

  try {
    while (true) {
      const line = (await rl.question("> ")).trim();
      if (!line) {
        continue;
      }

      if (line === "/quit" || line === "/exit") {
        break;
      }

      if (line === "/scene") {
        output.write(`${JSON.stringify((await session.getSnapshot()).currentScene, null, 2)}\n`);
        continue;
      }

      if (line === "/events") {
        output.write(`${JSON.stringify(await session.getNewEvents(), null, 2)}\n`);
        continue;
      }

      if (line === "/tools") {
        output.write(`${JSON.stringify(session.listTools(), null, 2)}\n`);
        continue;
      }

      if (line === "/usage") {
        output.write(`${JSON.stringify((await session.getSnapshot()).usage, null, 2)}\n`);
        continue;
      }

      const result = await session.submitTurn(line);
      for (const debugLine of result.debugLines) {
        output.write(`[debug] ${debugLine}\n`);
      }
      output.write(`${result.assistantText}\n`);
    }
  } finally {
    rl.close();
    await session.dispose();
  }
}

function printBanner(config: ReplConfig): void {
  output.write(`World: ${config.worldPath}\n`);
  output.write(`Narrative mix: ${config.narrativeGuideMixPath ?? "none"}\n`);
  output.write(`Knowledge dir: ${config.knowledgeDirPath ?? "none"}\n`);
  output.write(`API mode: ${config.apiMode}\n`);
  output.write(`Model: ${config.model}\n`);
  output.write(`Debug: ${config.debug ? "on" : "off"}\n`);
  output.write(`Max history messages: ${config.maxHistoryMessages}\n`);
  output.write(`Sample actions for LLM: ${config.includeSampleActions ? "visible" : "hidden"}\n`);
  output.write(`Character: ${config.character ?? "none"}\n`);
  output.write(`Print system prompt only: ${config.printSystemPrompt ? "yes" : "no"}\n`);
  output.write(`Usage file: ${config.usageFilePath}\n`);
  output.write('Commands: /scene, /events, /tools, /usage, /quit\n');
}
