import type { WorldDocument } from "../types.js";
import { AssetValidationError, loadObjectAssetFile } from "../loadObjectAsset.js";
import { resolveObjectAssetReference } from "./resolveObjectAssetReference.js";

export async function validateWorldAssetReferences(world: WorldDocument, worldFilePath: string): Promise<string[]> {
  const errors: string[] = [];

  for (const [instanceId, assetInstance] of Object.entries(world.assetInstances ?? {})) {
    const resolvedAssetPath = resolveObjectAssetReference(worldFilePath, assetInstance.asset);

    try {
      await loadObjectAssetFile(resolvedAssetPath);
    } catch (error) {
      if (error instanceof AssetValidationError) {
        for (const detail of error.details) {
          errors.push(`assetInstances.${instanceId}.asset (${assetInstance.asset}) -> ${detail}`);
        }
        continue;
      }

      const message = error instanceof Error ? error.message : String(error);
      errors.push(`assetInstances.${instanceId}.asset (${assetInstance.asset}) could not be loaded from "${resolvedAssetPath}": ${message}`);
    }
  }

  return errors;
}
