import type OpenAI from "openai";

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

export function buildResponsesInputFromHistory(history: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): unknown[] {
  return history
    .filter(isPersistableConversationMessage)
    .map((message) => ({
      type: "message",
      role: message.role,
      content: [
        {
          type: message.role === "assistant" ? "output_text" : "input_text",
          text: typeof message.content === "string" ? message.content : ""
        }
      ]
    }));
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
