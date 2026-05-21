import type {
  Condition,
  ConditionGroup,
  Effect,
  InputCase,
  Interaction,
  InteractionOutcome,
  WorldObject
} from "../types.js";
import type { AssetPlacement, ObjectAssetDocument } from "../assetTypes.js";
import { validateIdGroup } from "./idValidation.js";
import { isValidRuntimeObjectPath } from "./pathValidation.js";

export function validateObjectAssetReferences(
  asset: ObjectAssetDocument,
  validateObjectState: (objectId: string, object: WorldObject, errors: string[]) => void
): string[] {
  const errors: string[] = [];

  validateIdGroup("asset.roots", asset.asset.roots, errors);
  validateIdGroup("interactionTypes", Object.keys(asset.interactionTypes), errors);
  validateIdGroup("objects", Object.keys(asset.objects), errors);
  validateIdGroup("placement", Object.keys(asset.placement), errors);

  validateAssetRoots(asset, errors);
  validateAssetPlacements(asset, errors);
  validateAssetSlots(asset, errors);

  for (const [objectId, object] of Object.entries(asset.objects)) {
    validateObjectReferences(objectId, object, asset, errors, validateObjectState);
  }

  return errors;
}

function validateAssetSlots(asset: ObjectAssetDocument, errors: string[]): void {
  validateIdGroup("slots", Object.keys(asset.slots ?? {}), errors);

  for (const [slotId, slot] of Object.entries(asset.slots ?? {})) {
    if (!(slot.object in asset.objects)) {
      errors.push(`slots.${slotId}.object references unknown object "${slot.object}"`);
    }
  }
}

function validateAssetRoots(asset: ObjectAssetDocument, errors: string[]): void {
  if (asset.asset.roots.length === 0) {
    errors.push("asset.roots must declare at least one root object");
  }

  for (const [index, rootId] of asset.asset.roots.entries()) {
    if (!(rootId in asset.objects)) {
      errors.push(`asset.roots[${index}] references unknown object "${rootId}"`);
      continue;
    }

    const placement = asset.placement[rootId];
    if (!placement) {
      errors.push(`asset.roots[${index}] has no placement entry in placement.${rootId}`);
      continue;
    }

    if (!("offstage" in placement)) {
      errors.push(`asset.roots[${index}] must use offstage placement in phase 0 assets`);
    }
  }
}

function validateAssetPlacements(asset: ObjectAssetDocument, errors: string[]): void {
  for (const objectId of Object.keys(asset.placement)) {
    if (!(objectId in asset.objects)) {
      errors.push(`placement.${objectId} references unknown object "${objectId}"`);
    }
  }

  for (const objectId of Object.keys(asset.objects)) {
    if (!(objectId in asset.placement)) {
      errors.push(`objects.${objectId} has no initial placement entry in placement.${objectId}`);
    }
  }

  const rootIds = new Set(asset.asset.roots);

  for (const [objectId, placement] of Object.entries(asset.placement)) {
    if ("object" in placement) {
      if (!(placement.object in asset.objects)) {
        errors.push(`placement.${objectId}.object references unknown object "${placement.object}"`);
        continue;
      }

      if (placement.object === objectId) {
        errors.push(`placement.${objectId}.object cannot reference itself`);
      }
    }

    if ("offstage" in placement && !rootIds.has(objectId)) {
      errors.push(`placement.${objectId}.offstage is only allowed for declared asset roots`);
    }
  }

  detectPlacementCycles(asset, errors);
}

function detectPlacementCycles(asset: ObjectAssetDocument, errors: string[]): void {
  const visited = new Set<string>();
  const active = new Set<string>();

  for (const objectId of Object.keys(asset.placement)) {
    visitPlacement(objectId, asset, visited, active, errors);
  }
}

function visitPlacement(
  objectId: string,
  asset: ObjectAssetDocument,
  visited: Set<string>,
  active: Set<string>,
  errors: string[]
): void {
  if (visited.has(objectId)) {
    return;
  }

  if (active.has(objectId)) {
    errors.push(`placement cycle detected at object "${objectId}"`);
    return;
  }

  const placement = asset.placement[objectId];
  if (!placement) {
    return;
  }

  active.add(objectId);

  if ("object" in placement) {
    visitPlacement(placement.object, asset, visited, active, errors);
  }

  active.delete(objectId);
  visited.add(objectId);
}

function validateObjectReferences(
  objectId: string,
  object: WorldObject,
  asset: ObjectAssetDocument,
  errors: string[],
  validateObjectState: (objectId: string, object: WorldObject, errors: string[]) => void
): void {
  validateIdGroup(`objects.${objectId}.interactions`, Object.keys(object.interactions ?? {}), errors);
  validateObjectState(objectId, object, errors);

  for (const [interactionId, interaction] of Object.entries(object.interactions ?? {})) {
    validateInteractionReferences(objectId, interactionId, interaction, asset, errors);
  }
}

function validateInteractionReferences(
  objectId: string,
  interactionId: string,
  interaction: Interaction,
  asset: ObjectAssetDocument,
  errors: string[]
): void {
  if (interaction.type && !(interaction.type in asset.interactionTypes)) {
    errors.push(
      `objects.${objectId}.interactions.${interactionId}.type references unknown interaction type "${interaction.type}"`
    );
  }

  validateConditionGroupReferences(
    interaction.availableWhen,
    asset,
    `objects.${objectId}.interactions.${interactionId}.availableWhen`,
    errors
  );

  if (interaction.input) {
    validateInteractionInput(interaction, asset, `objects.${objectId}.interactions.${interactionId}`, errors);
  }

  for (const [index, effect] of (interaction.effects ?? []).entries()) {
    validateEffectReference(effect, asset, `objects.${objectId}.interactions.${interactionId}.effects[${index}]`, errors);
  }
}

function validateConditionGroupReferences(
  group: ConditionGroup | undefined,
  asset: ObjectAssetDocument,
  location: string,
  errors: string[]
): void {
  if (!group) {
    return;
  }

  for (const [index, condition] of (group.all ?? []).entries()) {
    validateConditionReference(condition, asset, `${location}.all[${index}]`, errors);
  }

  for (const [index, condition] of (group.any ?? []).entries()) {
    validateConditionReference(condition, asset, `${location}.any[${index}]`, errors);
  }

  if (group.not) {
    validateConditionReference(group.not, asset, `${location}.not`, errors);
  }
}

function validateConditionReference(
  condition: Condition,
  asset: ObjectAssetDocument,
  location: string,
  errors: string[]
): void {
  const target = asset.objects[condition.ref];

  if (!target) {
    errors.push(`${location}.ref references unknown object "${condition.ref}"`);
    return;
  }

  if (condition.path && !isValidRuntimeObjectPath(target, condition.path)) {
    errors.push(`${location}.path references missing path "${condition.path}" on object "${condition.ref}"`);
  }

  if (condition.placement) {
    validatePlacementTargetReference(condition.placement as AssetPlacement, asset, `${location}.placement`, errors);
  }
}

function validateEffectReference(
  effect: Effect,
  asset: ObjectAssetDocument,
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

    if (!(effect.ref in asset.objects)) {
      errors.push(`${location}.ref references unknown object "${effect.ref}"`);
      return;
    }

    if (!isValidRuntimeObjectPath(asset.objects[effect.ref], effect.path)) {
      errors.push(`${location}.path references missing path "${effect.path}" on object "${effect.ref}"`);
    }
  }

  if (effect.type === "move") {
    if (!effect.ref) {
      errors.push(`${location}.ref is required for move effects`);
      return;
    }

    if (!(effect.ref in asset.objects)) {
      errors.push(`${location}.ref references unknown object "${effect.ref}"`);
      return;
    }

    if (!effect.to) {
      errors.push(`${location}.to is required for move effects`);
      return;
    }

    validatePlacementTargetReference(effect.to as AssetPlacement, asset, `${location}.to`, errors);
  }

  if (effect.type === "say" && !effect.text) {
    errors.push(`${location}.text is required for say effects`);
  }

  if (effect.type === "trigger" && !effect.event) {
    errors.push(`${location}.event is required for trigger effects`);
  }
}

function validatePlacementTargetReference(
  placement: AssetPlacement,
  asset: ObjectAssetDocument,
  location: string,
  errors: string[]
): void {
  if ("object" in placement && !(placement.object in asset.objects)) {
    errors.push(`${location}.object references unknown object "${placement.object}"`);
  }
}

function validateInteractionOutcomeReferences(
  outcome: InteractionOutcome | undefined,
  asset: ObjectAssetDocument,
  location: string,
  errors: string[]
): void {
  if (!outcome) {
    return;
  }

  for (const [index, effect] of (outcome.effects ?? []).entries()) {
    validateEffectReference(effect, asset, `${location}.effects[${index}]`, errors);
  }
}

function validateInteractionInput(
  interaction: Interaction,
  asset: ObjectAssetDocument,
  location: string,
  errors: string[]
): void {
  if (interaction.effects || interaction.result) {
    errors.push(`${location} must use input.cases/default instead of top-level effects/result when input is defined`);
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
  }

  if (interaction.input?.mode === "number") {
    if (interaction.input.min !== undefined && interaction.input.max !== undefined && interaction.input.min > interaction.input.max) {
      errors.push(`${location}.input.min must not be greater than max`);
    }

    if (interaction.input.step !== undefined && interaction.input.step <= 0) {
      errors.push(`${location}.input.step must be greater than 0`);
    }
  }

  if (interaction.input?.applyInputTo) {
    if (!interaction.input.applyInputTo.ref) {
      errors.push(`${location}.input.applyInputTo.ref is required`);
    } else if (!(interaction.input.applyInputTo.ref in asset.objects)) {
      errors.push(`${location}.input.applyInputTo.ref references unknown object "${interaction.input.applyInputTo.ref}"`);
    }

    if (!interaction.input.applyInputTo.path) {
      errors.push(`${location}.input.applyInputTo.path is required`);
    } else if (
      interaction.input.applyInputTo.ref &&
      asset.objects[interaction.input.applyInputTo.ref] &&
      !isValidRuntimeObjectPath(asset.objects[interaction.input.applyInputTo.ref], interaction.input.applyInputTo.path)
    ) {
      errors.push(
        `${location}.input.applyInputTo.path references missing path "${interaction.input.applyInputTo.path}" on object "${interaction.input.applyInputTo.ref}"`
      );
    }
  }

  for (const [index, inputCase] of (interaction.input?.cases ?? []).entries()) {
    validateInputCase(inputCase, interaction, asset, `${location}.input.cases[${index}]`, errors);
  }

  validateInteractionOutcomeReferences(interaction.input?.default, asset, `${location}.input.default`, errors);
}

function validateInputCase(
  inputCase: InputCase,
  interaction: Interaction,
  asset: ObjectAssetDocument,
  location: string,
  errors: string[]
): void {
  if (inputCase.equals === undefined && inputCase.min === undefined && inputCase.max === undefined) {
    errors.push(`${location} must define at least one matcher`);
  }

  if (interaction.input?.mode !== "number" && (inputCase.min !== undefined || inputCase.max !== undefined)) {
    errors.push(`${location}.min/max are only supported for number inputs`);
  }

  if (interaction.input?.mode === "number") {
    if (typeof inputCase.equals === "string") {
      errors.push(`${location}.equals must be numeric for number inputs`);
    }

    if (inputCase.min !== undefined && inputCase.max !== undefined && inputCase.min > inputCase.max) {
      errors.push(`${location}.min must not be greater than max`);
    }
  }

  if (interaction.input?.mode !== "number" && typeof inputCase.equals === "number") {
    errors.push(`${location}.equals must be a string for text/select inputs`);
  }

  if (interaction.input?.mode === "select" && typeof inputCase.equals === "string") {
    const allowedValues = new Set(interaction.input.options.map((option) => option.value));
    if (!allowedValues.has(inputCase.equals)) {
      errors.push(`${location}.equals must be one of the declared select option values`);
    }
  }

  validateInteractionOutcomeReferences(
    {
      effects: inputCase.effects,
      result: inputCase.result
    },
    asset,
    location,
    errors
  );
}
