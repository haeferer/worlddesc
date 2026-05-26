import { inferCanonicalIntentVerb } from "./intentVerbs.js";
import type { PlayerInteractionCommand, PlayerSceneView } from "./types.js";
import type {
  PlayerIntentCommand,
  PlayerIntentResolutionCode,
  PlayerIntentResolution,
  PlayerIntentVerbId
} from "./intentTypes.js";

const OBJECT2_HINT_VERBS: ReadonlySet<PlayerIntentVerbId> = new Set(["unlock", "use", "put"]);
const EXECUTABLE_INTENT_VERBS: ReadonlySet<PlayerIntentVerbId> = new Set([
  "go",
  "examine",
  "open",
  "close",
  "take",
  "unlock",
  "toggle",
  "read",
  "input"
]);

export function resolvePlayerIntent(scene: PlayerSceneView, intent: PlayerIntentCommand): PlayerIntentResolution {
  const knownTargetIds = new Set([
    ...scene.objects.map((item) => item.objectId),
    ...scene.inventoryObjects.map((item) => item.objectId),
    ...scene.knownButNotVisibleObjects.map((item) => item.objectId),
    ...scene.ways.map((item) => item.wayId)
  ]);

  if (!EXECUTABLE_INTENT_VERBS.has(intent.verb)) {
    return rejected(
      intent,
      "intent-not-available",
      `Intent verb "${intent.verb}" is currently not mapped to a concrete world action`,
      false
    );
  }

  if (!intent.object1) {
    return rejected(intent, "missing-object1", `Intent verb "${intent.verb}" requires object1`, true);
  }

  if (intent.verb === "go") {
    const wayAction = findWayAction(scene, intent.object1);

    if (!wayAction) {
      return rejected(intent, "intent-not-available", `No available way matches "${intent.object1}"`, true);
    }

    return {
      status: "resolved",
      command: wayAction.command,
      verb: intent.verb,
      object1: intent.object1,
      object2: intent.object2,
      usedObject2AsHint: false,
      sourceActionId: wayAction.commandId
    };
  }

  if (!knownTargetIds.has(intent.object1)) {
    return rejected(intent, "unknown-object1", `Unknown target "${intent.object1}" for intent resolution`, true);
  }

  if (intent.object2 && !knownTargetIds.has(intent.object2)) {
    return rejected(intent, "unknown-object2", `Unknown secondary target "${intent.object2}" for intent resolution`, true);
  }

  if (intent.object2 && !OBJECT2_HINT_VERBS.has(intent.verb)) {
    return rejected(
      intent,
      "object2-not-supported",
      `Intent verb "${intent.verb}" does not currently support object2`,
      true
    );
  }

  const candidates = scene.sampleActions.filter(
    (action) =>
      action.kind === "interaction" &&
      action.objectId === intent.object1 &&
      inferCanonicalIntentVerb(action) === intent.verb
  );

  if (candidates.length === 0) {
    return rejected(
      intent,
      "intent-not-available",
      `No available interaction on "${intent.object1}" matches intent verb "${intent.verb}"`,
      true
    );
  }

  if (candidates.length > 1) {
    return rejected(
      intent,
      "ambiguous-intent",
      `Intent verb "${intent.verb}" on "${intent.object1}" matches multiple available actions`,
      true,
      candidates.map((item) => item.commandId)
    );
  }

  const action = candidates[0];
  const command = action.command as PlayerInteractionCommand;
  const additionalText = normalizeIntentInput(intent);

  return {
    status: "resolved",
    command: additionalText ? { ...command, additionalText } : command,
    verb: intent.verb,
    object1: intent.object1,
    object2: intent.object2,
    usedObject2AsHint: Boolean(intent.object2),
    sourceActionId: action.commandId
  };
}

function normalizeIntentInput(intent: PlayerIntentCommand): string | undefined {
  if (intent.inputText !== undefined) {
    return intent.inputText;
  }

  if (intent.inputNumber !== undefined) {
    return String(intent.inputNumber);
  }

  return undefined;
}

function rejected(
  intent: PlayerIntentCommand,
  code: PlayerIntentResolutionCode,
  message: string,
  retryable: boolean,
  candidateActionIds?: string[]
): PlayerIntentResolution {
  return {
    status: "rejected",
    issue: {
      code,
      message,
      retryable,
      verb: intent.verb,
      object1: intent.object1,
      object2: intent.object2,
      candidateActionIds
    }
  };
}

function findWayAction(scene: PlayerSceneView, target: string) {
  const normalizedTarget = normalizeIntentTarget(target);
  if (!normalizedTarget) {
    return undefined;
  }

  return scene.sampleActions.find((action) => {
    if (action.kind !== "way") {
      return false;
    }

    const way = scene.ways.find((candidate) => candidate.wayId === action.actionId);
    const terms = [action.actionId, action.title, action.desc, way?.title, way?.desc];

    return terms.some((term) => normalizeIntentTarget(term) === normalizedTarget);
  });
}

function normalizeIntentTarget(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("de-DE")
    .replace(/\s+/g, " ");
}
