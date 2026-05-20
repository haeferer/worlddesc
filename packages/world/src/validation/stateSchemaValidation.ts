import type { StateSchema, StateSchemaNode, WorldObject } from "../types.js";

type StateValidator = {
  compile<T>(schema: object): {
    (value: T): boolean;
    errors?: Array<{ instancePath: string; message?: string }> | null;
  };
};

export function validateObjectState(
  objectId: string,
  object: WorldObject,
  errors: string[],
  stateValidator: StateValidator
): void {
  if (object.state && !object.stateSchema) {
    errors.push(`objects.${objectId}.state requires objects.${objectId}.stateSchema`);
    return;
  }

  if (!object.stateSchema) {
    return;
  }

  validateStateSchemaNode(object.stateSchema, `objects.${objectId}.stateSchema`, errors, true);

  if (errors.some((error) => error.startsWith(`objects.${objectId}.stateSchema`))) {
    return;
  }

  const validateState = stateValidator.compile(object.stateSchema as object);
  const stateValue = object.state ?? {};
  object.state = stateValue;

  if (!validateState(stateValue)) {
    for (const error of validateState.errors ?? []) {
      const location = error.instancePath || "/";
      errors.push(`objects.${objectId}.state ${location} ${error.message ?? "is invalid"}`);
    }
  }
}

function validateStateSchemaNode(
  node: StateSchema | StateSchemaNode,
  location: string,
  errors: string[],
  isRoot = false
): void {
  const properties = node.properties;
  const hasProperties = isRecord(properties);

  if (isRoot && node.type !== "object") {
    errors.push(`${location}.type must be "object"`);
  }

  if (hasProperties) {
    if (!includesType(node.type, "object")) {
      errors.push(`${location}.type must include "object" when properties are declared`);
    }

    for (const [propertyName, propertySchema] of Object.entries(properties)) {
      validateStateSchemaNode(propertySchema, `${location}.properties.${propertyName}`, errors);
    }

    return;
  }

  if (node.type === undefined) {
    errors.push(`${location}.type is required for state values`);
  }

  if (!("default" in node)) {
    errors.push(`${location}.default is required for state values`);
  }
}

function includesType(typeValue: string | string[] | undefined, expected: string): boolean {
  if (typeValue === undefined) {
    return false;
  }

  if (typeof typeValue === "string") {
    return typeValue === expected;
  }

  return typeValue.includes(expected);
}

function isRecord(value: unknown): value is Record<string, StateSchemaNode> {
  return typeof value === "object" && value !== null;
}
