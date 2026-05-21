import type { ObjectAssetDocument } from "../assetTypes.js";
import type {
  AssetInstance,
  AssetObjectOverride,
  Condition,
  ConditionGroup,
  Effect,
  InputCase,
  Interaction,
  InteractionOutcome,
  InteractionType,
  ObjectPlacement,
  WorldDocument,
  WorldObject
} from "../types.js";
import { validateWorldSemantics, WorldValidationError } from "../worldValidation.js";

export function expandObjectAssetInstance(
  world: WorldDocument,
  instanceId: string,
  assetInstance: AssetInstance,
  asset: ObjectAssetDocument
): WorldDocument {
  if (asset.asset.roots.length !== 1) {
    throw new WorldValidationError([
      `assetInstances.${instanceId}.asset (${asset.asset.id}) must currently expose exactly one root for world expansion`
    ]);
  }

  const expanded = structuredClone(world);
  const objectIdMap = createObjectIdMap(instanceId, asset);

  mergeInteractionTypes(expanded.interactionTypes, asset.interactionTypes, instanceId, asset.asset.id);
  mergeObjects(expanded, asset, objectIdMap, instanceId, assetInstance.objectOverrides);
  mergePlacement(expanded, asset, objectIdMap, instanceId, assetInstance.rootPlacement);
  applySlotContents(expanded, asset, assetInstance, objectIdMap, instanceId);

  const semanticErrors = validateWorldSemantics(expanded);
  if (semanticErrors.length > 0) {
    throw new WorldValidationError(semanticErrors);
  }

  return expanded;
}

function createObjectIdMap(instanceId: string, asset: ObjectAssetDocument): Record<string, string> {
  const [rootId] = asset.asset.roots;
  const idMap: Record<string, string> = {};

  for (const localObjectId of Object.keys(asset.objects)) {
    idMap[localObjectId] = localObjectId === rootId ? instanceId : `${instanceId}${capitalize(localObjectId)}`;
  }

  return idMap;
}

function mergeInteractionTypes(
  target: Record<string, InteractionType>,
  source: Record<string, InteractionType>,
  instanceId: string,
  assetId: string
): void {
  for (const [interactionTypeId, interactionType] of Object.entries(source)) {
    const existing = target[interactionTypeId];
    if (!existing) {
      target[interactionTypeId] = structuredClone(interactionType);
      continue;
    }

    if (JSON.stringify(existing) !== JSON.stringify(interactionType)) {
      throw new WorldValidationError([
        `assetInstances.${instanceId}.asset (${assetId}) interactionTypes.${interactionTypeId} conflicts with the world definition`
      ]);
    }
  }
}

function mergeObjects(
  world: WorldDocument,
  asset: ObjectAssetDocument,
  objectIdMap: Record<string, string>,
  instanceId: string,
  objectOverrides: Record<string, AssetObjectOverride> | undefined
): void {
  validateObjectOverrides(asset, objectOverrides, instanceId);

  for (const [localObjectId, object] of Object.entries(asset.objects)) {
    const expandedObjectId = objectIdMap[localObjectId];

    if (world.objects[expandedObjectId]) {
      throw new WorldValidationError([
        `assetInstances.${instanceId} would create duplicate object id "${expandedObjectId}"`
      ]);
    }

    world.objects[expandedObjectId] = rewriteObject(object, objectIdMap, objectOverrides?.[localObjectId]);
  }
}

function mergePlacement(
  world: WorldDocument,
  asset: ObjectAssetDocument,
  objectIdMap: Record<string, string>,
  instanceId: string,
  rootPlacement: ObjectPlacement
): void {
  const [rootId] = asset.asset.roots;

  for (const [localObjectId, placement] of Object.entries(asset.placement)) {
    const expandedObjectId = objectIdMap[localObjectId];

    if (world.placement[expandedObjectId]) {
      throw new WorldValidationError([
        `assetInstances.${instanceId} would create duplicate placement entry "${expandedObjectId}"`
      ]);
    }

    world.placement[expandedObjectId] =
      localObjectId === rootId ? structuredClone(rootPlacement) : rewritePlacement(placement, objectIdMap);
  }
}

function applySlotContents(
  world: WorldDocument,
  asset: ObjectAssetDocument,
  assetInstance: AssetInstance,
  objectIdMap: Record<string, string>,
  instanceId: string
): void {
  const assignedObjectIds = new Set<string>();

  for (const [slotId, objectIds] of Object.entries(assetInstance.slotContents ?? {})) {
    const slot = asset.slots?.[slotId];
    if (!slot) {
      throw new WorldValidationError([
        `assetInstances.${instanceId}.slotContents.${slotId} references unknown asset slot "${slotId}"`
      ]);
    }

    const targetObjectId = objectIdMap[slot.object];
    for (const objectId of objectIds) {
      if (!(objectId in world.objects)) {
        throw new WorldValidationError([
          `assetInstances.${instanceId}.slotContents.${slotId} references unknown world object "${objectId}"`
        ]);
      }

      if (assignedObjectIds.has(objectId)) {
        throw new WorldValidationError([
          `assetInstances.${instanceId}.slotContents assigns object "${objectId}" more than once`
        ]);
      }

      assignedObjectIds.add(objectId);
      world.placement[objectId] = {
        object: targetObjectId
      };
    }
  }
}

function rewriteObject(
  object: WorldObject,
  objectIdMap: Record<string, string>,
  objectOverride: AssetObjectOverride | undefined
): WorldObject {
  const rewrittenState = object.state ? structuredClone(object.state) : undefined;
  const mergedState =
    rewrittenState || objectOverride?.state
      ? {
          ...(rewrittenState ?? {}),
          ...(structuredClone(objectOverride?.state ?? {}) as Record<string, unknown>)
        }
      : undefined;

  return {
    ...structuredClone(object),
    title: objectOverride?.title ?? object.title,
    desc: objectOverride?.desc ?? object.desc,
    state: mergedState,
    interactions: rewriteInteractions(object.interactions, objectIdMap)
  };
}

function validateObjectOverrides(
  asset: ObjectAssetDocument,
  objectOverrides: Record<string, AssetObjectOverride> | undefined,
  instanceId: string
): void {
  for (const localObjectId of Object.keys(objectOverrides ?? {})) {
    if (!(localObjectId in asset.objects)) {
      throw new WorldValidationError([
        `assetInstances.${instanceId}.objectOverrides.${localObjectId} references unknown asset object "${localObjectId}"`
      ]);
    }
  }
}

function rewriteInteractions(
  interactions: Record<string, Interaction> | undefined,
  objectIdMap: Record<string, string>
): Record<string, Interaction> | undefined {
  if (!interactions) {
    return undefined;
  }

  const rewritten: Record<string, Interaction> = {};

  for (const [interactionId, interaction] of Object.entries(interactions)) {
    rewritten[interactionId] = {
      ...structuredClone(interaction),
      availableWhen: rewriteConditionGroup(interaction.availableWhen, objectIdMap),
      input: rewriteInteractionInput(interaction.input, objectIdMap),
      effects: interaction.effects?.map((effect) => rewriteEffect(effect, objectIdMap))
    };
  }

  return rewritten;
}

function rewriteInteractionInput(interactionInput: Interaction["input"], objectIdMap: Record<string, string>): Interaction["input"] {
  if (!interactionInput) {
    return undefined;
  }

  return {
    ...structuredClone(interactionInput),
    applyInputTo: interactionInput.applyInputTo
      ? {
          ...interactionInput.applyInputTo,
          ref: interactionInput.applyInputTo.ref ? objectIdMap[interactionInput.applyInputTo.ref] : interactionInput.applyInputTo.ref
        }
      : undefined,
    cases: interactionInput.cases?.map((inputCase) => rewriteInputCase(inputCase, objectIdMap)),
    default: rewriteInteractionOutcome(interactionInput.default, objectIdMap)
  };
}

function rewriteInputCase(inputCase: InputCase, objectIdMap: Record<string, string>): InputCase {
  return {
    ...structuredClone(inputCase),
    effects: inputCase.effects?.map((effect) => rewriteEffect(effect, objectIdMap))
  };
}

function rewriteInteractionOutcome(
  outcome: InteractionOutcome | undefined,
  objectIdMap: Record<string, string>
): InteractionOutcome | undefined {
  if (!outcome) {
    return undefined;
  }

  return {
    ...structuredClone(outcome),
    effects: outcome.effects?.map((effect) => rewriteEffect(effect, objectIdMap))
  };
}

function rewriteConditionGroup(
  group: ConditionGroup | undefined,
  objectIdMap: Record<string, string>
): ConditionGroup | undefined {
  if (!group) {
    return undefined;
  }

  return {
    all: group.all?.map((condition) => rewriteCondition(condition, objectIdMap)),
    any: group.any?.map((condition) => rewriteCondition(condition, objectIdMap)),
    not: group.not ? rewriteCondition(group.not, objectIdMap) : undefined
  };
}

function rewriteCondition(condition: Condition, objectIdMap: Record<string, string>): Condition {
  return {
    ...structuredClone(condition),
    ref: objectIdMap[condition.ref] ?? condition.ref,
    placement: condition.placement ? rewritePlacement(condition.placement, objectIdMap) : undefined
  };
}

function rewriteEffect(effect: Effect, objectIdMap: Record<string, string>): Effect {
  if (effect.type === "set") {
    return {
      ...structuredClone(effect),
      ref: effect.ref ? objectIdMap[effect.ref] ?? effect.ref : effect.ref
    };
  }

  if (effect.type === "move") {
    return {
      ...structuredClone(effect),
      ref: effect.ref ? objectIdMap[effect.ref] ?? effect.ref : effect.ref,
      to: effect.to ? rewritePlacement(effect.to, objectIdMap) : effect.to
    };
  }

  return structuredClone(effect);
}

function rewritePlacement(placement: ObjectPlacement, objectIdMap: Record<string, string>): ObjectPlacement {
  if ("object" in placement) {
    return {
      object: objectIdMap[placement.object] ?? placement.object
    };
  }

  return structuredClone(placement);
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}
