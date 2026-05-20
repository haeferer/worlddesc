import type { Effect, RuntimeWorldState } from "../types.js";
import { setObjectPathValue } from "./runtimeHelpers.js";

export function applyEffects(
  state: RuntimeWorldState,
  effects: Effect[],
  say: string[],
  triggers: string[]
): void {
  for (const effect of effects) {
    applyEffect(state, effect, say, triggers);
  }
}

function applyEffect(state: RuntimeWorldState, effect: Effect, say: string[], triggers: string[]): void {
  if (effect.type === "set") {
    if (!effect.ref || !effect.path) {
      throw new Error("Set effect requires ref and path");
    }

    setObjectPathValue(state, effect.ref, effect.path, effect.value);
    return;
  }

  if (effect.type === "say" && effect.text) {
    say.push(effect.text);
    return;
  }

  if (effect.type === "trigger" && effect.event) {
    triggers.push(effect.event);
  }
}
