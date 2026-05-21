import type { RuntimeInteraction, RuntimeWay, WorldObject } from "../types.js";
import type { PlayerActionCommand, WorldRuntimePort } from "./types.js";

export interface ResolvedInteractionAction {
  kind: "interaction";
  objectId: string;
  interactionId: string;
}

export interface ResolvedWayAction {
  kind: "way";
  wayId: string;
}

export type ResolvedPlayerAction = ResolvedInteractionAction | ResolvedWayAction;

export interface ResolvedPlayerActionCandidate {
  kind: ResolvedPlayerAction["kind"];
  objectId?: string;
  actionId: string;
  label: string;
}

export interface PlayerActionTextRequest {
  inputText: string;
  objectHintId?: string;
  interactionHintId?: string;
  wayHintId?: string;
}

export type PlayerActionTextResolution =
  | {
      status: "resolved";
      action: ResolvedPlayerAction;
    }
  | {
      status: "ambiguous";
      candidates: ResolvedPlayerActionCandidate[];
    }
  | {
      status: "unresolved";
    };

export function resolvePlayerActionCommand(action: PlayerActionCommand): ResolvedPlayerAction {
  if (action.kind === "interaction") {
    return {
      kind: "interaction",
      objectId: action.objectId,
      interactionId: action.actionId
    };
  }

  return {
    kind: "way",
    wayId: action.actionId
  };
}

export function resolvePlayerActionFromText(
  runtime: WorldRuntimePort,
  action: PlayerActionTextRequest
): PlayerActionTextResolution {
  if (action.objectHintId && action.interactionHintId) {
    return resolved({
      kind: "interaction",
      objectId: action.objectHintId,
      interactionId: action.interactionHintId
    });
  }

  if (action.wayHintId) {
    return resolved({
      kind: "way",
      wayId: action.wayHintId
    });
  }

  if (action.objectHintId) {
    const match = resolveInteractionOnObject(runtime, action.objectHintId, action.inputText);
    return match ? resolved(match) : { status: "unresolved" };
  }

  if (action.interactionHintId) {
    const match = resolveInteractionById(runtime, action.interactionHintId);
    return match ? resolved(match) : { status: "unresolved" };
  }

  const normalizedInput = normalizeActionText(action.inputText);
  if (!normalizedInput) {
    return { status: "unresolved" };
  }

  const wayMatches = resolveWaysByText(runtime, normalizedInput);
  if (wayMatches.length === 1) {
    return resolved({
      kind: "way",
      wayId: wayMatches[0].wayId
    });
  }

  const interactionMatches = resolveInteractionsByText(runtime, normalizedInput);
  if (interactionMatches.length === 1) {
    return resolved({
      kind: "interaction",
      objectId: interactionMatches[0].objectId,
      interactionId: interactionMatches[0].interactionId
    });
  }

  const candidates = [
    ...wayMatches.map((way) => createWayCandidate(way)),
    ...interactionMatches.map((interaction) => createInteractionCandidate(runtime, interaction))
  ];

  if (candidates.length > 1) {
    return {
      status: "ambiguous",
      candidates
    };
  }

  return { status: "unresolved" };
}

function resolveInteractionOnObject(
  runtime: WorldRuntimePort,
  objectId: string,
  inputText: string
): ResolvedInteractionAction | null {
  const object = runtime.world.objects[objectId];
  if (!object) {
    return null;
  }

  const interactions = runtime.listAvailableInteractions(objectId);
  const normalizedInput = normalizeActionText(inputText);

  if (!normalizedInput) {
    return interactions.length === 1
      ? {
          kind: "interaction",
          objectId,
          interactionId: interactions[0].interactionId
        }
      : null;
  }

  const exactMatches = interactions.filter((interaction) =>
    matchesInteractionText(interaction, object, normalizedInput)
  );

  if (exactMatches.length !== 1) {
    return null;
  }

  return {
    kind: "interaction",
    objectId,
    interactionId: exactMatches[0].interactionId
  };
}

function resolveInteractionById(runtime: WorldRuntimePort, interactionId: string): ResolvedInteractionAction | null {
  const matches = listAccessibleInteractionCandidates(runtime).filter((candidate) => candidate.interactionId === interactionId);
  if (matches.length !== 1) {
    return null;
  }

  return {
    kind: "interaction",
    objectId: matches[0].objectId,
    interactionId
  };
}

function resolveWaysByText(runtime: WorldRuntimePort, normalizedInput: string): RuntimeWay[] {
  return runtime
    .listAvailableWays()
    .filter((way) => collectWayTerms(way).some((term) => normalizeActionText(term) === normalizedInput));
}

function resolveInteractionsByText(runtime: WorldRuntimePort, normalizedInput: string): RuntimeInteraction[] {
  return listAccessibleInteractionCandidates(runtime).filter((candidate) =>
    matchesInteractionText(candidate, runtime.world.objects[candidate.objectId], normalizedInput)
  );
}

function listAccessibleInteractionCandidates(runtime: WorldRuntimePort): RuntimeInteraction[] {
  const candidateObjectIds = new Set<string>([
    ...runtime.getRoomObjectIds(),
    ...runtime.getInventoryObjectIds()
  ]);

  for (const objectId of [...candidateObjectIds]) {
    for (const containedId of runtime.getContainedObjectIds(objectId)) {
      if (runtime.isObjectAccessible(containedId)) {
        candidateObjectIds.add(containedId);
      }
    }
  }

  return [...candidateObjectIds].flatMap((objectId) => runtime.listAvailableInteractions(objectId));
}

function matchesInteractionText(interaction: RuntimeInteraction, object: WorldObject, normalizedInput: string): boolean {
  return collectInteractionTerms(interaction, object).some((term) => normalizeActionText(term) === normalizedInput);
}

function collectWayTerms(way: RuntimeWay): string[] {
  return [way.wayId, way.definition.title, way.definition.desc, ...(way.definition.aliases ?? [])];
}

function collectInteractionTerms(interaction: RuntimeInteraction, object: WorldObject): string[] {
  return [
    interaction.interactionId,
    interaction.definition.title,
    interaction.definition.intent ?? "",
    ...(interaction.definition.aliases ?? []),
    ...buildObjectInteractionPhrases(object, interaction.interactionId)
  ];
}

function buildObjectInteractionPhrases(object: WorldObject, interactionId: string): string[] {
  return [object.title, ...(object.aliases ?? [])].map((alias) => `${alias} ${interactionId}`);
}

function resolved(action: ResolvedPlayerAction): PlayerActionTextResolution {
  return {
    status: "resolved",
    action
  };
}

function createWayCandidate(way: RuntimeWay): ResolvedPlayerActionCandidate {
  return {
    kind: "way",
    actionId: way.wayId,
    label: `${way.definition.title} (${way.wayId})`
  };
}

function createInteractionCandidate(
  runtime: WorldRuntimePort,
  interaction: RuntimeInteraction
): ResolvedPlayerActionCandidate {
  const object = runtime.world.objects[interaction.objectId];
  return {
    kind: "interaction",
    objectId: interaction.objectId,
    actionId: interaction.interactionId,
    label: `${object.title}: ${interaction.definition.title}`
  };
}

function normalizeActionText(text: string | undefined): string {
  return (text ?? "")
    .trim()
    .toLocaleLowerCase("de-DE")
    .replace(/\s+/g, " ");
}
