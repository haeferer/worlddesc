import type { PerceptionEvent } from "./types.js";

export interface CreatePerceptionEventInput {
  key?: string;
  type: PerceptionEvent["type"];
  roomId?: string;
  objectId?: string;
  text?: string;
  knowledge?: string[];
  isNew?: boolean;
}

let nextPerceptionEventId = 1;

export function createPerceptionEvent(input: CreatePerceptionEventInput): PerceptionEvent {
  return {
    id: buildPerceptionEventId(input),
    type: input.type,
    roomId: input.roomId,
    objectId: input.objectId,
    text: input.text,
    knowledge: input.knowledge ? [...input.knowledge] : undefined,
    isNew: input.isNew ?? true
  };
}

export function markEventsAsSeen(events: PerceptionEvent[]): PerceptionEvent[] {
  return events.map((event) => ({ ...event, isNew: false }));
}

function buildPerceptionEventId(input: CreatePerceptionEventInput): string {
  if (input.key) {
    return input.key;
  }

  const dynamicId = nextPerceptionEventId;
  nextPerceptionEventId += 1;

  return [
    "event",
    dynamicId.toString()
  ].join(":");
}
