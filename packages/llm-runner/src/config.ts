import { resolve } from "node:path";

export interface ReplConfig {
  web: boolean;
  worldPath: string;
  narrativeGuideMixPath?: string;
  knowledgeDirPath?: string;
  pricingFilePath: string;
  apiMode: "chat" | "responses";
  model: string;
  printSystemPrompt: boolean;
  debug: boolean;
  maxToolRounds: number;
  maxHistoryMessages: number;
  includeSampleActions: boolean;
  usageFilePath: string;
  character?: string;
  systemPromptFile?: string;
  webPort: number;
  webUiDistPath?: string;
}

export function parseReplArgs(argv: string[], cwd = process.cwd(), env = process.env): ReplConfig {
  const defaults: ReplConfig = {
    web: false,
    worldPath: resolve(cwd, "sample/test.world.yaml"),
    pricingFilePath: resolve(cwd, "pricing.json"),
    model: env.OPENAI_MODEL ?? "gpt-5.4-mini",
    apiMode: env.OPENAI_API_MODE === "responses" ? "responses" : "chat",
    printSystemPrompt: false,
    debug: false,
    maxToolRounds: 8,
    maxHistoryMessages: 6,
    includeSampleActions: true,
    usageFilePath: resolve(cwd, "tokens.usage.json"),
    webPort: 4315
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
      case "--web":
        defaults.web = true;
        index += 1;
        continue;
      case "--web-port":
        defaults.webPort = parsePositiveInteger(requireValue(args, index, "--web-port"), "--web-port");
        index += 2;
        continue;
      case "--web-ui-dist":
        defaults.webUiDistPath = resolve(cwd, requireValue(args, index, "--web-ui-dist"));
        index += 2;
        continue;
      case "--narrative-guide-mix":
        defaults.narrativeGuideMixPath = resolve(cwd, requireValue(args, index, "--narrative-guide-mix"));
        index += 2;
        continue;
      case "--knowledge-dir":
        defaults.knowledgeDirPath = resolve(cwd, requireValue(args, index, "--knowledge-dir"));
        index += 2;
        continue;
      case "--pricing-file":
        defaults.pricingFilePath = resolve(cwd, requireValue(args, index, "--pricing-file"));
        index += 2;
        continue;
      case "--model":
        defaults.model = requireValue(args, index, "--model");
        index += 2;
        continue;
      case "--api-mode":
        defaults.apiMode = parseApiMode(requireValue(args, index, "--api-mode"));
        index += 2;
        continue;
      case "--print-system-prompt":
        defaults.printSystemPrompt = true;
        index += 1;
        continue;
      case "--debug":
        defaults.debug = true;
        index += 1;
        continue;
      case "--max-tool-rounds":
        defaults.maxToolRounds = parsePositiveInteger(requireValue(args, index, "--max-tool-rounds"), "--max-tool-rounds");
        index += 2;
        continue;
      case "--max-history-messages":
        defaults.maxHistoryMessages = parsePositiveInteger(
          requireValue(args, index, "--max-history-messages"),
          "--max-history-messages"
        );
        index += 2;
        continue;
      case "--hide-sample-actions":
        defaults.includeSampleActions = false;
        index += 1;
        continue;
      case "--usage-file":
        defaults.usageFilePath = resolve(cwd, requireValue(args, index, "--usage-file"));
        index += 2;
        continue;
      case "--character":
        defaults.character = requireValue(args, index, "--character");
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
    "  --web                        Start the local web server instead of the console REPL",
    "  --web-port <number>          Port for the local web server. Default: 4315",
    "  --web-ui-dist <path>         Optional path to built static web assets for the web mode",
    "  --world <path>               Path to the world file. Default: sample/test.world.yaml",
    "  --narrative-guide-mix <path> Optional narrative guide mix file to build the LLM-facing narrativeContext",
    "  --knowledge-dir <path>       Optional knowledge directory with objects/<objectId>.md and rooms/<roomId>.md",
    "  --pricing-file <path>        Path to model pricing JSON. Default: pricing.json",
    "  --api-mode <chat|responses>  OpenAI API mode. Default: OPENAI_API_MODE or chat",
    "  --model <name>               OpenAI model name. Default: OPENAI_MODEL or gpt-5.4-mini",
    "  --print-system-prompt        Print the fully assembled runner system prompt and exit",
    "  --debug                      Print tool calls and internal summaries",
    "  --max-tool-rounds <number>   Maximum tool-call loops per user turn. Default: 8",
    "  --max-history-messages <n>   Maximum persisted chat history messages between turns. Default: 6",
    "  --hide-sample-actions        Hide sampleActions from the LLM-facing scene and action results",
    "  --usage-file <path>          Path to the persistent token usage file. Default: tokens.usage.json",
    "  --character <name>           Load prompts/<name>.character.txt and append it to the base system prompt",
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

function parseApiMode(value: string): "chat" | "responses" {
  if (value === "chat" || value === "responses") {
    return value;
  }

  throw new Error(`--api-mode must be either "chat" or "responses"`);
}
