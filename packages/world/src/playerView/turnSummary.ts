import type { PlayerMemory, PlayerSceneView, PlayerTurnSummaryView } from "./types.js";

export function buildTurnSummary(
  beforeScene: PlayerSceneView,
  afterScene: PlayerSceneView,
  beforeMemory: PlayerMemory,
  afterMemory: PlayerMemory,
  eventIds: string[],
  primaryResultText?: string
): PlayerTurnSummaryView {
  const beforeVisible = new Set(beforeScene.objects.map((item) => item.objectId));
  const afterVisible = new Set(afterScene.objects.map((item) => item.objectId));
  const beforeInventory = new Set(beforeScene.inventoryObjects.map((item) => item.objectId));
  const afterInventory = new Set(afterScene.inventoryObjects.map((item) => item.objectId));
  const beforeAccessible = new Set(listAccessibleObjectIds(beforeScene));
  const afterAccessible = new Set(listAccessibleObjectIds(afterScene));
  const beforeActions = new Set(beforeScene.availableActions.map((item) => item.commandId));
  const afterActions = new Set(afterScene.availableActions.map((item) => item.commandId));
  const beforeKnownObjects = new Set(Object.keys(beforeMemory.knownObjects));
  const afterKnownObjects = new Set(Object.keys(afterMemory.knownObjects));
  const beforeKnowledge = new Set(beforeMemory.knownKnowledge);
  const afterKnowledge = new Set(afterMemory.knownKnowledge);

  return {
    primaryResultText,
    newEventIds: [...eventIds],
    newlyVisibleObjectIds: difference(afterVisible, beforeVisible),
    newlyInventoryObjectIds: difference(afterInventory, beforeInventory),
    newlyKnownObjectIds: difference(afterKnownObjects, beforeKnownObjects),
    newlyAccessibleObjectIds: difference(afterAccessible, beforeAccessible),
    newlyAvailableActionIds: difference(afterActions, beforeActions),
    newlyKnownKnowledge: difference(afterKnowledge, beforeKnowledge)
  };
}

function listAccessibleObjectIds(scene: PlayerSceneView): string[] {
  return [...scene.objects, ...scene.inventoryObjects]
    .filter((item) => item.accessible)
    .map((item) => item.objectId);
}

function difference(after: Set<string>, before: Set<string>): string[] {
  return [...after].filter((item) => !before.has(item));
}
