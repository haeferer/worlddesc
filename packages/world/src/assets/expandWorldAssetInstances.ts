import type { ObjectAssetDocument } from "../assetTypes.js";
import type { WorldDocument } from "../types.js";
import { loadObjectAssetFile } from "../loadObjectAsset.js";
import { expandObjectAssetInstance } from "./expandObjectAssetInstance.js";
import { resolveObjectAssetReference } from "./resolveObjectAssetReference.js";

export async function expandWorldAssetInstances(world: WorldDocument, worldFilePath: string): Promise<WorldDocument> {
  let expanded = structuredClone(world);

  for (const [instanceId, assetInstance] of Object.entries(world.assetInstances ?? {})) {
    const assetPath = resolveObjectAssetReference(worldFilePath, assetInstance.asset);
    const asset = await loadObjectAssetFile(assetPath);
    expanded = expandObjectAssetInstance(expanded, instanceId, assetInstance, asset);
  }

  return expanded;
}
