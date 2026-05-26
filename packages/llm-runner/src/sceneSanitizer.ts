import type { PlayerNarrativeNodeView, PlayerSceneView } from "@worlddesc/world";

export function sanitizeSceneForModel(scene: PlayerSceneView, includeSampleActions: boolean): PlayerSceneView {
  const sanitizedNarrativeContext = sanitizeNarrativeContextForModel(scene);

  if (includeSampleActions) {
    return {
      ...scene,
      narrativeContext: sanitizedNarrativeContext
    };
  }

  return {
    ...scene,
    sampleActions: [],
    narrativeContext: sanitizedNarrativeContext
  };
}

export function sanitizeActionResultForModel<T>(result: T, includeSampleActions: boolean): T {
  if (includeSampleActions || typeof result !== "object" || result === null || !("scene" in result)) {
    return result;
  }

  const actionResult = result as T & { scene: PlayerSceneView };
  return {
    ...actionResult,
    scene: sanitizeSceneForModel(actionResult.scene, false)
  };
}

export function buildTurnContextMessage(scene: PlayerSceneView): string {
  return [
    "Deterministic scene snapshot for the current player turn:",
    JSON.stringify(scene)
  ].join("\n");
}

export function buildResponsesInstructions(systemPrompt: string, scene: PlayerSceneView): string {
  return [systemPrompt, buildTurnContextMessage(scene)].join("\n\n");
}

function sanitizeNarrativeContextForModel(scene: PlayerSceneView): PlayerSceneView["narrativeContext"] {
  const context = scene.narrativeContext;
  if (!context) {
    return undefined;
  }

  const visibleObjectIds = scene.objects.map((item) => item.objectId);
  const inventoryObjectIds = scene.inventoryObjects.map((item) => item.objectId);
  const prioritizedObjectIds = uniqueIds([
    scene.currentActionFocus?.objectId,
    ...visibleObjectIds,
    ...inventoryObjectIds
  ]).slice(0, 3);

  const objectNodes: NonNullable<PlayerSceneView["narrativeContext"]>["objects"] = {};
  for (const objectId of prioritizedObjectIds) {
    const node = context.objects[objectId];
    if (node) {
      const trimmedNode = trimNarrativeNode(node, ["tone", "narrativeHints", "associations"], 2, 2);
      if (trimmedNode) {
        objectNodes[objectId] = trimmedNode;
      }
    }
  }

  const trimmed = {
    mixId: context.mixId,
    world: trimNarrativeNode(context.world, ["tone", "associations"], 2, 2),
    room: trimNarrativeNode(context.room, ["tone", "sensoryHints", "narrativeHints"], 3, 2),
    objects: objectNodes,
    currentActionFocusObject: trimNarrativeNode(
      context.currentActionFocusObject,
      ["tone", "narrativeHints", "associations"],
      2,
      2
    )
  };

  if (!trimmed.world && !trimmed.room && Object.keys(trimmed.objects).length === 0 && !trimmed.currentActionFocusObject) {
    return undefined;
  }

  return trimmed;
}

function trimNarrativeNode(
  node: PlayerNarrativeNodeView | undefined,
  fieldPriority: Array<keyof PlayerNarrativeNodeView>,
  maxFields: number,
  maxItemsPerList: number
): PlayerNarrativeNodeView | undefined {
  if (!node) {
    return undefined;
  }

  const result: Record<string, unknown> = {};
  let includedFields = 0;

  for (const field of fieldPriority) {
    if (includedFields >= maxFields) {
      break;
    }

    const value = node[field];
    if (value === undefined) {
      continue;
    }

    result[field] = Array.isArray(value) ? value.slice(0, maxItemsPerList) : value;
    includedFields += 1;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function uniqueIds(ids: Array<string | undefined>): string[] {
  return [...new Set(ids.filter((value): value is string => typeof value === "string" && value.length > 0))];
}
