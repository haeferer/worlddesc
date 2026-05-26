import { resolvePlayerActionCommand } from "./actionResolution.js";
import { createActionFailure, validateActionInput } from "./actionFeedback.js";
import { createPerceptionEvent } from "./events.js";
import { buildAvailableInteractionView } from "./interactionViews.js";
import { markEventDelivered, setCurrentActionFocus } from "./memory.js";
import {
  buildPlayerSceneView,
  rememberInteractionKnowledge,
  syncRuntimeKnowledge,
  syncSceneObservations
} from "./scene.js";
import { buildTurnSummary } from "./turnSummary.js";
import type {
  PerceptionEvent,
  PlayerActionCommand,
  PlayerActionFailure,
  PlayerActionResultView,
  PlayerMemory,
  PlayerNarrativeContextProvider,
  WorldRuntimePort
} from "./types.js";
import type { PlayerIntentCommand, PlayerIntentResolution } from "./intentTypes.js";

export interface PlayerActionExecutionContext {
  runtime: WorldRuntimePort;
  memory: PlayerMemory;
  pendingEvents: PerceptionEvent[];
  narrativeContextProvider?: PlayerNarrativeContextProvider;
}

export interface PlayerActionExecutionHooks {
  capturePassiveObservations(): void;
  getCurrentScene(): PlayerActionResultView["scene"];
}

export function performPlayerIntent(
  resolution: PlayerIntentResolution,
  executeResolvedAction: (action: PlayerActionCommand) => PlayerActionResultView,
  rejectAction: (failure: PlayerActionFailure) => PlayerActionResultView
): PlayerActionResultView {
  if (resolution.status === "resolved") {
    return executeResolvedAction(resolution.command);
  }

  return rejectAction(mapIntentResolutionFailure(resolution));
}

export function performPlayerAction(
  context: PlayerActionExecutionContext,
  hooks: PlayerActionExecutionHooks,
  action: PlayerActionCommand
): PlayerActionResultView {
  const runtime = context.runtime;
  const resolvedAction = resolvePlayerActionCommand(action);

  if (resolvedAction.kind === "interaction") {
    const object = runtime.world.objects[resolvedAction.objectId];
    if (!object) {
      return rejectAction(context, hooks, createActionFailure({
        code: "unknown-object",
        kind: "unknown",
        message: `Unknown object "${resolvedAction.objectId}"`,
        retryable: false,
        objectId: resolvedAction.objectId,
        actionId: resolvedAction.interactionId
      }));
    }

    const interaction = object.interactions?.[resolvedAction.interactionId];
    if (!interaction) {
      return rejectAction(context, hooks, createActionFailure({
        code: "unknown-action",
        kind: "unknown",
        message: `Unknown interaction "${resolvedAction.interactionId}" on object "${resolvedAction.objectId}"`,
        retryable: false,
        objectId: resolvedAction.objectId,
        actionId: resolvedAction.interactionId
      }));
    }

    if (!runtime.isObjectAccessible(resolvedAction.objectId)) {
      return rejectAction(context, hooks, createActionFailure({
        code: "object-not-accessible",
        kind: "availability",
        message: `Object "${resolvedAction.objectId}" is not currently accessible`,
        retryable: false,
        objectId: resolvedAction.objectId,
        actionId: resolvedAction.interactionId
      }));
    }

    const availableInteractions = runtime.listAvailableInteractions(resolvedAction.objectId);
    if (!availableInteractions.some((item) => item.interactionId === resolvedAction.interactionId)) {
      return rejectAction(context, hooks, createActionFailure({
        code: "action-not-available",
        kind: "availability",
        message: `Interaction "${resolvedAction.interactionId}" on object "${resolvedAction.objectId}" is currently not available`,
        retryable: false,
        objectId: resolvedAction.objectId,
        actionId: resolvedAction.interactionId
      }));
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
      return rejectAction(context, hooks, {
        ...interactionInputFailure,
        objectId: resolvedAction.objectId
      });
    }
  } else {
    const currentRoom = runtime.getCurrentRoom();
    const knownWay = currentRoom.ways?.[resolvedAction.wayId];
    if (!knownWay) {
      return rejectAction(context, hooks, createActionFailure({
        code: "unknown-action",
        kind: "unknown",
        message: `Unknown way "${resolvedAction.wayId}"`,
        retryable: false,
        actionId: resolvedAction.wayId
      }));
    }

    const availableWays = runtime.listAvailableWays();
    if (!availableWays.some((item) => item.wayId === resolvedAction.wayId)) {
      return rejectAction(context, hooks, createActionFailure({
        code: "action-not-available",
        kind: "availability",
        message: `Way "${resolvedAction.wayId}" is currently not available`,
        retryable: false,
        actionId: resolvedAction.wayId
      }));
    }
  }

  try {
    const beforeScene = hooks.getCurrentScene();
    const beforeMemory = structuredClone(context.memory);
    let text: string | undefined;

    if (resolvedAction.kind === "interaction") {
      const result = runtime.executeInteraction(
        resolvedAction.objectId,
        resolvedAction.interactionId,
        action.kind === "interaction" ? action.additionalText : undefined
      );
      text = result.text;

      if (result.text) {
        context.pendingEvents.push(
          createPerceptionEvent({
            type: "interaction",
            objectId: resolvedAction.objectId,
            text: result.text
          })
        );
      }

      for (const sayText of result.say) {
        context.pendingEvents.push(
          createPerceptionEvent({
            type: "system",
            objectId: resolvedAction.objectId,
            text: sayText
          })
        );
      }

      if (result.knowledgeGained.length > 0) {
        rememberInteractionKnowledge(context.memory, resolvedAction.objectId, result.knowledgeGained);
        context.pendingEvents.push(
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
        context.pendingEvents.push(
          createPerceptionEvent({
            type: "system",
            roomId: runtime.getCurrentRoomId(),
            text: sayText
          })
        );
      }
    }

    hooks.capturePassiveObservations();
    const scene = buildPlayerSceneView(runtime, context.memory, context.pendingEvents, context.narrativeContextProvider);
    const events = scene.newEvents.map((event) => ({ ...event }));
    const turn = buildTurnSummary(
      beforeScene,
      scene,
      beforeMemory,
      context.memory,
      events.map((event) => event.id),
      text
    );
    setCurrentActionFocus(context.memory, {
      objectId: resolvedAction.kind === "interaction" ? resolvedAction.objectId : undefined,
      actionId: resolvedAction.kind === "interaction" ? resolvedAction.interactionId : resolvedAction.wayId,
      accepted: true,
      primaryResultText: turn.primaryResultText ?? text
    });
    const sceneWithFocus = buildPlayerSceneView(
      runtime,
      context.memory,
      context.pendingEvents,
      context.narrativeContextProvider
    );
    clearPendingEvents(context.memory, context.pendingEvents);

    return {
      accepted: true,
      text,
      events,
      scene: sceneWithFocus,
      turn
    };
  } catch {
    return rejectAction(context, hooks, createActionFailure({
      code: "execution-failed",
      kind: "execution",
      message: "Action failed during execution",
      retryable: false,
      objectId: resolvedAction.kind === "interaction" ? resolvedAction.objectId : undefined,
      actionId: resolvedAction.kind === "interaction" ? resolvedAction.interactionId : resolvedAction.wayId
    }));
  }
}

export function capturePassiveObservations(
  runtime: WorldRuntimePort,
  memory: PlayerMemory,
  pendingEvents: PerceptionEvent[]
): void {
  syncSceneObservations(runtime, memory, pendingEvents);
  syncRuntimeKnowledge(runtime, memory, pendingEvents);
}

export function clearPendingEvents(memory: PlayerMemory, pendingEvents: PerceptionEvent[]): void {
  for (const event of pendingEvents) {
    markEventDelivered(memory, event.id);
  }

  pendingEvents.splice(0, pendingEvents.length);
}

export function rejectAction(
  context: PlayerActionExecutionContext,
  hooks: PlayerActionExecutionHooks,
  failure: PlayerActionFailure
): PlayerActionResultView {
  setCurrentActionFocus(context.memory, {
    objectId: failure.objectId,
    actionId: failure.actionId ?? "unknown",
    accepted: false,
    primaryResultText: failure.message
  });
  const scene = hooks.getCurrentScene();
  return {
    accepted: false,
    text: failure.message,
    events: [],
    scene,
    failure
  };
}

function mapIntentResolutionFailure(resolution: Extract<PlayerIntentResolution, { status: "rejected" }>): PlayerActionFailure {
  return createActionFailure({
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
  });
}
