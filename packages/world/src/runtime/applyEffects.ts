import type { Effect, ObjectPlacement, RuntimeWorldState, WorldDocument } from "../types.js";
import { setObjectPathValue } from "./runtimeHelpers.js";

export function applyEffects(
  world: WorldDocument,
  state: RuntimeWorldState,
  effects: Effect[],
  say: string[],
  triggers: string[]
): void {
  for (const effect of effects) {
    applyEffect(world, state, effect, say, triggers);
  }
}

function applyEffect(world: WorldDocument, state: RuntimeWorldState, effect: Effect, say: string[], triggers: string[]): void {
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

  if (effect.type === "move") {
    if (!effect.ref || !effect.to) {
      throw new Error("Move effect requires ref and to");
    }

    applyMove(world, state, effect.ref, effect.to);
  }
}

function applyMove(world: WorldDocument, state: RuntimeWorldState, objectId: string, to: ObjectPlacement): void {
  if (!(objectId in state.placements)) {
    throw new Error(`Cannot move unknown object "${objectId}"`);
  }

  if ("inventory" in to) {
    if (to.inventory !== "player") {
      throw new Error(`Unsupported inventory target "${to.inventory}"`);
    }

    if (!world.objects[objectId]?.portable) {
      throw new Error(`Object "${objectId}" is not portable`);
    }
  }

  if ("object" in to) {
    if (to.object === objectId) {
      throw new Error(`Object "${objectId}" cannot contain itself`);
    }

    ensureNoPlacementCycle(state, objectId, to.object);
  }

  state.placements[objectId] = structuredClone(to);
}

function ensureNoPlacementCycle(state: RuntimeWorldState, movedObjectId: string, containerId: string): void {
  let currentId: string | undefined = containerId;

  while (currentId) {
    if (currentId === movedObjectId) {
      throw new Error(`Move would create placement cycle for "${movedObjectId}"`);
    }

    const placement: ObjectPlacement | undefined = state.placements[currentId];
    currentId = placement && "object" in placement ? placement.object : undefined;
  }
}
