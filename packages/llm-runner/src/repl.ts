import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import OpenAI from "openai";
import {
  createLlmToolHost,
  loadNarrativeGuideProviderFromMixFile,
  createPlayerWorldView,
  createWorldRuntime,
  loadWorldFile
} from "@worlddesc/world";

import type { ReplConfig } from "./config.js";
import { buildRunnerSystemPrompt } from "./promptAssembly.js";
import { runToolLoop } from "./toolLoop.js";
import { createUsageTracker } from "./usageTracker.js";

export async function runConsoleRepl(config: ReplConfig): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Put it into .env or your environment before starting the REPL.");
  }

  const world = await loadWorldFile(config.worldPath);
  const runtime = createWorldRuntime(world);
  const narrativeProviderResult = config.narrativeGuideMixPath
    ? await loadNarrativeGuideProviderFromMixFile(config.narrativeGuideMixPath, world)
    : undefined;
  const playerView = createPlayerWorldView({
    runtime,
    narrativeContextProvider: narrativeProviderResult?.provider
  });
  const host = createLlmToolHost(playerView);
  const client = new OpenAI({ apiKey });
  const usageTracker = createUsageTracker(config.usageFilePath);
  const rl = createInterface({ input, output });

  let history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  const systemPrompt = await buildRunnerSystemPrompt(config);

  printBanner(config);
  if (narrativeProviderResult?.warnings.length) {
    for (const warning of narrativeProviderResult.warnings) {
      output.write(`[narrative warning] ${warning}\n`);
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
        output.write(`${JSON.stringify(host.callTool("get_current_scene", {}), null, 2)}\n`);
        continue;
      }

      if (line === "/events") {
        output.write(`${JSON.stringify(host.callTool("get_new_events", {}), null, 2)}\n`);
        continue;
      }

      if (line === "/tools") {
        output.write(`${JSON.stringify(host.listTools(), null, 2)}\n`);
        continue;
      }

      if (line === "/usage") {
        output.write(`${JSON.stringify(await usageTracker.readSnapshot(), null, 2)}\n`);
        continue;
      }

      const result = await runToolLoop({
        client,
        host,
        model: config.model,
        systemPrompt,
        userMessage: line,
        debug: config.debug,
        maxToolRounds: config.maxToolRounds,
        maxHistoryMessages: config.maxHistoryMessages,
        includeSampleActions: config.includeSampleActions,
        usageTracker,
        history,
        onDebugLog: (debugLine) => output.write(`[debug] ${debugLine}\n`)
      });

      history = result.history;
      output.write(`${result.assistantText}\n`);
    }
  } finally {
    rl.close();
  }
}

function printBanner(config: ReplConfig): void {
  output.write(`World: ${config.worldPath}\n`);
  output.write(`Narrative mix: ${config.narrativeGuideMixPath ?? "none"}\n`);
  output.write(`Model: ${config.model}\n`);
  output.write(`Debug: ${config.debug ? "on" : "off"}\n`);
  output.write(`Max history messages: ${config.maxHistoryMessages}\n`);
  output.write(`Sample actions for LLM: ${config.includeSampleActions ? "visible" : "hidden"}\n`);
  output.write(`Character: ${config.character ?? "none"}\n`);
  output.write(`Print system prompt only: ${config.printSystemPrompt ? "yes" : "no"}\n`);
  output.write(`Usage file: ${config.usageFilePath}\n`);
  output.write('Commands: /scene, /events, /tools, /usage, /quit\n');
}
