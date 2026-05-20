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
  const value = getObjectPathValue(state, condition.ref, condition.path);

  if ("equals" in condition) {
    return Object.is(value, condition.equals);
  }

  if ("contains" in condition) {
    return Array.isArray(value) && value.includes(condition.contains);
  }

  return Boolean(value);
}
