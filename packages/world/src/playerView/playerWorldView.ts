import { resolvePlayerActionCommand } from "./actionResolution.js";
import { createPerceptionEvent } from "./events.js";
import { buildAvailableInteractionView } from "./interactionViews.js";
import { createEmptyPlayerMemory, markEventDelivered, rememberObjectText } from "./memory.js";
import {
  buildPlayerSceneView,
  rememberInteractionKnowledge,
  syncRuntimeKnowledge,
  syncSceneObservations
} from "./scene.js";
import type {
  PlayerActionCommand,
  PlayerActionFailureCode,
  KnownObjectView,
  PerceptionEvent,
  PlayerActionResultView,
  PlayerMemory,
  PlayerSceneView,
  PlayerWorldView,
  WorldRuntimePort
} from "./types.js";

export interface PlayerWorldViewContext {
  runtime: WorldRuntimePort;
  memory?: PlayerMemory;
}

export class RuntimeBackedPlayerWorldView implements PlayerWorldView {
  private readonly memory: PlayerMemory;
  private readonly pendingEvents: PerceptionEvent[] = [];

  constructor(private readonly context: PlayerWorldViewContext) {
    this.memory = context.memory ? structuredClone(context.memory) : createEmptyPlayerMemory();
    this.capturePassiveObservations();
  }

  getCurrentScene(): PlayerSceneView {
    this.capturePassiveObservations();
    return buildPlayerSceneView(this.context.runtime, this.memory, this.pendingEvents);
  }

  getKnownObject(objectId: string): KnownObjectView | null {
    this.capturePassiveObservations();

    const object = this.context.runtime.world.objects[objectId];
    if (!object) {
      return null;
    }

    if (this.context.runtime.isObjectAccessible(objectId)) {
      rememberObjectText(this.memory, objectId, object.desc);
    }

    const known = this.memory.knownObjects[objectId];
    if (!known) {
      return null;
    }

    return {
      objectId,
      title: object.title,
      knownTexts: [...known.knownTexts],
      knownKnowledge: [...known.knownKnowledge],
      availableInteractionIds: this.context.runtime.isObjectAccessible(objectId)
        ? this.context.runtime.listAvailableInteractions(objectId).map((item) => item.interactionId)
        : [],
      availableInteractions: this.context.runtime.isObjectAccessible(objectId)
        ? this.context.runtime.listAvailableInteractions(objectId).map(buildAvailableInteractionView)
        : []
    };
  }

  getNewEvents(): PerceptionEvent[] {
    this.capturePassiveObservations();
    const events = this.pendingEvents.map((event) => ({ ...event }));
    this.clearPendingEvents();
    return events;
  }

  performAction(action: PlayerActionCommand): PlayerActionResultView {
    const runtime = this.context.runtime;
    const resolvedAction = resolvePlayerActionCommand(action);

    if (resolvedAction.kind === "interaction") {
      const object = runtime.world.objects[resolvedAction.objectId];
      if (!object) {
        return this.buildRejectedResult("unknown-object", `Unknown object "${resolvedAction.objectId}"`, resolvedAction);
      }

      const interaction = object.interactions?.[resolvedAction.interactionId];
      if (!interaction) {
        return this.buildRejectedResult(
          "unknown-action",
          `Unknown interaction "${resolvedAction.interactionId}" on object "${resolvedAction.objectId}"`,
          resolvedAction
        );
      }

      if (!runtime.isObjectAccessible(resolvedAction.objectId)) {
        return this.buildRejectedResult(
          "object-not-accessible",
          `Object "${resolvedAction.objectId}" is not currently accessible`,
          resolvedAction
        );
      }

      const availableInteractions = runtime.listAvailableInteractions(resolvedAction.objectId);
      if (!availableInteractions.some((item) => item.interactionId === resolvedAction.interactionId)) {
        return this.buildRejectedResult(
          "action-not-available",
          `Interaction "${resolvedAction.interactionId}" on object "${resolvedAction.objectId}" is currently not available`,
          resolvedAction
        );
      }
    } else {
      const currentRoom = runtime.getCurrentRoom();
      const knownWay = currentRoom.ways?.[resolvedAction.wayId];
      if (!knownWay) {
        return this.buildRejectedResult("unknown-action", `Unknown way "${resolvedAction.wayId}"`, resolvedAction);
      }

      const availableWays = runtime.listAvailableWays();
      if (!availableWays.some((item) => item.wayId === resolvedAction.wayId)) {
        return this.buildRejectedResult(
          "action-not-available",
          `Way "${resolvedAction.wayId}" is currently not available`,
          resolvedAction
        );
      }
    }

    try {
      let text: string | undefined;
      if (resolvedAction.kind === "interaction") {
        const result = runtime.executeInteraction(
          resolvedAction.objectId,
          resolvedAction.interactionId,
          action.kind === "interaction" ? action.additionalText : undefined
        );
        text = result.text;

        if (result.text) {
          this.pendingEvents.push(
            createPerceptionEvent({
              type: "interaction",
              objectId: resolvedAction.objectId,
              text: result.text
            })
          );
        }

        for (const sayText of result.say) {
          this.pendingEvents.push(
            createPerceptionEvent({
              type: "system",
              objectId: resolvedAction.objectId,
              text: sayText
            })
          );
        }

        if (result.knowledgeGained.length > 0) {
          rememberInteractionKnowledge(this.memory, resolvedAction.objectId, result.knowledgeGained);
          this.pendingEvents.push(
            createPerceptionEvent({
              type: "interaction",
              objectId: resolvedAction.objectId,
              knowledge: result.knowledgeGained
            })
          );
        }
      } else {
        const result = runtime.executeWay(resolvedAction.wayId);

        for (const sayText of result.say) {
          this.pendingEvents.push(
            createPerceptionEvent({
              type: "system",
              roomId: runtime.getCurrentRoomId(),
              text: sayText
            })
          );
        }
      }

      this.capturePassiveObservations();
      const scene = buildPlayerSceneView(runtime, this.memory, this.pendingEvents);
      const events = scene.newEvents.map((event) => ({ ...event }));
      this.clearPendingEvents();

      return {
        accepted: true,
        text,
        events,
        scene
      };
    } catch {
      return this.buildRejectedResult("execution-failed", "Action failed during execution", resolvedAction);
    }
  }

  getRuntime(): WorldRuntimePort {
    return this.context.runtime;
  }

  private capturePassiveObservations(): void {
    syncSceneObservations(this.context.runtime, this.memory, this.pendingEvents);
    syncRuntimeKnowledge(this.context.runtime, this.memory, this.pendingEvents);
  }

  private clearPendingEvents(): void {
    for (const event of this.pendingEvents) {
      markEventDelivered(this.memory, event.id);
    }

    this.pendingEvents.splice(0, this.pendingEvents.length);
  }

  private buildRejectedResult(
    code: PlayerActionFailureCode,
    message: string,
    action: { kind: string; objectId?: string; interactionId?: string; wayId?: string }
  ): PlayerActionResultView {
    const scene = this.getCurrentScene();
    return {
      accepted: false,
      text: message,
      events: [],
      scene,
      failure: {
        code,
        message,
        objectId: action.objectId,
        actionId: action.kind === "interaction" ? action.interactionId : action.wayId
      }
    };
  }
}

export function createPlayerWorldView(context: PlayerWorldViewContext): PlayerWorldView {
  return new RuntimeBackedPlayerWorldView(context);
}
