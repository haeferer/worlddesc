import type { RuntimeWorldState } from "../types.js";

export function getObjectPathValue(state: RuntimeWorldState, objectId: string, path: string | undefined): unknown {
  if (!path) {
    return undefined;
  }

  const root = buildObjectRuntimeView(state, objectId);
  return getPathValue(root, path);
}

export function setObjectPathValue(state: RuntimeWorldState, objectId: string, path: string, value: unknown): void {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) {
    throw new Error(`Invalid path "${path}"`);
  }

  const object = getMutableObjectRuntimeView(state, objectId);
  let current: Record<string, unknown> = object;

  for (const segment of segments.slice(0, -1)) {
    const next = current[segment];
    if (!isRecord(next)) {
      throw new Error(`Cannot set path "${path}" on object "${objectId}"`);
    }

    current = next;
  }

  current[segments[segments.length - 1]] = value;
}

export function buildInitialObjectStates(
  objectStates: Record<string, { state?: Record<string, unknown> }>,
  overrides?: Record<string, Record<string, unknown> | undefined>
): Record<string, Record<string, unknown> | undefined> {
  const states: Record<string, Record<string, unknown> | undefined> = {};

  for (const [objectId, object] of Object.entries(objectStates)) {
    states[objectId] = object.state ? structuredClone(object.state) : undefined;
  }

  for (const [objectId, state] of Object.entries(overrides ?? {})) {
    states[objectId] = state ? structuredClone(state) : undefined;
  }

  return states;
}

export function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function buildObjectRuntimeView(state: RuntimeWorldState, objectId: string): Record<string, unknown> {
  return {
    state: state.objectStates[objectId] ?? {}
  };
}

function getMutableObjectRuntimeView(state: RuntimeWorldState, objectId: string): Record<string, unknown> {
  const objectState = state.objectStates[objectId] ?? {};
  state.objectStates[objectId] = objectState;
  return {
    state: objectState
  };
}

function getPathValue(root: Record<string, unknown>, path: string): unknown {
  const segments = path.split(".").filter(Boolean);
  let current: unknown = root;

  for (const segment of segments) {
    if (!isRecord(current) || !(segment in current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
