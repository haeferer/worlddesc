import type OpenAI from "openai";

import type { LlmToolHost, PlayerActionCommand, PlayerSceneView } from "@worlddesc/world";

import { buildFirstLlmToolSchemas } from "./toolSchemas.js";

export interface ToolLoopOptions {
  client: OpenAI;
  host: LlmToolHost;
  model: string;
  systemPrompt: string;
  userMessage: string;
  debug: boolean;
  maxToolRounds: number;
  history: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  onDebugLog?: (line: string) => void;
}

export interface ToolLoopResult {
  assistantText: string;
  history: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
}

export interface ToolExecutionState {
  resolvedCommandKey?: string;
}

export async function runToolLoop(options: ToolLoopOptions): Promise<ToolLoopResult> {
  const tools = buildFirstLlmToolSchemas() as unknown as OpenAI.Chat.Completions.ChatCompletionTool[];
  const history = [...options.history];
  const toolState = createToolExecutionState();

  history.push({
    role: "user",
    content: options.userMessage
  });

  for (let round = 0; round < options.maxToolRounds; round += 1) {
    const scene = options.host.callTool("get_current_scene", {});
    if (options.debug && round === 0) {
      options.onDebugLog?.(`scene ${JSON.stringify(scene)}`);
    }

    const completion = await options.client.chat.completions.create({
      model: options.model,
      messages: [
        {
          role: "system",
          content: options.systemPrompt
        },
        {
          role: "system",
          content: buildTurnContextMessage(scene)
        },
        ...history
      ],
      tools,
      tool_choice: round === 0 ? "required" : "auto"
    });

    const message = completion.choices[0]?.message;
    if (!message) {
      throw new Error("Model returned no message");
    }

    if (message.tool_calls && message.tool_calls.length > 0) {
      history.push(message);

      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== "function") {
          continue;
        }

        const parsedArgs = parseToolArguments(toolCall.function.arguments);
        if (options.debug) {
          options.onDebugLog?.(`tool ${toolCall.function.name} ${JSON.stringify(parsedArgs)}`);
        }
        const result = callToolWithPolicy(options.host, toolCall.function.name, parsedArgs, toolState);
        if (options.debug) {
          options.onDebugLog?.(`result ${toolCall.function.name} ${JSON.stringify(result)}`);
        }

        history.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }

      continue;
    }

    const assistantText = message.content ?? "";
    history.push({
      role: "assistant",
      content: assistantText
    });

    return {
      assistantText,
      history
    };
  }

  throw new Error(`Model exceeded max tool rounds (${options.maxToolRounds})`);
}

function parseToolArguments(input: string): Record<string, unknown> {
  if (!input.trim()) {
    return {};
  }

  return JSON.parse(input) as Record<string, unknown>;
}

export function createToolExecutionState(): ToolExecutionState {
  return {};
}

export function callToolWithPolicy(
  host: LlmToolHost,
  name: string,
  args: Record<string, unknown>,
  state: ToolExecutionState
): unknown {
  switch (name) {
    case "get_current_scene":
      return host.callTool("get_current_scene", {});
    case "get_known_object":
      return host.callTool("get_known_object", {
        objectId: String(args.objectId ?? "")
      });
    case "resolve_intent": {
      const result = host.callTool("resolve_intent", {
        intent: args.intent as never
      });
      if (result.status === "resolved") {
        state.resolvedCommandKey = serializeCommand(result.command);
      } else {
        state.resolvedCommandKey = undefined;
      }
      return result;
    }
    case "perform_action": {
      const command = args.command as PlayerActionCommand;
      const commandKey = serializeCommand(command);

      if (!state.resolvedCommandKey) {
        return {
          accepted: false,
          error: {
            code: "missing-resolve-intent",
            message: "perform_action requires a successful resolve_intent in the same turn"
          }
        };
      }

      if (state.resolvedCommandKey !== commandKey) {
        return {
          accepted: false,
          error: {
            code: "resolved-command-mismatch",
            message: "perform_action must use the exact command returned by the most recent successful resolve_intent"
          }
        };
      }

      state.resolvedCommandKey = undefined;
      return host.callTool("perform_action", {
        command
      });
    }
    case "get_new_events":
      return host.callTool("get_new_events", {});
    default:
      throw new Error(`Unknown tool "${name}"`);
  }
}

function buildTurnContextMessage(scene: PlayerSceneView): string {
  return [
    "Deterministic scene snapshot for the current player turn:",
    JSON.stringify(scene)
  ].join("\n");
}

function serializeCommand(command: PlayerActionCommand): string {
  return JSON.stringify(command);
}
