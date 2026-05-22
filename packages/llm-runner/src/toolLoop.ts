import type OpenAI from "openai";

import type { LlmToolHost } from "@worlddesc/world";

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

export async function runToolLoop(options: ToolLoopOptions): Promise<ToolLoopResult> {
  const tools = buildFirstLlmToolSchemas() as unknown as OpenAI.Chat.Completions.ChatCompletionTool[];
  const history = [...options.history];

  history.push({
    role: "user",
    content: options.userMessage
  });

  for (let round = 0; round < options.maxToolRounds; round += 1) {
    const completion = await options.client.chat.completions.create({
      model: options.model,
      messages: [
        {
          role: "system",
          content: options.systemPrompt
        },
        ...history
      ],
      tools
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
        const result = callHostTool(options.host, toolCall.function.name, parsedArgs);
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

function callHostTool(host: LlmToolHost, name: string, args: Record<string, unknown>): unknown {
  switch (name) {
    case "get_current_scene":
      return host.callTool("get_current_scene", {});
    case "get_known_object":
      return host.callTool("get_known_object", {
        objectId: String(args.objectId ?? "")
      });
    case "resolve_intent":
      return host.callTool("resolve_intent", {
        intent: args.intent as never
      });
    case "perform_action":
      return host.callTool("perform_action", {
        command: args.command as never
      });
    case "get_new_events":
      return host.callTool("get_new_events", {});
    default:
      throw new Error(`Unknown tool "${name}"`);
  }
}
