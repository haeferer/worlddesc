import type { KnownObjectMemory, PlayerMemory } from "./types.js";

export function createEmptyPlayerMemory(): PlayerMemory {
  return {
    knownKnowledge: [],
    seenRooms: [],
    knownObjects: {},
    deliveredEventIds: []
  };
}

export function markRoomSeen(memory: PlayerMemory, roomId: string): void {
  if (!memory.seenRooms.includes(roomId)) {
    memory.seenRooms.push(roomId);
  }
}

export function rememberKnowledge(memory: PlayerMemory, knowledge: string[]): void {
  for (const item of knowledge) {
    if (!memory.knownKnowledge.includes(item)) {
      memory.knownKnowledge.push(item);
    }
  }
}

export function rememberObjectText(memory: PlayerMemory, objectId: string, text: string): void {
  const objectMemory = ensureKnownObjectMemory(memory, objectId);
  if (!objectMemory.knownTexts.includes(text)) {
    objectMemory.knownTexts.push(text);
  }
}

export function rememberObjectKnowledge(memory: PlayerMemory, objectId: string, knowledge: string[]): void {
  const objectMemory = ensureKnownObjectMemory(memory, objectId);
  for (const item of knowledge) {
    if (!objectMemory.knownKnowledge.includes(item)) {
      objectMemory.knownKnowledge.push(item);
    }
  }
}

export function markEventDelivered(memory: PlayerMemory, eventId: string): void {
  if (!memory.deliveredEventIds.includes(eventId)) {
    memory.deliveredEventIds.push(eventId);
  }
}

function ensureKnownObjectMemory(memory: PlayerMemory, objectId: string): KnownObjectMemory {
  const known = memory.knownObjects[objectId];
  if (known) {
    return known;
  }

  const created: KnownObjectMemory = {
    knownTexts: [],
    knownKnowledge: []
  };
  memory.knownObjects[objectId] = created;
  return created;
}
