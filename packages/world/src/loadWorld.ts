import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { ErrorObject, ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020.js";
import { parse } from "yaml";

import schema from "../../../schema/world.schema.json" with { type: "json" };
import type {
  Condition,
  ConditionGroup,
  Effect,
  Interaction,
  Room,
  StateSchema,
  StateSchemaNode,
  Way,
  WorldDocument,
  WorldObject
} from "./types.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const defaultSchemaPath = resolve(moduleDir, "../../../schema/world.schema.json");

type AjvLike = {
  compile<T>(schema: object): ValidateFunction<T>;
};

type AjvCtor = new (options?: { allErrors?: boolean; strict?: boolean; useDefaults?: boolean }) => AjvLike;

const Ajv2020Ctor = Ajv2020 as unknown as AjvCtor;

const ajv = new Ajv2020Ctor({
  allErrors: true,
  strict: false
});
const stateAjv = new Ajv2020Ctor({
  allErrors: true,
  strict: false,
  useDefaults: true
});

const validateWorld = ajv.compile<WorldDocument>(schema);
const idPattern = /^[a-z][A-Za-z0-9]*$/;

export class WorldValidationError extends Error {
  readonly details: string[];

  constructor(details: string[]) {
    super(`World validation failed:\n${details.join("\n")}`);
    this.name = "WorldValidationError";
    this.details = details;
  }
}

export async function loadWorldFile(path: string): Promise<WorldDocument> {
  const source = await readFile(path, "utf8");
  return loadWorldDocument(source);
}

export function loadWorldDocument(source: string): WorldDocument {
  const parsed = parse(source) as unknown;

  if (!validateWorld(parsed)) {
    const details =
      validateWorld.errors?.map((error: ErrorObject) => {
        const location = error.instancePath || "/";
        return `${location} ${error.message ?? "is invalid"}`;
      }) ?? ["Unknown validation error"];

    throw new WorldValidationError(details);
  }

  const world = structuredClone(parsed as WorldDocument);
  const semanticErrors = validateWorldReferences(world);

  if (semanticErrors.length > 0) {
    throw new WorldValidationError(semanticErrors);
  }

  return world;
}

export function getWorldSchemaPath(): string {
  return defaultSchemaPath;
}

export function validateWorldReferences(world: WorldDocument): string[] {
  const errors: string[] = [];

  validateIdGroup("interactionTypes", Object.keys(world.interactionTypes), errors);
  validateIdGroup("rooms", Object.keys(world.rooms), errors);
  validateIdGroup("objects", Object.keys(world.objects), errors);

  if (!(world.world.initialRoom in world.rooms)) {
    errors.push(`world.initialRoom references unknown room "${world.world.initialRoom}"`);
  }

  for (const [objectId, object] of Object.entries(world.objects)) {
    validateObjectReferences(objectId, object, world, errors);
  }

  for (const [roomId, room] of Object.entries(world.rooms)) {
    validateRoomReferences(roomId, room, world, errors);
  }

  return errors;
}

function validateRoomReferences(
  roomId: string,
  room: Room,
  world: WorldDocument,
  errors: string[]
): void {
  validateIdGroup(`rooms.${roomId}.ways`, Object.keys(room.ways ?? {}), errors);

  for (const objectId of room.objects ?? []) {
    if (!(objectId in world.objects)) {
      errors.push(`rooms.${roomId}.objects references unknown object "${objectId}"`);
    }
  }

  for (const [wayId, way] of Object.entries(room.ways ?? {})) {
    validateWayReferences(roomId, wayId, way, world, errors);
  }

  for (const [index, effect] of (room.onEnter ?? []).entries()) {
    validateEffectReference(effect, world, `rooms.${roomId}.onEnter[${index}]`, errors);
  }
}

function validateWayReferences(
  roomId: string,
  wayId: string,
  way: Way,
  world: WorldDocument,
  errors: string[]
): void {
  if (!(way.target.room in world.rooms)) {
    errors.push(`rooms.${roomId}.ways.${wayId}.target.room references unknown room "${way.target.room}"`);
  }

  validateConditionGroupReferences(way.availableWhen, world, `rooms.${roomId}.ways.${wayId}.availableWhen`, errors);
}

function validateObjectReferences(
  objectId: string,
  object: WorldObject,
  world: WorldDocument,
  errors: string[]
): void {
  validateIdGroup(`objects.${objectId}.interactions`, Object.keys(object.interactions ?? {}), errors);
  validateObjectState(objectId, object, errors);

  for (const [interactionId, interaction] of Object.entries(object.interactions ?? {})) {
    validateInteractionReferences(objectId, interactionId, interaction, world, errors);
  }
}

function validateInteractionReferences(
  objectId: string,
  interactionId: string,
  interaction: Interaction,
  world: WorldDocument,
  errors: string[]
): void {
  if (interaction.type && !(interaction.type in world.interactionTypes)) {
    errors.push(
      `objects.${objectId}.interactions.${interactionId}.type references unknown interaction type "${interaction.type}"`
    );
  }

  validateConditionGroupReferences(
    interaction.availableWhen,
    world,
    `objects.${objectId}.interactions.${interactionId}.availableWhen`,
    errors
  );

  for (const [index, effect] of (interaction.effects ?? []).entries()) {
    validateEffectReference(effect, world, `objects.${objectId}.interactions.${interactionId}.effects[${index}]`, errors);
  }
}

function validateConditionGroupReferences(
  group: ConditionGroup | undefined,
  world: WorldDocument,
  location: string,
  errors: string[]
): void {
  if (!group) {
    return;
  }

  for (const [index, condition] of (group.all ?? []).entries()) {
    validateConditionReference(condition, world, `${location}.all[${index}]`, errors);
  }

  for (const [index, condition] of (group.any ?? []).entries()) {
    validateConditionReference(condition, world, `${location}.any[${index}]`, errors);
  }

  if (group.not) {
    validateConditionReference(group.not, world, `${location}.not`, errors);
  }
}

function validateConditionReference(
  condition: Condition,
  world: WorldDocument,
  location: string,
  errors: string[]
): void {
  const target = world.objects[condition.ref];

  if (!target) {
    errors.push(`${location}.ref references unknown object "${condition.ref}"`);
    return;
  }

  if (!hasPath(target, condition.path)) {
    errors.push(`${location}.path references missing path "${condition.path}" on object "${condition.ref}"`);
  }
}

function validateEffectReference(
  effect: Effect,
  world: WorldDocument,
  location: string,
  errors: string[]
): void {
  if (effect.type === "set") {
    if (!effect.ref) {
      errors.push(`${location}.ref is required for set effects`);
      return;
    }

    if (!effect.path) {
      errors.push(`${location}.path is required for set effects`);
      return;
    }

    if (!(effect.ref in world.objects)) {
      errors.push(`${location}.ref references unknown object "${effect.ref}"`);
    }
  }

  if (effect.type === "say" && !effect.text) {
    errors.push(`${location}.text is required for say effects`);
  }

  if (effect.type === "trigger" && !effect.event) {
    errors.push(`${location}.event is required for trigger effects`);
  }
}

function hasPath(target: WorldObject, path: string): boolean {
  const segments = path.split(".").filter(Boolean);
  let current: unknown = target;

  for (const segment of segments) {
    if (!isRecord(current) || !(segment in current)) {
      return false;
    }

    current = current[segment];
  }

  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validateIdGroup(location: string, ids: string[], errors: string[]): void {
  for (const id of ids) {
    if (!idPattern.test(id)) {
      errors.push(`${location} contains invalid id "${id}"; expected camelCase matching ${idPattern.toString()}`);
    }
  }
}

function validateObjectState(objectId: string, object: WorldObject, errors: string[]): void {
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

  const validateState = stateAjv.compile(object.stateSchema as object);
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

  if (isRoot) {
    if (node.type !== "object") {
      errors.push(`${location}.type must be "object"`);
    }
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
