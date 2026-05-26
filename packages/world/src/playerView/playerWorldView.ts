import {
  capturePassiveObservations,
  clearPendingEvents,
  performPlayerAction,
  performPlayerIntent,
  rejectAction
} from "./actionExecution.js";
import { buildIntentSurface } from "./intentSurface.js";
import { resolvePlayerIntent } from "./intentResolution.js";
import { createEmptyPlayerMemory } from "./memory.js";
import { buildKnownObjectView, buildObjectKnowledgeView } from "./objectQueries.js";
import { buildPlayerSceneView } from "./scene.js";
import type {
  PlayerActionCommand,
  KnownObjectView,
  PerceptionEvent,
  PlayerActionResultView,
  PlayerKnowledgeEntryView,
  PlayerMemory,
  PlayerNarrativeContextProvider,
  PlayerSceneView,
  PlayerWorldView,
  PlayerKnowledgeProvider,
  WorldRuntimePort
} from "./types.js";
import type { PlayerIntentCommand, PlayerIntentResolution, PlayerIntentSurfaceView } from "./intentTypes.js";

export interface PlayerWorldViewContext {
  runtime: WorldRuntimePort;
  memory?: PlayerMemory;
  narrativeContextProvider?: PlayerNarrativeContextProvider;
  knowledgeProvider?: PlayerKnowledgeProvider;
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
    return buildKnownObjectView(
      {
        runtime: this.context.runtime,
        memory: this.memory,
        narrativeContextProvider: this.context.narrativeContextProvider,
        knowledgeProvider: this.context.knowledgeProvider
      },
      objectId
    );
  }

  getObjectKnowledge(objectId: string): PlayerKnowledgeEntryView | null {
    this.capturePassiveObservations();
    return buildObjectKnowledgeView(
      {
        runtime: this.context.runtime,
        memory: this.memory,
        narrativeContextProvider: this.context.narrativeContextProvider,
        knowledgeProvider: this.context.knowledgeProvider
      },
      objectId
    );
  }

  getNewEvents(): PerceptionEvent[] {
    this.capturePassiveObservations();
    const events = this.pendingEvents.map((event) => ({ ...event }));
    this.clearPendingEvents();
    return events;
  }

  performIntent(intent: PlayerIntentCommand): PlayerActionResultView {
    return performPlayerIntent(this.resolveIntent(intent), (action) => this.performAction(action), (failure) =>
      this.buildRejectedResult(failure)
    );
  }

  performAction(action: PlayerActionCommand): PlayerActionResultView {
    return performPlayerAction(
      {
        runtime: this.context.runtime,
        memory: this.memory,
        pendingEvents: this.pendingEvents,
        narrativeContextProvider: this.context.narrativeContextProvider
      },
      {
        capturePassiveObservations: () => this.capturePassiveObservations(),
        getCurrentScene: () => this.getCurrentScene()
      },
      action
    );
  }

  getRuntime(): WorldRuntimePort {
    return this.context.runtime;
  }

  private capturePassiveObservations(): void {
    capturePassiveObservations(this.context.runtime, this.memory, this.pendingEvents);
  }

  private clearPendingEvents(): void {
    clearPendingEvents(this.memory, this.pendingEvents);
  }

  private buildRejectedResult(failure: PlayerActionResultView["failure"]): PlayerActionResultView {
    return rejectAction(
      {
        runtime: this.context.runtime,
        memory: this.memory,
        pendingEvents: this.pendingEvents,
        narrativeContextProvider: this.context.narrativeContextProvider
      },
      {
        capturePassiveObservations: () => this.capturePassiveObservations(),
        getCurrentScene: () => this.getCurrentScene()
      },
      failure ?? {
        code: "execution-failed",
        kind: "execution",
        message: "Action failed during execution",
        retryable: false,
        actionId: "unknown"
      }
    );
  }
}

export function createPlayerWorldView(context: PlayerWorldViewContext): PlayerWorldView {
  return new RuntimeBackedPlayerWorldView(context);
}
