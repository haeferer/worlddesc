import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type {
  PlayerNarrativeContextProvider,
  PlayerNarrativeNodeView,
  PlayerObjectNarrativeContextRequest,
  PlayerSceneNarrativeContextRequest
} from "./playerView/types.js";
import { loadNarrativeGuideDocument, NarrativeGuideValidationError, validateNarrativeGuideAgainstWorld } from "./loadNarrativeGuide.js";
import { loadNarrativeGuideMixFile, NarrativeGuideMixValidationError } from "./loadNarrativeGuideMix.js";
import type {
  MixedNarrativeGuideDocument,
  NarrativeGuideDocument,
  NarrativeGuideMixDocument,
  NarrativeGuideProviderResult
} from "./narrativeGuideTypes.js";
import type { WorldDocument } from "./types.js";

export class NarrativeGuideMixingError extends Error {
  readonly details: string[];

  constructor(details: string[]) {
    super(`Narrative guide mixing failed:\n${details.join("\n")}`);
    this.name = "NarrativeGuideMixingError";
    this.details = details;
  }
}

export async function loadNarrativeGuideProviderFromMixFile(
  mixPath: string,
  world: WorldDocument
): Promise<NarrativeGuideProviderResult> {
  const mix = await loadNarrativeGuideMixFile(mixPath);
  const baseDir = dirname(mixPath);
  return buildNarrativeGuideProviderFromMix(mix, world, async (guideRef) => {
    const guidePath = resolve(baseDir, guideRef);
    const source = await readFile(guidePath, "utf8");
    return {
      path: guidePath,
      guide: loadNarrativeGuideDocument(source)
    };
  });
}

export async function buildNarrativeGuideProviderFromMix(
  mix: NarrativeGuideMixDocument,
  world: WorldDocument,
  resolver: (guideRef: string) => Promise<{ path: string; guide: NarrativeGuideDocument }>
): Promise<NarrativeGuideProviderResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const accumulated: MixedNarrativeGuideDocument = {
    mixId: mix.mix.id,
    layerIds: [],
    rooms: {},
    objects: {}
  };

  for (const [index, layer] of mix.layers.entries()) {
    const layerId = layer.id || `layer${index + 1}`;
    let resolvedGuide: NarrativeGuideDocument | undefined;
    let resolvedPath = layer.guide;

    try {
      const resolved = await resolver(layer.guide);
      resolvedPath = resolved.path;
      resolvedGuide = resolved.guide;
    } catch (error) {
      if (layer.optional) {
        warnings.push(`Narrative guide layer "${layerId}" could not be loaded and was skipped: ${layer.guide}`);
        continue;
      }

      if (error instanceof NarrativeGuideValidationError || error instanceof NarrativeGuideMixValidationError) {
        errors.push(...error.details.map((detail) => `Layer "${layerId}" (${layer.guide}): ${detail}`));
      } else {
        errors.push(`Layer "${layerId}" could not be loaded from "${layer.guide}"`);
      }
      continue;
    }

    const semanticErrors = validateNarrativeGuideAgainstWorld(resolvedGuide, world);
    if (semanticErrors.length > 0) {
      errors.push(...semanticErrors.map((detail) => `Layer "${layerId}" (${resolvedPath}): ${detail}`));
      continue;
    }

    const changed = applyGuideLayer(accumulated, resolvedGuide);
    accumulated.layerIds.push(layerId);

    if (!changed) {
      warnings.push(`Narrative guide layer "${layerId}" made no effective changes`);
    }
  }

  if (errors.length > 0) {
    throw new NarrativeGuideMixingError(errors);
  }

  return {
    document: accumulated,
    warnings,
    provider: createNarrativeContextProvider(accumulated)
  };
}

export function createNarrativeContextProvider(
  document: MixedNarrativeGuideDocument
): PlayerNarrativeContextProvider {
  return {
    getSceneNarrativeContext(request: PlayerSceneNarrativeContextRequest) {
      const objectIds = new Set([
        ...request.visibleObjectIds,
        ...request.inventoryObjectIds,
        ...(request.currentActionFocusObjectId ? [request.currentActionFocusObjectId] : [])
      ]);
      const objectNodes: Record<string, PlayerNarrativeNodeView> = {};

      for (const objectId of objectIds) {
        const node = document.objects[objectId];
        if (node) {
          objectNodes[objectId] = structuredClone(node);
        }
      }

      const roomNode = document.rooms[request.roomId];
      const focusNode = request.currentActionFocusObjectId ? document.objects[request.currentActionFocusObjectId] : undefined;

      if (!document.world && !roomNode && Object.keys(objectNodes).length === 0 && !focusNode) {
        return undefined;
      }

      return {
        mixId: document.mixId,
        world: cloneNode(document.world),
        room: cloneNode(roomNode),
        objects: objectNodes,
        currentActionFocusObject: cloneNode(focusNode)
      };
    },
    getObjectNarrativeContext(request: PlayerObjectNarrativeContextRequest) {
      return cloneNode(document.objects[request.objectId]);
    }
  };
}

function applyGuideLayer(target: MixedNarrativeGuideDocument, guide: NarrativeGuideDocument): boolean {
  let changed = false;

  if (guide.world) {
    const merged = mergeNarrativeNode(target.world, guide.world);
    if (!areNarrativeNodesEqual(target.world, merged)) {
      target.world = merged;
      changed = true;
    }
  }

  for (const [roomId, node] of Object.entries(guide.rooms ?? {})) {
    const merged = mergeNarrativeNode(target.rooms[roomId], node);
    if (!areNarrativeNodesEqual(target.rooms[roomId], merged)) {
      target.rooms[roomId] = merged;
      changed = true;
    }
  }

  for (const [objectId, node] of Object.entries(guide.objects ?? {})) {
    const merged = mergeNarrativeNode(target.objects[objectId], node);
    if (!areNarrativeNodesEqual(target.objects[objectId], merged)) {
      target.objects[objectId] = merged;
      changed = true;
    }
  }

  return changed;
}

function mergeNarrativeNode(
  current: PlayerNarrativeNodeView | undefined,
  incoming: PlayerNarrativeNodeView
): PlayerNarrativeNodeView {
  const merged: PlayerNarrativeNodeView = current ? structuredClone(current) : {};

  if (incoming.tone !== undefined) {
    merged.tone = structuredClone(incoming.tone);
  }
  if (incoming.associations !== undefined) {
    merged.associations = structuredClone(incoming.associations);
  }
  if (incoming.narrativeHints !== undefined) {
    merged.narrativeHints = structuredClone(incoming.narrativeHints);
  }
  if (incoming.sensoryHints !== undefined) {
    merged.sensoryHints = structuredClone(incoming.sensoryHints);
  }
  if (incoming.taboos !== undefined) {
    merged.taboos = structuredClone(incoming.taboos);
  }
  if (incoming.desc !== undefined) {
    merged.desc = incoming.desc;
  }

  return merged;
}

function areNarrativeNodesEqual(
  left: PlayerNarrativeNodeView | undefined,
  right: PlayerNarrativeNodeView | undefined
): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function cloneNode(node: PlayerNarrativeNodeView | undefined): PlayerNarrativeNodeView | undefined {
  return node ? structuredClone(node) : undefined;
}
