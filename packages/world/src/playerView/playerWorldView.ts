import { resolvePlayerActionCommand } from "./actionResolution.js";
import { createActionFailure, validateActionInput } from "./actionFeedback.js";
import { createPerceptionEvent } from "./events.js";
import { buildIntentSurface } from "./intentSurface.js";
import { resolvePlayerIntent } from "./intentResolution.js";
import { buildAvailableInteractionView } from "./interactionViews.js";
import { createEmptyPlayerMemory, markEventDelivered, rememberObjectText, setCurrentActionFocus } from "./memory.js";
import { describeObjectPerception } from "./objectPerception.js";
import {
  buildPlayerSceneView,
  rememberInteractionKnowledge,
  syncRuntimeKnowledge,
  syncSceneObservations
} from "./scene.js";
import { buildTurnSummary } from "./turnSummary.js";
import type {
  PlayerActionCommand,
  KnownObjectView,
  PerceptionEvent,
  PlayerActionResultView,
  PlayerMemory,
  PlayerNarrativeContextProvider,
  PlayerSceneView,
  PlayerWorldView,
  WorldRuntimePort
} from "./types.js";
import type { PlayerIntentCommand, PlayerIntentResolution, PlayerIntentSurfaceView } from "./intentTypes.js";

export interface PlayerWorldViewContext {
  runtime: WorldRuntimePort;
  memory?: PlayerMemory;
  narrativeContextProvider?: PlayerNarrativeContextProvider;
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
    return buildPlayerSceneView(
      this.context.runtime,
      this.memory,
      this.pendingEvents,
      this.context.narrativeContextProvider
    );
  }

  getIntentSurface(): PlayerIntentSurfaceView {
    return buildIntentSurface(this.getCurrentScene());
  }

  resolveIntent(intent: PlayerIntentCommand): PlayerIntentResolution {
    return resolvePlayerIntent(this.getCurrentScene(), intent);
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

    const perception = describeObjectPerception(this.context.runtime, objectId);

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
      availableInteractionIds: this.context.runtime.isObjectAccessible(objectId)
        ? this.context.runtime.listAvailableInteractions(objectId).map((item) => item.interactionId)
        : [],
      availableInteractions: this.context.runtime.isObjectAccessible(objectId)
        ? this.context.runtime.listAvailableInteractions(objectId).map(buildAvailableInteractionView)
        : [],
      narrative: this.context.narrativeContextProvider?.getObjectNarrativeContext?.({
        objectId,
        roomId: this.context.runtime.getCurrentRoomId(),
        perception: perception.perception,
        visible: perception.visible,
        accessible: perception.accessible,
        accessibilityReason: perception.accessibilityReason,
        currentActionFocus: this.memory.currentActionFocus?.objectId === objectId
      })
    };
  }

  getNewEvents(): PerceptionEvent[] {
    this.capturePassiveObservations();
    const events = this.pendingEvents.map((event) => ({ ...event }));
    this.clearPendingEvents();
    return events;
  }

  performIntent(intent: PlayerIntentCommand): PlayerActionResultView {
    const resolution = this.resolveIntent(intent);
    if (resolution.status === "resolved") {
      return this.performAction(resolution.command);
    }

    return this.buildRejectedResult(
      createActionFailure({
        code:
          resolution.issue.code === "unknown-object1"
            ? "unknown-object"
            : resolution.issue.code === "missing-object1"
              ? "unknown-action"
              : resolution.issue.code === "ambiguous-intent"
                ? "action-not-available"
                : resolution.issue.code === "object2-not-supported" || resolution.issue.code === "intent-not-available"
                  ? "action-not-available"
                  : "unknown-action",
        kind:
          resolution.issue.code === "unknown-object1" || resolution.issue.code === "unknown-object2"
            ? "unknown"
            : "availability",
        message: resolution.issue.message,
        retryable: resolution.issue.retryable,
        objectId: resolution.issue.object1,
        actionId: resolution.issue.verb,
        details: resolution.issue.candidateActionIds
          ? {
              allowedValues: resolution.issue.candidateActionIds
            }
          : undefined
      })
    );
  }

  performAction(action: PlayerActionCommand): PlayerActionResultView {
    const runtime = this.context.runtime;
    const resolvedAction = resolvePlayerActionCommand(action);

    if (resolvedAction.kind === "interaction") {
      const object = runtime.world.objects[resolvedAction.objectId];
      if (!object) {
        return this.buildRejectedResult(
          createActionFailure({
            code: "unknown-object",
            kind: "unknown",
            message: `Unknown object "${resolvedAction.objectId}"`,
            retryable: false,
            objectId: resolvedAction.objectId,
            actionId: resolvedAction.interactionId
          })
        );
      }

      const interaction = object.interactions?.[resolvedAction.interactionId];
      if (!interaction) {
        return this.buildRejectedResult(
          createActionFailure({
            code: "unknown-action",
            kind: "unknown",
            message: `Unknown interaction "${resolvedAction.interactionId}" on object "${resolvedAction.objectId}"`,
            retryable: false,
            objectId: resolvedAction.objectId,
            actionId: resolvedAction.interactionId
          })
        );
      }

      if (!runtime.isObjectAccessible(resolvedAction.objectId)) {
        return this.buildRejectedResult(
          createActionFailure({
            code: "object-not-accessible",
            kind: "availability",
            message: `Object "${resolvedAction.objectId}" is not currently accessible`,
            retryable: false,
            objectId: resolvedAction.objectId,
            actionId: resolvedAction.interactionId
          })
        );
      }

      const availableInteractions = runtime.listAvailableInteractions(resolvedAction.objectId);
      if (!availableInteractions.some((item) => item.interactionId === resolvedAction.interactionId)) {
        return this.buildRejectedResult(
          createActionFailure({
            code: "action-not-available",
            kind: "availability",
            message: `Interaction "${resolvedAction.interactionId}" on object "${resolvedAction.objectId}" is currently not available`,
            retryable: false,
            objectId: resolvedAction.objectId,
            actionId: resolvedAction.interactionId
          })
        );
      }

      const interactionInputFailure = validateActionInput(
        resolvedAction.interactionId,
        buildAvailableInteractionView({
          objectId: resolvedAction.objectId,
          interactionId: resolvedAction.interactionId,
          definition: interaction
        }).input,
        action.kind === "interaction" ? action.additionalText : undefined
      );
      if (interactionInputFailure) {
        return this.buildRejectedResult({
          ...interactionInputFailure,
          objectId: resolvedAction.objectId
        });
      }
    } else {
      const currentRoom = runtime.getCurrentRoom();
      const knownWay = currentRoom.ways?.[resolvedAction.wayId];
      if (!knownWay) {
        return this.buildRejectedResult(
          createActionFailure({
            code: "unknown-action",
            kind: "unknown",
            message: `Unknown way "${resolvedAction.wayId}"`,
            retryable: false,
            actionId: resolvedAction.wayId
          })
        );
      }

      const availableWays = runtime.listAvailableWays();
      if (!availableWays.some((item) => item.wayId === resolvedAction.wayId)) {
        return this.buildRejectedResult(
          createActionFailure({
            code: "action-not-available",
            kind: "availability",
            message: `Way "${resolvedAction.wayId}" is currently not available`,
            retryable: false,
            actionId: resolvedAction.wayId
          })
        );
      }
    }

    try {
      const beforeScene = this.getCurrentScene();
      const beforeMemory = structuredClone(this.memory);
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
      const scene = buildPlayerSceneView(
        runtime,
        this.memory,
        this.pendingEvents,
        this.context.narrativeContextProvider
      );
      const events = scene.newEvents.map((event) => ({ ...event }));
      const turn = buildTurnSummary(
        beforeScene,
        scene,
        beforeMemory,
        this.memory,
        events.map((event) => event.id),
        text
      );
      setCurrentActionFocus(this.memory, {
        objectId: resolvedAction.kind === "interaction" ? resolvedAction.objectId : undefined,
        actionId: resolvedAction.kind === "interaction" ? resolvedAction.interactionId : resolvedAction.wayId,
        accepted: true,
        primaryResultText: turn.primaryResultText ?? text
      });
      const sceneWithFocus = buildPlayerSceneView(
        runtime,
        this.memory,
        this.pendingEvents,
        this.context.narrativeContextProvider
      );
      this.clearPendingEvents();

      return {
        accepted: true,
        text,
        events,
        scene: sceneWithFocus,
        turn
      };
    } catch {
      return this.buildRejectedResult(
        createActionFailure({
          code: "execution-failed",
          kind: "execution",
          message: "Action failed during execution",
          retryable: false,
          objectId: resolvedAction.kind === "interaction" ? resolvedAction.objectId : undefined,
          actionId: resolvedAction.kind === "interaction" ? resolvedAction.interactionId : resolvedAction.wayId
        })
      );
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

  private buildRejectedResult(failure: PlayerActionResultView["failure"]): PlayerActionResultView {
    setCurrentActionFocus(this.memory, {
      objectId: failure?.objectId,
      actionId: failure?.actionId ?? "unknown",
      accepted: false,
      primaryResultText: failure?.message
    });
    const scene = this.getCurrentScene();
    return {
      accepted: false,
      text: failure?.message,
      events: [],
      scene,
      failure
    };
  }
}

export function createPlayerWorldView(context: PlayerWorldViewContext): PlayerWorldView {
  return new RuntimeBackedPlayerWorldView(context);
}
