import type { ObjectAssetDocument } from "../assetTypes.js";
import type { WorldDocument } from "../types.js";
import { loadObjectAssetFile } from "../loadObjectAsset.js";
import { expandObjectAssetInstance } from "./expandObjectAssetInstance.js";
import { resolveObjectAssetReference } from "./resolveObjectAssetReference.js";
import { WorldValidationError } from "../worldValidation.js";

export async function expandWorldAssetInstances(world: WorldDocument, worldFilePath: string): Promise<WorldDocument> {
  let expanded = structuredClone(world);
  const assignedSlotObjects = new Map<string, string>();

  for (const [instanceId, assetInstance] of Object.entries(world.assetInstances ?? {})) {
    for (const [slotId, objectIds] of Object.entries(assetInstance.slotContents ?? {})) {
      for (const objectId of objectIds) {
        const assignedInstanceId = assignedSlotObjects.get(objectId);
        if (assignedInstanceId && assignedInstanceId !== instanceId) {
          throw new WorldValidationError([
            `assetInstances.${instanceId}.slotContents.${slotId} assigns world object "${objectId}" more than once across asset instances`
          ]);
        }

        assignedSlotObjects.set(objectId, instanceId);
      }
    }

    const assetPath = resolveObjectAssetReference(worldFilePath, assetInstance.asset);
    const asset = await loadObjectAssetFile(assetPath);
    expanded = expandObjectAssetInstance(expanded, instanceId, assetInstance, asset);
  }

  return expanded;
}
