import type { Condition, ConditionGroup, RuntimeWorldState } from "../types.js";
import { getObjectPathValue } from "./runtimeHelpers.js";

export function evaluateConditionGroup(state: RuntimeWorldState, group: ConditionGroup | undefined): boolean {
  if (!group) {
    return true;
  }

  if (group.all && !group.all.every((condition) => evaluateCondition(state, condition))) {
    return false;
  }

  if (group.any && !group.any.some((condition) => evaluateCondition(state, condition))) {
    return false;
  }

  if (group.not && evaluateCondition(state, group.not)) {
    return false;
  }

  return true;
}

function evaluateCondition(state: RuntimeWorldState, condition: Condition): boolean {
  if (condition.placement && !matchesPlacement(state, condition.ref, condition.placement)) {
    return false;
  }

  if (!condition.path) {
    return condition.placement !== undefined;
  }

  const value = getObjectPathValue(state, condition.ref, condition.path);

  if ("equals" in condition) {
    return Object.is(value, condition.equals);
  }

  if ("contains" in condition) {
    return Array.isArray(value) && value.includes(condition.contains);
  }

  return Boolean(value);
}

function matchesPlacement(
  state: RuntimeWorldState,
  objectId: string,
  expected: NonNullable<Condition["placement"]>
): boolean {
  const actual = state.placements[objectId];

  if (!actual) {
    return false;
  }

  if ("room" in expected) {
    return "room" in actual && actual.room === expected.room;
  }

  if ("inventory" in expected) {
    return "inventory" in actual && actual.inventory === expected.inventory;
  }

  if ("offstage" in expected) {
    return "offstage" in actual && actual.offstage === true;
  }

  if ("object" in expected) {
    return "object" in actual && actual.object === expected.object;
  }

  return false;
}
