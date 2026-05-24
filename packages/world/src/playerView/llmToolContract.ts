import type {
  KnownObjectView,
  PerceptionEvent,
  PlayerActionCommand,
  PlayerActionResultView,
  PlayerSceneView
} from "./types.js";
import type { PlayerIntentCommand, PlayerIntentResolution } from "./intentTypes.js";

export interface LlmToolSpec<TName extends string, TArgs, TResult> {
  name: TName;
  description: string;
  argsExample: TArgs;
  resultExample?: TResult;
}

export interface GetCurrentSceneArgs {}

export interface GetKnownObjectArgs {
  objectId: string;
}

export interface ResolveIntentArgs {
  intent: PlayerIntentCommand;
}

export interface PerformActionArgs {
  command: PlayerActionCommand;
}

export interface GetNewEventsArgs {}

export type FirstLlmToolName = FirstLlmToolSpec["name"];

export type FirstLlmToolSpec =
  | LlmToolSpec<"get_current_scene", GetCurrentSceneArgs, PlayerSceneView>
  | LlmToolSpec<"get_known_object", GetKnownObjectArgs, KnownObjectView | null>
  | LlmToolSpec<"resolve_intent", ResolveIntentArgs, PlayerIntentResolution>
  | LlmToolSpec<"perform_action", PerformActionArgs, PlayerActionResultView>
  | LlmToolSpec<"get_new_events", GetNewEventsArgs, PerceptionEvent[]>;

export type FirstLlmToolArgs<TName extends FirstLlmToolName> =
  Extract<FirstLlmToolSpec, { name: TName }> extends LlmToolSpec<TName, infer TArgs, unknown> ? TArgs : never;

export type FirstLlmToolResult<TName extends FirstLlmToolName> =
  Extract<FirstLlmToolSpec, { name: TName }> extends LlmToolSpec<TName, unknown, infer TResult> ? TResult : never;

export const FIRST_LLM_TOOL_CONTRACT: FirstLlmToolSpec[] = [
  {
    name: "get_current_scene",
    description:
      "Return the current player-facing scene, including visible objects, inventory, known hidden objects, actions, intent hints and an optional narrative context slice.",
    argsExample: {}
  },
  {
    name: "get_known_object",
    description: "Return known player-facing detail for a specific object.",
    argsExample: {
      objectId: "kiste"
    }
  },
  {
    name: "resolve_intent",
    description: "Resolve a broad point-and-click-like player intent into a concrete player action command or a structured rejection.",
    argsExample: {
      intent: {
        verb: "open",
        object1: "kiste"
      }
    }
  },
  {
    name: "perform_action",
    description: "Execute a concrete structured player action and return the new scene, events and turn summary.",
    argsExample: {
      command: {
        kind: "interaction",
        objectId: "kiste",
        actionId: "oeffnen"
      }
    }
  },
  {
    name: "get_new_events",
    description: "Return newly observed events since the last event poll.",
    argsExample: {}
  }
];
