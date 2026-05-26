import type OpenAI from "openai";

import type { LlmToolHost, PlayerSceneView } from "@worlddesc/world";

import { buildPersistedConversationHistory, buildResponsesInputFromHistory } from "./historyPolicy.js";
import { extractResponseFunctionCalls, extractResponseOutputText } from "./responsesAdapter.js";
import { buildResponsesInstructions, buildTurnContextMessage, sanitizeSceneForModel } from "./sceneSanitizer.js";
import { buildFirstLlmResponseToolSchemas, buildFirstLlmToolSchemas } from "./toolSchemas.js";
import { callToolWithPolicy, createToolExecutionState, getResponsesToolChoice } from "./toolPolicy.js";
import type { UsageTracker } from "./usageTracker.js";
import { fromOpenAiUsage } from "./usageTracker.js";
export { buildPersistedConversationHistory, buildResponsesInputFromHistory, trimConversationHistory } from "./historyPolicy.js";
export { callToolWithPolicy, createToolExecutionState, getResponsesToolChoice } from "./toolPolicy.js";

export interface ToolLoopOptions {
  client: OpenAI;
  host: LlmToolHost;
  apiMode: "chat" | "responses";
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

export async function runToolLoop(options: ToolLoopOptions): Promise<ToolLoopResult> {
  if (options.apiMode === "responses") {
    return runResponsesToolLoop(options);
  }

  return runChatToolLoop(options);
}

async function runChatToolLoop(options: ToolLoopOptions): Promise<ToolLoopResult> {
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

async function runResponsesToolLoop(options: ToolLoopOptions): Promise<ToolLoopResult> {
  const tools = buildFirstLlmResponseToolSchemas();
  const history = [...options.history];
  const toolState = createToolExecutionState();

  history.push({
    role: "user",
    content: options.userMessage
  });

  let previousResponseId: string | undefined;
  let pendingInput: unknown = buildResponsesInputFromHistory(history);

  for (let round = 0; round < options.maxToolRounds; round += 1) {
    const scene = sanitizeSceneForModel(
      options.host.callTool("get_current_scene", {}),
      options.includeSampleActions
    );
    if (options.debug && round === 0) {
      options.onDebugLog?.(`scene ${JSON.stringify(scene)}`);
    }

    const response = (await (options.client.responses.create as unknown as (input: unknown) => Promise<unknown>)({
      model: options.model,
      instructions: buildResponsesInstructions(options.systemPrompt, scene),
      input: pendingInput,
      previous_response_id: previousResponseId,
      tools: tools as unknown as never[],
      tool_choice: getResponsesToolChoice(round, toolState),
      parallel_tool_calls: false,
      max_tool_calls: 1
    })) as {
      id: string;
      usage?: Parameters<typeof fromOpenAiUsage>[1];
      output_text?: string;
      output?: unknown[];
    };

    if (response.usage && options.usageTracker) {
      const snapshot = await options.usageTracker.recordCompletion(fromOpenAiUsage(options.model, response.usage));
      if (options.debug) {
        options.onDebugLog?.(
          `usage total=${snapshot.totals.totalTokens} prompt=${snapshot.totals.promptTokens} completion=${snapshot.totals.completionTokens} cached=${snapshot.totals.cachedTokens} reasoning=${snapshot.totals.reasoningTokens} requests=${snapshot.totals.requests}`
        );
      }
    }

    previousResponseId = response.id;
    const functionCalls = extractResponseFunctionCalls(response);

    if (functionCalls.length > 0) {
      const toolOutputs: Array<{ type: "function_call_output"; call_id: string; output: string }> = [];

      for (const functionCall of functionCalls) {
        const parsedArgs = parseToolArguments(functionCall.arguments ?? "");
        if (options.debug) {
          options.onDebugLog?.(`tool ${functionCall.name} ${JSON.stringify(parsedArgs)}`);
        }
        const result = callToolWithPolicy(
          options.host,
          functionCall.name,
          parsedArgs,
          toolState,
          options.includeSampleActions
        );
        if (options.debug) {
          options.onDebugLog?.(`result ${functionCall.name} ${JSON.stringify(result)}`);
          if (functionCall.name === "perform_action" && isActionResultWithScene(result)) {
            options.onDebugLog?.(
              `focus room=${result.scene.roomId} actionFocus=${JSON.stringify(result.scene.currentActionFocus ?? null)}`
            );
          }
        }
        toolOutputs.push({
          type: "function_call_output",
          call_id: functionCall.call_id,
          output: JSON.stringify(result)
        });
      }

      pendingInput = toolOutputs;
      continue;
    }

    const assistantText = extractResponseOutputText(response);
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

function isActionResultWithScene(value: unknown): value is { scene: PlayerSceneView } {
  return typeof value === "object" && value !== null && "scene" in value;
}
