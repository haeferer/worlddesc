import {
  markObjectSeen,
  markRoomSeen,
  rememberKnowledge,
  rememberObjectKnowledge,
  rememberObjectText
} from "./memory.js";
import { describeObjectPerception } from "./objectPerception.js";
import { createPerceptionEvent } from "./events.js";
import { buildAvailableInteractionView, buildInteractionActionOption, buildWayActionOption } from "./interactionViews.js";
import type {
  KnownSceneObjectView,
  PerceptionEvent,
  PlayerActionOptionView,
  PlayerActionFocusView,
  PlayerMemory,
  PlayerSceneObjectView,
  PlayerSceneView,
  PreparedTextBlock,
  WorldRuntimePort
} from "./types.js";

export function buildPlayerSceneView(
  runtime: WorldRuntimePort,
  memory: PlayerMemory,
  pendingEvents: PerceptionEvent[]
): PlayerSceneView {
  const roomId = runtime.getCurrentRoomId();
  const room = runtime.getCurrentRoom();
  const visibleObjectIds = listVisibleSceneObjectIds(runtime, roomId);
  const inventoryObjectIds = runtime.getInventoryObjectIds();

  const preparedTexts: PreparedTextBlock[] = [
    {
      kind: "room",
      text: room.desc,
      isNew: hasPendingEvent(pendingEvents, `room:${roomId}:desc`)
    }
  ];

  const objects = visibleObjectIds.map((objectId) => buildSceneObjectView(runtime, memory, pendingEvents, objectId, true));
  const inventoryObjects = inventoryObjectIds.map((objectId) =>
    buildSceneObjectView(runtime, memory, pendingEvents, objectId, false)
  );
  const visibleOrInventory = new Set([...visibleObjectIds, ...inventoryObjectIds]);
  const knownButNotVisibleObjects: KnownSceneObjectView[] = Object.entries(memory.knownObjects)
    .filter(([objectId]) => !visibleOrInventory.has(objectId))
    .map(([objectId, known]) => {
      const perception = describeObjectPerception(runtime, objectId);
      return {
        objectId,
        title: runtime.world.objects[objectId]?.title ?? objectId,
        perception: perception.perception,
        currentlyAccessible: perception.accessible,
        accessibilityReason: perception.accessibilityReason,
        lastSeenAt: known.lastSeenAt,
        knownKnowledge: [...known.knownKnowledge],
        knownTexts: [...known.knownTexts]
      };
    });
  const sampleActions: PlayerActionOptionView[] = [
    ...runtime.listAvailableWays(roomId).map(buildWayActionOption),
    ...objects.flatMap((objectView) =>
      runtime
        .listAvailableInteractions(objectView.objectId)
        .map((interaction) => buildInteractionActionOption(objectView.objectId, objectView.title, interaction))
    ),
    ...inventoryObjects.flatMap((objectView) =>
      runtime
        .listAvailableInteractions(objectView.objectId)
        .map((interaction) => buildInteractionActionOption(objectView.objectId, objectView.title, interaction))
    )
  ];

  return {
    roomId,
    title: room.title,
    description: room.desc,
    preparedTexts,
    objects,
    inventoryObjects,
    knownButNotVisibleObjects,
    ways: runtime.listAvailableWays(roomId).map((way) => ({
      wayId: way.wayId,
      title: way.definition.title,
      desc: way.definition.desc
    })),
    inventoryObjectIds,
    newEvents: pendingEvents.map((event) => ({ ...event })),
    sampleActions,
    currentActionFocus: memory.currentActionFocus ? { ...memory.currentActionFocus } : undefined
  };
}

function buildSceneObjectView(
  runtime: WorldRuntimePort,
  memory: PlayerMemory,
  pendingEvents: PerceptionEvent[],
  objectId: string,
  visible: boolean
): PlayerSceneObjectView {
  const object = runtime.world.objects[objectId];
  const objectMemory = memory.knownObjects[objectId];
  const isNewDescription = !(objectMemory?.knownTexts.includes(object.desc) ?? false);
  const perception = describeObjectPerception(runtime, objectId);
  const availableInteractions = runtime.listAvailableInteractions(objectId);

  return {
    objectId,
    title: object.title,
    shortDescription: object.desc,
    perception: perception.perception,
    visible,
    accessible: perception.accessible,
    accessibilityReason: perception.accessibilityReason,
    availableInteractionIds: availableInteractions.map((item) => item.interactionId),
    availableInteractions: availableInteractions.map(buildAvailableInteractionView),
    preparedTexts: [
      {
        kind: "object",
        text: object.desc,
        isNew: isNewDescription || hasPendingEvent(pendingEvents, `object:${objectId}:desc`),
        objectId
      }
    ]
  };
}

export function syncSceneObservations(
  runtime: WorldRuntimePort,
  memory: PlayerMemory,
  pendingEvents: PerceptionEvent[]
): void {
  const roomId = runtime.getCurrentRoomId();
  const room = runtime.getCurrentRoom();
  const visibleObjectIds = listVisibleSceneObjectIds(runtime, roomId);

  if (!memory.seenRooms.includes(roomId)) {
    enqueueStableEvent(memory, pendingEvents, {
      key: `room:${roomId}:desc`,
      type: "room",
      roomId,
      text: room.desc
    });
    markRoomSeen(memory, roomId);
  }

  for (const objectId of visibleObjectIds) {
    const object = runtime.world.objects[objectId];
    const objectMemory = memory.knownObjects[objectId];

    if (!(objectMemory?.knownTexts.includes(object.desc) ?? false)) {
      enqueueStableEvent(memory, pendingEvents, {
        key: `object:${objectId}:desc`,
        type: "object",
        roomId,
        objectId,
        text: object.desc
      });
      rememberObjectText(memory, objectId, object.desc);
    }

    markObjectSeen(memory, objectId, roomId);
  }
}

export function syncRuntimeKnowledge(
  runtime: WorldRuntimePort,
  memory: PlayerMemory,
  pendingEvents: PerceptionEvent[]
): void {
  const newKnowledge = runtime.getKnowledge().filter((item) => !memory.knownKnowledge.includes(item));
  if (newKnowledge.length === 0) {
    return;
  }

  enqueueStableEvent(memory, pendingEvents, {
    key: `knowledge:${newKnowledge.join("|")}`,
    type: "system",
    knowledge: newKnowledge
  });
  rememberKnowledge(memory, newKnowledge);
}

export function rememberInteractionKnowledge(
  memory: PlayerMemory,
  objectId: string | undefined,
  knowledge: string[]
): void {
  if (knowledge.length === 0) {
    return;
  }

  rememberKnowledge(memory, knowledge);

  if (objectId) {
    rememberObjectKnowledge(memory, objectId, knowledge);
  }
}

export function listVisibleSceneObjectIds(runtime: WorldRuntimePort, roomId = runtime.getCurrentRoomId()): string[] {
  const visible: string[] = [];

  for (const objectId of runtime.getRoomObjectIds(roomId)) {
    collectVisibleObjectIds(runtime, objectId, visible);
  }

  return visible;
}

function collectVisibleObjectIds(runtime: WorldRuntimePort, objectId: string, visible: string[]): void {
  const perception = describeObjectPerception(runtime, objectId);
  if (perception.perception !== "visible") {
    return;
  }

  visible.push(objectId);

  for (const containedId of runtime.getContainedObjectIds(objectId)) {
    collectVisibleObjectIds(runtime, containedId, visible);
  }
}

function enqueueStableEvent(
  memory: PlayerMemory,
  pendingEvents: PerceptionEvent[],
  input: Parameters<typeof createPerceptionEvent>[0]
): void {
  const event = createPerceptionEvent(input);

  if (memory.deliveredEventIds.includes(event.id)) {
    return;
  }

  if (pendingEvents.some((existing) => existing.id === event.id)) {
    return;
  }

  pendingEvents.push(event);
}

function hasPendingEvent(pendingEvents: PerceptionEvent[], eventId: string): boolean {
  return pendingEvents.some((event) => event.id === eventId && event.isNew);
}
