import {
  markRoomSeen,
  rememberKnowledge,
  rememberObjectKnowledge,
  rememberObjectText
} from "./memory.js";
import { createPerceptionEvent } from "./events.js";
import { buildAvailableInteractionView } from "./interactionViews.js";
import type {
  PerceptionEvent,
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

  const preparedTexts: PreparedTextBlock[] = [
    {
      kind: "room",
      text: room.desc,
      isNew: hasPendingEvent(pendingEvents, `room:${roomId}:desc`)
    }
  ];

  const objects: PlayerSceneObjectView[] = visibleObjectIds.map((objectId) => {
    const object = runtime.world.objects[objectId];
    const objectMemory = memory.knownObjects[objectId];
    const isNewDescription = !(objectMemory?.knownTexts.includes(object.desc) ?? false);
    const availableInteractions = runtime.listAvailableInteractions(objectId);

    return {
      objectId,
      title: object.title,
      shortDescription: object.desc,
      accessible: runtime.isObjectAccessible(objectId),
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
  });

  return {
    roomId,
    title: room.title,
    description: room.desc,
    preparedTexts,
    objects,
    ways: runtime.listAvailableWays(roomId).map((way) => ({
      wayId: way.wayId,
      title: way.definition.title,
      desc: way.definition.desc
    })),
    inventoryObjectIds: runtime.getInventoryObjectIds(),
    newEvents: pendingEvents.map((event) => ({ ...event }))
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
  visible.push(objectId);

  if (!runtime.isObjectAccessible(objectId)) {
    return;
  }

  for (const containedId of runtime.getContainedObjectIds(objectId)) {
    if (!runtime.isObjectAccessible(containedId)) {
      continue;
    }

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
