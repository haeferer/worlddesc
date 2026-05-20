import type { StateSchemaNode, WorldObject } from "../types.js";

export function isValidRuntimeObjectPath(object: WorldObject, path: string): boolean {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) {
    return false;
  }

  if (segments[0] !== "state") {
    return false;
  }

  if (!object.stateSchema) {
    return false;
  }

  if (segments.length === 1) {
    return true;
  }

  let currentProperties: Record<string, StateSchemaNode> | undefined = object.stateSchema.properties;

  for (const segment of segments.slice(1)) {
    if (!currentProperties || !(segment in currentProperties)) {
      return false;
    }

    const node: StateSchemaNode = currentProperties[segment];
    currentProperties = node.properties;
  }

  return true;
}
