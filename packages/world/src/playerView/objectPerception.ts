import type { WorldRuntimePort } from "./types.js";
import type { PlayerObjectAccessibilityReason, PlayerObjectPerceptionKind } from "./types.js";

export interface ObjectPerceptionState {
  perception: PlayerObjectPerceptionKind;
  visible: boolean;
  accessible: boolean;
  accessibilityReason: PlayerObjectAccessibilityReason;
}

export function describeObjectPerception(runtime: WorldRuntimePort, objectId: string): ObjectPerceptionState {
  return describeObjectPerceptionInternal(runtime, objectId, new Set<string>());
}

function describeObjectPerceptionInternal(
  runtime: WorldRuntimePort,
  objectId: string,
  visited: Set<string>
): ObjectPerceptionState {
  if (visited.has(objectId)) {
    return {
      perception: "known",
      visible: false,
      accessible: false,
      accessibilityReason: "unknown"
    };
  }

  visited.add(objectId);
  const placement = runtime.getPlacement(objectId);
  if (!placement) {
    return {
      perception: "known",
      visible: false,
      accessible: false,
      accessibilityReason: "unknown"
    };
  }

  if ("room" in placement) {
    if (placement.room === runtime.getCurrentRoomId()) {
      return {
        perception: "visible",
        visible: true,
        accessible: true,
        accessibilityReason: "visible"
      };
    }

    return {
      perception: "known",
      visible: false,
      accessible: false,
      accessibilityReason: "other-room"
    };
  }

  if ("inventory" in placement) {
    return {
      perception: "inventory",
      visible: false,
      accessible: true,
      accessibilityReason: "inventory"
    };
  }

  if ("offstage" in placement) {
    return {
      perception: "known",
      visible: false,
      accessible: false,
      accessibilityReason: "offstage"
    };
  }

  const containerState = runtime.getObjectState(placement.object);
  if (containerState?.closed === true) {
    return {
      perception: "known",
      visible: false,
      accessible: false,
      accessibilityReason: "closed-container"
    };
  }

  const containerPerception = describeObjectPerceptionInternal(runtime, placement.object, visited);
  if (!containerPerception.accessible) {
    return {
      perception: "known",
      visible: false,
      accessible: false,
      accessibilityReason: containerPerception.accessibilityReason
    };
  }

  if (containerPerception.perception === "inventory") {
    return {
      perception: "inventory",
      visible: false,
      accessible: true,
      accessibilityReason: "inventory"
    };
  }

  return {
    perception: "visible",
    visible: true,
    accessible: true,
    accessibilityReason: "visible"
  };
}
