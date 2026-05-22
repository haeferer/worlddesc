import type {
  PlayerActionOptionView,
  PlayerActionOptionView as SceneAction,
  PlayerSceneObjectView,
  PlayerSceneView
} from "./types.js";
import type {
  PlayerIntentCandidateView,
  PlayerIntentSurfaceView,
  PlayerIntentTargetView,
  PlayerIntentVerbView
} from "./intentTypes.js";
import { inferCanonicalIntentVerb, listCanonicalIntentVerbs } from "./intentVerbs.js";

export function buildIntentSurface(scene: PlayerSceneView): PlayerIntentSurfaceView {
  const verbs = buildIntentVerbs(scene.sampleActions);
  const targets = buildIntentTargets(scene);
  const suggestedCandidates = scene.sampleActions.map((action) => buildIntentCandidate(action, scene));

  return {
    verbs,
    targets,
    suggestedCandidates,
    sourceActionIds: scene.sampleActions.map((action) => action.commandId)
  };
}

function buildIntentVerbs(actions: PlayerActionOptionView[]): PlayerIntentVerbView[] {
  const verbs = listCanonicalIntentVerbs();
  const byVerb = new Map(verbs.map((verb) => [verb.id, verb]));

  for (const action of actions) {
    const canonicalVerbId = inferCanonicalIntentVerb(action);
    const existing = byVerb.get(canonicalVerbId);

    if (!existing) {
      continue;
    }

    existing.sceneRelevant = true;
    existing.sourceActionIds = [...(existing.sourceActionIds ?? []), action.commandId];
  }

  return verbs;
}

function buildIntentTargets(scene: PlayerSceneView): PlayerIntentTargetView[] {
  return [
    ...scene.objects.map((objectView) => buildObjectTarget(objectView, "object")),
    ...scene.inventoryObjects.map((objectView) => buildObjectTarget(objectView, "inventory")),
    ...scene.ways.map((way) => ({
      id: way.wayId,
      title: way.title,
      kind: "way" as const,
      visible: true,
      accessible: true
    }))
  ];
}

function buildObjectTarget(
  objectView: PlayerSceneObjectView,
  kind: "object" | "inventory"
): PlayerIntentTargetView {
  return {
    id: objectView.objectId,
    title: objectView.title,
    kind,
    visible: objectView.visible,
    accessible: objectView.accessible
  };
}

function buildIntentCandidate(action: SceneAction, scene: PlayerSceneView): PlayerIntentCandidateView {
  if (action.kind === "way") {
    return {
      verb: getCandidateVerb(action),
      object1: {
        id: action.actionId,
        title: action.title,
        kind: "way",
        visible: true,
        accessible: true
      }
    };
  }

  const sceneObject =
    scene.objects.find((item) => item.objectId === action.objectId) ??
    scene.inventoryObjects.find((item) => item.objectId === action.objectId);

  return {
    verb: getCandidateVerb(action),
    object1: sceneObject
      ? {
          id: sceneObject.objectId,
          title: sceneObject.title,
          kind: scene.inventoryObjectIds.includes(sceneObject.objectId) ? "inventory" : "object",
          visible: sceneObject.visible,
          accessible: sceneObject.accessible
        }
      : undefined,
    expectedInput: action.input
  };
}

function getCandidateVerb(action: SceneAction): PlayerIntentVerbView {
  const verbId = inferCanonicalIntentVerb(action);
  const verb = listCanonicalIntentVerbs().find((item) => item.id === verbId);

  if (!verb) {
    throw new Error(`Unknown canonical intent verb "${verbId}"`);
  }

  return {
    ...verb,
    sceneRelevant: true,
    sourceActionIds: [action.commandId]
  };
}
