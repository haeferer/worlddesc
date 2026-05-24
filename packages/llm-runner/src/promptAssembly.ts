import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { ReplConfig } from "./config.js";
import { buildDefaultSystemPrompt } from "./systemPrompt.js";

export async function buildRunnerSystemPrompt(config: ReplConfig): Promise<string> {
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
