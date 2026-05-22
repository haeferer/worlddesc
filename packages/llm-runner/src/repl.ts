import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import OpenAI from "openai";
import {
  createLlmToolHost,
  createPlayerWorldView,
  createWorldRuntime,
  loadWorldFile
} from "@worlddesc/world";

import type { ReplConfig } from "./config.js";
import { buildDefaultSystemPrompt } from "./systemPrompt.js";
import { runToolLoop } from "./toolLoop.js";
import { createUsageTracker } from "./usageTracker.js";

export async function runConsoleRepl(config: ReplConfig): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Put it into .env or your environment before starting the REPL.");
  }

  const world = await loadWorldFile(config.worldPath);
  const runtime = createWorldRuntime(world);
  const playerView = createPlayerWorldView({ runtime });
  const host = createLlmToolHost(playerView);
  const client = new OpenAI({ apiKey });
  const usageTracker = createUsageTracker(config.usageFilePath);
  const rl = createInterface({ input, output });

  let history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  const systemPrompt = await buildRunnerSystemPrompt(config);

  printBanner(config);

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
  output.write(`Model: ${config.model}\n`);
  output.write(`Debug: ${config.debug ? "on" : "off"}\n`);
  output.write(`Sample actions for LLM: ${config.includeSampleActions ? "visible" : "hidden"}\n`);
  output.write(`Character: ${config.character ?? "none"}\n`);
  output.write(`Usage file: ${config.usageFilePath}\n`);
  output.write('Commands: /scene, /events, /tools, /usage, /quit\n');
}

async function buildRunnerSystemPrompt(config: ReplConfig): Promise<string> {
  const parts = [buildDefaultSystemPrompt()];

  if (config.character) {
    const characterPath = resolve(process.cwd(), "prompts", `${config.character}.character.txt`);
    parts.push(await readFile(characterPath, "utf8"));
  }

  if (config.systemPromptFile) {
    parts.push(await readFile(config.systemPromptFile, "utf8"));
  }

  return parts.join("\n\n");
}
