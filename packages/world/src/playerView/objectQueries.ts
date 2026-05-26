import { buildAvailableInteractionView } from "./interactionViews.js";
import { describeObjectPerception } from "./objectPerception.js";
import { rememberObjectText } from "./memory.js";
import type {
  KnownObjectView,
  PlayerKnowledgeEntryView,
  PlayerKnowledgeProvider,
  PlayerMemory,
  PlayerNarrativeContextProvider,
  WorldRuntimePort
} from "./types.js";

export interface PlayerObjectQueryContext {
  runtime: WorldRuntimePort;
  memory: PlayerMemory;
  narrativeContextProvider?: PlayerNarrativeContextProvider;
  knowledgeProvider?: PlayerKnowledgeProvider;
}

export function buildKnownObjectView(
  context: PlayerObjectQueryContext,
  objectId: string
): KnownObjectView | null {
  const object = context.runtime.world.objects[objectId];
  if (!object) {
    return null;
  }

  if (context.runtime.isObjectAccessible(objectId)) {
    rememberObjectText(context.memory, objectId, object.desc);
  }

  const known = context.memory.knownObjects[objectId];
  if (!known) {
    return null;
  }

  const perception = describeObjectPerception(context.runtime, objectId);
  const accessible = context.runtime.isObjectAccessible(objectId);
  const availableInteractions = accessible ? context.runtime.listAvailableInteractions(objectId) : [];

  return {
    objectId,
    title: object.title,
    perception: perception.perception,
    currentlyVisible: perception.visible,
    currentlyAccessible: perception.accessible,
    accessibilityReason: perception.accessibilityReason,
    lastSeenAt: known.lastSeenAt,
    knownTexts: [...known.knownTexts],
    knownKnowledge: [...known.knownKnowledge],
    availableInteractionIds: availableInteractions.map((item) => item.interactionId),
    availableInteractions: availableInteractions.map(buildAvailableInteractionView),
    narrative: context.narrativeContextProvider?.getObjectNarrativeContext?.({
      objectId,
      roomId: context.runtime.getCurrentRoomId(),
      perception: perception.perception,
      visible: perception.visible,
      accessible: perception.accessible,
      accessibilityReason: perception.accessibilityReason,
      currentActionFocus: context.memory.currentActionFocus?.objectId === objectId
    })
  };
}

export function buildObjectKnowledgeView(
  context: PlayerObjectQueryContext,
  objectId: string
): PlayerKnowledgeEntryView | null {
  const object = context.runtime.world.objects[objectId];
  if (!object) {
    return null;
  }

  const known = context.memory.knownObjects[objectId];
  if (!known) {
    return null;
  }

  const perception = describeObjectPerception(context.runtime, objectId);

  return (
    context.knowledgeProvider?.getObjectKnowledge?.({
      objectId,
      roomId: context.runtime.getCurrentRoomId(),
      currentlyVisible: perception.visible,
      currentlyAccessible: perception.accessible,
      lastSeenAt: known.lastSeenAt
    }) ?? null
  );
}
