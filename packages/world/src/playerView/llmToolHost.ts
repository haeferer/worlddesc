import { FIRST_LLM_TOOL_CONTRACT } from "./llmToolContract.js";
import type {
  FirstLlmToolArgs,
  FirstLlmToolName,
  FirstLlmToolResult,
  FirstLlmToolSpec,
  GetKnownObjectArgs,
  PerformActionArgs,
  ResolveIntentArgs
} from "./llmToolContract.js";
import type { PlayerWorldView } from "./types.js";

export interface LlmToolHost {
  listTools(): FirstLlmToolSpec[];
  callTool<TName extends FirstLlmToolName>(name: TName, args: FirstLlmToolArgs<TName>): FirstLlmToolResult<TName>;
}

export class RuntimeBackedLlmToolHost implements LlmToolHost {
  constructor(private readonly playerView: PlayerWorldView) {}

  listTools(): FirstLlmToolSpec[] {
    return FIRST_LLM_TOOL_CONTRACT.map((tool) => structuredClone(tool));
  }

  callTool<TName extends FirstLlmToolName>(name: TName, args: FirstLlmToolArgs<TName>): FirstLlmToolResult<TName> {
    switch (name) {
      case "get_current_scene":
        return this.playerView.getCurrentScene() as FirstLlmToolResult<TName>;
      case "get_known_object":
        return this.playerView.getKnownObject((args as GetKnownObjectArgs).objectId) as FirstLlmToolResult<TName>;
      case "resolve_intent":
        return this.playerView.resolveIntent((args as ResolveIntentArgs).intent) as FirstLlmToolResult<TName>;
      case "perform_action":
        return this.playerView.performAction((args as PerformActionArgs).command) as FirstLlmToolResult<TName>;
      case "get_new_events":
        return this.playerView.getNewEvents() as FirstLlmToolResult<TName>;
      default: {
        const unreachable: never = name;
        throw new Error(`Unsupported tool "${unreachable}"`);
      }
    }
  }
}

export function createLlmToolHost(playerView: PlayerWorldView): LlmToolHost {
  return new RuntimeBackedLlmToolHost(playerView);
}
