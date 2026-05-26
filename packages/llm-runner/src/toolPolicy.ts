import type { LlmToolHost, PlayerActionCommand } from "@worlddesc/world";

import { sanitizeActionResultForModel, sanitizeSceneForModel } from "./sceneSanitizer.js";

export interface ToolExecutionState {
  resolvedCommandKey?: string;
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
    case "get_object_knowledge":
      return host.callTool("get_object_knowledge", {
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

export function getResponsesToolChoice(
  round: number,
  state: ToolExecutionState
): "auto" | "required" | { type: "function"; name: "perform_action" } {
  if (state.resolvedCommandKey) {
    return {
      type: "function",
      name: "perform_action"
    };
  }

  return round === 0 ? "required" : "auto";
}

function serializeCommand(command: PlayerActionCommand): string {
  return JSON.stringify(normalizeCommandForComparison(command));
}

function normalizeCommandForComparison(command: PlayerActionCommand): PlayerActionCommand {
  if (command.kind === "way") {
    return {
      kind: "way",
      actionId: command.actionId
    };
  }

  const normalized: PlayerActionCommand = {
    kind: "interaction",
    objectId: command.objectId,
    actionId: command.actionId
  };

  if (typeof command.additionalText === "string" && command.additionalText.trim().length > 0) {
    normalized.additionalText = command.additionalText;
  }

  return normalized;
}
