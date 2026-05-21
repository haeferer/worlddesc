import type {
  Condition,
  ConditionGroup,
  Effect,
  Interaction,
  InteractionOutcome,
  ObjectPlacement,
  Room,
  Way,
  WorldDocument,
  WorldObject
} from "../types.js";
import { validateIdGroup } from "./idValidation.js";
import { validateObjectPlacements } from "./placementValidation.js";
import { isValidRuntimeObjectPath } from "./pathValidation.js";

export function validateWorldReferences(
  world: WorldDocument,
  validateObjectState: (objectId: string, object: WorldObject, errors: string[]) => void
): string[] {
  const errors: string[] = [];

  validateIdGroup("interactionTypes", Object.keys(world.interactionTypes), errors);
  validateIdGroup("rooms", Object.keys(world.rooms), errors);
  validateIdGroup("objects", Object.keys(world.objects), errors);
  validateIdGroup("placement", Object.keys(world.placement), errors);

  if (!(world.player.initialRoom in world.rooms)) {
    errors.push(`player.initialRoom references unknown room "${world.player.initialRoom}"`);
  }

  validateObjectPlacements(world, errors);

  for (const [objectId, object] of Object.entries(world.objects)) {
    validateObjectReferences(objectId, object, world, errors, validateObjectState);
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
  errors: string[],
  validateObjectState: (objectId: string, object: WorldObject, errors: string[]) => void
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

  if (interaction.input) {
    validateInteractionInput(interaction, world, `objects.${objectId}.interactions.${interactionId}`, errors);
  }

  for (const [index, effect] of (interaction.effects ?? []).entries()) {
    validateEffectReference(effect, world, `objects.${objectId}.interactions.${interactionId}.effects[${index}]`, errors);
  }

  validateInteractionOutcomeReferences(
    interaction.onSuccess,
    world,
    `objects.${objectId}.interactions.${interactionId}.onSuccess`,
    errors
  );
  validateInteractionOutcomeReferences(
    interaction.onFailure,
    world,
    `objects.${objectId}.interactions.${interactionId}.onFailure`,
    errors
  );
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

  if (condition.path && !isValidRuntimeObjectPath(target, condition.path)) {
    errors.push(`${location}.path references missing path "${condition.path}" on object "${condition.ref}"`);
  }

  if (condition.placement) {
    validatePlacementTargetReference(condition.placement, world, `${location}.placement`, errors);
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
      return;
    }

    if (!isValidRuntimeObjectPath(world.objects[effect.ref], effect.path)) {
      errors.push(`${location}.path references missing path "${effect.path}" on object "${effect.ref}"`);
    }
  }

  if (effect.type === "move") {
    if (!effect.ref) {
      errors.push(`${location}.ref is required for move effects`);
      return;
    }

    if (!(effect.ref in world.objects)) {
      errors.push(`${location}.ref references unknown object "${effect.ref}"`);
      return;
    }

    if (!effect.to) {
      errors.push(`${location}.to is required for move effects`);
      return;
    }

    validatePlacementTargetReference(effect.to, world, `${location}.to`, errors);
  }

  if (effect.type === "say" && !effect.text) {
    errors.push(`${location}.text is required for say effects`);
  }

  if (effect.type === "trigger" && !effect.event) {
    errors.push(`${location}.event is required for trigger effects`);
  }
}

function validatePlacementTargetReference(
  placement: ObjectPlacement,
  world: WorldDocument,
  location: string,
  errors: string[]
): void {
  if ("room" in placement && !(placement.room in world.rooms)) {
    errors.push(`${location}.room references unknown room "${placement.room}"`);
  }

  if ("object" in placement && !(placement.object in world.objects)) {
    errors.push(`${location}.object references unknown object "${placement.object}"`);
  }

  if ("inventory" in placement && placement.inventory !== "player") {
    errors.push(`${location}.inventory must currently be "player"`);
  }
}

function validateInteractionOutcomeReferences(
  outcome: InteractionOutcome | undefined,
  world: WorldDocument,
  location: string,
  errors: string[]
): void {
  if (!outcome) {
    return;
  }

  for (const [index, effect] of (outcome.effects ?? []).entries()) {
    validateEffectReference(effect, world, `${location}.effects[${index}]`, errors);
  }
}

function validateInteractionInput(interaction: Interaction, world: WorldDocument, location: string, errors: string[]): void {
  if (interaction.effects || interaction.result) {
    errors.push(`${location} must use onSuccess/onFailure instead of top-level effects/result when input is defined`);
  }

  if (!interaction.onSuccess && !interaction.onFailure) {
    errors.push(`${location} must define onSuccess or onFailure when input is defined`);
  }

  if (interaction.input?.mode === "text" && interaction.input.minLength !== undefined && interaction.input.maxLength !== undefined) {
    if (interaction.input.minLength > interaction.input.maxLength) {
      errors.push(`${location}.input.minLength must not be greater than maxLength`);
    }
  }

  if (interaction.input?.mode === "text" && interaction.input.pattern) {
    try {
      new RegExp(interaction.input.pattern);
    } catch {
      errors.push(`${location}.input.pattern is not a valid regular expression`);
    }
  }

  if (interaction.input?.mode === "select") {
    const seenValues = new Set<string>();
    for (const option of interaction.input.options) {
      if (seenValues.has(option.value)) {
        errors.push(`${location}.input.options contains duplicate value "${option.value}"`);
      }
      seenValues.add(option.value);
    }

    if (interaction.input.equals !== undefined && !seenValues.has(interaction.input.equals)) {
      errors.push(`${location}.input.equals must be one of the declared select option values`);
    }
  }

  if (interaction.input?.mode === "number") {
    if (interaction.input.min !== undefined && interaction.input.max !== undefined && interaction.input.min > interaction.input.max) {
      errors.push(`${location}.input.min must not be greater than max`);
    }

    if (interaction.input.step !== undefined && interaction.input.step <= 0) {
      errors.push(`${location}.input.step must be greater than 0`);
    }

    if (interaction.input.equals !== undefined) {
      if (interaction.input.min !== undefined && interaction.input.equals < interaction.input.min) {
        errors.push(`${location}.input.equals must not be smaller than min`);
      }

      if (interaction.input.max !== undefined && interaction.input.equals > interaction.input.max) {
        errors.push(`${location}.input.equals must not be greater than max`);
      }
    }
  }

  if (interaction.input?.applyInputTo) {
    if (!interaction.input.applyInputTo.ref) {
      errors.push(`${location}.input.applyInputTo.ref is required`);
    } else if (!(interaction.input.applyInputTo.ref in world.objects)) {
      errors.push(`${location}.input.applyInputTo.ref references unknown object "${interaction.input.applyInputTo.ref}"`);
    }

    if (!interaction.input.applyInputTo.path) {
      errors.push(`${location}.input.applyInputTo.path is required`);
    } else if (
      interaction.input.applyInputTo.ref &&
      world.objects[interaction.input.applyInputTo.ref] &&
      !isValidRuntimeObjectPath(world.objects[interaction.input.applyInputTo.ref], interaction.input.applyInputTo.path)
    ) {
      errors.push(
        `${location}.input.applyInputTo.path references missing path "${interaction.input.applyInputTo.path}" on object "${interaction.input.applyInputTo.ref}"`
      );
    }
  }
}
