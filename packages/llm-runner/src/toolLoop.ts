import type OpenAI from "openai";

import type { LlmToolHost, PlayerActionCommand, PlayerSceneView } from "@worlddesc/world";

import { buildFirstLlmToolSchemas } from "./toolSchemas.js";
import type { UsageTracker } from "./usageTracker.js";
import { fromOpenAiUsage } from "./usageTracker.js";

export interface ToolLoopOptions {
  client: OpenAI;
  host: LlmToolHost;
  model: string;
  systemPrompt: string;
  userMessage: string;
  debug: boolean;
  maxToolRounds: number;
  maxHistoryMessages: number;
  includeSampleActions: boolean;
  usageTracker?: UsageTracker;
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
    const scene = sanitizeSceneForModel(
      options.host.callTool("get_current_scene", {}),
      options.includeSampleActions
    );
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

    if (completion.usage && options.usageTracker) {
      const snapshot = await options.usageTracker.recordCompletion(fromOpenAiUsage(options.model, completion.usage));
      if (options.debug) {
        options.onDebugLog?.(
          `usage total=${snapshot.totals.totalTokens} prompt=${snapshot.totals.promptTokens} completion=${snapshot.totals.completionTokens} cached=${snapshot.totals.cachedTokens} reasoning=${snapshot.totals.reasoningTokens} requests=${snapshot.totals.requests}`
        );
      }
    }

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
        const result = callToolWithPolicy(
          options.host,
          toolCall.function.name,
          parsedArgs,
          toolState,
          options.includeSampleActions
        );
        if (options.debug) {
          options.onDebugLog?.(`result ${toolCall.function.name} ${JSON.stringify(result)}`);
          if (toolCall.function.name === "perform_action" && isActionResultWithScene(result)) {
            options.onDebugLog?.(
              `focus room=${result.scene.roomId} actionFocus=${JSON.stringify(result.scene.currentActionFocus ?? null)}`
            );
          }
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
      history: buildPersistedConversationHistory(history, options.maxHistoryMessages)
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
  state: ToolExecutionState,
  includeSampleActions = true
): unknown {
  switch (name) {
    case "get_current_scene":
      return sanitizeSceneForModel(host.callTool("get_current_scene", {}), includeSampleActions);
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
      return sanitizeActionResultForModel(
        host.callTool("perform_action", {
          command
        }),
        includeSampleActions
      );
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

function sanitizeSceneForModel(scene: PlayerSceneView, includeSampleActions: boolean): PlayerSceneView {
  if (includeSampleActions) {
    return scene;
  }

  return {
    ...scene,
    sampleActions: []
  };
}

function sanitizeActionResultForModel<T>(result: T, includeSampleActions: boolean): T {
  if (includeSampleActions || typeof result !== "object" || result === null || !("scene" in result)) {
    return result;
  }

  const actionResult = result as T & { scene: PlayerSceneView };
  return {
    ...actionResult,
    scene: sanitizeSceneForModel(actionResult.scene, false)
  };
}

export function trimConversationHistory(
  history: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  maxHistoryMessages: number
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  if (history.length <= maxHistoryMessages) {
    return [...history];
  }

  return history.slice(-maxHistoryMessages);
}

export function buildPersistedConversationHistory(
  history: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  maxHistoryMessages: number
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const persisted = history.filter(isPersistableConversationMessage);
  return trimConversationHistory(persisted, maxHistoryMessages);
}

function isPersistableConversationMessage(
  message: OpenAI.Chat.Completions.ChatCompletionMessageParam
): boolean {
  if (message.role === "user") {
    return typeof message.content === "string" && message.content.trim().length > 0;
  }

  if (message.role === "assistant") {
    const assistantMessage = message as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam & {
      tool_calls?: unknown;
    };

    return !assistantMessage.tool_calls && typeof assistantMessage.content === "string" && assistantMessage.content.trim().length > 0;
  }

  return false;
}

function isActionResultWithScene(value: unknown): value is { scene: PlayerSceneView } {
  return typeof value === "object" && value !== null && "scene" in value;
}
