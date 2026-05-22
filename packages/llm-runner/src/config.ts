import { resolve } from "node:path";

export interface ReplConfig {
  worldPath: string;
  model: string;
  debug: boolean;
  maxToolRounds: number;
  systemPromptFile?: string;
}

export function parseReplArgs(argv: string[], cwd = process.cwd(), env = process.env): ReplConfig {
  const defaults: ReplConfig = {
    worldPath: resolve(cwd, "sample/test.world.yaml"),
    model: env.OPENAI_MODEL ?? "gpt-5-mini",
    debug: false,
    maxToolRounds: 8
  };

  const args = [...argv];
  let index = 0;

  while (index < args.length) {
    const arg = args[index];

    switch (arg) {
      case "--world":
        defaults.worldPath = resolve(cwd, requireValue(args, index, "--world"));
        index += 2;
        continue;
      case "--model":
        defaults.model = requireValue(args, index, "--model");
        index += 2;
        continue;
      case "--debug":
        defaults.debug = true;
        index += 1;
        continue;
      case "--max-tool-rounds":
        defaults.maxToolRounds = parsePositiveInteger(requireValue(args, index, "--max-tool-rounds"), "--max-tool-rounds");
        index += 2;
        continue;
      case "--system-prompt-file":
        defaults.systemPromptFile = resolve(cwd, requireValue(args, index, "--system-prompt-file"));
        index += 2;
        continue;
      case "--help":
      case "-h":
        throw new Error(buildHelpText());
      default:
        throw new Error(`Unknown argument "${arg}"\n\n${buildHelpText()}`);
    }
  }

  return defaults;
}

export function buildHelpText(): string {
  return [
    "Usage: worlddesc-llm-repl [options]",
    "",
    "Options:",
    "  --world <path>               Path to the world file. Default: sample/test.world.yaml",
    "  --model <name>               OpenAI model name. Default: OPENAI_MODEL or gpt-5-mini",
    "  --debug                      Print tool calls and internal summaries",
    "  --max-tool-rounds <number>   Maximum tool-call loops per user turn. Default: 8",
    "  --system-prompt-file <path>  Optional file whose contents are appended to the default system prompt",
    "  --help                       Show this help"
  ].join("\n");
}

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value) {
    throw new Error(`Missing value for ${flag}\n\n${buildHelpText()}`);
  }

  return value;
}

function parsePositiveInteger(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }

  return parsed;
}
